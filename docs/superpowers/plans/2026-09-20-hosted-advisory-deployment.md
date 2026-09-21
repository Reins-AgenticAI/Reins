# Hosted Advisory Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public Reins demo run in reliable simulation mode and optionally obtain non-authoritative advisory notes from Groq without exposing provider keys.

**Architecture:** A small web-server advisory adapter selects simulation, local Ollama, or Groq from server-only configuration and implements the existing `LocalModelClient` contract. The current workflow, deterministic evaluator, reservations, and evidence persistence remain unchanged consumers of that contract. Vercel receives only the Next.js web app and server route; a managed PostgreSQL URL is needed for durable hosted state.

**Tech Stack:** Next.js 16 route handlers, TypeScript 7, Vitest 5, native `fetch`, Groq OpenAI-compatible HTTPS API, Vercel environment variables, PostgreSQL/Drizzle.

**Spec:** `docs/superpowers/specs/2026-09-20-hosted-advisory-deployment-design.md`

## Global Constraints

- Only synthetic inputs and data are permitted.
- Simulation is the default when `LLM_PROVIDER` is absent.
- LLM advisory prose never decides, changes, or fabricates ALLOW/ESCALATE/DENY.
- Provider keys are server-only and may not use a `NEXT_PUBLIC_` name.
- Invalid configuration, timeout, non-2xx response, malformed output, rate limit, or provider error must fail closed.
- No new LLM SDK dependency: use bounded native `fetch` against an allowlisted HTTPS URL.
- Do not attempt to host Ollama or PostgreSQL inside Vercel.
- Do not commit the current unbaselined working tree; inspect the focused diff instead and obtain the other product owner’s review before a future merge.

---

## File structure

| File | Responsibility |
| --- | --- |
| `packages/assurance/src/local-agent-workflow.ts` | Carry a typed advisory source from a model client into each workflow trace. |
| `packages/assurance/src/local-agent-workflow.test.ts` | Prove the supplied advisory source is retained and remains unable to change the deterministic decision. |
| `apps/web/src/lib/advisory-client.ts` | Parse provider configuration and implement deterministic simulation, local Ollama, and Groq clients behind `LocalModelClient`. |
| `apps/web/src/lib/advisory-client.test.ts` | Provider-selection, request-shape, parsing, and safe-failure tests. |
| `apps/web/src/app/api/agent-run/route.ts` | Obtain the configured client; retain queue, persistence, deterministic decision, and existing HTTP failure boundary. |
| `apps/web/src/app/api/agent-run/route.test.ts` | Assert simulation default and missing-Groq-key fail-closed route behavior. |
| `.env.example` | Document safe local defaults and non-secret provider selectors. |
| `README.md` | Explain local Ollama, hosted simulation, optional Groq, Vercel variable configuration, and managed PostgreSQL boundary. |

### Task 1: Truthful advisory-source contract

**Files:**
- Modify: `packages/assurance/src/local-agent-workflow.ts`
- Modify: `packages/assurance/src/local-agent-workflow.test.ts`

**Interfaces:**
- Consumes: existing `LocalModelClient.complete` output.
- Produces: `AdvisorySource = "simulation" | "live_local_model" | "hosted_model"`, included in both the client output and `AgentTrace`.

- [ ] **Step 1: Write a failing source-propagation test**

```ts
it("labels traces with the client advisory source without changing escalation", async () => {
  const result = await runLocalAgentWorkflow(task, {
    complete: async () => ({ content: "Synthetic advisory", model: "simulation-v1", durationMs: 0, source: "simulation" }),
  });
  expect(result.decision).toBe("ESCALATE");
  expect(result.traces.every((trace) => trace.source === "simulation")).toBe(true);
});
```

- [ ] **Step 2: Run the assurance unit suite to verify it fails**

Run: `pnpm --filter @reins/assurance test:unit`

Expected: FAIL because `source` is not part of the model-client contract.

- [ ] **Step 3: Add the smallest source union**

```ts
export type AdvisorySource = "simulation" | "live_local_model" | "hosted_model";

export type LocalModelClient = {
  complete(input: { role: string; task: FinanceTask }): Promise<{
    content: string;
    model: string;
    durationMs: number;
    source: AdvisorySource;
  }>;
};
```

