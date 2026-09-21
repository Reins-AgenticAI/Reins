import type { FinanceTask, LocalModelClient } from "@reins/assurance";

type Environment = Readonly<Record<string, string | undefined>>;
type Completion = Awaited<ReturnType<LocalModelClient["complete"]>>;

const groqEndpoint = "https://api.groq.com/openai/v1/chat/completions";
const timeoutMs = 15_000;

export class AdvisoryClientConfigurationError extends Error {}

function unavailable(): never {
  throw new Error("AI advisory unavailable");
}

function simulation(role: string, task: FinanceTask): Completion {
  return {
    content: `Synthetic advisory: ${role} reviewed ${task.vendor} for ${task.title}.`,
    model: "simulation-v1",
    durationMs: 0,
    source: "simulation",
  };
}

function localOllama(environment: Environment): LocalModelClient {
  const endpoint =
    environment.OLLAMA_ENDPOINT ?? environment.OLLAMA_URL ?? "http://127.0.0.1:11434/api/generate";
  const model = environment.OLLAMA_MODEL ?? "qwen3:4b";
  return {
    async complete({ role, task }) {
      const startedAt = performance.now();
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: AbortSignal.timeout(timeoutMs),
          body: JSON.stringify({
            model,
            stream: false,
            think: false,
            options: { num_predict: 24, temperature: 0 },
            prompt: `${role}: provide one concise factual note for this synthetic finance request. Do not approve or deny. ${JSON.stringify(task)}`,
          }),
        });
        if (!response.ok) unavailable();
        const payload = (await response.json()) as { model?: unknown; response?: unknown };
        if (typeof payload.response !== "string" || !payload.response.trim()) unavailable();
        return {
          content: payload.response,
          model: typeof payload.model === "string" ? payload.model : model,
          durationMs: Math.round(performance.now() - startedAt),
          source: "live_local_model" as const,
        };
      } catch {
        unavailable();
      }
    },
  };
}

function groq(environment: Environment): LocalModelClient {
  const key = environment.GROQ_API_KEY;
  if (!key)
    throw new AdvisoryClientConfigurationError("GROQ_API_KEY is required for LLM_PROVIDER=groq");
  const model = environment.GROQ_MODEL ?? "openai/gpt-oss-20b";
  return {
    async complete({ role, task }) {
      const startedAt = performance.now();
      try {
        const response = await fetch(groqEndpoint, {
          method: "POST",
          headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
          signal: AbortSignal.timeout(timeoutMs),
          body: JSON.stringify({
            model,
            max_tokens: 80,
            stream: false,
            messages: [
              {
                role: "system",
                content:
                  "Provide one concise factual note for synthetic finance context. Never approve or deny.",
              },
              { role: "user", content: `${role}: ${JSON.stringify(task)}` },
            ],
          }),
        });
        if (!response.ok) unavailable();
        const payload = (await response.json()) as {
          choices?: Array<{ message?: { content?: unknown } }>;
        };
        const content = payload.choices?.[0]?.message?.content;
        if (typeof content !== "string" || !content.trim()) unavailable();
        return {
          content,
          model,
          durationMs: Math.round(performance.now() - startedAt),
          source: "hosted_model" as const,
        };
      } catch {
        unavailable();
      }
    },
  };
}

export function createAdvisoryClient(environment: Environment = process.env): LocalModelClient {
  switch (environment.LLM_PROVIDER ?? "simulation") {
    case "simulation":
      return { complete: ({ role, task }) => Promise.resolve(simulation(role, task)) };
    case "ollama":
      return localOllama(environment);
    case "groq":
      return groq(environment);
    default:
      throw new AdvisoryClientConfigurationError("Unsupported LLM_PROVIDER");
  }
}
