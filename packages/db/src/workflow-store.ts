import {
  type AdvisoryAgentOutput,
  type AdvisoryAgentTrace,
  type AdvisoryWorkflow,
  type SpendWorkflowRequest,
  WorkflowConflictError,
  type WorkflowStore,
} from "@reins/assurance";
import { and, asc, eq, sql } from "drizzle-orm";
import type { Database } from "./index";
import { workflowEvent, workflowRun } from "./schema";

type BeginInput = Parameters<WorkflowStore["begin"]>[0];

function freezeOutput(value: unknown): AdvisoryAgentOutput {
  const output = value as AdvisoryAgentOutput;
  return Object.freeze({
    summary: output.summary,
    facts: Object.freeze({ ...output.facts }),
    evidenceRefs: Object.freeze([...output.evidenceRefs]),
  });
}

function freezeWorkflow(
  run: typeof workflowRun.$inferSelect,
  events: Array<typeof workflowEvent.$inferSelect>,
): AdvisoryWorkflow {
  const traces = events.map((event) =>
    Object.freeze({
      sequence: event.sequence,
      agent: event.agent as AdvisoryAgentTrace["agent"],
      status: event.status,
      durationMs: event.durationMs,
      ...(event.output ? { output: freezeOutput(event.output) } : {}),
      ...(event.errorCode
        ? { errorCode: event.errorCode as NonNullable<AdvisoryAgentTrace["errorCode"]> }
        : {}),
    }),
  );
  return Object.freeze({
    workflowId: run.id,
    organizationId: run.organizationId,
    idempotencyKey: run.idempotencyKey,
    requestHash: run.requestHash,
    request: Object.freeze({ ...(run.request as SpendWorkflowRequest) }),
    status: run.status,
    startedAt: run.startedAt.toISOString(),
    ...(run.completedAt ? { completedAt: run.completedAt.toISOString() } : {}),
    traces: Object.freeze(traces),
  });
}

export class PostgresWorkflowStore implements WorkflowStore {
  constructor(private readonly database: Database) {}

  async begin(input: BeginInput) {
    return this.database.transaction(async (tx) => {
      const scope = `${input.organizationId}:${input.idempotencyKey}`;
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${scope}, 0))`);
      const [existing] = await tx
        .select()
        .from(workflowRun)
        .where(
          and(
            eq(workflowRun.organizationId, input.organizationId),
            eq(workflowRun.idempotencyKey, input.idempotencyKey),
          ),
        )
        .limit(1);
      if (existing) {
        if (existing.requestHash !== input.requestHash) {
          throw new WorkflowConflictError("Idempotency key reused with different workflow request");
        }
        const events = await tx
          .select()
          .from(workflowEvent)
          .where(eq(workflowEvent.workflowId, existing.id))
          .orderBy(asc(workflowEvent.sequence));
        return { created: false, workflow: freezeWorkflow(existing, events) };
      }

      const [created] = await tx
        .insert(workflowRun)
        .values({
          id: input.workflowId,
          organizationId: input.organizationId,
          idempotencyKey: input.idempotencyKey,
          requestHash: input.requestHash,
          request: input.request,
          startedAt: new Date(input.startedAt),
        })
        .returning();
      if (!created) throw new Error("Workflow was not created");
      return { created: true, workflow: freezeWorkflow(created, []) };
    });
  }

  async complete(
    workflowId: string,
    status: "COMPLETED" | "CANCELLED",
    traces: readonly AdvisoryAgentTrace[],
    completedAt: string,
  ) {
    return this.database.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`workflow-complete:${workflowId}`}, 0))`,
      );
      const [current] = await tx
        .select()
        .from(workflowRun)
        .where(eq(workflowRun.id, workflowId))
        .limit(1);
      if (!current) throw new Error("Workflow not found");
      if (current.status !== "RUNNING") {
        const events = await tx
          .select()
          .from(workflowEvent)
          .where(eq(workflowEvent.workflowId, workflowId))
          .orderBy(asc(workflowEvent.sequence));
        return freezeWorkflow(current, events);
      }

      const occurredAt = new Date(completedAt);
      if (traces.length) {
        await tx.insert(workflowEvent).values(
          traces.map((trace) => ({
            id: `${workflowId}:${trace.sequence}`,
            workflowId,
            sequence: trace.sequence,
            agent: trace.agent,
            status: trace.status,
            durationMs: trace.durationMs,
            output: trace.output ?? null,
            errorCode: trace.errorCode ?? null,
            occurredAt,
          })),
        );
      }
      const [completed] = await tx
        .update(workflowRun)
        .set({ status, completedAt: occurredAt })
        .where(and(eq(workflowRun.id, workflowId), eq(workflowRun.status, "RUNNING")))
        .returning();
      if (!completed) throw new Error("Workflow completion conflict");
      const events = await tx
        .select()
        .from(workflowEvent)
        .where(eq(workflowEvent.workflowId, workflowId))
        .orderBy(asc(workflowEvent.sequence));
      return freezeWorkflow(completed, events);
    });
  }
}
