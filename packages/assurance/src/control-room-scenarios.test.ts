import { describe, expect, it } from "vitest";
import { controlRoomScenarios, getScenario } from "./index";

describe("control-room scenarios", () => {
  it("defines the quarter-close request mix expected from deterministic policy", () => {
    const scenario = getScenario("quarter-close-spend-controls");

    expect(scenario).toBeDefined();
    expect(scenario?.requests.map((request) => request.requestId)).toEqual([
      "quarter-close-engineering",
      "quarter-close-research",
      "quarter-close-platform",
      "quarter-close-compliance",
    ]);
    expect(new Set(scenario?.requests.map((request) => request.requestId)).size).toBe(4);
    expect(scenario?.requests.map((request) => request.expectedOutcome)).toEqual([
      "ALLOW",
      "ALLOW",
      "DENY",
      "ESCALATE",
    ]);
    expect(scenario?.requests).toMatchObject([
      {
        agent: "Engineering",
        category: "Developer tooling",
        vendor: "Datacore",
        amountMinor: 84_000,
        currency: "USD",
        costCenter: "Engineering",
      },
      {
        agent: "Research",
        category: "Market data",
        vendor: "Datacore",
        amountMinor: 480_000,
        currency: "USD",
        costCenter: "Research",
      },
      {
        agent: "Platform",
        category: "Cloud capacity",
        vendor: "BuildKit",
        amountMinor: 1_850_000,
        currency: "USD",
        costCenter: "Platform",
      },
      {
        agent: "Compliance",
        category: "AML data provider",
        vendor: "AML Provider",
        amountMinor: 720_000,
        currency: "USD",
        costCenter: "Compliance",
      },
    ]);
  });

  it("uses a run nonce to isolate request and idempotency identifiers", () => {
    const firstRun = getScenario("quarter-close-spend-controls", "run-001");
    const secondRun = getScenario("quarter-close-spend-controls", "run-002");

    expect(firstRun?.requests.map((request) => request.requestId)).toEqual([
      "quarter-close-engineering:run-001",
      "quarter-close-research:run-001",
      "quarter-close-platform:run-001",
      "quarter-close-compliance:run-001",
    ]);
    expect(new Set(firstRun?.requests.map((request) => request.idempotencyKey)).size).toBe(4);
    expect(firstRun?.requests.map((request) => request.idempotencyKey)).not.toEqual(
      secondRun?.requests.map((request) => request.idempotencyKey),
    );
  });

  it("keeps the catalogue immutable and does not invent unknown scenarios", () => {
    expect(Object.isFrozen(controlRoomScenarios)).toBe(true);
    expect(Object.isFrozen(controlRoomScenarios[0])).toBe(true);
    expect(Object.isFrozen(controlRoomScenarios[0]?.requests)).toBe(true);
    expect(getScenario("unknown-scenario")).toBeUndefined();
  });
});
