import { beforeEach, describe, expect, it, vi } from "vitest";

const processEvent = vi.hoisted(() => vi.fn());

vi.mock("@reins/db", () => ({
  getDatabase: vi.fn(),
  PostgresEvidenceStore: class {},
  PostgresStripeExecutionStore: class {},
}));
vi.mock("@/lib/stripe-webhook", () => ({ processStripeWebhook: processEvent }));

import { POST } from "./route";

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("STRIPE_MODE", "test");
    vi.stubEnv("STRIPE_SECRET_KEY", "rk_test_example");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_example");
  });

  it("rejects a request with no Stripe signature", async () => {
    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", { method: "POST", body: "{}" }),
    );

    expect(response.status).toBe(400);
    expect(processEvent).not.toHaveBeenCalled();
  });

  it("acknowledges a verified applied event", async () => {
    processEvent.mockResolvedValue({ disposition: "APPLIED" });

    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "test-signature" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true, disposition: "APPLIED" });
  });

  it("returns bad request without persisting an invalid signature", async () => {
    processEvent.mockRejectedValue(new Error("Stripe webhook signature verification failed"));

    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "bad-signature" },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid Stripe webhook signature" });
  });
});
