import type {
  AdvisoryAgentOutput,
  ReconciliationEvent,
  ReconciliationFinding,
  SpendWorkflowRequest,
} from "@reins/assurance";
import { reconcileLifecycle } from "@reins/assurance";
import { and, asc, desc, eq } from "drizzle-orm";
import type { Database } from "./index";
import {
  decisionReceipt,
  humanApproval,
  lifecycleEvent,
  workflowEvent,
  workflowRun,
} from "./schema";

export type Investigation = Readonly<{
  workflow: Readonly<{
    id: string;
    organizationId: string;
    status: string;
    request: SpendWorkflowRequest;
    startedAt: string;
    completedAt?: string;
  }>;
  traces: readonly Readonly<{
    sequence: number;
    agent: string;
    status: string;
    durationMs: number;
    output?: AdvisoryAgentOutput;
    errorCode?: string;
  }>[];
  decision?: Readonly<{
    outcome: string;
    reasonCodes: readonly string[];
    policyVersionId: string;
    reservationId: string;
    decidedAt: string;
    approval?: Readonly<{ status: string; approverId?: string; decidedAt?: string }>;
  }>;
  lifecycle: readonly ReconciliationEvent[];
  findings: readonly ReconciliationFinding[];
}>;

async function requireWorkflow(database: Database, organizationId: string, workflowId: string) {
  const [workflow] = await database
    .select()
    .from(workflowRun)
    .where(and(eq(workflowRun.id, workflowId), eq(workflowRun.organizationId, organizationId)))
    .limit(1);
  if (!workflow) throw new Error("Workflow not found for organization");
  return workflow;
}

function asEvent(row: typeof lifecycleEvent.$inferSelect): ReconciliationEvent {
  return Object.freeze({
    id: row.providerEventId,
    kind: row.kind,
    amountMinor: row.amountMinor,
    currency: row.currency,
    source: row.source,
    occurredAt: row.occurredAt.toISOString(),
    ...(row.parentEventId ? { parentId: row.parentEventId } : {}),
  });
}

export class PostgresEvidenceStore {
  constructor(private readonly database: Database) {}

  async append(
    input: Readonly<{ organizationId: string; workflowId: string; event: ReconciliationEvent }>,
  ) {
    await requireWorkflow(this.database, input.organizationId, input.workflowId);
    const [created] = await this.database
      .insert(lifecycleEvent)
      .values({
        id: `${input.workflowId}:${input.event.id}`,
        organizationId: input.organizationId,
        workflowId: input.workflowId,
        providerEventId: input.event.id,
        kind: input.event.kind,
        amountMinor: input.event.amountMinor,
        currency: input.event.currency,
        source: input.event.source,
        occurredAt: new Date(input.event.occurredAt),
        parentEventId: input.event.parentId ?? null,
      })
      .onConflictDoNothing()
      .returning();
    if (!created) return input.event;
    return asEvent(created);
  }

  async findLatest(
    input: Readonly<{ organizationId: string }>,
  ): Promise<Investigation | undefined> {
    const [workflow] = await this.database
      .select({ id: workflowRun.id })
      .from(workflowRun)
      .where(eq(workflowRun.organizationId, input.organizationId))
      .orderBy(desc(workflowRun.startedAt))
      .limit(1);
    return workflow
      ? this.getInvestigation({ organizationId: input.organizationId, workflowId: workflow.id })
      : undefined;
  }

  async getInvestigation(
    input: Readonly<{ organizationId: string; workflowId: string }>,
  ): Promise<Investigation> {
    const workflow = await requireWorkflow(this.database, input.organizationId, input.workflowId);
    const [traces, lifecycle, receipts] = await Promise.all([
      this.database
        .select()
        .from(workflowEvent)
        .where(eq(workflowEvent.workflowId, input.workflowId))
        .orderBy(asc(workflowEvent.sequence)),
      this.database
        .select()
        .from(lifecycleEvent)
        .where(
          and(
            eq(lifecycleEvent.workflowId, input.workflowId),
            eq(lifecycleEvent.organizationId, input.organizationId),
          ),
        )
        .orderBy(asc(lifecycleEvent.occurredAt)),
      this.database
        .select({ receipt: decisionReceipt, approval: humanApproval })
        .from(decisionReceipt)
        .leftJoin(humanApproval, eq(decisionReceipt.approvalId, humanApproval.id))
        .where(
          and(
            eq(decisionReceipt.workflowId, input.workflowId),
            eq(decisionReceipt.organizationId, input.organizationId),
          ),
        )
        .orderBy(desc(decisionReceipt.decidedAt))
        .limit(1),
    ]);
    const events = Object.freeze(lifecycle.map(asEvent));
    const current = receipts[0];
    return Object.freeze({
      workflow: Object.freeze({
        id: workflow.id,
        organizationId: workflow.organizationId,
        status: workflow.status,
        request: Object.freeze({ ...(workflow.request as SpendWorkflowRequest) }),
        startedAt: workflow.startedAt.toISOString(),
        ...(workflow.completedAt ? { completedAt: workflow.completedAt.toISOString() } : {}),
      }),
      traces: Object.freeze(
        traces.map((trace) =>
          Object.freeze({
            sequence: trace.sequence,
            agent: trace.agent,
            status: trace.status,
            durationMs: trace.durationMs,
            ...(trace.output ? { output: trace.output as AdvisoryAgentOutput } : {}),
            ...(trace.errorCode ? { errorCode: trace.errorCode } : {}),
          }),
        ),
      ),
      ...(current
        ? {
            decision: Object.freeze({
              outcome: current.receipt.decision,
              reasonCodes: Object.freeze(current.receipt.reasonCodes as string[]),
              policyVersionId: current.receipt.policyVersionId,
              reservationId: current.receipt.reservationId,
              decidedAt: current.receipt.decidedAt.toISOString(),
              ...(current.approval
                ? {
                    approval: Object.freeze({
                      status: current.approval.status,
                      ...(current.approval.approverId
                        ? { approverId: current.approval.approverId }
                        : {}),
                      ...(current.approval.decidedAt
                        ? { decidedAt: current.approval.decidedAt.toISOString() }
                        : {}),
                    }),
                  }
                : {}),
            }),
          }
        : {}),
      lifecycle: events,
      findings: reconcileLifecycle(events),
    });
  }
}
