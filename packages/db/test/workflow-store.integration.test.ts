import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase, PostgresWorkflowStore, schema } from "../src/index";
import { requireLocalTestDatabaseUrl } from "./database-target";

const databaseUrl = requireLocalTestDatabaseUrl(process.env.DATABASE_URL);

describe("PostgreSQL workflow store", () => {
  afterAll(closeDatabase);

  it("persists one idempotent workflow and its canonically ordered immutable traces", async () => {
    const db = getDatabase(databaseUrl);
    const suffix = randomUUID();
    const organizationId = `org-workflow-${suffix}`;
    const workflowId = `workflow-${suffix}`;
    const store = new PostgresWorkflowStore(db);
    const begin = {
      workflowId,
      organizationId,
      idempotencyKey: `request-${suffix}`,
      requestHash: "hash-original",
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
    } as const;
    const traces = [
      {
        sequence: 1,
        agent: "INTAKE",
        status: "SUCCEEDED",
        durationMs: 12,
        output: { summary: "Request normalized", facts: {}, evidenceRefs: [] },
      },
      {
        sequence: 2,
        agent: "VENDOR_CONTEXT",
        status: "TIMED_OUT",
        durationMs: 50,
        errorCode: "AGENT_TIMEOUT",
      },
    ] as const;
    await db.insert(schema.organization).values({ id: organizationId, name: "Workflow test" });

    try {
      const first = await store.begin(begin);
      const duplicate = await store.begin({ ...begin, workflowId: `retry-${suffix}` });

      expect(first.created).toBe(true);
      expect(duplicate.created).toBe(false);
      expect(duplicate.workflow.workflowId).toBe(workflowId);
      await expect(
        store.begin({
          ...begin,
          workflowId: `mutated-${suffix}`,
          requestHash: "hash-mutated",
        }),
      ).rejects.toThrow("Idempotency key reused with different workflow request");
      await expect(
        db.insert(schema.workflowEvent).values({
          id: `invalid-agent-${suffix}`,
          workflowId,
          sequence: 99,
          agent: "DECISION" as typeof schema.workflowEvent.$inferInsert.agent,
          status: "FAILED",
          durationMs: 1,
          errorCode: "AGENT_FAILURE",
          occurredAt: new Date("2026-09-20T18:00:00.500Z"),
        }),
      ).rejects.toThrow();
      await expect(
        db
          .update(schema.workflowRun)
          .set({ completedAt: new Date("2026-09-20T18:00:00.500Z") })
          .where(eq(schema.workflowRun.id, workflowId)),
      ).rejects.toThrow();

      const [completed, concurrentReplay] = await Promise.all([
        store.complete(workflowId, "COMPLETED", traces, "2026-09-20T18:00:01.000Z"),
        store.complete(workflowId, "COMPLETED", traces, "2026-09-20T18:00:01.000Z"),
      ]);
      const replay = await store.begin({ ...begin, workflowId: `replay-${suffix}` });

      expect(completed.status).toBe("COMPLETED");
      expect(concurrentReplay).toEqual(completed);
      expect(replay.workflow).toEqual(completed);
      expect(replay.workflow.traces.map((trace) => trace.sequence)).toEqual([1, 2]);
      expect(
        await db
          .select({ id: schema.workflowEvent.id })
          .from(schema.workflowEvent)
          .where(eq(schema.workflowEvent.workflowId, workflowId)),
      ).toHaveLength(2);
      await expect(
        db.insert(schema.workflowEvent).values({
          id: `duplicate-sequence-${suffix}`,
          workflowId,
          sequence: 1,
          agent: "EVIDENCE",
          status: "FAILED",
          durationMs: 1,
          errorCode: "AGENT_FAILURE",
          occurredAt: new Date("2026-09-20T18:00:02.000Z"),
        }),
      ).rejects.toThrow();
    } finally {
      await db.delete(schema.organization).where(and(eq(schema.organization.id, organizationId)));
    }
  });
});
