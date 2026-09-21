import { createHash } from "node:crypto";

export type SpendDecision = "ALLOW" | "ESCALATE" | "DENY";
export type DecisionReasonCode =
  | "CURRENCY_MISMATCH"
  | "MERCHANT_NOT_ALLOWED"
  | "PER_TRANSACTION_LIMIT_EXCEEDED"
  | "BUDGET_CONFLICT"
  | "REQUEST_MUTATED"
  | "APPROVAL_REJECTED"
  | "POLICY_STALE"
  | "CONTEXT_INCOMPLETE"
  | "APPROVAL_REQUIRED"
  | "APPROVAL_EXPIRED"
  | "APPROVAL_INVALIDATED";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";

export type ApprovalRecord = Readonly<{
  id: string;
  requestHash: string;
  policyVersionId: string;
  status: ApprovalStatus;
  requestedAt: string;
  expiresAt: string;
  approverId?: string;
  decidedAt?: string;
}>;

export type DecisionInput = Readonly<{
  request: Readonly<{
    requestHash: string;
    amountMinor: number;
    currency: string;
    merchant: string;
  }>;
  policy: Readonly<{
    versionId: string;
    digest: string;
    currency: string;
    perTransactionLimitMinor: number;
    approvalThresholdMinor: number;
    allowedMerchants: readonly string[];
    validUntil: string;
  }>;
  reservation: Readonly<{
    id: string;
    requestHash: string;
    state: "HELD" | "CONFLICT" | "MISSING";
  }>;
  contextComplete: boolean;
  approval?: ApprovalRecord;
  evaluatedAt: string;
}>;

export type DecisionReceipt = Readonly<{
  decision: SpendDecision;
  reasonCodes: readonly DecisionReasonCode[];
  requestHash: string;
  policyVersionId: string;
  policyDigest: string;
  evaluatorVersion: "1";
  reservationId: string;
  approvalId?: string;
  evaluatedAt: string;
  digest: string;
}>;

const evaluatorVersion = "1" as const;

function requireText(value: string, label: string) {
  if (!value.trim()) throw new Error(`${label} is required`);
}

