import { beforeEach, describe, expect, it, vi } from "vitest";

const run = vi.hoisted(() => vi.fn());

vi.mock("@reins/db", () => ({
  getDatabase: vi.fn(),
  PostgresEvidenceStore: class {},
  PostgresStripeExecutionStore: class {},
}));
vi.mock("@/lib/stripe-payment-provider", () => ({ createStripePaymentProvider: vi.fn() }));
vi.mock("@/lib/stripe-test-execution", () => ({ executeStripeTestRequest: run }));

import { POST } from "./route";

describe("POST /api/provider-executions/stripe-test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("STRIPE_TEST_EXECUTION_ENABLED", "true");
  });

  it("rejects public deployments unless Stripe Sandbox execution is explicitly enabled", async () => {
    vi.stubEnv("STRIPE_TEST_EXECUTION_ENABLED", "false");

    const response = await POST(
      new Request("http://localhost/api/provider-executions/stripe-test", {
        method: "POST",
        body: JSON.stringify({ workflowId: "workflow-1", receiptId: "receipt-allow" }),
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Stripe Sandbox execution is disabled for this deployment",
    });
    expect(run).not.toHaveBeenCalled();
  });

  it("rejects malformed execution requests before reaching Stripe", async () => {
    const response = await POST(
      new Request("http://localhost/api/provider-executions/stripe-test", {
        method: "POST",
        body: "{}",
      }),
    );

    expect(response.status).toBe(400);
    expect(run).not.toHaveBeenCalled();
  });

  it("maps missing ALLOW bindings to a conflict without calling a provider", async () => {
    run.mockRejectedValue(new Error("Stripe execution requires a bound ALLOW receipt"));

    const response = await POST(
      new Request("http://localhost/api/provider-executions/stripe-test", {
        method: "POST",
        body: JSON.stringify({ workflowId: "workflow-1", receiptId: "receipt-deny" }),
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Execution requires a bound ALLOW receipt",
    });
  });

  it("maps a Stripe provider outage to a gateway failure", async () => {
    run.mockRejectedValue(new Error("Stripe provider unavailable"));

    const response = await POST(
      new Request("http://localhost/api/provider-executions/stripe-test", {
        method: "POST",
        body: JSON.stringify({ workflowId: "workflow-1", receiptId: "receipt-allow" }),
      }),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "Stripe test execution failed" });
  });

  it("returns a created provider execution", async () => {
    run.mockResolvedValue({
      executionId: "execution-1",
      paymentIntentId: "pi_test_123",
      providerStatus: "requires_payment_method",
      idempotent: false,
    });

    const response = await POST(
      new Request("http://localhost/api/provider-executions/stripe-test", {
        method: "POST",
        body: JSON.stringify({ workflowId: "workflow-1", receiptId: "receipt-allow" }),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ paymentIntentId: "pi_test_123" });
  });
});
