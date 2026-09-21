import type { ReconciliationEvent } from "@reins/assurance";
import type Stripe from "stripe";

type StripeExecution = Readonly<{
  id: string;
  organizationId: string;
  workflowId: string;
  receiptId: string;
  requestHash: string;
  amountMinor: number;
  currency: string;
}>;

type Dependencies = Readonly<{
  organizationId: string;
  webhookSecret: string;
  constructEvent(payload: string, signature: string, secret: string): Stripe.Event;
  findExecutionByIntent(paymentIntentId: string): Promise<StripeExecution | undefined>;
  recordWebhookReceipt(
    input: Readonly<{
      organizationId: string;
      stripeEventId: string;
      eventType: string;
      executionId?: string;
      disposition: "APPLIED" | "IGNORED" | "UNVERIFIED";
    }>,
  ): Promise<Readonly<{ disposition: "APPLIED" | "IGNORED" | "UNVERIFIED" | "DUPLICATE" }>>;
  appendEvidence(
    input: Readonly<{ organizationId: string; workflowId: string; event: ReconciliationEvent }>,
  ): Promise<unknown>;
}>;

const kindByType: Readonly<Record<string, ReconciliationEvent["kind"]>> = {
  "payment_intent.amount_capturable_updated": "AUTHORIZATION",
  "payment_intent.succeeded": "SETTLEMENT",
  "payment_intent.payment_failed": "REVERSAL",
  "payment_intent.canceled": "REVERSAL",
};

function asPaymentIntent(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const intent = value as Record<string, unknown>;
  if (
    typeof intent.id !== "string" ||
    !Number.isSafeInteger(intent.amount) ||
    typeof intent.currency !== "string" ||
    !intent.metadata ||
    typeof intent.metadata !== "object"
  )
    return undefined;
  const metadata = intent.metadata as Record<string, unknown>;
  if (
    typeof metadata.reins_receipt_id !== "string" ||
    typeof metadata.reins_request_hash !== "string" ||
    typeof metadata.reins_workflow_id !== "string"
  )
    return undefined;
  return Object.freeze({
    id: intent.id,
    amountMinor: intent.amount,
    currency: intent.currency.toUpperCase(),
    receiptId: metadata.reins_receipt_id,
    requestHash: metadata.reins_request_hash,
    workflowId: metadata.reins_workflow_id,
  });
}

function eventTime(event: Stripe.Event): string {
  if (!Number.isSafeInteger(event.created)) throw new Error("Stripe event timestamp is invalid");
  return new Date(event.created * 1_000).toISOString();
}

export async function processStripeWebhook(
  payload: string,
  signature: string,
  dependencies: Dependencies,
) {
  let event: Stripe.Event;
  try {
    event = dependencies.constructEvent(payload, signature, dependencies.webhookSecret);
  } catch {
    throw new Error("Stripe webhook signature verification failed");
  }
  const kind = kindByType[event.type];
  if (!kind)
    return dependencies.recordWebhookReceipt({
      organizationId: dependencies.organizationId,
      stripeEventId: event.id,
      eventType: event.type,
      disposition: "IGNORED",
    });
  const intent = asPaymentIntent(event.data.object);
  if (!intent) {
    return dependencies.recordWebhookReceipt({
      organizationId: dependencies.organizationId,
      stripeEventId: event.id,
      eventType: event.type,
      disposition: "UNVERIFIED",
    });
  }
  const execution = await dependencies.findExecutionByIntent(intent.id);
  if (
    !execution ||
    execution.organizationId !== dependencies.organizationId ||
    execution.workflowId !== intent.workflowId ||
    execution.receiptId !== intent.receiptId ||
    execution.requestHash !== intent.requestHash ||
    execution.amountMinor !== intent.amountMinor ||
    execution.currency !== intent.currency
  ) {
    return dependencies.recordWebhookReceipt({
      organizationId: dependencies.organizationId,
      stripeEventId: event.id,
      eventType: event.type,
      ...(execution ? { executionId: execution.id } : {}),
      disposition: "UNVERIFIED",
    });
  }
  const receipt = await dependencies.recordWebhookReceipt({
    organizationId: dependencies.organizationId,
    stripeEventId: event.id,
    eventType: event.type,
    executionId: execution.id,
    disposition: "APPLIED",
  });
  if (receipt.disposition !== "APPLIED") return receipt;
  await dependencies.appendEvidence({
    organizationId: execution.organizationId,
    workflowId: execution.workflowId,
    event: {
      id: event.id,
      kind,
      amountMinor: intent.amountMinor,
      currency: intent.currency,
      source: "PROVIDER",
      occurredAt: eventTime(event),
      parentId:
        kind === "AUTHORIZATION" ? `auth-${execution.workflowId}` : `stripe:intent:${intent.id}`,
    },
  });
  return receipt;
}
