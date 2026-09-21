import { randomUUID } from "node:crypto";
import type { SpendWorkflowRequest } from "@reins/assurance";
import { and, eq, sql } from "drizzle-orm";
import type { Database } from "./index";
import {
  budgetReservation,
  decisionReceipt,
  stripeProviderExecution,
  stripeWebhookReceipt,
  workflowRun,
} from "./schema";

export type StripeExecution = Readonly<{
  id: string;
  organizationId: string;
  workflowId: string;
  receiptId: string;
  requestHash: string;
  idempotencyKey: string;
  paymentIntentId?: string;
  amountMinor: number;
  currency: string;
  status: "PENDING" | "CREATED" | "FAILED";
  providerStatus?: string;
  errorCode?: string;
}>;

export type StripeExecutionInput = Readonly<{
  organizationId: string;
  workflowId: string;
  receiptId: string;
  requestHash: string;
  idempotencyKey: string;
  amountMinor: number;
  currency: string;
}>;

type WebhookInput = Readonly<{
  organizationId: string;
  stripeEventId: string;
  eventType: string;
  executionId?: string;
  disposition: "APPLIED" | "IGNORED" | "UNVERIFIED";
}>;

export type StripeExecutionBinding = Readonly<{
  organizationId: string;
  workflowId: string;
  receiptId: string;
  requestHash: string;
  amountMinor: number;
  currency: string;
}>;

function freezeExecution(row: typeof stripeProviderExecution.$inferSelect): StripeExecution {
  return Object.freeze({
    id: row.id,
    organizationId: row.organizationId,
    workflowId: row.workflowId,
    receiptId: row.receiptId,
    requestHash: row.requestHash,
    idempotencyKey: row.executionIdempotencyKey,
    ...(row.stripePaymentIntentId ? { paymentIntentId: row.stripePaymentIntentId } : {}),
    amountMinor: row.amountMinor,
    currency: row.currency,
    status: row.status,
    ...(row.providerStatus ? { providerStatus: row.providerStatus } : {}),
    ...(row.errorCode ? { errorCode: row.errorCode } : {}),
  });
}

export class PostgresStripeExecutionStore {
  constructor(private readonly database: Database) {}

