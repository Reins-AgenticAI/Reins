import { describe, expect, it, vi } from "vitest";
import { executeStripeTestRequest } from "./stripe-test-execution";

const binding = {
  organizationId: "synthetic-control-room",
  workflowId: "workflow-1",
  receiptId: "receipt-allow",
  requestHash: "request-hash-1",
  amountMinor: 480_000,
  currency: "USD",
};

function dependencies(overrides: Partial<Parameters<typeof executeStripeTestRequest>[1]> = {}) {
  return {
    loadBinding: vi.fn().mockResolvedValue(binding),
    beginExecution: vi.fn().mockResolvedValue({
      created: true,
      execution: { id: "execution-1", ...binding, idempotencyKey: "stripe:receipt-allow" },
    }),
    completeExecution: vi.fn().mockResolvedValue(undefined),
    failExecution: vi.fn().mockResolvedValue(undefined),
    appendEvidence: vi.fn().mockResolvedValue(undefined),
    provider: {
      createIntent: vi.fn().mockResolvedValue({
        id: "pi_test_123",
        status: "requires_payment_method",
      }),
      retrieveIntent: vi.fn(),
    },
    now: () => "2026-09-21T18:05:00.000Z",
    ...overrides,
  };
}

describe("executeStripeTestRequest", () => {
  it("does not call Stripe unless a stored ALLOW binding exists", async () => {
    const deps = dependencies({ loadBinding: vi.fn().mockResolvedValue(undefined) });

    await expect(
      executeStripeTestRequest({ workflowId: "workflow-1", receiptId: "receipt-deny" }, deps),
    ).rejects.toThrow("bound ALLOW receipt");
    expect(deps.provider.createIntent).not.toHaveBeenCalled();
  });

  it("creates one provider intent and evidence record for a new execution", async () => {
    const deps = dependencies();

    await expect(
      executeStripeTestRequest({ workflowId: "workflow-1", receiptId: "receipt-allow" }, deps),
    ).resolves.toEqual({
      executionId: "execution-1",
      paymentIntentId: "pi_test_123",
      providerStatus: "requires_payment_method",
      idempotent: false,
    });
    expect(deps.provider.createIntent).toHaveBeenCalledWith({
      ...binding,
      idempotencyKey: "stripe-execution:receipt-allow",
    });
    expect(deps.appendEvidence).toHaveBeenCalledWith({
      organizationId: binding.organizationId,
      workflowId: binding.workflowId,
      event: {
        id: "stripe:intent:pi_test_123",
        kind: "ORDER",
        amountMinor: 480_000,
        currency: "USD",
        source: "PROVIDER",
        occurredAt: "2026-09-21T18:05:00.000Z",
        parentId: "auth-workflow-1",
      },
    });
  });

  it("returns the persisted execution without a second Stripe call on retry", async () => {
    const deps = dependencies({
      beginExecution: vi.fn().mockResolvedValue({
        created: false,
        execution: {
          id: "execution-1",
          ...binding,
          paymentIntentId: "pi_test_123",
          status: "CREATED",
          providerStatus: "requires_payment_method",
        },
      }),
    });

    await expect(
      executeStripeTestRequest({ workflowId: "workflow-1", receiptId: "receipt-allow" }, deps),
    ).resolves.toMatchObject({
      idempotent: true,
      paymentIntentId: "pi_test_123",
    });
    expect(deps.provider.createIntent).not.toHaveBeenCalled();
    expect(deps.appendEvidence).toHaveBeenCalledOnce();
  });

  it("records missing provider evidence on retry without creating a second intent", async () => {
    const deps = dependencies({
      beginExecution: vi.fn().mockResolvedValue({
        created: false,
        execution: {
          id: "execution-1",
          ...binding,
          paymentIntentId: "pi_test_123",
          status: "CREATED",
          providerStatus: "requires_payment_method",
        },
      }),
    });

    await executeStripeTestRequest({ workflowId: "workflow-1", receiptId: "receipt-allow" }, deps);

    expect(deps.provider.createIntent).not.toHaveBeenCalled();
    expect(deps.appendEvidence).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ id: "stripe:intent:pi_test_123" }),
      }),
    );
  });
});
