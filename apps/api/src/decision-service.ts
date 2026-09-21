import { randomUUID } from "node:crypto";
import {
  type ApprovalRecord,
  createApprovalRequest,
  type DecisionInput,
  type DecisionReceipt,
  evaluateSpendDecision,
} from "@reins/assurance";

export type DecisionCommand = Readonly<{
  organizationId: string;
  workflowId: string;
  input: Omit<DecisionInput, "approval"> & Readonly<{ approvalId?: string }>;
}>;

export type CreateApprovalCommand = Readonly<{
  organizationId: string;
  workflowId: string;
  requestHash: string;
  policyVersionId: string;
  requestedAt: string;
  expiresAt: string;
}>;

type DecisionStore = Readonly<{
  getApproval(id: string, organizationId: string, workflowId: string): Promise<ApprovalRecord>;
  createApproval(
    input: Readonly<{ organizationId: string; workflowId: string; approval: ApprovalRecord }>,
  ): Promise<ApprovalRecord>;
  resolveApproval(
    id: string,
    input: Readonly<{ outcome: "APPROVED" | "REJECTED"; approverId: string; decidedAt: string }>,
  ): Promise<ApprovalRecord>;
  saveReceipt(
    input: Readonly<{
      id: string;
      organizationId: string;
      workflowId: string;
      receipt: DecisionReceipt;
    }>,
  ): Promise<DecisionReceipt>;
}>;

export function createDecisionService(
  options: Readonly<{ store: DecisionStore; createId?: () => string }>,
) {
  const createId = options.createId ?? randomUUID;
  return Object.freeze({
    async runDecision(command: DecisionCommand) {
      const { approvalId, ...input } = command.input;
      const approval = approvalId
        ? await options.store.getApproval(approvalId, command.organizationId, command.workflowId)
        : undefined;
      const receipt = evaluateSpendDecision({ ...input, ...(approval ? { approval } : {}) });
      return await options.store.saveReceipt({
        id: createId(),
        organizationId: command.organizationId,
        workflowId: command.workflowId,
        receipt,
      });
    },
    async createApproval(command: CreateApprovalCommand) {
      const approval = createApprovalRequest({ id: createId(), ...command });
      return await options.store.createApproval({
        organizationId: command.organizationId,
        workflowId: command.workflowId,
        approval,
      });
    },
    async resolveApproval(
      approvalId: string,
      input: Readonly<{ outcome: "APPROVED" | "REJECTED"; approverId: string; decidedAt: string }>,
    ) {
      return await options.store.resolveApproval(approvalId, input);
    },
  });
}
