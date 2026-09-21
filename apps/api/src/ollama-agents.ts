import { type AdvisoryAgent, type AdvisoryAgentName, advisoryAgentNames } from "@reins/assurance";

type OllamaAgentOptions = Readonly<{
  fetch?: typeof fetch;
  endpoint?: string;
  model?: string;
}>;

const roleInstructions: Record<AdvisoryAgentName, string> = {
  INTAKE: "Normalize the request fields and identify missing request context.",
  VENDOR_CONTEXT: "Summarize vendor identity, category, and synthetic risk context.",
  BUDGET_ANALYSIS:
    "Summarize the requested amount and relevant budget context without reserving funds.",
  EVIDENCE: "List the evidence needed to investigate this request and any missing lineage.",
};

export function createOllamaAdvisoryAgents(options: OllamaAgentOptions = {}): AdvisoryAgent[] {
  const fetchImpl = options.fetch ?? fetch;
  const endpoint = options.endpoint ?? "http://127.0.0.1:11434/api/generate";
  const model = options.model ?? "qwen3:4b";

  return advisoryAgentNames.map((name) => ({
    name,
    async run({ request, signal }) {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal,
        body: JSON.stringify({
          model,
          stream: false,
          think: false,
          options: { temperature: 0, num_predict: 96 },
          prompt: [
            `You are the ${name} advisory agent in a synthetic finance-control workflow.`,
            roleInstructions[name],
            "Return a concise factual summary in plain text.",
            "Do not approve, deny, or escalate. Do not recommend a payment decision.",
            `Synthetic request: ${JSON.stringify(request)}`,
          ].join(" "),
        }),
      });
      if (!response.ok) throw new Error("Ollama request failed");
      const payload = (await response.json()) as { response?: unknown; model?: unknown };
      if (typeof payload.response !== "string" || !payload.response.trim()) {
        throw new Error("Ollama response was malformed");
      }
      return {
        summary: payload.response.trim(),
        facts: {
          model: typeof payload.model === "string" ? payload.model : model,
          role: name,
        },
        evidenceRefs: [],
      };
    },
  }));
}
