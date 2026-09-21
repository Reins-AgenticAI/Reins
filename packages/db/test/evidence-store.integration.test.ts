import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import {
  closeDatabase,
  getDatabase,
  PostgresEvidenceStore,
  PostgresWorkflowStore,
  schema,
} from "../src";
import { requireLocalTestDatabaseUrl } from "./database-target";

const databaseUrl = requireLocalTestDatabaseUrl(process.env.DATABASE_URL);

describe("PostgreSQL evidence store", () => {
  afterAll(closeDatabase);

  it("joins workflow records with synthetic lifecycle findings in chronological order", async () => {
    const database = getDatabase(databaseUrl);
    const suffix = randomUUID();
    const organizationId = `org-evidence-${suffix}`;
    const workflowId = `workflow-evidence-${suffix}`;
    const workflows = new PostgresWorkflowStore(database);
    const evidence = new PostgresEvidenceStore(database);
    await database
      .insert(schema.organization)
      .values({ id: organizationId, name: "Evidence test" });
    try {
      await workflows.begin({
        workflowId,
        organizationId,
        idempotencyKey: `request-${suffix}`,
        requestHash: "request-evidence-v1",
        request: {
          requestId: "SR-501",
          title: "Institutional market-data renewal",
          requestingAgent: "Research Agent",
          vendor: "Datacore",
          category: "Data and research",
          amountMinor: 800_000,
          currency: "USD",
          costCenter: "482",
        },
        startedAt: "2026-09-20T18:00:00.000Z",
      });
      await evidence.append({
        organizationId,
        workflowId,
        event: {
          id: `auth-${suffix}`,
          kind: "AUTHORIZATION",
          amountMinor: 800_000,
          currency: "USD",
          source: "POLICY",
          occurredAt: "2026-09-20T18:01:00.000Z",
        },
      });
      await evidence.append({
        organizationId,
        workflowId,
        event: {
          id: `settle-${suffix}`,
          kind: "SETTLEMENT",
          amountMinor: 900_000,
          currency: "USD",
          source: "PROVIDER",
          occurredAt: "2026-09-20T18:02:00.000Z",
          parentId: `auth-${suffix}`,
        },
      });

      const investigation = await evidence.getInvestigation({ organizationId, workflowId });

      expect(investigation.lifecycle.map((event) => event.id)).toEqual([
        `auth-${suffix}`,
        `settle-${suffix}`,
      ]);
      expect(investigation.findings.map((finding) => finding.code)).toContain("EXCESS_SETTLEMENT");
      expect((await evidence.findLatest({ organizationId }))?.workflow.id).toBe(workflowId);
      const replayed = await evidence.append({
        organizationId,
        workflowId,
        event: {
          id: `settle-${suffix}`,
          kind: "SETTLEMENT",
          amountMinor: 900_000,
          currency: "USD",
          source: "PROVIDER",
          occurredAt: "2026-09-20T18:02:00.000Z",
          parentId: `auth-${suffix}`,
        },
      });
      expect(replayed).toEqual({
        id: `settle-${suffix}`,
        kind: "SETTLEMENT",
        amountMinor: 900_000,
        currency: "USD",
        source: "PROVIDER",
        occurredAt: "2026-09-20T18:02:00.000Z",
        parentId: `auth-${suffix}`,
      });
      expect(
        (await evidence.getInvestigation({ organizationId, workflowId })).lifecycle,
      ).toHaveLength(2);
      await expect(
        evidence.append({
          organizationId,
          workflowId,
          event: {
            id: `settle-${suffix}`,
            kind: "SETTLEMENT",
            amountMinor: 800_000,
            currency: "USD",
            source: "PROVIDER",
            occurredAt: "2026-09-20T18:02:00.000Z",
            parentId: `auth-${suffix}`,
          },
        }),
      ).rejects.toThrow("Lifecycle event conflicts with existing event");
    } finally {
      await database.delete(schema.organization).where(eq(schema.organization.id, organizationId));
    }
  });
});
