# Reins

Reins is an independent policy enforcement and authorization evidence application for AI agent spending. This repository is jointly owned by Sai Prathap Reddy Cheluri and Lekhashree Srinath Reddy.

## Current milestone

Reins is a synthetic, local-first assurance workbench for AI-agent payment policies. It drafts policy text with an optional local Ollama model, validates it deterministically, compares synthetic provider capabilities, runs adversarial scenarios, reconciles lifecycle events, and creates verifiable evidence. It does not move money or approve payments.

## Prerequisites

- Node.js 24 (the CI runtime; other supported versions are not the verified baseline)
- pnpm 11.19.0 (the repository package-manager version)
- PostgreSQL 17 locally, or Podman with Compose support

All runtime libraries and tools used by this milestone are free and open source. Hosted services are not required.

## Local setup

Run this command sequence from the repository root:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
pnpm install --frozen-lockfile
pnpm db:up
pnpm db:migrate
pnpm db:verify
pnpm dev
```

The web application runs at `http://localhost:3000`. The API health endpoint runs at `http://127.0.0.1:4000/health`.

The secret in `.env.example` is for local development only. Replace it before any shared or hosted environment. Never commit `.env` or customer financial data.

## Stripe Sandbox evidence integration

The optional Stripe integration creates an unconfirmed PaymentIntent only after a stored Reins `ALLOW` receipt and a held synthetic budget reservation. It never confirms a payment, collects a card, captures funds, refunds, or uses a live Stripe key.

1. In the Stripe Dashboard's test/sandbox mode, create a restricted `rk_test_` key with PaymentIntents read and write access only.
2. Add it locally to `.env` along with `STRIPE_MODE=test` and `STRIPE_TEST_EXECUTION_ENABLED=true`. Never expose it through `NEXT_PUBLIC_` or commit it.
3. Run an allowed synthetic workflow. Its API response includes `workflowId` and `receiptId`. Call `POST /api/provider-executions/stripe-test` with those two values to create the unconfirmed intent.
4. For webhook testing, use the Stripe CLI or a Dashboard test webhook to forward to `/api/webhooks/stripe`, then place the resulting `whsec_` secret in local `.env`.

The opt-in smoke check creates a one-dollar unconfirmed Sandbox intent and retrieves it. It does not use a payment method or move money:

```powershell
$env:RUN_STRIPE_SANDBOX_TEST = "1"
pnpm stripe:sandbox:verify
Remove-Item Env:RUN_STRIPE_SANDBOX_TEST
```

Use only synthetic metadata and Stripe test/sandbox data. The smoke check is a credential-and-network check; the application flow is separately covered by deterministic unit, route, and PostgreSQL integration tests.

## Synthetic demo flow

1. Open `http://localhost:3000/assurance`.
2. Review the persisted synthetic finance request, deterministic receipt, advisory traces, and lifecycle evidence.
3. Select “New synthetic request” and choose a market-data renewal, developer-tooling expansion, or unapproved cloud-capacity scenario.
4. Run the local Ollama advisory workflow. Its output is context only; deterministic rules retain authority for ALLOW, ESCALATE, or DENY.
5. Review the agent registry and evidence view. All displayed requests, vendors, amounts, and lifecycle events are synthetic.

## Advisory-agent providers

The default `LLM_PROVIDER=simulation` is deterministic, requires no model key, and is the recommended public portfolio-demo mode. It produces labelled synthetic advisory notes; it does not call a remote model.

For local development with Ollama, set:

```powershell
$env:LLM_PROVIDER = "ollama"
$env:OLLAMA_ENDPOINT = "http://127.0.0.1:11434/api/generate"
$env:OLLAMA_MODEL = "qwen3:4b"
```

For an optional hosted advisory model, set `LLM_PROVIDER=groq` and `GROQ_API_KEY` in the server environment. Reins calls Groq only from its server route; the provider key must never use a `NEXT_PUBLIC_` prefix or be supplied by browser code. The model only produces advisory context. The deterministic policy evaluator, budget reservation, evidence receipt, and reconciliation logic remain authoritative.

If an advisory provider is missing, unavailable, rate-limited, times out, or returns malformed output, Reins returns **AI advisory unavailable**. It never turns that condition into an approval.

