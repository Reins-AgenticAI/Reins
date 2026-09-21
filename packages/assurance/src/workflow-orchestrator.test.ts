import { describe, expect, it } from "vitest";
import {
  type AdvisoryAgent,
  type AdvisoryAgentName,
  createWorkflowOrchestrator,
  InMemoryWorkflowStore,
  type SpendWorkflowCommand,
} from "./workflow-orchestrator";

const agentOrder: AdvisoryAgentName[] = ["INTAKE", "VENDOR_CONTEXT", "BUDGET_ANALYSIS", "EVIDENCE"];

const command: SpendWorkflowCommand = {
  organizationId: "org-finance",
  idempotencyKey: "request-SR-2048",
  request: {
    requestId: "SR-2048",
    title: "Renew market-data platform",
    requestingAgent: "Research Agent",
    vendor: "Datacore",
    category: "Data and research",
    amountMinor: 4_800_000,
    currency: "USD",
    costCenter: "482",
  },
};

function agent(name: AdvisoryAgentName, run: AdvisoryAgent["run"]): AdvisoryAgent {
  return { name, run };
}

function createTestOrchestrator(agents: AdvisoryAgent[], timeoutMs = 50) {
  let sequence = 0;
  return createWorkflowOrchestrator({
    agents,
    store: new InMemoryWorkflowStore(),
    timeoutMs,
    createId: () => `workflow-${++sequence}`,
    now: () => new Date("2026-09-20T18:00:00.000Z"),
  });
}

