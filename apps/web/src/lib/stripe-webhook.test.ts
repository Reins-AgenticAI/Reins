import Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import { processStripeWebhook } from "./stripe-webhook";

const secret = "whsec_test_secret";
const stripe = new Stripe("rk_test_example");
const execution = {
  id: "execution-1",
  organizationId: "org-m2-demo",
  workflowId: "workflow-1",
  receiptId: "receipt-1",
  requestHash: "request-hash-1",
  amountMinor: 480_000,
  currency: "USD",
};

function signedEvent(overrides: Record<string, unknown> = {}) {
  const payload = JSON.stringify({
    id: "evt_test_123",
    type: "payment_intent.succeeded",
    data: {
      object: {
        id: "pi_test_123",
        amount: 480_000,
        currency: "usd",
        metadata: {
          reins_receipt_id: "receipt-1",
          reins_request_hash: "request-hash-1",
          reins_workflow_id: "workflow-1",
        },
      },
    },
    created: 1_790_000_000,
    ...overrides,
  });
  return {
    payload,
    signature: stripe.webhooks.generateTestHeaderString({ payload, secret }),
  };
}

function dependencies(overrides: Partial<Parameters<typeof processStripeWebhook>[2]> = {}) {
  return {
    organizationId: "org-m2-demo",
    webhookSecret: secret,
    constructEvent: (payload: string, signature: string, signingSecret: string) =>
      stripe.webhooks.constructEvent(payload, signature, signingSecret),
    findExecutionByIntent: vi.fn().mockResolvedValue(execution),
    recordWebhookReceipt: vi.fn().mockImplementation(async (input) => ({
      disposition: input.disposition,
    })),
    appendEvidence: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("processStripeWebhook", () => {
  it("rejects an invalid signature before recording evidence", async () => {
    const deps = dependencies();

    await expect(
      processStripeWebhook(signedEvent().payload, "bad-signature", deps),
    ).rejects.toThrow("Stripe webhook signature verification failed");
    expect(deps.recordWebhookReceipt).not.toHaveBeenCalled();
    expect(deps.appendEvidence).not.toHaveBeenCalled();
  });

  it("maps a verified settled intent to one normalized provider event", async () => {
    const deps = dependencies();
    const event = signedEvent();

    await expect(processStripeWebhook(event.payload, event.signature, deps)).resolves.toEqual({
      disposition: "APPLIED",
    });
    expect(deps.appendEvidence).toHaveBeenCalledWith({
      organizationId: "org-m2-demo",
      workflowId: "workflow-1",
      event: expect.objectContaining({
        id: "evt_test_123",
        kind: "SETTLEMENT",
        source: "PROVIDER",
        parentId: "stripe:intent:pi_test_123",
      }),
    });
  });

  it("does not append duplicate, unknown, or mismatched events", async () => {
    const duplicate = dependencies({
      recordWebhookReceipt: vi.fn().mockResolvedValue({ disposition: "DUPLICATE" }),
    });
    const valid = signedEvent();
    await expect(processStripeWebhook(valid.payload, valid.signature, duplicate)).resolves.toEqual({
      disposition: "DUPLICATE",
    });
    expect(duplicate.appendEvidence).not.toHaveBeenCalled();

    const unknown = dependencies();
    const ignored = signedEvent({ type: "customer.created" });
    await expect(
      processStripeWebhook(ignored.payload, ignored.signature, unknown),
    ).resolves.toEqual({
      disposition: "IGNORED",
    });
    expect(unknown.appendEvidence).not.toHaveBeenCalled();

    const mismatch = dependencies();
    const wrongAmount = signedEvent({
      data: {
        object: {
          id: "pi_test_123",
          amount: 1,
          currency: "usd",
          metadata: {
            reins_receipt_id: "receipt-1",
            reins_request_hash: "request-hash-1",
            reins_workflow_id: "workflow-1",
          },
        },
      },
    });
    await expect(
      processStripeWebhook(wrongAmount.payload, wrongAmount.signature, mismatch),
    ).resolves.toEqual({
      disposition: "UNVERIFIED",
    });
    expect(mismatch.appendEvidence).not.toHaveBeenCalled();
  });
});