## Vercel portfolio deployment

Vercel hosts the Next.js application and its server-side routes. It does not run your laptop's Ollama process or access your local PostgreSQL database.

1. Import this repository into Vercel and set the project root to `apps/web`. Enable source files outside the root directory so the workspace packages are available to the build.
2. Add `DATABASE_URL`, `BETTER_AUTH_URL`, and `BETTER_AUTH_SECRET` as server-side Vercel environment variables. Use a managed PostgreSQL instance for durable hosted state.
3. Set `LLM_PROVIDER=simulation` for a dependable public demonstration without an external LLM key.
4. Optionally add `LLM_PROVIDER=groq` and `GROQ_API_KEY` in Vercel Project Settings to show hosted advisory traces. Keep the key limited and rotate it if exposed.
5. Keep `STRIPE_TEST_EXECUTION_ENABLED=false`, and do not add `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` to the public portfolio deployment. The public demo uses safe synthetic provider evidence. Enable the external Stripe test connector only after an authenticated authorization boundary is in place.
6. Do not add `NEXT_PUBLIC_GROQ_API_KEY`, payment credentials, customer data, or a local Ollama URL to Vercel.

Vercel's free personal plan and a free LLM tier are suitable for a portfolio demonstration, not a commercial payment product or an uptime-backed service. All Reins requests, vendors, budgets, advisory outputs, and evidence shown in the public demo must remain synthetic.

## Verification

```powershell
pnpm check
```

This is the database-free developer gate: formatting/lint, migration metadata, TypeScript, coverage-gated unit tests, HTTP/auth-route tests that do not require PostgreSQL, and production builds. It does not certify database integration or milestone completion. The explicitly selected database suite never silently skips.

Use the focused commands while developing:

```powershell
pnpm test:unit
pnpm test:integration
pnpm test:coverage
```

For the required real-database release gate, create the separate synthetic test configuration and start the isolated PostgreSQL test service:

```powershell
if (-not (Test-Path .env.test)) { Copy-Item .env.test.example .env.test }
pnpm db:up:test
pnpm check:release
```

The release runbook, including reset, backup, restore, synthetic account flow, and limitations, is in [`docs/verification/m5-local-release.md`](docs/verification/m5-local-release.md).

`check:release` runs the developer gate, validates the test target, applies committed migrations to it, and executes PostgreSQL integration tests. CI runs this same gate. The test database must be named `reins_test` and reachable through `localhost`, `127.0.0.1`, or `::1`. Query parameters and fragments are rejected so they cannot override the target. The test service uses loopback port 5433, separate from development port 5432. These credentials and databases are synthetic and must never contain real data. Existing shell environment variables take precedence over dotenv files; clear an unrelated `DATABASE_URL` from the shell before running the test commands.

Focused database commands:

```powershell
pnpm db:migrate:test
pnpm test:integration:db
```

Both commands fail when the test configuration is missing or unsafe; they do not use the development database as a fallback. An unavailable PostgreSQL runtime is a pending release check, not a passed test. No SQLite or in-memory substitute establishes PostgreSQL transaction behavior.

The five milestone acceptance checks and remaining delivery stages are in [the milestone plan](docs/Reins_Milestone_Plan.md). Use a normal terminal with permission to start child processes for builds. If an agent sandbox reports `spawn EPERM`, record the environment restriction and rerun the same build with appropriate permission; do not disable type checking to hide it.

## Workspace

```text
apps/web       Next.js App Router user interface and Better Auth route
apps/api       Fastify HTTP interface
packages/db    PostgreSQL connection, Drizzle schema, and migrations
docs           Product requirements, research, and architecture records
```

Turborepo is intentionally not included. The workspace will add it only if measured build time or caching needs justify another orchestration layer.

## Product constraints

- No real PAN, CVV, bank credentials, wallet private keys, or customer financial data.
- No language model may approve a payment or change an authorization decision.
- A provider integration must not claim enforcement without a mandatory control point.
- The Control Room uses an off-white, charcoal, and forest-teal system and preserves an accessible evidence view without depending on Three.js.

See `CONTRIBUTING.md`, `SECURITY.md`, `AGENTS.md`, and `docs/architecture/m1-foundation.md` before making changes.
