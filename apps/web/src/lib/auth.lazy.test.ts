import { afterEach, describe, expect, it, vi } from "vitest";

const environmentKeys = ["DATABASE_URL", "BETTER_AUTH_URL", "BETTER_AUTH_SECRET"] as const;
const originalEnvironment = Object.fromEntries(
  environmentKeys.map((key) => [key, process.env[key]]),
);

afterEach(() => {
  for (const key of environmentKeys) {
    const value = originalEnvironment[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  vi.resetModules();
});

describe("authentication initialization", () => {
  it("keeps module import safe and defers configuration until authentication is used", async () => {
    for (const key of environmentKeys) {
      delete process.env[key];
    }
    vi.resetModules();

    const authModulePromise = import("./auth");

    await expect(authModulePromise).resolves.toHaveProperty("getAuth");
    const { getAuth } = await authModulePromise;
    expect(() => getAuth()).toThrow(/DATABASE_URL is required/);
  });
});
