import { randomUUID } from "node:crypto";
import { createApprovalRequest, evaluateSpendDecision } from "@reins/assurance";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import {
  closeDatabase,
  getDatabase,
  PostgresDecisionStore,
  PostgresWorkflowStore,
  schema,
} from "../src/index";
import { requireLocalTestDatabaseUrl } from "./database-target";

const databaseUrl = requireLocalTestDatabaseUrl(process.env.DATABASE_URL);

describe("PostgreSQL decisions and approvals", () => {
  afterAll(closeDatabase);

  it("keeps a receipt and human approval bound to the workflow request and organization", async () => {
    const db = getDatabase(databaseUrl);
    const suffix = randomUUID();
    const organizationId = `org-decision-${suffix}`;
    const workflowId = `workflow-decision-${suffix}`;
    const workflowStore = new PostgresWorkflowStore(db);
    const decisionStore = new PostgresDecisionStore(db);
    await db.insert(schema.organization).values({ id: organizationId, name: "Decision test" });

    try {
      await workflowStore.begin({
        workflowId,
        organizationId,
        idempotencyKey: `request-${suffix}`,
        requestHash: "request-v1",
        request: {
          requestId: "SR-2048",
          title: "Renew market-data platform",
          requestingAgent: "Research Agent",
          vendor: "Datacore",
          category: "Data and research",
          amountMinor: 4_800_000,
          currency: "USD",
          costCenter: "482",
        },
        startedAt: "2026-09-20T18:00:00.000Z",
      });
      const receipt = evaluateSpendDecision({
        request: {
          requestHash: "request-v1",
          amountMinor: 4_800_000,
          currency: "USD",
          merchant: "datacore",
        },
        policy: {
          versionId: "policy-v3",
          digest: "policy-digest-v3",
          currency: "USD",
          perTransactionLimitMinor: 5_000_000,
          approvalThresholdMinor: 4_000_000,
          allowedMerchants: ["datacore"],
          validUntil: "2026-10-01T00:00:00.000Z",
        },
        reservation: { id: "reservation-v1", requestHash: "request-v1", state: "HELD" },
        contextComplete: true,
        evaluatedAt: "2026-09-20T18:00:00.000Z",
      });
      const approval = createApprovalRequest({
        id: `approval-${suffix}`,
        requestHash: "request-v1",
        policyVersionId: "policy-v3",
        requestedAt: "2026-09-20T18:00:00.000Z",
        expiresAt: "2026-09-20T18:15:00.000Z",
      });

      await decisionStore.createApproval({ organizationId, workflowId, approval });
      const saved = await decisionStore.saveReceipt({
        id: `decision-${suffix}`,
        organizationId,
        workflowId,
        receipt,
      });
      const resolved = await decisionStore.resolveApproval(approval.id, {
        outcome: "APPROVED",
        approverId: "user-finance-1",
        decidedAt: "2026-09-20T18:05:00.000Z",
      });

      expect(saved).toMatchObject({ workflowId, requestHash: "request-v1", decision: "ESCALATE" });
      await expect(
        decisionStore.findReceiptByWorkflow(organizationId, workflowId),
      ).resolves.toEqual({
        id: saved.id,
      });
      expect(resolved).toMatchObject({ status: "APPROVED", approverId: "user-finance-1" });
      await expect(
        decisionStore.saveReceipt({
          id: `wrong-hash-${suffix}`,
          organizationId,
          workflowId,
          receipt: { ...receipt, requestHash: "wrong-hash" },
        }),
      ).rejects.toThrow("Decision request hash does not match workflow");
      await workflowStore.begin({
        workflowId: `other-workflow-${suffix}`,
        organizationId,
        idempotencyKey: `other-request-${suffix}`,
        requestHash: "request-v1",
        request: {
          requestId: "SR-2049",
          title: "Other request",
          requestingAgent: "Research Agent",
          vendor: "Datacore",
          category: "Data and research",
          amountMinor: 4_800_000,
          currency: "USD",
          costCenter: "482",
        },
        startedAt: "2026-09-20T18:00:00.000Z",
      });
      const otherApproval = createApprovalRequest({
        id: `approval-other-${suffix}`,
        requestHash: "request-v1",
        policyVersionId: "policy-v3",
        requestedAt: "2026-09-20T18:00:00.000Z",
        expiresAt: "2026-09-20T18:15:00.000Z",
      });
      await decisionStore.createApproval({
        organizationId,
        workflowId: `other-workflow-${suffix}`,
        approval: otherApproval,
      });
      await expect(
        decisionStore.saveReceipt({
          id: `cross-workflow-${suffix}`,
          organizationId,
          workflowId,
          receipt: { ...receipt, approvalId: otherApproval.id, digest: `cross-digest-${suffix}` },
        }),
      ).rejects.toThrow("Approval not found");
    } finally {
      await db.delete(schema.organization).where(eq(schema.organization.id, organizationId));
    }
  });
});
