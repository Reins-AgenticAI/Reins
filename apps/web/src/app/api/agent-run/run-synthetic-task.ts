import { createHash, randomUUID } from "node:crypto";
import {
  evaluateSpendDecision,
  type FinanceTask,
  type LocalModelClient,
  requiresComplianceVendorReview,
  runLocalAgentWorkflow,
} from "@reins/assurance";
import {
  type Database,
  getDatabase,
  PostgresDecisionStore,
  PostgresEvidenceStore,
  PostgresWorkflowStore,
  releaseBudgetReservationInDatabase,
  reserveBudgetInDatabase,
  schema,
} from "@reins/db";
import { createAdvisoryClient } from "@/lib/advisory-client";

export const syntheticOrganizationId = "org-m2-demo";
export const syntheticBudgetId = "budget-synthetic-shared";

export function validTask(value: unknown): value is FinanceTask {
  if (!value || typeof value !== "object") return false;
  const task = value as Record<string, unknown>;
  return (
    ["requestId", "title", "agent", "vendor", "category", "currency", "costCenter"].every(
      (key) => typeof task[key] === "string" && task[key].trim().length > 0,
    ) &&
    Number.isSafeInteger(task.amountMinor) &&
    Number(task.amountMinor) > 0
  );
}

type Dependencies = {
  database?: Database;
  advisoryClient?: LocalModelClient;
  organizationId?: string;
  budgetId?: string;
};

export async function runSyntheticTask(
  input: FinanceTask & { idempotencyKey?: string },
  dependencies: Dependencies = {},
) {
  if (!validTask(input)) throw new Error("Invalid synthetic finance task");
  const result = await runLocalAgentWorkflow(
    input,
    dependencies.advisoryClient ?? createAdvisoryClient(),
  );
  const database = dependencies.database ?? getDatabase();
  const organizationId = dependencies.organizationId ?? syntheticOrganizationId;
  const budgetId = dependencies.budgetId ?? syntheticBudgetId;
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
  const workflowRequest = {
    requestId: input.requestId,
    title: input.title,
    requestingAgent: input.agent,
    vendor: input.vendor,
    category: input.category,
    amountMinor: input.amountMinor,
    currency: input.currency,
    costCenter: input.costCenter,
  };
  const requestHash = createHash("sha256").update(JSON.stringify(workflowRequest)).digest("hex");
  const idempotencyKey = input.idempotencyKey ?? input.requestId;
  const begun = await store.begin({
    workflowId: randomUUID(),
    organizationId,
    idempotencyKey,
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
    return {
      ...result,
      decision: receipt.decision,
      reason: receipt.reasonCodes.length ? receipt.reasonCodes.join(", ") : result.reason,
      workflowId: begun.workflow.workflowId,
      receiptId: receipt.id,
      synthetic: true as const,
    };
  }
  const reservation = await reserveBudgetInDatabase(database, {
    id: randomUUID(),
    organizationId,
    budgetId,
    idempotencyKey,
    requestHash: begun.workflow.requestHash,
    amountMinor: input.amountMinor,
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
  const complianceReview = requiresComplianceVendorReview(input);
  // The category-scoped policy admits a new AML vendor only to mandatory human review.
  // The existing evaluator still owns every hard denial, including reservation conflicts.
  const receipt = evaluateSpendDecision({
    request: {
      requestHash: completed.requestHash,
      amountMinor: input.amountMinor,
      currency: input.currency,
      merchant: input.vendor,
    },
    policy: {
      versionId: complianceReview ? "policy-local-compliance-v1" : "policy-local-v1",
      digest: complianceReview ? "policy-local-compliance-v1" : "policy-local-v1",
      currency: "USD",
      perTransactionLimitMinor: 10_000_000,
      approvalThresholdMinor: complianceReview ? 1 : 1_000_000,
      allowedMerchants: complianceReview ? [input.vendor.trim().toLowerCase()] : ["datacore"],
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
        amountMinor: input.amountMinor,
        currency: input.currency,
        source: "POLICY",
        occurredAt: new Date().toISOString(),
      },
    });
  }
  return {
    ...result,
    decision: receipt.decision,
    reason: receipt.reasonCodes.length ? receipt.reasonCodes.join(", ") : result.reason,
    workflowId: completed.workflowId,
    receiptId: savedReceipt.id,
    synthetic: true as const,
  };
}