Set `AgentTrace.source` from the returned source instead of a hard-coded value. Update existing test clients to explicitly return `live_local_model`.

- [ ] **Step 4: Run the assurance unit suite to verify it passes**

Run: `pnpm --filter @reins/assurance test:unit`

Expected: PASS; local clients retain `live_local_model`, simulation can be labelled honestly, and deterministic decisions are unchanged.

- [ ] **Step 5: Inspect the focused diff**

Run: `git diff --check -- packages/assurance/src/local-agent-workflow.ts packages/assurance/src/local-agent-workflow.test.ts`

Expected: no output.

### Task 2: Typed advisory-client boundary

**Files:**
- Create: `apps/web/src/lib/advisory-client.ts`
- Create: `apps/web/src/lib/advisory-client.test.ts`

**Interfaces:**
- Consumes: `FinanceTask` and `LocalModelClient` from `@reins/assurance`.
- Produces: `createAdvisoryClient(environment?: Record<string, string | undefined>): LocalModelClient`.
- Produces: `AdvisoryClientConfigurationError`, used by the route to return safe unavailable status.

- [ ] **Step 1: Write failing selection and safe-failure tests**

```ts
it("uses labelled deterministic simulation without any environment configuration", async () => {
  const result = await createAdvisoryClient({}).complete({ role: "Intake Agent", task });
  expect(result).toMatchObject({ model: "simulation-v1" });
  expect(result.content).toContain("Synthetic advisory");
});

it("rejects Groq selection when its server-only key is absent", () => {
  expect(() => createAdvisoryClient({ LLM_PROVIDER: "groq" })).toThrow(
    AdvisoryClientConfigurationError,
  );
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run: `pnpm --filter @reins/web test:unit`

Expected: FAIL because `advisory-client.ts` does not exist.

- [ ] **Step 3: Implement the smallest provider adapter**

```ts
export function createAdvisoryClient(environment = process.env): LocalModelClient {
  const provider = environment.LLM_PROVIDER ?? "simulation";
  if (provider === "simulation") return simulatedClient;
  if (provider === "ollama") return ollamaClient(environment);
  if (provider === "groq") return groqClient(requireGroqKey(environment));
  throw new AdvisoryClientConfigurationError("Unsupported LLM_PROVIDER");
}
```

`groqClient` must call only `https://api.groq.com/openai/v1/chat/completions`, attach the bearer key in the request header, use `AbortSignal.timeout(15_000)`, limit output tokens, and accept only a nonempty `choices[0].message.content` string. The simulation client must return concise task-derived text with model `simulation-v1`; it must not invent an approval recommendation.

- [ ] **Step 4: Add Groq request and failure tests**

```ts
it("sends the Groq key only as a server request header and parses bounded content", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse("Synthetic vendor context")));
  const output = await createAdvisoryClient({ LLM_PROVIDER: "groq", GROQ_API_KEY: "test-key" })
    .complete({ role: "Vendor Context Agent", task });
  expect(output.content).toBe("Synthetic vendor context");
  expect(fetch).toHaveBeenCalledWith(
    "https://api.groq.com/openai/v1/chat/completions",
    expect.objectContaining({ headers: expect.objectContaining({ authorization: "Bearer test-key" }) }),
  );
});

it.each([new Response("rate limited", { status: 429 }), jsonResponse({ choices: [] })])(
  "rejects unusable Groq responses", async (response) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    await expect(client.complete({ role: "Intake Agent", task })).rejects.toThrow();
  },
);
```

- [ ] **Step 5: Run the focused client suite**

Run: `pnpm --filter @reins/web test:unit`

Expected: PASS with simulation default, Ollama configuration, Groq request shape, and malformed/non-2xx safe-failure cases.

- [ ] **Step 6: Inspect the focused diff**

Run: `git diff --check -- apps/web/src/lib/advisory-client.ts apps/web/src/lib/advisory-client.test.ts`

Expected: no output.

### Task 3: Route integration without changing deterministic authority

**Files:**
- Modify: `apps/web/src/app/api/agent-run/route.ts`
- Modify: `apps/web/src/app/api/agent-run/route.test.ts`

**Interfaces:**
- Consumes: `createAdvisoryClient` and `AdvisoryClientConfigurationError` from `src/lib/advisory-client.ts`.
- Produces: existing `POST(request: Request): Promise<Response>` behavior with provider-independent workflow traces.

