# Hosted Advisory Deployment Design

## Purpose

Make Reins shareable as a public, synthetic portfolio demo without changing its financial-control boundary. The deployed application must work without an external LLM key and may optionally use a hosted LLM for advisory agent notes.

## Product boundary

Reins remains a synthetic demonstration. It does not execute payments, connect to payment rails, store payment credentials, or claim production enforcement. A language model can summarize supplied synthetic context only. The deterministic evaluator remains the sole authority for ALLOW, ESCALATE, and DENY. A missing key, timeout, rate limit, malformed model output, provider error, unsupported provider, or database error must never produce ALLOW.

## Deployment architecture

Vercel hosts the Next.js application and Node.js route handlers. `/api/agent-run` selects a typed advisory client from server-only environment configuration:

1. `simulation` is the default and produces deterministic, labelled synthetic advisory notes without an API key.
2. `ollama` is the local-development option and calls only the contributor's configured local Ollama endpoint.
3. `groq` is the hosted option and calls Groq over HTTPS with `GROQ_API_KEY` held only by the server runtime.

The browser never receives a provider key and never calls an LLM provider directly. The advisory workflow returns safe, bounded text and trace metadata. The existing policy evaluator, budget reservation, receipt, and evidence stores run independently of advisory prose.

```text
Browser -> Vercel Next.js route -> advisory-client adapter -> optional Groq HTTPS API
                                  -> deterministic policy + PostgreSQL ledger -> evidence receipt
```

## Configuration

`LLM_PROVIDER` is optional and defaults to `simulation`. `GROQ_API_KEY` is required only when `LLM_PROVIDER=groq`. `OLLAMA_ENDPOINT` and `OLLAMA_MODEL` are local-only optional overrides. No sensitive configuration may be named with `NEXT_PUBLIC_`.

The hosting guide will list the Vercel variables, a managed PostgreSQL `DATABASE_URL` requirement for durable hosted state, local OLLama requirements, and a clear free-tier/no-SLA disclosure. The default Vercel deployment uses simulation because a free provider quota cannot be treated as reliable infrastructure.

## Failure behavior

Hosted requests use an allowlisted HTTPS endpoint, an application-level timeout, a small response cap, and strict response parsing. Provider failures result in a typed advisory-unavailable trace or a non-success response consistent with the existing Control Room behavior. They cannot alter or fabricate a policy receipt. Sensitive values, full prompts, and provider headers are never logged.

## Testing

- Unit tests prove provider selection defaults to simulation and rejects invalid configuration.
- Unit tests prove Groq requests are server-side, bounded, parsed safely, and fail closed for timeout, non-200, and malformed content.
- Existing workflow tests prove advisory content cannot affect the deterministic decision.
- Route tests cover the missing-key and provider-unavailable responses.
- A local end-to-end browser run proves simulation mode remains usable without Ollama or a provider key.
- `pnpm format` and `pnpm check` pass before delivery.

## Acceptance criteria

- A Vercel-ready deployment can run Reins without an LLM key in labelled simulation mode.
- A configured Groq key enables hosted advisory traces without exposing the key to browser code.
- Local Ollama remains supported for contributor development.
- All provider and configuration failures fail closed and do not create an ALLOW decision.
- Deployment instructions distinguish a public portfolio demo from commercial or production payment infrastructure.
