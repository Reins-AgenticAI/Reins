import { describe, expect, it } from "vitest";
import { createOllamaAdvisoryAgents } from "../src/ollama-agents.js";

const request = {
  requestId: "SR-2048",
  title: "Renew market-data platform",
  requestingAgent: "Research Agent",
  vendor: "Datacore",
  category: "Data and research",
  amountMinor: 4_800_000,
  currency: "USD",
  costCenter: "482",
};

describe("Ollama advisory agents", () => {
  it("creates four role-specific agents that return context without a decision field", async () => {
    const prompts: string[] = [];
    const requests: Array<{ think?: unknown; options?: Record<string, unknown> }> = [];
    const fetchImpl: typeof fetch = async (_input, init) => {
      const payload = JSON.parse(String(init?.body)) as {
        prompt: string;
        think?: unknown;
        options?: Record<string, unknown>;
      };
      prompts.push(payload.prompt);
      requests.push(payload);
      return Response.json({ response: "Vendor record found", model: "qwen3:4b" });
    };
    const agents = createOllamaAdvisoryAgents({ fetch: fetchImpl });

    const outputs = await Promise.all(
      agents.map((agent) => agent.run({ request, signal: new AbortController().signal })),
    );

    expect(agents.map((agent) => agent.name)).toEqual([
      "INTAKE",
      "VENDOR_CONTEXT",
      "BUDGET_ANALYSIS",
      "EVIDENCE",
    ]);
    expect(outputs).toEqual([
      {
        summary: "Vendor record found",
        facts: { model: "qwen3:4b", role: "INTAKE" },
        evidenceRefs: [],
      },
      {
        summary: "Vendor record found",
        facts: { model: "qwen3:4b", role: "VENDOR_CONTEXT" },
        evidenceRefs: [],
      },
      {
        summary: "Vendor record found",
        facts: { model: "qwen3:4b", role: "BUDGET_ANALYSIS" },
        evidenceRefs: [],
      },
      {
        summary: "Vendor record found",
        facts: { model: "qwen3:4b", role: "EVIDENCE" },
        evidenceRefs: [],
      },
    ]);
    expect(prompts).toHaveLength(4);
    expect(prompts.every((prompt) => prompt.includes("Do not approve, deny, or escalate"))).toBe(
      true,
    );
    expect(requests.every((request) => request.think === false)).toBe(true);
    expect(requests.every((request) => request.options?.num_predict === 96)).toBe(true);
  });

  it("rejects unsuccessful and malformed model responses", async () => {
    const failedAgents = createOllamaAdvisoryAgents({
      fetch: async () => new Response(null, { status: 503 }),
    });
    const malformedAgents = createOllamaAdvisoryAgents({
      fetch: async () => Response.json({ response: 42 }),
    });
    const failed = failedAgents[0];
    const malformed = malformedAgents[0];
    if (!failed || !malformed) throw new Error("Expected advisory agents");

    await expect(failed.run({ request, signal: new AbortController().signal })).rejects.toThrow(
      "Ollama request failed",
    );
    await expect(malformed.run({ request, signal: new AbortController().signal })).rejects.toThrow(
      "Ollama response was malformed",
    );
  });
});
