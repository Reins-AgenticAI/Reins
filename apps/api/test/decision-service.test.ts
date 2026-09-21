import { type ApprovalRecord, createApprovalRequest, type DecisionReceipt } from "@reins/assurance";
import { describe, expect, it } from "vitest";
import { createDecisionService } from "../src/decision-service.js";

const command = {
  organizationId: "org-finance",
  workflowId: "workflow-SR-2048",
  input: {
    request: {
      requestHash: "request-hash",
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
    reservation: { id: "reservation-v1", requestHash: "request-hash", state: "HELD" as const },
    contextComplete: true,
    evaluatedAt: "2026-09-20T18:00:00.000Z",
  },
};

describe("decision service", () => {
  it("loads the persisted approval before producing and storing an allow receipt", async () => {
    const approval = createApprovalRequest({
      id: "approval-v1",
      requestHash: "request-hash",
      policyVersionId: "policy-v3",
      requestedAt: "2026-09-20T18:00:00.000Z",
      expiresAt: "2026-09-20T18:15:00.000Z",
    });
    const approved: ApprovalRecord = {
      ...approval,
      status: "APPROVED",
      approverId: "user-finance-1",
      decidedAt: "2026-09-20T18:05:00.000Z",
    };
    const saved: DecisionReceipt[] = [];
    const service = createDecisionService({
      store: {
        getApproval: async () => approved,
        saveReceipt: async ({ receipt }) => {
          saved.push(receipt);
          return receipt;
        },
        createApproval: async ({ approval }) => approval,
        resolveApproval: async () => approved,
      },
      createId: () => "decision-v1",
    });

    const receipt = await service.runDecision({
      ...command,
      input: { ...command.input, approvalId: "approval-v1" },
    });
    const pendingReceipt = await service.runDecision(command);
    const created = await service.createApproval({
      organizationId: "org-finance",
      workflowId: "workflow-SR-2048",
      requestHash: "request-hash",
      policyVersionId: "policy-v3",
      requestedAt: "2026-09-20T18:00:00.000Z",
      expiresAt: "2026-09-20T18:15:00.000Z",
    });
    const resolved = await service.resolveApproval("approval-v1", {
      outcome: "APPROVED",
      approverId: "user-finance-1",
      decidedAt: "2026-09-20T18:05:00.000Z",
    });

    expect(receipt).toMatchObject({ decision: "ALLOW", approvalId: "approval-v1" });
    expect(pendingReceipt).toMatchObject({
      decision: "ESCALATE",
      reasonCodes: ["APPROVAL_REQUIRED"],
    });
    expect(saved).toEqual([receipt, pendingReceipt]);
    expect(created.status).toBe("PENDING");
    expect(resolved.status).toBe("APPROVED");

    const defaultIds = createDecisionService({
      store: {
        getApproval: async () => approved,
        saveReceipt: async ({ receipt }) => receipt,
        createApproval: async ({ approval }) => approval,
        resolveApproval: async () => approved,
      },
    });
    await expect(
      defaultIds.createApproval({
        organizationId: "org-finance",
        workflowId: "workflow-SR-2048",
        requestHash: "request-hash",
        policyVersionId: "policy-v3",
        requestedAt: "2026-09-20T18:00:00.000Z",
        expiresAt: "2026-09-20T18:15:00.000Z",
      }),
    ).resolves.toMatchObject({ id: expect.stringMatching(/^[0-9a-f-]{36}$/u) });
  });
});
