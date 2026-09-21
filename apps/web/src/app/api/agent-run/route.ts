import { createHash, randomUUID } from "node:crypto";
import { evaluateSpendDecision, type FinanceTask, runLocalAgentWorkflow } from "@reins/assurance";
import {
  getDatabase,
  PostgresDecisionStore,
  PostgresEvidenceStore,
  PostgresWorkflowStore,
  releaseBudgetReservationInDatabase,
  reserveBudgetInDatabase,
  schema,
} from "@reins/db";
import { createAdvisoryClient } from "@/lib/advisory-client";
import { createWorkflowQueue, WorkflowQueueFullError } from "./workflow-queue";

const workflowQueue = createWorkflowQueue({ maxPending: 1 });
const organizationId = "org-m2-demo";
const budgetId = "budget-synthetic-shared";

function validTask(value: unknown): value is FinanceTask {
  if (!value || typeof value !== "object") return false;
  const task = value as Record<string, unknown>;
  return (
    ["requestId", "title", "agent", "vendor", "category", "currency", "costCenter"].every(
      (key) => typeof task[key] === "string" && task[key].trim().length > 0,
    ) && Number.isSafeInteger(task.amountMinor)
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!validTask(body))
    return Response.json({ error: "Invalid synthetic finance task" }, { status: 400 });
  try {
    const advisoryClient = createAdvisoryClient();
    const result = await workflowQueue.run(() => runLocalAgentWorkflow(body, advisoryClient));
    const database = getDatabase();
    await database
      .insert(schema.organization)
      .values({ id: organizationId, name: "Synthetic Control Room" })
      .onConflictDoNothing();
    await database
      .insert(schema.budget)
      .values({
        id: budgetId,
        organizationId,
        name: "Shared operating budget",
        currency: "USD",
        limitMinor: 50_000_000,
        availableMinor: 50_000_000,
      })
      .onConflictDoNothing();
    const store = new PostgresWorkflowStore(database);
    const workflowRequest = { ...body, requestingAgent: body.agent };
    const requestHash = createHash("sha256")
      .update(
        JSON.stringify({
          requestId: workflowRequest.requestId,
          title: workflowRequest.title,
          requestingAgent: workflowRequest.requestingAgent,
          vendor: workflowRequest.vendor,
          category: workflowRequest.category,
          amountMinor: workflowRequest.amountMinor,
          currency: workflowRequest.currency,
          costCenter: workflowRequest.costCenter,
        }),
      )
      .digest("hex");
    const begun = await store.begin({
      workflowId: randomUUID(),
      organizationId,
      idempotencyKey: body.requestId,
      requestHash,
      request: workflowRequest,
      startedAt: new Date().toISOString(),
    });
    const decisions = new PostgresDecisionStore(database);
    if (!begun.created) {
      const receipt = await decisions.findReceiptByWorkflow(
        organizationId,
        begun.workflow.workflowId,
      );
      if (!receipt) throw new Error("Persisted workflow receipt missing");
      return Response.json({
        ...result,
        workflowId: begun.workflow.workflowId,
        receiptId: receipt.id,
        synthetic: true,
      });
    }
    const reservation = await reserveBudgetInDatabase(database, {
      id: randomUUID(),
      organizationId,
      budgetId,
      idempotencyKey: body.requestId,
      requestHash: begun.workflow.requestHash,
      amountMinor: body.amountMinor,
      expiresAt: new Date(Date.now() + 30 * 60_000),
    });
    const completed = await store.complete(
      begun.workflow.workflowId,
      "COMPLETED",
      result.traces.map((trace, index) => ({
        sequence: index + 1,
        agent: ["INTAKE", "VENDOR_CONTEXT", "BUDGET_ANALYSIS", "EVIDENCE"][index] as
          | "INTAKE"
          | "VENDOR_CONTEXT"
          | "BUDGET_ANALYSIS"
          | "EVIDENCE",
        status: "SUCCEEDED" as const,
        durationMs: trace.durationMs,
        output: { summary: trace.summary, facts: {}, evidenceRefs: [] },
      })),
      new Date().toISOString(),
    );
    const reservationId = "reservationId" in reservation ? reservation.reservationId : randomUUID();
    const receipt = evaluateSpendDecision({
      request: {
        requestHash: completed.requestHash,
        amountMinor: body.amountMinor,
        currency: body.currency,
        merchant: body.vendor,
      },
      policy: {
        versionId: "policy-local-v1",
        digest: "policy-local-v1",
        currency: "USD",
        perTransactionLimitMinor: 10_000_000,
        approvalThresholdMinor: 1_000_000,
        allowedMerchants: ["datacore"],
        validUntil: "2030-01-01T00:00:00.000Z",
      },
      reservation: {
        id: reservationId,
        requestHash: completed.requestHash,
        state: reservation.outcome === "HELD" ? "HELD" : "CONFLICT",
      },
      contextComplete: true,
      evaluatedAt: new Date().toISOString(),
    });
    const savedReceipt = await decisions.saveReceipt({
      id: randomUUID(),
      organizationId,
      workflowId: completed.workflowId,
      receipt,
    });
    if (receipt.decision === "DENY" && reservation.outcome === "HELD") {
      await releaseBudgetReservationInDatabase(database, organizationId, reservationId);
    } else if (receipt.decision !== "DENY") {
      await new PostgresEvidenceStore(database).append({
        organizationId,
        workflowId: completed.workflowId,
        event: {
          id: `auth-${completed.workflowId}`,
          kind: "AUTHORIZATION",
          amountMinor: body.amountMinor,
          currency: body.currency,
          source: "POLICY",
          occurredAt: new Date().toISOString(),
        },
      });
    }
    return Response.json({
      ...result,
      decision: receipt.decision,
      workflowId: completed.workflowId,
      receiptId: savedReceipt.id,
      synthetic: true,
    });
  } catch (error) {
    if (error instanceof WorkflowQueueFullError)
      return Response.json({ error: "Local agent queue is full" }, { status: 429 });
    return Response.json({ error: "AI advisory unavailable" }, { status: 503 });
  }
}
