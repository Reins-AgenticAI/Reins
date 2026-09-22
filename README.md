# Reins

Reins is a synthetic assurance workbench for AI-agent spending, jointly owned by Sai Prathap Reddy Cheluri and Lekhashree Srinath Reddy. Deterministic code evaluates policies, reserves a shared budget, and records decisions and evidence. Model output is advisory only. This milestone does not move money or establish production payment readiness.

## Run locally

Prerequisites: Node.js 24 (the CI baseline), pnpm 11.19.0, and PostgreSQL 17 or Podman with Compose support. From the repository root:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
pnpm install --frozen-lockfile
pnpm db:up
pnpm db:migrate
pnpm db:verify
$env:LLM_PROVIDER = "simulation"
$env:STRIPE_TEST_EXECUTION_ENABLED = "false"
pnpm dev
```

`pnpm dev` starts the Next app at `http://localhost:3000` and the Fastify API at `http://127.0.0.1:4000/health`. Simulation requires no model key. Use only synthetic records; never commit `.env`, secrets, or customer financial data. The example authentication secret is for local development only.

Open `/assurance`, select **Parallel**, and run **Quarter-close spend controls**. With sufficient available budget, the four requests return **ALLOW, ALLOW, DENY, ESCALATE**. The allowed and escalated requests hold $12,840 in total; the denied request releases its reservation. Each new scenario run creates fresh persisted records and consumes additional synthetic budget. Requests and evidence remain available after refresh.

Select **Reports** and change **Reporting month** to inspect charts and receipt-linked evidence. Reports cover the latest 24 loaded investigations, group approved request amounts by UTC decision month, and show a current budget snapshot. They are not settlement accounting. Review aging uses a visibly synthetic 24-hour SLA assessed at month end; review resolution dates are unavailable.

## Verify the running app

Keep the local app running in another terminal:

```powershell
$env:REINS_EVAL_URL = "http://127.0.0.1:3000"
pnpm eval:agents
node --test scripts/run-parallel-spend-eval.test.mjs
node scripts/verify-control-room.mjs http://127.0.0.1:3000
```

The evaluator dispatches three synthetic workflows concurrently and reads trace `status` values from persisted investigations. It exits nonzero for unavailable workflows, absent trace evidence, or missing/null statuses. Its fixed request IDs replay existing receipts on repeat runs; it is a local workflow measurement, not a throughput benchmark.

The browser verifier requires an existing Playwright installation and browser. It adds no repository dependency. If Playwright is outside this workspace, set `PLAYWRIGHT_MODULE` to its absolute package directory. Set `PLAYWRIGHT_CHANNEL=msedge` to use installed Microsoft Edge; otherwise Playwright's Chromium must be installed. Run `node scripts/verify-control-room.mjs --help` for options. `TEST_BASE_URL` is an alternative to the URL argument. Browser traffic is confined to loopback; redirects are rejected before following, service workers are blocked, and every console error fails verification without logging its text. Optional `REINS_VERIFY_OUTPUT_DIR` saves desktop/mobile screenshots. With the same Playwright configuration, run `node --test scripts/control-room-browser-guards.test.mjs` for the focused network/error-handling checks.

With the same Playwright configuration, `node --test scripts/control-room-selection.test.mjs` exercises workflow-specific queue and timeline selection, receipt details, and pending-to-persisted selection against an isolated synthetic HTTP fixture. It does not require or modify PostgreSQL.

The verifier drives the actual Next app without intercepted responses: Parallel selection, four decision rows, persisted receipts/traces, the exact budget decrease, month-dependent chart totals, evidence links, and desktop/mobile overflow. It requires simulation mode, exclusive use of the local demo during the run, and at least $31,340 available for concurrent reservation attempts. An absent budget is initialized by the application to $500,000. Each successful verification holds another $12,840; the script never resets the database or calls Stripe.

## Repository and database gates

```powershell
pnpm format
pnpm check
if (-not (Test-Path .env.test)) { Copy-Item .env.test.example .env.test }
pnpm db:up:test
pnpm check:release
```

`check` runs lint, migration metadata checks, TypeScript, coverage-gated tests, and production builds without requiring PostgreSQL. `check:release` also validates the isolated test target, applies migrations, and runs real PostgreSQL integration tests. A missing database is a failed/pending gate, never a passed release check.

The test database must be `reins_test` on a loopback host; its Compose service uses port 5433, separate from development port 5432. Shell environment variables override dotenv files: clear unrelated `DATABASE_URL` values before running test commands. Focused commands are `pnpm test:unit`, `pnpm test:integration`, `pnpm db:migrate:test`, and `pnpm test:integration:db`. See the [local release runbook](docs/verification/m5-local-release.md) for synthetic reset, backup, restore, and database safety checks.

Run the pnpm gates from a normally installed checkout. Dependency-junction worktrees can fail pnpm workspace reconciliation before checks start; that is not passing gate evidence. Child-process restrictions such as `spawn EPERM` also require a permitted terminal to run the same check.

## Advisory providers and deployment boundary

`LLM_PROVIDER=simulation` is the deterministic default. Local Ollama requires `LLM_PROVIDER=ollama`, `OLLAMA_ENDPOINT`, and `OLLAMA_MODEL`. Optional hosted advisory inference uses `LLM_PROVIDER=groq` with server-only `GROQ_API_KEY`. No model key may use a `NEXT_PUBLIC_` prefix. Provider errors, timeouts, missing configuration, and malformed outputs fail closed with advisory-unavailable feedback.

Public Stripe test-intent creation remains disabled: keep `STRIPE_TEST_EXECUTION_ENABLED=false` and omit `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` from public deployments. The optional local connector creates only an unconfirmed Stripe test intent after a stored ALLOW receipt and held reservation; it never confirms or captures payment. Do not enable it publicly without an authenticated authorization boundary. All requests, vendors, budgets, and evidence must remain synthetic.

Local verification does not certify hosted availability, production readiness, real-money authorization, or customer demand. Hosted deployment requires separate environment, authentication, and database verification; a host cannot reach the developer's local PostgreSQL or Ollama by default.

## Workspace

- `apps/web`: Next.js interface, server routes, and authentication.
- `apps/api`: Fastify HTTP interface.
- `packages/assurance`: deterministic policies, scenarios, and advisory workflow contracts.
- `packages/db`: PostgreSQL persistence, Drizzle schema, and migrations.

Never store PAN, CVV, bank credentials, wallet private keys, production tokens, or customer financial data. Preserve fail-closed decisions, integer minor-unit money, idempotency, and atomic reservations. Read [AGENTS.md](AGENTS.md), [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and the [current PRD](docs/Reins_PRD_Revision_1.md) before changing scope.
