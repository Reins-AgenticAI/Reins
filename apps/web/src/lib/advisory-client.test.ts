import { afterEach, describe, expect, it, vi } from "vitest";
import { AdvisoryClientConfigurationError, createAdvisoryClient } from "./advisory-client";

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

afterEach(() => vi.unstubAllGlobals());

describe("createAdvisoryClient", () => {
  it("uses deterministic simulation when no provider is configured", async () => {
    const output = await createAdvisoryClient({}).complete({ role: "Intake Agent", task });

    expect(output).toMatchObject({ model: "simulation-v1", durationMs: 0 });
    expect(output.content).toContain("Synthetic advisory");
    expect(output.content).toContain("Datacore");
  });

  it("rejects Groq when the server-only key is missing", () => {
    expect(() => createAdvisoryClient({ LLM_PROVIDER: "groq" })).toThrow(
      AdvisoryClientConfigurationError,
    );
  });

  it("rejects an unsupported provider instead of selecting one implicitly", () => {
    expect(() => createAdvisoryClient({ LLM_PROVIDER: "unknown" })).toThrow(
      AdvisoryClientConfigurationError,
    );
  });

  it("sends a bounded request to the allowlisted Groq endpoint", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ choices: [{ message: { content: "Synthetic vendor context" } }] }),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const output = await createAdvisoryClient({
      LLM_PROVIDER: "groq",
      GROQ_API_KEY: "test-key",
    }).complete({ role: "Vendor Context Agent", task });

    expect(output).toMatchObject({
      content: "Synthetic vendor context",
      model: "openai/gpt-oss-20b",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.groq.com/openai/v1/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: "Bearer test-key" }),
      }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      max_tokens: 80,
      stream: false,
    });
  });

  it.each([
    new Response("rate limited", { status: 429 }),
    new Response(JSON.stringify({ choices: [] })),
  ])("fails closed for unusable Groq responses", async (response) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    const client = createAdvisoryClient({ LLM_PROVIDER: "groq", GROQ_API_KEY: "test-key" });

    await expect(client.complete({ role: "Intake Agent", task })).rejects.toThrow(
      "AI advisory unavailable",
    );
  });
});
