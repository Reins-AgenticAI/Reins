import { afterEach, describe, expect, it } from "vitest";
import { buildApi } from "../src/app.js";

const openApps: Array<ReturnType<typeof buildApi>> = [];

afterEach(async () => {
  await Promise.all(openApps.splice(0).map((app) => app.close()));
});

describe("API network boundary", () => {
  it("serves the health contract over HTTP", async () => {
    const now = new Date("2026-09-16T12:00:00.000Z");
    const app = buildApi({ now: () => now });
    openApps.push(app);
    const address = await app.listen({ host: "127.0.0.1", port: 0 });

    const response = await fetch(`${address}/health`);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      service: "reins-api",
      time: "2026-09-16T12:00:00.000Z",
    });
  });

  it("does not expose an undefined route", async () => {
    const app = buildApi();
    openApps.push(app);
    const address = await app.listen({ host: "127.0.0.1", port: 0 });

    const response = await fetch(`${address}/not-a-route`);

    expect(response.status).toBe(404);
  });
});
