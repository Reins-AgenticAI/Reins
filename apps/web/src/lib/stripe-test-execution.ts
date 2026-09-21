import type { ReconciliationEvent } from "@reins/assurance";
import type { StripeExecution, StripeExecutionInput } from "@reins/db";
import type { StripeIntentInput, StripePaymentProvider } from "./stripe-payment-provider";

type Binding = Omit<StripeExecutionInput, "idempotencyKey">;

type Dependencies = Readonly<{
  loadBinding(
    input: Readonly<{ workflowId: string; receiptId: string }>,
  ): Promise<Binding | undefined>;
  beginExecution(
    input: StripeExecutionInput,
  ): Promise<Readonly<{ created: boolean; execution: StripeExecution }>>;
  completeExecution(id: string, paymentIntentId: string, status: string): Promise<unknown>;
  failExecution(id: string, errorCode: string): Promise<unknown>;
  appendEvidence(
    input: Readonly<{ organizationId: string; workflowId: string; event: ReconciliationEvent }>,
  ): Promise<unknown>;
  provider: StripePaymentProvider;
  now(): string;
}>;

async function appendProviderEvidence(
  binding: Binding,
  paymentIntentId: string,
  dependencies: Dependencies,
) {
  await dependencies.appendEvidence({
    organizationId: binding.organizationId,
    workflowId: binding.workflowId,
    event: {
      id: `stripe:intent:${paymentIntentId}`,
      kind: "ORDER",
      amountMinor: binding.amountMinor,
      currency: binding.currency,
      source: "PROVIDER",
      occurredAt: dependencies.now(),
      parentId: `auth-${binding.workflowId}`,
    },
  });
}

export async function executeStripeTestRequest(
  input: Readonly<{ workflowId: string; receiptId: string }>,
  dependencies: Dependencies,
) {
  const binding = await dependencies.loadBinding(input);
  if (!binding) throw new Error("Stripe execution requires a bound ALLOW receipt");
  const idempotencyKey = `stripe-execution:${binding.receiptId}`;
  const begun = await dependencies.beginExecution({ ...binding, idempotencyKey });
  if (!begun.created) {
    if (!begun.execution.paymentIntentId)
      throw new Error("Stripe execution is pending or failed; human review is required");
    await appendProviderEvidence(binding, begun.execution.paymentIntentId, dependencies);
    return Object.freeze({
      executionId: begun.execution.id,
      paymentIntentId: begun.execution.paymentIntentId,
      providerStatus: begun.execution.providerStatus ?? begun.execution.status,
      idempotent: true,
    });
  }
  let intent: Awaited<ReturnType<StripePaymentProvider["createIntent"]>>;
  try {
    intent = await dependencies.provider.createIntent({
      ...binding,
      idempotencyKey,
    } satisfies StripeIntentInput);
  } catch {
    await dependencies.failExecution(begun.execution.id, "PROVIDER_UNAVAILABLE");
    throw new Error("Stripe provider unavailable");
  }
  await dependencies.completeExecution(begun.execution.id, intent.id, intent.status);
  await appendProviderEvidence(binding, intent.id, dependencies);
  return Object.freeze({
    executionId: begun.execution.id,
    paymentIntentId: intent.id,
    providerStatus: intent.status,
    idempotent: false,
  });
}
