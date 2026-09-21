import type { FinanceTask } from "./local-agent-workflow";
import type { SpendDecision } from "./spend-decision";

export type ScenarioExecutionMode = "parallel" | "sequential";

export type ControlRoomScenarioRequest = Readonly<
  FinanceTask & {
    idempotencyKey: string;
    expectedOutcome: SpendDecision;
  }
>;

export type ControlRoomScenario = Readonly<{
  id: string;
  name: string;
  requests: readonly ControlRoomScenarioRequest[];
}>;

function freezeRequest(request: ControlRoomScenarioRequest): ControlRoomScenarioRequest {
  return Object.freeze({ ...request });
}

function freezeScenario(scenario: ControlRoomScenario): ControlRoomScenario {
  return Object.freeze({
    ...scenario,
    requests: Object.freeze(scenario.requests.map(freezeRequest)),
  });
}

export const controlRoomScenarios: readonly ControlRoomScenario[] = Object.freeze([
  freezeScenario({
    id: "quarter-close-spend-controls",
    name: "Quarter-close spend controls",
    requests: [
      {
        requestId: "quarter-close-engineering",
        idempotencyKey: "quarter-close-engineering",
        title: "Developer-seat expansion",
        agent: "Engineering",
        vendor: "Datacore",
        category: "Developer tooling",
        amountMinor: 84_000,
        currency: "USD",
        costCenter: "Engineering",
        expectedOutcome: "ALLOW",
      },
      {
        requestId: "quarter-close-research",
        idempotencyKey: "quarter-close-research",
        title: "Market-data renewal",
        agent: "Research",
        vendor: "Datacore",
        category: "Market data",
        amountMinor: 480_000,
        currency: "USD",
        costCenter: "Research",
        expectedOutcome: "ALLOW",
      },
      {
        requestId: "quarter-close-platform",
        idempotencyKey: "quarter-close-platform",
        title: "Cloud-capacity commitment",
        agent: "Platform",
        vendor: "BuildKit",
        category: "Cloud capacity",
        amountMinor: 1_850_000,
        currency: "USD",
        costCenter: "Platform",
        expectedOutcome: "DENY",
      },
      {
        requestId: "quarter-close-compliance",
        idempotencyKey: "quarter-close-compliance",
        title: "AML data-provider exception",
        agent: "Compliance",
        vendor: "AML Provider",
        category: "AML data provider",
        amountMinor: 720_000,
        currency: "USD",
        costCenter: "Compliance",
        expectedOutcome: "ESCALATE",
      },
    ],
  }),
]);

export function getScenario(id: string, runNonce?: string): ControlRoomScenario | undefined {
  const scenario = controlRoomScenarios.find((candidate) => candidate.id === id);
  if (!scenario) return undefined;
  if (!runNonce) return scenario;

  return freezeScenario({
    ...scenario,
    requests: scenario.requests.map((request) => ({
      ...request,
      requestId: `${request.requestId}:${runNonce}`,
      idempotencyKey: `${request.idempotencyKey}:${runNonce}`,
    })),
  });
}