  async beginExecution(input: StripeExecutionInput) {
    return this.database.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`${input.organizationId}:${input.idempotencyKey}`}, 0))`,
      );
      const [existing] = await tx
        .select()
        .from(stripeProviderExecution)
        .where(
          and(
            eq(stripeProviderExecution.organizationId, input.organizationId),
            eq(stripeProviderExecution.executionIdempotencyKey, input.idempotencyKey),
          ),
        )
        .limit(1);
      if (existing) {
        if (
          existing.workflowId !== input.workflowId ||
          existing.receiptId !== input.receiptId ||
          existing.requestHash !== input.requestHash
        )
          throw new Error("Stripe execution idempotency key reused with different binding");
        return Object.freeze({ created: false, execution: freezeExecution(existing) });
      }
      const [bound] = await tx
        .select({ workflowId: workflowRun.id })
        .from(decisionReceipt)
        .innerJoin(workflowRun, eq(decisionReceipt.workflowId, workflowRun.id))
        .where(
          and(
            eq(decisionReceipt.id, input.receiptId),
            eq(decisionReceipt.organizationId, input.organizationId),
            eq(decisionReceipt.workflowId, input.workflowId),
            eq(decisionReceipt.requestHash, input.requestHash),
            eq(decisionReceipt.decision, "ALLOW"),
            eq(workflowRun.organizationId, input.organizationId),
          ),
        )
        .limit(1);
      if (!bound) throw new Error("Stripe execution requires a bound ALLOW receipt");
      const [created] = await tx
        .insert(stripeProviderExecution)
        .values({
          id: randomUUID(),
          organizationId: input.organizationId,
          workflowId: input.workflowId,
          receiptId: input.receiptId,
          requestHash: input.requestHash,
          executionIdempotencyKey: input.idempotencyKey,
          amountMinor: input.amountMinor,
          currency: input.currency,
        })
        .returning();
      if (!created) throw new Error("Stripe execution was not created");
      return Object.freeze({ created: true, execution: freezeExecution(created) });
    });
  }

  async completeExecution(id: string, paymentIntentId: string, status: string) {
    const [updated] = await this.database
      .update(stripeProviderExecution)
      .set({
        stripePaymentIntentId: paymentIntentId,
        status: "CREATED",
        providerStatus: status,
        updatedAt: new Date(),
      })
      .where(and(eq(stripeProviderExecution.id, id), eq(stripeProviderExecution.status, "PENDING")))
      .returning();
    if (updated) return freezeExecution(updated);
    const [existing] = await this.database
      .select()
      .from(stripeProviderExecution)
      .where(eq(stripeProviderExecution.id, id))
      .limit(1);
    if (!existing || existing.stripePaymentIntentId !== paymentIntentId)
      throw new Error("Stripe execution completion conflict");
    return freezeExecution(existing);
  }

  async loadAllowedBinding(organizationId: string, workflowId: string, receiptId: string) {
    const [record] = await this.database
      .select({ receipt: decisionReceipt, workflow: workflowRun })
      .from(decisionReceipt)
      .innerJoin(workflowRun, eq(decisionReceipt.workflowId, workflowRun.id))
      .where(
        and(
          eq(decisionReceipt.id, receiptId),
          eq(decisionReceipt.organizationId, organizationId),
          eq(decisionReceipt.workflowId, workflowId),
          eq(decisionReceipt.decision, "ALLOW"),
          eq(workflowRun.organizationId, organizationId),
        ),
      )
      .limit(1);
    if (!record) return undefined;
    const [reservation] = await this.database
      .select({ id: budgetReservation.id })
      .from(budgetReservation)
      .where(
        and(
          eq(budgetReservation.id, record.receipt.reservationId),
          eq(budgetReservation.organizationId, organizationId),
          eq(budgetReservation.requestHash, record.receipt.requestHash),
          eq(budgetReservation.state, "HELD"),
        ),
      )
      .limit(1);
    if (!reservation) return undefined;
    const request = record.workflow.request as SpendWorkflowRequest;
    if (
      !Number.isSafeInteger(request.amountMinor) ||
      request.amountMinor <= 0 ||
      typeof request.currency !== "string" ||
      !/^[A-Z]{3}$/.test(request.currency)
    )
      return undefined;
    return Object.freeze({
      organizationId,
      workflowId,
      receiptId,
      requestHash: record.receipt.requestHash,
      amountMinor: request.amountMinor,
      currency: request.currency,
    } satisfies StripeExecutionBinding);
  }

  async failExecution(id: string, errorCode: string) {
    const [updated] = await this.database
      .update(stripeProviderExecution)
      .set({ status: "FAILED", errorCode, updatedAt: new Date() })
      .where(and(eq(stripeProviderExecution.id, id), eq(stripeProviderExecution.status, "PENDING")))
      .returning();
    if (!updated) throw new Error("Stripe execution failure conflict");
    return freezeExecution(updated);
  }

  async findExecutionByIntent(paymentIntentId: string) {
    const [row] = await this.database
      .select()
      .from(stripeProviderExecution)
      .where(eq(stripeProviderExecution.stripePaymentIntentId, paymentIntentId))
      .limit(1);
    return row ? freezeExecution(row) : undefined;
  }

  async recordWebhookReceipt(input: WebhookInput) {
    const [created] = await this.database
      .insert(stripeWebhookReceipt)
      .values({ id: randomUUID(), ...input })
      .onConflictDoNothing()
      .returning();
    return Object.freeze({ disposition: created ? input.disposition : ("DUPLICATE" as const) });
  }
}