function asDate(value: string, label: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} must be a valid ISO date`);
  return date;
}

function freezeApproval(approval: ApprovalRecord): ApprovalRecord {
  return Object.freeze({ ...approval });
}

export function createApprovalRequest(
  input: Readonly<{
    id: string;
    requestHash: string;
    policyVersionId: string;
    requestedAt: string;
    expiresAt: string;
  }>,
): ApprovalRecord {
  requireText(input.id, "Approval id");
  requireText(input.requestHash, "Request hash");
  requireText(input.policyVersionId, "Policy version");
  const requestedAt = asDate(input.requestedAt, "Requested at");
  const expiresAt = asDate(input.expiresAt, "Approval expiry");
  if (expiresAt <= requestedAt) throw new Error("Approval expiry must be after request time");
  return freezeApproval({ ...input, status: "PENDING" });
}

export function resolveApproval(
  approval: ApprovalRecord,
  input: Readonly<{ outcome: "APPROVED" | "REJECTED"; approverId: string; decidedAt: string }>,
): ApprovalRecord {
  if (approval.status !== "PENDING") throw new Error("Only pending approvals can be resolved");
  requireText(input.approverId, "Approver identity");
  const decidedAt = asDate(input.decidedAt, "Approval decision time");
  if (decidedAt >= asDate(approval.expiresAt, "Approval expiry")) {
    return freezeApproval({ ...approval, status: "EXPIRED" });
  }
  return freezeApproval({
    ...approval,
    status: input.outcome,
    approverId: input.approverId.trim(),
    decidedAt: decidedAt.toISOString(),
  });
}

function isValidApproval(input: DecisionInput, evaluatedAt: Date): boolean {
  const approval = input.approval;
  return Boolean(
    approval &&
      approval.status === "APPROVED" &&
      approval.approverId &&
      approval.decidedAt &&
      approval.requestHash === input.request.requestHash &&
      approval.policyVersionId === input.policy.versionId &&
      asDate(approval.expiresAt, "Approval expiry") > evaluatedAt,
  );
}

function validateDecisionInput(input: DecisionInput) {
  for (const value of [
    input.request.amountMinor,
    input.policy.perTransactionLimitMinor,
    input.policy.approvalThresholdMinor,
  ]) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error("Decision amounts must use positive integer minor units");
    }
  }
  if (input.policy.approvalThresholdMinor > input.policy.perTransactionLimitMinor) {
    throw new Error("Approval threshold cannot exceed transaction limit");
  }
  for (const value of [
    input.request.requestHash,
    input.request.merchant,
    input.policy.versionId,
    input.policy.digest,
    input.reservation.id,
    input.reservation.requestHash,
  ]) {
    requireText(value, "Decision binding field");
  }
  if (!/^[A-Z]{3}$/u.test(input.request.currency) || !/^[A-Z]{3}$/u.test(input.policy.currency)) {
    throw new Error("Decision currencies must be ISO codes");
  }
}

export function evaluateSpendDecision(input: DecisionInput): DecisionReceipt {
  validateDecisionInput(input);
  const evaluatedAt = asDate(input.evaluatedAt, "Evaluation time");
  const hardReasons: DecisionReasonCode[] = [];
  const softReasons: DecisionReasonCode[] = [];
  const merchant = input.request.merchant.trim().toLowerCase();

  if (input.request.currency !== input.policy.currency) hardReasons.push("CURRENCY_MISMATCH");
  if (!input.policy.allowedMerchants.includes(merchant)) hardReasons.push("MERCHANT_NOT_ALLOWED");
  if (input.request.amountMinor > input.policy.perTransactionLimitMinor) {
    hardReasons.push("PER_TRANSACTION_LIMIT_EXCEEDED");
  }
  if (input.reservation.state !== "HELD") hardReasons.push("BUDGET_CONFLICT");
  if (input.reservation.requestHash !== input.request.requestHash)
    hardReasons.push("REQUEST_MUTATED");
  if (input.approval?.status === "REJECTED") hardReasons.push("APPROVAL_REJECTED");
  if (evaluatedAt >= asDate(input.policy.validUntil, "Policy validity"))
    softReasons.push("POLICY_STALE");
  if (!input.contextComplete) softReasons.push("CONTEXT_INCOMPLETE");

  let decision: SpendDecision;
  let reasonCodes: DecisionReasonCode[];
  if (hardReasons.length) {
    decision = "DENY";
    reasonCodes = [...hardReasons, ...softReasons];
  } else if (softReasons.length) {
    decision = "ESCALATE";
    reasonCodes = softReasons;
  } else if (input.request.amountMinor >= input.policy.approvalThresholdMinor) {
    decision = isValidApproval(input, evaluatedAt) ? "ALLOW" : "ESCALATE";
    const approval = input.approval;
    reasonCodes =
      decision === "ALLOW"
        ? []
        : approval?.status === "EXPIRED" ||
            (approval && asDate(approval.expiresAt, "Approval expiry") <= evaluatedAt)
          ? ["APPROVAL_EXPIRED"]
          : approval &&
              (approval.requestHash !== input.request.requestHash ||
                approval.policyVersionId !== input.policy.versionId)
            ? ["APPROVAL_INVALIDATED"]
            : ["APPROVAL_REQUIRED"];
  } else {
    decision = "ALLOW";
    reasonCodes = [];
  }

  const receipt = {
    decision,
    reasonCodes: Object.freeze(reasonCodes),
    requestHash: input.request.requestHash,
    policyVersionId: input.policy.versionId,
    policyDigest: input.policy.digest,
    evaluatorVersion,
    reservationId: input.reservation.id,
    ...(input.approval ? { approvalId: input.approval.id } : {}),
    evaluatedAt: evaluatedAt.toISOString(),
  };
  return Object.freeze({
    ...receipt,
    digest: createHash("sha256").update(JSON.stringify(receipt)).digest("hex"),
  });
}
