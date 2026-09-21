import { describe, expect, it } from "vitest";
import { readApiConfig } from "../src/config.js";

describe("readApiConfig", () => {
  it("uses safe local defaults", () => {
    expect(readApiConfig({})).toEqual({
      host: "127.0.0.1",
      port: 4000,
      logLevel: "info",
      ollamaUrl: "http://127.0.0.1:11434/api/generate",
      ollamaModel: "qwen3:4b",
      agentTimeoutMs: 30_000,
    });
  });

  it.each(["0", "65536", "not-a-port"])("rejects invalid API_PORT %s", (rawPort) => {
    expect(() => readApiConfig({ API_PORT: rawPort })).toThrow(/API_PORT/);
  });

  it("rejects a blank API_HOST", () => {
    expect(() => readApiConfig({ API_HOST: "   " })).toThrow(/API_HOST/);
  });

  it("rejects an unsupported LOG_LEVEL", () => {
    expect(() => readApiConfig({ LOG_LEVEL: "verbose" })).toThrow(/LOG_LEVEL/);
  });

  it.each(["0", "not-a-number"])("rejects invalid AGENT_TIMEOUT_MS %s", (value) => {
    expect(() => readApiConfig({ AGENT_TIMEOUT_MS: value })).toThrow(/AGENT_TIMEOUT_MS/);
  });

  it("rejects a non-local Ollama endpoint", () => {
    expect(() => readApiConfig({ OLLAMA_URL: "https://example.com/api/generate" })).toThrow(
      /OLLAMA_URL/,
    );
  });
});