- [ ] **Step 1: Add failing route tests for the default and missing Groq key**

```ts
it("uses simulation when LLM_PROVIDER is absent and still persists the deterministic receipt", async () => {
  vi.stubEnv("LLM_PROVIDER", "");
  const response = await POST(request(body));
  await expect(response.json()).resolves.toMatchObject({ decision: "ESCALATE", synthetic: true });
  expect(db.saveReceipt).toHaveBeenCalledOnce();
});

it("returns unavailable when Groq is selected without GROQ_API_KEY", async () => {
  vi.stubEnv("LLM_PROVIDER", "groq");
  vi.stubEnv("GROQ_API_KEY", "");
  const response = await POST(request(body));
  expect(response.status).toBe(503);
  await expect(response.json()).resolves.toEqual({ error: "AI advisory unavailable" });
  expect(db.reserve).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run route tests to verify the current route fails**

Run: `pnpm --filter @reins/web test:unit`

Expected: FAIL because the current module constructs Ollama directly and has no simulation provider.

- [ ] **Step 3: Replace the inline Ollama client with the adapter**

```ts
const advisoryClient = createAdvisoryClient();
const result = await workflowQueue.run(() => runLocalAgentWorkflow(body, advisoryClient));
```

Keep all input validation, queue behavior, reservation calls, receipt construction, DENY release, and evidence append logic exactly as-is. Replace only the generic model error response with `{ error: "AI advisory unavailable" }`; do not return provider diagnostics.

- [ ] **Step 4: Prove LLM output still cannot change the deterministic decision**

```ts
expect(result.decision).toBe("ESCALATE");
expect(db.reserve).toHaveBeenCalledOnce();
expect(db.saveReceipt).toHaveBeenCalledOnce();
```

Run: `pnpm --filter @reins/web test:unit && pnpm --filter @reins/assurance test:unit`

Expected: PASS.

- [ ] **Step 5: Inspect the focused diff**

Run: `git diff --check -- apps/web/src/app/api/agent-run/route.ts apps/web/src/app/api/agent-run/route.test.ts`

Expected: no output.

### Task 4: Configuration and portfolio deployment guide

**Files:**
- Modify: `.env.example`
- Modify: `README.md`

**Interfaces:**
- Consumes: exact environment names accepted by `createAdvisoryClient`.
- Produces: a reproducible local simulation setup and explicit Vercel deployment instructions.

- [ ] **Step 1: Add the safe local defaults to `.env.example`**

```dotenv
LLM_PROVIDER=simulation
OLLAMA_ENDPOINT=http://127.0.0.1:11434/api/generate
OLLAMA_MODEL=qwen3:4b
# GROQ_API_KEY is set only in Vercel Project Settings; never commit it.
```

- [ ] **Step 2: Add a hosted-demo section to the README**

Include these exact points: deploy the Next.js `apps/web` workspace to Vercel; add `DATABASE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, and `LLM_PROVIDER=simulation`; leave `GROQ_API_KEY` unset for a reliable public simulation; to enable Groq, add `LLM_PROVIDER=groq` and `GROQ_API_KEY` to Vercel Project Settings for the target environment; never use `NEXT_PUBLIC_GROQ_API_KEY`; and the deployment is synthetic portfolio software, not production payment infrastructure.

- [ ] **Step 3: Run documentation/configuration checks**

Run: `pnpm format`

Expected: repository formatter completes without errors.

- [ ] **Step 4: Run the complete developer quality gate**

Run: `pnpm check`

Expected: formatting/lint, database metadata, typecheck, coverage gate, and production builds pass. Record pre-existing warnings separately if they do not fail the command.

- [ ] **Step 5: Perform a no-key simulation browser journey**

Run the web app with `LLM_PROVIDER=simulation`, open `/assurance`, submit the seeded Datacore renewal, and verify that the result remains `ESCALATE`, an evidence receipt is visible, and the budget is updated. Record this as a synthetic simulation outcome, not a live payment or production LLM test.

- [ ] **Step 6: Inspect final scope**

Run: `git diff --check; git status --short`

Expected: no whitespace errors; only the planned deployment adapter, tests, configuration, documentation, task record, design, and plan files are changed for this scope.
