import Stripe from "stripe";

type Environment = Readonly<Record<string, string | undefined>>;

export type StripeIntentInput = Readonly<{
  receiptId: string;
  workflowId: string;
  requestHash: string;
  amountMinor: number;
  currency: string;
  idempotencyKey: string;
}>;

type StripeClient = Readonly<{
  paymentIntents: Readonly<{
    create: Stripe["paymentIntents"]["create"];
    retrieve: Stripe["paymentIntents"]["retrieve"];
  }>;
}>;

type StripeFactory = (key: string) => StripeClient;

export type StripePaymentProvider = Readonly<{
  createIntent(input: StripeIntentInput): Promise<Readonly<{ id: string; status: string }>>;
  retrieveIntent(
    id: string,
  ): Promise<Readonly<{ id: string; status: string; amount: number; currency: string }>>;
}>;

export class StripeConfigurationError extends Error {}

function requireTestKey(environment: Environment): string {
  if (environment.STRIPE_MODE !== "test")
    throw new StripeConfigurationError("STRIPE_MODE must be test");
  const key = environment.STRIPE_SECRET_KEY;
  if (!key) throw new StripeConfigurationError("STRIPE_SECRET_KEY is required");
  if (!key.startsWith("rk_test_"))
    throw new StripeConfigurationError("STRIPE_SECRET_KEY must be a restricted test key");
  return key;
}

function validateInput(input: StripeIntentInput): void {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0)
    throw new Error("Stripe amount must be a positive integer minor-unit value");
  if (!/^[A-Z]{3}$/.test(input.currency)) throw new Error("Stripe currency must be ISO 4217");
}

function asCreatedIntent(intent: Readonly<{ id: string; status: string }>) {
  if (!intent.id || !intent.status) throw new Error("Stripe returned an incomplete PaymentIntent");
  return Object.freeze({ id: intent.id, status: intent.status });
}

export function createStripePaymentProvider(
  environment: Environment = process.env,
  factory: StripeFactory = (key) => new Stripe(key),
): StripePaymentProvider {
  const client = factory(requireTestKey(environment));
  return Object.freeze({
    async createIntent(input) {
      validateInput(input);
      return asCreatedIntent(
        await client.paymentIntents.create(
          {
            amount: input.amountMinor,
            currency: input.currency.toLowerCase(),
            metadata: {
              reins_receipt_id: input.receiptId,
              reins_request_hash: input.requestHash,
              reins_workflow_id: input.workflowId,
            },
          },
          { idempotencyKey: input.idempotencyKey },
        ),
      );
    },
    async retrieveIntent(id) {
      const intent = await client.paymentIntents.retrieve(id);
      return Object.freeze({
        id: intent.id,
        status: intent.status,
        amount: intent.amount,
        currency: intent.currency,
      });
    },
  });
}
