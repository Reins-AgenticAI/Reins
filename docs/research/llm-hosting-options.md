# Reins: hosted LLM options for a public portfolio demo

**As of:** 2026-09-20  
**Source policy:** official documentation only. Limits and free tiers can change.

## Recommendation

Deploy the Next.js UI and API routes to Vercel, but do **not** attempt to run the local Ollama model inside Vercel. The public deployment should call a cloud LLM from a server-side route only, or use the existing deterministic synthetic advisory fallback. The policy evaluator, reservation ledger, and final ALLOW/ESCALATE/DENY decision must remain deterministic and must never depend on a language model.

For a no-cost portfolio demo, use this order of preference:

1. **Default:** deterministic synthetic workflow, with no external model key required.
2. **Optional AI advisory:** OpenRouter free models behind a server-only API key, with a strict timeout, output cap, request-rate cap, and deterministic fallback.
3. **Local development:** Ollama on the contributor's machine.
4. **Optional hosted Ollama:** Ollama Cloud API if its account-specific terms and limits work for the demonstrator; do not describe it as guaranteed free production infrastructure.

This avoids a public demo failing because a free LLM quota is exhausted and keeps its central financial-control claim truthful.

## What Vercel can and cannot host

Vercel Functions can run Next.js route handlers, call external HTTPS APIs, and are intended for I/O-bound AI workloads. A route such as `app/api/agent-run/route.ts` can therefore call a hosted LLM provider without exposing the provider key to the browser. [Vercel Functions](https://vercel.com/docs/functions)

Vercel is not a suitable place to run the local `ollama serve` process or package a local model. On Hobby, Node.js Functions have at most 2 GB / 1 vCPU and a 250 MB function bundle limit. Instances are request-driven rather than a persistent GPU host. The developer machine's `http://localhost:11434` is not reachable by a Vercel Function. [Vercel Function limits](https://vercel.com/docs/functions/limitations)

Keep the LLM route short. Next.js route handlers can export `maxDuration`; Vercel documents that a function exceeding its duration is terminated. For this application, use a smaller application-level abort timeout (for example 10–20 seconds) and return an advisory-unavailable result well before the platform duration. [Configuring function duration](https://vercel.com/docs/functions/configuring-functions/duration)

## Provider choices

| Option | Suitable role | Cost / operational boundary |
|---|---|---|
| Local Ollama | Development and recorded local demo | Requires the developer's running machine and model. It cannot be called by public Vercel visitors. |
| Ollama Cloud | Optional hosted alternative | Ollama documents HTTPS chat through `https://ollama.com/api/chat` with a bearer API key, but account availability and usage terms must be checked before a demo. [Ollama cloud models](https://ollama.com/blog/cloud-models) |
| OpenRouter free models | Best public-demo option | OpenRouter currently advertises free models, but says free capacity is not for production. Use `:free`, expect quota failures, and fall back safely. [OpenRouter pricing](https://openrouter.ai/pricing) |
| Gemini API free tier | Alternative demo provider | Google documents a free tier, but model/account quotas vary. Treat 429 as an expected, safe fallback condition. [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) |
| Groq free tier | Alternative demo provider | Groq documents Free-tier limits, applied at organization level. Its paid-only spend-limit feature is not a no-cost guardrail. [Groq rate limits](https://console.groq.com/docs/rate-limits), [Groq billing FAQ](https://console.groq.com/docs/billing-faqs) |

OpenRouter supports scoped API keys with optional expiry and daily, weekly, or monthly USD limits. If selected, create a dedicated demo key with the smallest allowed limit and an expiry date. [OpenRouter key API](https://openrouter.ai/docs/api/api-reference/api-keys/create-keys)

## Safe deployment design

```text
Browser
  -> Next.js Control Room
  -> /api/agent-run (Vercel Node Function)
       -> deterministic policy + PostgreSQL reservation (authoritative)
       -> optional cloud LLM advisory (non-authoritative)
       -> receipt/evidence response
```

- The browser never calls the LLM provider directly.
- Store `LLM_PROVIDER`, `LLM_API_KEY`, and `DATABASE_URL` as project environment variables. Do not use the `NEXT_PUBLIC_` prefix: Next.js embeds such variables in browser JavaScript. [Vercel environment variables](https://vercel.com/docs/environment-variables), [Next.js public variable boundary](https://vercel.com/academy/nextjs-foundations/env-and-security)
- Restrict Vercel project membership. Vercel encrypts environment variables at rest, but project members with access can view them; setting changes apply only to new deployments. [Vercel environment variables](https://vercel.com/docs/environment-variables)
- Use allowlisted provider URLs, `AbortSignal.timeout`, low `max_tokens`, input-size limits, and server-side rate limiting.
- On a missing key, timeout, invalid model output, 429, or provider 5xx: show **AI advisory unavailable** and continue only with deterministic policy behavior. Never convert any failure into ALLOW.
- Do not send real financial or personal data to a demo provider; Reins remains synthetic-data only.

## Deployment conclusion

Vercel Hobby is appropriate for a personal, non-commercial portfolio demonstration within its current free limits, not for a commercial pilot. The durable public demo should work with `LLM_PROVIDER=simulation`; enable an external provider only as an optional enhancement. This provides a reliable project link while accurately showing that the multi-agent AI layer is advisory and the spending-control layer is deterministic. [Vercel limits](https://vercel.com/docs/limits)
