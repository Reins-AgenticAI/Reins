import { closeDatabase } from "@reins/db";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  process.env.DATABASE_URL = "postgresql://reins:reins_local_only@127.0.0.1:5432/reins_test";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  process.env.BETTER_AUTH_SECRET = "01234567890123456789012345678901";
  vi.resetModules();
});
afterAll(async () => {
  await closeDatabase();
  vi.resetModules();
});

describe("authenticated assurance persistence", () => {
  it("rejects anonymous writes and isolates a saved policy to the authenticated workspace", async () => {
    const { POST: postAssessment } = await import("./route");
    const anonymous = await postAssessment(
      new Request("http://localhost:3000/api/assessments", {
        method: "POST",
        body: "{}",
        headers: { "content-type": "application/json" },
      }),
    );
    expect(anonymous.status).toBe(401);
    const authRoute = await import("../auth/[...all]/route");
    const email = `m2-${crypto.randomUUID()}@example.test`;
    const signup = await authRoute.POST(
      new Request("http://localhost:3000/api/auth/sign-up/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Synthetic Owner",
          email,
          password: "local-only-password-123",
        }),
      }),
    );
    expect(signup.status).toBe(200);
    const signIn = await authRoute.POST(
      new Request("http://localhost:3000/api/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password: "local-only-password-123" }),
      }),
    );
    expect(signIn.status).toBe(200);
    const cookie = signIn.headers.get("set-cookie");
    expect(cookie).toBeTruthy();
    const authenticated = await postAssessment(
      new Request("http://localhost:3000/api/assessments", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: cookie ?? "" },
        body: JSON.stringify({
          name: "Saved market-data policy",
          currency: "USD",
          perTransactionLimitMinor: 10000,
          monthlyBudgetMinor: 50000,
          approvalThresholdMinor: 5000,
          allowedMerchants: ["datacore"],
        }),
      }),
    );
    expect(authenticated.status).toBe(201);
    const body = await authenticated.json();
    expect(body.assessments).toHaveLength(2);
    const evidenceRoute = await import("../evidence/[id]/route");
    const evidence = await evidenceRoute.GET(
      new Request(`http://localhost:3000/api/evidence/${body.evidenceId}`, {
        headers: { cookie: cookie ?? "" },
      }),
      { params: Promise.resolve({ id: body.evidenceId }) },
    );
    expect(evidence.status).toBe(200);
    expect((await evidence.json()).digest).toBe(body.evidence.manifestDigest);
    const missing = await evidenceRoute.GET(
      new Request("http://localhost:3000/api/evidence/not-owned", {
        headers: { cookie: cookie ?? "" },
      }),
      { params: Promise.resolve({ id: "not-owned" }) },
    );
    expect(missing.status).toBe(404);
    const { GET } = await import("./route");
    const listed = await GET(
      new Request("http://localhost:3000/api/assessments", { headers: { cookie: cookie ?? "" } }),
    );
    expect(listed.status).toBe(200);
    expect((await listed.json()).assessments).toHaveLength(1);
  });
});
