import { closeDatabase } from "@reins/db";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const originalEnvironment = {
  DATABASE_URL: process.env.DATABASE_URL,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
};

beforeAll(() => {
  process.env.DATABASE_URL = "postgresql://reins:test@127.0.0.1:5432/reins";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  process.env.BETTER_AUTH_SECRET = "01234567890123456789012345678901";
  vi.resetModules();
});

afterAll(async () => {
  await closeDatabase();
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  vi.resetModules();
});

describe("Better Auth route", () => {
  it("returns an anonymous session through the Next.js handler", async () => {
    const { GET } = await import("./route");

    const response = await GET(
      new Request("http://localhost:3000/api/auth/get-session", { method: "GET" }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toBeNull();
  });

  it("handles an anonymous sign-out through the POST handler", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost:3000/api/auth/sign-out", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true });
  });
});
