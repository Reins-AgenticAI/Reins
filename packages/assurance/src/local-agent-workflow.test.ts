import { describe, expect, it } from "vitest";
import { type LocalModelClient, runLocalAgentWorkflow } from "./local-agent-workflow";

const task = {
  requestId: "SR-2048",
  title: "Datacore data-platform renewal",
  agent: "Procurement Agent",
  vendor: "Datacore",
  category: "Data and research",
  amountMinor: 4_800_000,
  currency: "USD",
  costCenter: "482",
};

const safeModel: LocalModelClient = {
  async complete() {
    return {
      content: '{"summary":"Safe to approve immediately"}',
      model: "qwen3:4b",
      durationMs: 18,
      source: "live_local_model",
    };
  },
};

describe("runLocalAgentWorkflow", () => {
  it("requires review for a new AML provider but denies unknown vendors outside that category", async () => {
    for (const [category, vendor, expected] of [
      ["AML data provider", "AML Provider", "ESCALATE"],
      ["Cloud capacity", "AML Provider", "DENY"],
      ["AML data provider", "Datacore", "ALLOW"],
    ] as const) {
      const result = await runLocalAgentWorkflow(
        { ...task, amountMinor: 720_000, category, vendor },
        safeModel,
      );
      expect(result.decision).toBe(expected);
    }
    for (const invalid of [{ amountMinor: 0 }, { currency: "EUR" }]) {
      const result = await runLocalAgentWorkflow(
        { ...task, category: "AML data provider", vendor: "AML Provider", ...invalid },
        safeModel,
      );
      expect(result.decision).toBe("DENY");
    }
  });

  it("retains a simulation source without changing the deterministic escalation", async () => {
    const simulated: LocalModelClient = {
      async complete() {
        return {
          content: "Synthetic advisory only",
          model: "simulation-v1",
          durationMs: 0,
          source: "simulation",
        };
      },
    };

    const result = await runLocalAgentWorkflow(task, simulated);

    expect(result.decision).toBe("ESCALATE");
    expect(result.traces.map((trace) => trace.source)).toEqual([
      "simulation",
      "simulation",
      "simulation",
      "simulation",
    ]);
  });

  it("keeps the $48,000 renewal escalated even when the model recommends approval", async () => {
    const result = await runLocalAgentWorkflow(task, safeModel);

    expect(result.decision).toBe("ESCALATE");
    expect(result.reason).toBe("Amount meets the Finance approval threshold");
    expect(result.traces.map((trace) => trace.agent)).toEqual([
      "Intake Agent",
      "Vendor Context Agent",
      "Budget Analyst Agent",
      "Evidence Agent",
    ]);
    expect(result.traces.every((trace) => trace.source === "live_local_model")).toBe(true);
  });

  it("fails safely when the local model is unavailable", async () => {
    const unavailable: LocalModelClient = {
      async complete() {
        throw new Error("Ollama unavailable");
      },
    };

    await expect(runLocalAgentWorkflow(task, unavailable)).rejects.toThrow(
      "Local model unavailable",
    );
  });
});
