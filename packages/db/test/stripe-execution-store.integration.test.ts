import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import {
  closeDatabase,
  getDatabase,
  PostgresStripeExecutionStore,
  PostgresWorkflowStore,
  schema,
} from "../src";
import { requireLocalTestDatabaseUrl } from "./database-target";

const databaseUrl = requireLocalTestDatabaseUrl(process.env.DATABASE_URL);

describe("PostgreSQL Stripe execution store", () => {
  afterAll(closeDatabase);

  it("creates one execution and deduplicates a webhook event", async () => {
    const database = getDatabase(databaseUrl);
    const suffix = randomUUID();
    const organizationId = `org-stripe-${suffix}`;
    const workflowId = `workflow-stripe-${suffix}`;
    const receiptId = `receipt-stripe-${suffix}`;
    const workflows = new PostgresWorkflowStore(database);
    const store = new PostgresStripeExecutionStore(database);
    await database.insert(schema.organization).values({ id: organizationId, name: "Stripe test" });
    try {
      await workflows.begin({
        workflowId,
        organizationId,
        idempotencyKey: `request-${suffix}`,
        requestHash: "request-stripe-v1",
        request: {
          requestId: "SR-stripe",
          title: "Synthetic Stripe test",
          requestingAgent: "Finance Agent",
          vendor: "Datacore",
          category: "Software",
          amountMinor: 480_000,
          currency: "USD",
          costCenter: "482",
        },
        startedAt: "2026-09-21T18:00:00.000Z",
      });
      await database.insert(schema.decisionReceipt).values({
        id: receiptId,
        organizationId,
        workflowId,
        requestHash: "request-stripe-v1",
        policyVersionId: "policy-stripe-v1",
        policyDigest: "policy-stripe-digest",
        evaluatorVersion: "deterministic-v1",
        reservationId: "reservation-stripe-v1",
        decision: "ALLOW",
        reasonCodes: [],
        digest: `digest-${suffix}`,
        decidedAt: new Date("2026-09-21T18:00:00.000Z"),
      });
      const input = {
        organizationId,
        workflowId,
        receiptId,
        requestHash: "request-stripe-v1",
        idempotencyKey: `stripe-execution:${receiptId}`,
        amountMinor: 480_000,
        currency: "USD",
      };

      const [first, second] = await Promise.all([
        store.beginExecution(input),
        store.beginExecution(input),
      ]);

      expect([first.created, second.created].filter(Boolean)).toHaveLength(1);
      const execution = first.execution;
      await store.completeExecution(execution.id, "pi_test_stripe", "requires_payment_method");
      await expect(
        store.recordWebhookReceipt({
          organizationId,
          stripeEventId: "evt_test_stripe",
          eventType: "payment_intent.succeeded",
          executionId: execution.id,
          disposition: "APPLIED",
        }),
      ).resolves.toMatchObject({ disposition: "APPLIED" });
      await expect(
        store.recordWebhookReceipt({
          organizationId,
          stripeEventId: "evt_test_stripe",
          eventType: "payment_intent.succeeded",
          executionId: execution.id,
          disposition: "APPLIED",
        }),
      ).resolves.toMatchObject({ disposition: "DUPLICATE" });
    } finally {
      await database.delete(schema.organization).where(eq(schema.organization.id, organizationId));
    }
  });
});
