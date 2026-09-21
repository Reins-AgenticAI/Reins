import {
  type ApprovalRecord,
  createApprovalRequest,
  type DecisionReceipt,
  resolveApproval,
} from "@reins/assurance";
import { and, eq } from "drizzle-orm";
import type { Database } from "./index";
import { decisionReceipt, humanApproval, workflowRun } from "./schema";

type SavedReceipt = Readonly<
  { id: string; workflowId: string; organizationId: string } & DecisionReceipt
>;

function toApproval(row: typeof humanApproval.$inferSelect): ApprovalRecord {
  return Object.freeze({
    id: row.id,
    requestHash: row.requestHash,
    policyVersionId: row.policyVersionId,
    status: row.status,
    requestedAt: row.requestedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    ...(row.approverId ? { approverId: row.approverId } : {}),
    ...(row.decidedAt ? { decidedAt: row.decidedAt.toISOString() } : {}),
  });
}

async function requireWorkflow(
  database: Database,
  organizationId: string,
  workflowId: string,
  requestHash: string,
) {
  const [workflow] = await database
    .select({ id: workflowRun.id, requestHash: workflowRun.requestHash })
    .from(workflowRun)
    .where(and(eq(workflowRun.id, workflowId), eq(workflowRun.organizationId, organizationId)))
    .limit(1);
  if (!workflow) throw new Error("Workflow not found for organization");
  if (workflow.requestHash !== requestHash)
    throw new Error("Decision request hash does not match workflow");
}

export class PostgresDecisionStore {
  constructor(private readonly database: Database) {}

  async findReceiptByWorkflow(organizationId: string, workflowId: string) {
    const [receipt] = await this.database
      .select({ id: decisionReceipt.id })
      .from(decisionReceipt)
      .where(
        and(
          eq(decisionReceipt.organizationId, organizationId),
          eq(decisionReceipt.workflowId, workflowId),
        ),
      )
      .limit(1);
    return receipt;
  }

  async createApproval(
    input: Readonly<{ organizationId: string; workflowId: string; approval: ApprovalRecord }>,
  ) {
    await requireWorkflow(
      this.database,
      input.organizationId,
      input.workflowId,
      input.approval.requestHash,
    );
    const [created] = await this.database
      .insert(humanApproval)
      .values({
        id: input.approval.id,
        organizationId: input.organizationId,
        workflowId: input.workflowId,
        requestHash: input.approval.requestHash,
        policyVersionId: input.approval.policyVersionId,
        status: input.approval.status,
        requestedAt: new Date(input.approval.requestedAt),
        expiresAt: new Date(input.approval.expiresAt),
      })
      .returning();
    if (!created) throw new Error("Approval was not created");
    return toApproval(created);
  }

  async getApproval(id: string, organizationId?: string, workflowId?: string) {
    const [approval] = await this.database
      .select()
      .from(humanApproval)
      .where(
        and(
          eq(humanApproval.id, id),
          ...(organizationId ? [eq(humanApproval.organizationId, organizationId)] : []),
          ...(workflowId ? [eq(humanApproval.workflowId, workflowId)] : []),
        ),
      )
      .limit(1);
    if (!approval) throw new Error("Approval not found");
    return toApproval(approval);
  }

  async resolveApproval(
    id: string,
    input: Readonly<{ outcome: "APPROVED" | "REJECTED"; approverId: string; decidedAt: string }>,
  ) {
    return this.database.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(humanApproval)
        .where(eq(humanApproval.id, id))
        .limit(1);
      if (!current) throw new Error("Approval not found");
      const resolved = resolveApproval(toApproval(current), input);
      const [updated] = await tx
        .update(humanApproval)
        .set({
          status: resolved.status,
          approverId: resolved.approverId ?? null,
          decidedAt: resolved.decidedAt ? new Date(resolved.decidedAt) : null,
        })
        .where(and(eq(humanApproval.id, id), eq(humanApproval.status, "PENDING")))
        .returning();
      if (!updated) throw new Error("Approval resolution conflict");
      return toApproval(updated);
    });
  }

  async saveReceipt(
    input: Readonly<{
      id: string;
      organizationId: string;
      workflowId: string;
      receipt: DecisionReceipt;
    }>,
  ): Promise<SavedReceipt> {
    await requireWorkflow(
      this.database,
      input.organizationId,
      input.workflowId,
      input.receipt.requestHash,
    );
    if (input.receipt.approvalId) {
      await this.getApproval(input.receipt.approvalId, input.organizationId, input.workflowId);
    }
    const [created] = await this.database
      .insert(decisionReceipt)
      .values({
        id: input.id,
        organizationId: input.organizationId,
        workflowId: input.workflowId,
        requestHash: input.receipt.requestHash,
        policyVersionId: input.receipt.policyVersionId,
        policyDigest: input.receipt.policyDigest,
        evaluatorVersion: input.receipt.evaluatorVersion,
        reservationId: input.receipt.reservationId,
        approvalId: input.receipt.approvalId ?? null,
        decision: input.receipt.decision,
        reasonCodes: input.receipt.reasonCodes,
        digest: input.receipt.digest,
        decidedAt: new Date(input.receipt.evaluatedAt),
      })
      .returning();
    if (!created) throw new Error("Decision receipt was not created");
    return Object.freeze({
      id: created.id,
      workflowId: created.workflowId,
      organizationId: created.organizationId,
      ...input.receipt,
    });
  }
}
