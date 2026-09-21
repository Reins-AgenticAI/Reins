const allowedLogLevels = new Set(["fatal", "error", "warn", "info", "debug", "trace", "silent"]);

export type ApiConfig = Readonly<{
  host: string;
  port: number;
  logLevel: string;
  ollamaUrl: string;
  ollamaModel: string;
  agentTimeoutMs: number;
}>;

export function readApiConfig(environment: NodeJS.ProcessEnv = process.env): ApiConfig {
  const host = (environment.API_HOST ?? "127.0.0.1").trim();
  if (!host) {
    throw new Error("API_HOST must not be blank");
  }

  const rawPort = environment.API_PORT ?? "4000";
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`API_PORT must be an integer from 1 to 65535, received ${rawPort}`);
  }

  const logLevel = environment.LOG_LEVEL ?? "info";
  if (!allowedLogLevels.has(logLevel)) {
    throw new Error(`LOG_LEVEL is not supported: ${logLevel}`);
  }

  const ollamaUrl = environment.OLLAMA_URL ?? "http://127.0.0.1:11434/api/generate";
  let parsedOllamaUrl: URL;
  try {
    parsedOllamaUrl = new URL(ollamaUrl);
  } catch {
    throw new Error("OLLAMA_URL must be a valid local HTTP URL");
  }
  if (
    parsedOllamaUrl.protocol !== "http:" ||
    !["127.0.0.1", "localhost", "[::1]"].includes(parsedOllamaUrl.hostname)
  ) {
    throw new Error("OLLAMA_URL must use a local HTTP endpoint");
  }

  const ollamaModel = (environment.OLLAMA_MODEL ?? "qwen3:4b").trim();
  if (!ollamaModel) throw new Error("OLLAMA_MODEL must not be blank");

  const rawTimeout = environment.AGENT_TIMEOUT_MS ?? "30000";
  const agentTimeoutMs = Number(rawTimeout);
  if (!Number.isSafeInteger(agentTimeoutMs) || agentTimeoutMs < 1 || agentTimeoutMs > 300_000) {
    throw new Error(`AGENT_TIMEOUT_MS must be an integer from 1 to 300000, received ${rawTimeout}`);
  }

  return {
    host,
    port,
    logLevel,
    ollamaUrl: parsedOllamaUrl.toString(),
    ollamaModel,
    agentTimeoutMs,
  };
}
