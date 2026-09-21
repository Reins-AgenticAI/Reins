import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("assurance fixture route", () => {
  it("returns deterministic policy, coverage, and scenario evidence without live payment data", async () => {
    const response = GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.synthetic).toBe(true);
    expect(body.profiles).toHaveLength(2);
    expect(body.profiles[0].assessment.compatible).toBe(true);
    expect(body.profiles[1].assessment.compatible).toBe(false);
    expect(body.scenarios.every((scenario: { passed: boolean }) => scenario.passed)).toBe(true);
  });
});
