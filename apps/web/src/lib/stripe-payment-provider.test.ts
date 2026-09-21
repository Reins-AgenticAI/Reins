import { describe, expect, it, vi } from "vitest";
import { createStripePaymentProvider, StripeConfigurationError } from "./stripe-payment-provider";

const input = {
  receiptId: "receipt-1",
  workflowId: "workflow-1",
  requestHash: "request-hash-1",
  amountMinor: 4_800_000,
  currency: "USD",
  idempotencyKey: "stripe-execution:receipt-1",
};

describe("createStripePaymentProvider", () => {
  it("rejects absent, live, and non-restricted credentials", () => {
    expect(() => createStripePaymentProvider({ STRIPE_MODE: "test" })).toThrow(
      StripeConfigurationError,
    );
    expect(() =>
      createStripePaymentProvider({ STRIPE_MODE: "live", STRIPE_SECRET_KEY: "rk_test_example" }),
    ).toThrow("STRIPE_MODE must be test");
    expect(() =>
      createStripePaymentProvider({ STRIPE_MODE: "test", STRIPE_SECRET_KEY: "sk_test_example" }),
    ).toThrow("restricted test key");
  });

  it("creates an unconfirmed intent with only Reins metadata and an idempotency key", async () => {
    const create = vi
      .fn()
      .mockResolvedValue({ id: "pi_test_123", status: "requires_payment_method" });
    const provider = createStripePaymentProvider(
      { STRIPE_MODE: "test", STRIPE_SECRET_KEY: "rk_test_example" },
      () => ({ paymentIntents: { create, retrieve: vi.fn() } }),
    );

    await expect(provider.createIntent(input)).resolves.toEqual({
      id: "pi_test_123",
      status: "requires_payment_method",
    });
    expect(create).toHaveBeenCalledWith(
      {
        amount: 4_800_000,
        currency: "usd",
        metadata: {
          reins_receipt_id: "receipt-1",
          reins_request_hash: "request-hash-1",
          reins_workflow_id: "workflow-1",
        },
      },
      { idempotencyKey: "stripe-execution:receipt-1" },
    );
  });
});