describe("parallel advisory workflow", () => {
  it("uses safe production defaults when optional orchestration settings are omitted", async () => {
    const agents = agentOrder.map((name) =>
      agent(name, async () => ({
        summary: `${name} complete`,
        facts: {},
        evidenceRefs: [],
      })),
    );
    const result = await createWorkflowOrchestrator({
      agents,
      store: new InMemoryWorkflowStore(),
    }).run({ ...command, idempotencyKey: "default-settings" });

    expect(result.workflowId).toMatch(/^[0-9a-f-]{36}$/u);
    expect(Number.isNaN(Date.parse(result.startedAt))).toBe(false);
    expect(Number.isNaN(Date.parse(result.completedAt ?? ""))).toBe(false);
  });

  it("starts every agent concurrently and records sanitized traces in canonical order", async () => {
    let started = 0;
    let releaseAgents = () => {};
    let reportAllStarted = () => {};
    const release = new Promise<void>((resolve) => {
      releaseAgents = resolve;
    });
    const allStarted = new Promise<void>((resolve) => {
      reportAllStarted = resolve;
    });
    const agents = [...agentOrder].reverse().map((name) =>
      agent(name, async () => {
        started += 1;
        if (started === agentOrder.length) reportAllStarted();
        await release;
        return {
          summary: `${name} context collected`,
          facts: { source: "synthetic", confidence: 1 },
          evidenceRefs: [`fixture://${name.toLowerCase()}`],
          decision: "ALLOW",
        };
      }),
    );
    const running = createTestOrchestrator(agents).run(command);

    await Promise.race([
      allStarted,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Agents did not start concurrently")), 200),
      ),
    ]);
    releaseAgents();
    const result = await running;

    expect(result.status).toBe("COMPLETED");
    expect(result.traces.map((trace) => trace.agent)).toEqual(agentOrder);
    expect(result.traces.map((trace) => trace.sequence)).toEqual([1, 2, 3, 4]);
    expect(result.traces.every((trace) => trace.status === "SUCCEEDED")).toBe(true);
    expect(result.traces.every((trace) => !("decision" in (trace.output ?? {})))).toBe(true);
    expect(Object.isFrozen(result.traces)).toBe(true);
    expect(result.traces.every(Object.isFrozen)).toBe(true);
  });

  it("isolates malformed output, provider failure, and per-agent timeout", async () => {
    const agents = [
      agent("INTAKE", async () => ({ summary: "Valid", facts: {}, evidenceRefs: [] })),
      agent("VENDOR_CONTEXT", async () => ({
        summary: "Invalid numeric fact",
        facts: { confidence: Number.POSITIVE_INFINITY },
        evidenceRefs: [],
      })),
      agent("BUDGET_ANALYSIS", async () => await new Promise(() => {})),
      agent("EVIDENCE", async () => {
        throw new Error("provider offline");
      }),
    ];

    const result = await createTestOrchestrator(agents, 10).run(command);

    expect(result.status).toBe("COMPLETED");
    expect(
      result.traces.map(({ agent, status, errorCode }) => ({ agent, status, errorCode })),
    ).toEqual([
      { agent: "INTAKE", status: "SUCCEEDED", errorCode: undefined },
      { agent: "VENDOR_CONTEXT", status: "MALFORMED", errorCode: "MALFORMED_OUTPUT" },
      { agent: "BUDGET_ANALYSIS", status: "TIMED_OUT", errorCode: "AGENT_TIMEOUT" },
      { agent: "EVIDENCE", status: "FAILED", errorCode: "AGENT_FAILURE" },
    ]);

    const malformedAgents = [
      agent("INTAKE", async () => null),
      agent("VENDOR_CONTEXT", async () => ({ summary: 42, facts: {}, evidenceRefs: [] })),
      agent("BUDGET_ANALYSIS", async () => ({
        summary: "Invalid facts",
        facts: [],
        evidenceRefs: [],
      })),
      agent("EVIDENCE", async () => ({
        summary: "Invalid evidence",
        facts: {},
        evidenceRefs: [42],
      })),
    ];
    const malformedResult = await createTestOrchestrator(malformedAgents).run({
      ...command,
      idempotencyKey: "request-malformed-variants",
    });
    expect(malformedResult.traces.map((trace) => trace.status)).toEqual([
      "MALFORMED",
      "MALFORMED",
      "MALFORMED",
      "MALFORMED",
    ]);
  });

  it("replays an identical command without rerunning agents and rejects a mutated retry", async () => {
    let executions = 0;
    const agents = agentOrder.map((name) =>
      agent(name, async () => {
        executions += 1;
        return { summary: `${name} complete`, facts: {}, evidenceRefs: [] };
      }),
    );
    const orchestrator = createTestOrchestrator(agents);

    const first = await orchestrator.run(command);
    const replay = await orchestrator.run({
      idempotencyKey: command.idempotencyKey,
      organizationId: command.organizationId,
      request: {
        currency: command.request.currency,
        costCenter: command.request.costCenter,
        amountMinor: command.request.amountMinor,
        category: command.request.category,
        vendor: command.request.vendor,
        requestingAgent: command.request.requestingAgent,
        title: command.request.title,
        requestId: command.request.requestId,
      },
    });

    expect(replay).toEqual(first);
    expect(executions).toBe(4);
    await expect(
      orchestrator.run({
        ...command,
        request: { ...command.request, amountMinor: 4_900_000 },
      }),
    ).rejects.toThrow("Idempotency key reused with different workflow request");
    expect(executions).toBe(4);

    await expect(orchestrator.run({ ...command, organizationId: " " })).rejects.toThrow(
      "Workflow fields are required",
    );
    await expect(
      orchestrator.run({
        ...command,
        idempotencyKey: "invalid-amount",
        request: { ...command.request, amountMinor: 0 },
      }),
    ).rejects.toThrow("positive integer minor units");
    expect(() => createTestOrchestrator(agents, 0)).toThrow(
      "Agent timeout must be a positive integer",
    );
    expect(() => createTestOrchestrator(agents.slice(0, 3))).toThrow(
      "Exactly one advisory agent is required",
    );

    const store = new InMemoryWorkflowStore();
    await expect(
      store.complete("missing", "COMPLETED", [], "2026-09-20T18:00:01.000Z"),
    ).rejects.toThrow("Workflow not found");
    const begun = await store.begin({
      workflowId: "already-complete",
      organizationId: command.organizationId,
      idempotencyKey: "already-complete",
      requestHash: "hash",
      request: command.request,
      startedAt: "2026-09-20T18:00:00.000Z",
    });
    const completed = await store.complete(
      begun.workflow.workflowId,
      "COMPLETED",
      [],
      "2026-09-20T18:00:01.000Z",
    );
    expect(
      await store.complete(begun.workflow.workflowId, "COMPLETED", [], "2026-09-20T18:00:02.000Z"),
    ).toBe(completed);
  });

  it("cancels all advisory work and persists cancellation traces", async () => {
    let started = 0;
    let reportAllStarted = () => {};
    const allStarted = new Promise<void>((resolve) => {
      reportAllStarted = resolve;
    });
    const agents = agentOrder.map((name) =>
      agent(
        name,
        async ({ signal }) =>
          await new Promise((_, reject) => {
            started += 1;
            if (started === agentOrder.length) reportAllStarted();
            signal.addEventListener("abort", () => reject(signal.reason), { once: true });
          }),
      ),
    );
    const controller = new AbortController();
    const running = createTestOrchestrator(agents).run(command, { signal: controller.signal });
    await allStarted;

    controller.abort(new Error("caller disconnected"));
    const result = await running;

    expect(result.status).toBe("CANCELLED");
    expect(result.traces.map((trace) => trace.status)).toEqual([
      "CANCELLED",
      "CANCELLED",
      "CANCELLED",
      "CANCELLED",
    ]);

    const alreadyAborted = new AbortController();
    alreadyAborted.abort(new Error("cancelled before dispatch"));
    const preCancelled = await createTestOrchestrator(agents).run(
      { ...command, idempotencyKey: "pre-cancelled" },
      { signal: alreadyAborted.signal },
    );
    expect(preCancelled.status).toBe("CANCELLED");
  });
});
