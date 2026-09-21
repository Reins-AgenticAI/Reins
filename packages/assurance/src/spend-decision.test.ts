import { describe, expect, it } from "vitest";
import {
  createApprovalRequest,
  type DecisionInput,
  evaluateSpendDecision,
  resolveApproval,
} from "./spend-decision";

const input: DecisionInput = {
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
};

describe("deterministic spend decisions", () => {
  it("denies the most restrictive policy violations and records stable binding fields", () => {
    const receipt = evaluateSpendDecision({
      ...input,
      request: { ...input.request, currency: "EUR", merchant: "unlisted", amountMinor: 6_000_000 },
    });

    expect(receipt.decision).toBe("DENY");
    expect(receipt.reasonCodes).toEqual([
      "CURRENCY_MISMATCH",
      "MERCHANT_NOT_ALLOWED",
      "PER_TRANSACTION_LIMIT_EXCEEDED",
    ]);
    expect(receipt).toMatchObject({
      requestHash: "request-v1",
      policyVersionId: "policy-v3",
      policyDigest: "policy-digest-v3",
      evaluatorVersion: "1",
      reservationId: "reservation-v1",
    });
  });

  it("never allows stale policy, absent context, budget conflict, or a mutated reservation", () => {
    const receipt = evaluateSpendDecision({
      ...input,
      policy: { ...input.policy, validUntil: "2026-09-20T18:00:00.000Z" },
      reservation: { ...input.reservation, requestHash: "different-request", state: "HELD" },
      contextComplete: false,
    });

    expect(receipt.decision).toBe("DENY");
    expect(receipt.reasonCodes).toEqual(["REQUEST_MUTATED", "POLICY_STALE", "CONTEXT_INCOMPLETE"]);
    expect(
      evaluateSpendDecision({ ...input, reservation: { ...input.reservation, state: "CONFLICT" } }),
    ).toMatchObject({ decision: "DENY", reasonCodes: ["BUDGET_CONFLICT"] });
    expect(evaluateSpendDecision({ ...input, contextComplete: false })).toMatchObject({
      decision: "ESCALATE",
      reasonCodes: ["CONTEXT_INCOMPLETE"],
    });
    expect(
      evaluateSpendDecision({
        ...input,
        request: { ...input.request, amountMinor: 3_000_000 },
      }),
    ).toMatchObject({ decision: "ALLOW", reasonCodes: [] });
  });

  it("requires an explicit, unexpired approval tied to the frozen request and policy version", () => {
    expect(evaluateSpendDecision(input)).toMatchObject({
      decision: "ESCALATE",
      reasonCodes: ["APPROVAL_REQUIRED"],
    });

    const pending = createApprovalRequest({
      id: "approval-v1",
      requestHash: "request-v1",
      policyVersionId: "policy-v3",
      requestedAt: "2026-09-20T18:00:00.000Z",
      expiresAt: "2026-09-20T18:15:00.000Z",
    });
    const approved = resolveApproval(pending, {
      outcome: "APPROVED",
      approverId: "user-finance-1",
      decidedAt: "2026-09-20T18:05:00.000Z",
    });

    expect(evaluateSpendDecision({ ...input, approval: approved })).toMatchObject({
      decision: "ALLOW",
    });
    expect(
      evaluateSpendDecision({
        ...input,
        request: { ...input.request, requestHash: "changed-request" },
        reservation: { ...input.reservation, requestHash: "changed-request" },
        approval: approved,
      }),
    ).toMatchObject({ decision: "ESCALATE", reasonCodes: ["APPROVAL_INVALIDATED"] });
    expect(
      evaluateSpendDecision({
        ...input,
        approval: { ...approved, expiresAt: "2026-09-20T18:00:00.000Z" },
      }),
    ).toMatchObject({ decision: "ESCALATE", reasonCodes: ["APPROVAL_EXPIRED"] });
    expect(
      evaluateSpendDecision({
        ...input,
        approval: { ...approved, status: "REJECTED" },
      }),
    ).toMatchObject({ decision: "DENY", reasonCodes: ["APPROVAL_REJECTED"] });
  });

  it("rejects invalid approval transitions and expires a late response", () => {
    expect(() =>
      createApprovalRequest({
        id: " ",
        requestHash: "request-v1",
        policyVersionId: "policy-v3",
        requestedAt: "2026-09-20T18:00:00.000Z",
        expiresAt: "2026-09-20T18:00:00.000Z",
      }),
    ).toThrow("Approval id is required");
    const pending = createApprovalRequest({
      id: "approval-late",
      requestHash: "request-v1",
      policyVersionId: "policy-v3",
      requestedAt: "2026-09-20T18:00:00.000Z",
      expiresAt: "2026-09-20T18:15:00.000Z",
    });
    const expired = resolveApproval(pending, {
      outcome: "APPROVED",
      approverId: "user-finance-1",
      decidedAt: "2026-09-20T18:15:00.000Z",
    });

    expect(expired).toMatchObject({ status: "EXPIRED" });
    expect(() =>
      resolveApproval(expired, {
        outcome: "APPROVED",
        approverId: "user-finance-1",
        decidedAt: "2026-09-20T18:16:00.000Z",
      }),
    ).toThrow("Only pending approvals can be resolved");
  });

  it("rejects malformed monetary policy inputs before they can become an allow", () => {
    expect(() =>
      evaluateSpendDecision({
        ...input,
        request: { ...input.request, amountMinor: 0 },
      }),
    ).toThrow("positive integer minor units");
    expect(() =>
      evaluateSpendDecision({
        ...input,
        policy: { ...input.policy, approvalThresholdMinor: 5_000_001 },
      }),
    ).toThrow("Approval threshold cannot exceed transaction limit");
  });
});
