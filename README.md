<a id="readme-top"></a>

<div align="center">
  <h1>Reins</h1>
  <p>Governed AI-agent spend with deterministic decisions and portable evidence.</p>
  <p>
    <a href="#product-overview">Product overview</a> ·
    <a href="#run-locally">Run locally</a> ·
    <a href="#evaluation">Evaluation</a> ·
    <a href="#security-and-data">Security and data</a>
  </p>
</div>

## Table of contents

- [Product overview](#product-overview)
- [The problem](#the-problem)
- [What Reins does](#what-reins-does)
- [Product decisions](#product-decisions)
- [Results](#results)
- [Architecture](#architecture)
- [Run locally](#run-locally)
- [Try the demo](#try-the-demo)
- [Evaluation](#evaluation)
- [Security and data](#security-and-data)
- [Roadmap](#roadmap)
- [Contributors](#contributors)
- [Project resources](#project-resources)

## Product overview

Reins is a portfolio reference application for teams that use AI purchasing agents. It gives finance, risk, and agent-platform teams a single place to define spend rules, evaluate requests against deterministic policy, reserve a shared budget, and investigate the record after a request completes.

The repository demonstrates an AI product-management thesis: language models are useful for drafting and investigation context, while financial authorization must remain deterministic, repeatable, and explainable. All suppliers, amounts, budgets, provider events, and outcomes in this project are synthetic.

## The problem

Agentic purchasing introduces a control gap. A company may use several providers, agent frameworks, cards, or authorization callbacks, while its finance team still needs clear answers:

- Which rule applied to a request?
- Could the system enforce that rule before the transaction?
- Did several agents spend from the same budget at the same time?
- What happened after the authorization decision?

Provider dashboards answer parts of these questions in isolation. Reins keeps a canonical policy decision, coverage disclosure, budget reservation, and evidence trail together.

## What Reins does

| Capability | User outcome |
| --- | --- |
| Deterministic policy gate | Each request receives an ALLOW, ESCALATE, or DENY verdict with stable reason codes. |
| Shared-budget reservation | Concurrent workflows reserve the same budget atomically, preventing an aggregate overspend in supported paths. |
| Multi-agent control room | Users can run sequential or parallel synthetic finance workflows, inspect agent traces, and review each receipt. |
| Portable evidence | Policy versions, decisions, lifecycle events, and reconciliation signals are assembled into an investigation record. |
| Coverage disclosure | The application reports whether a connected path is authoritative, cooperative, observe-only, or unsupported. |
| Advisory AI layer | A local or hosted model can generate context only. It cannot approve a payment, change policy, or release a budget. |

## Product decisions

### Deterministic money decisions

The policy evaluator, budget reservation, and evidence receipt are code paths with typed inputs and reproducible outcomes. Missing policy, unsupported coverage, provider errors, or advisory-model failures never become an approval.

### Honest provider coverage

Reins does not claim it can block a transaction unless it has a mandatory control point. The control room presents coverage as a product fact rather than implying that every connected provider offers the same protection.

### Evidence after the decision

An approval alone is not enough for finance and risk teams. Reins links the request, policy version, reservation, decision receipt, agent traces, and available downstream events so an investigator can see what was permitted and what was recorded.

## Results

The current synthetic release was verified locally against PostgreSQL and a production Next.js build.

| Check | Observed result |
| --- | --- |
| Unit tests | 144 passing tests across policy, database, API, and web packages. |
| PostgreSQL integration tests | 27 passing tests, including persisted scenario execution and shared-budget behavior. |
| Parallel agent evaluation | 3 concurrent workflows completed with 12 successful agent traces and no timeouts. |
| Local workflow latency | p50 384 ms; p95 and p99 428 ms for the synthetic three-workflow evaluation. |
| Browser journey | Four parallel finance requests produced persisted traces and receipts, decreased the shared budget by $12,840, updated reports, and completed without browser errors. |

These measurements are local, synthetic release evidence. They are not production service-level objectives or claims about live payment-network performance.

## Architecture

```text
Finance or risk user
        |
        v
Next.js Control Room
        |
        v
Typed scenario and workflow APIs
        |
        +--> Advisory agents (simulation, Ollama, or Groq)
        |       Context only
        |
        +--> Deterministic policy evaluator
        |       ALLOW / ESCALATE / DENY
        |
        +--> Atomic budget reservation
        |
        +--> PostgreSQL evidence store
                Policy, receipt, traces, lifecycle events, reconciliation
```

The workspace uses Next.js 16, React 19, TypeScript, PostgreSQL, Drizzle ORM, Fastify, Better Auth, Vitest, and Playwright. Three.js is used only as an optional evidence visualization; the accessible evidence timeline and tables remain the source of truth.

## Run locally

### Prerequisites

- Node.js 24
- pnpm 11.19.0
- PostgreSQL 17 locally, or Podman with Compose support

### Setup

The repository contains safe example configuration files with local placeholder values. Copy them locally, then keep the generated files untracked.

```powershell
git clone https://github.com/Reins-AgenticAI/Reins.git
Set-Location Reins
Copy-Item .env.example .env
pnpm install --frozen-lockfile
pnpm db:up
pnpm db:migrate
pnpm db:verify
pnpm dev
```

Open `http://localhost:3000` for the landing page and `http://localhost:3000/assurance` for the Control Room.

For the isolated PostgreSQL release check:

```powershell
Copy-Item .env.test.example .env.test
pnpm db:up:test
pnpm check:release
```

## Try the demo

1. Open the Control Room at `/assurance`.
2. Choose a synthetic finance scenario or add a synthetic agent to a workflow.
3. Run the scenario in parallel mode to see shared-budget coordination.
4. Inspect the request table, policy receipt, agent trace, evidence timeline, and reports.
5. Compare allowed, escalated, and denied requests. Every displayed record is synthetic.

The optional AI layer is configured for deterministic simulation by default. Local Ollama and hosted Groq are supported only as advisory providers. Their output cannot change the payment decision.

## Evaluation

The project evaluates behavior that matters for an agentic spend-control product.

| Evaluation | What it checks |
| --- | --- |
| Deterministic replay | Equivalent normalized requests and state return the same policy verdict and receipt fields. |
| Concurrency safety | Simultaneous requests cannot reserve more than the available shared budget. |
| Idempotency | A replay returns the stored result; a request ID reused with changed payload is rejected. |
| Evidence integrity | Policy, receipt, agent traces, and lifecycle records can be retrieved as one investigation. |
| UI journey | The Control Room, reports, desktop, and mobile flows complete without browser errors. |
| Advisory resilience | Missing, malformed, timed-out, or unavailable model output is reported as unavailable and never becomes ALLOW. |

Run the local verification commands:

```powershell
pnpm format
pnpm check
pnpm check:release
pnpm eval:agents
```

The browser verifier requires an already-running local web server:

```powershell
node scripts/verify-control-room.mjs http://127.0.0.1:3000
```

## Security and data

- The public repository excludes local configuration, Vercel metadata, database dumps, certificates, private keys, and generated build output.
- Do not commit `.env`, `.env.test`, `.env.local`, `.vercel`, database dumps, API keys, Stripe credentials, or customer data.
- The example configuration files contain only local development placeholders. They do not contain deployable credentials.
- The Stripe connector is sandbox-only and disabled for public deployment. It never captures or confirms a payment.
- Reins is a synthetic portfolio application. It is not a payment processor, issuer, bank, or production compliance system.

See [SECURITY.md](SECURITY.md) for reporting guidance and [CONTRIBUTING.md](CONTRIBUTING.md) for collaboration conventions.

## Roadmap

- [x] Deterministic policy gate and typed decision receipts
- [x] Atomic shared-budget reservations and replay protection
- [x] Multi-agent Control Room with parallel synthetic finance workflows
- [x] Evidence timeline, reconciliation signals, and reports
- [x] Local AI advisory integration with fail-closed behavior
- [ ] Hosted synthetic portfolio deployment with managed PostgreSQL
- [ ] Provider sandbox adapters with explicit coverage contracts
- [ ] Customer discovery with B2B agent-platform and finance teams

## Contributors

Reins is a shared project by:

- Sai Prathap Reddy Cheluri
- Lekhashree Srinath Reddy

The project tracks shared ownership rather than assigning individual contribution credit within product artifacts.

## Project resources

- [Product requirements document](docs/Reins_PRD_Revision_1.md)
- [Milestone plan](docs/Reins_Milestone_Plan.md)
- [Local release runbook](docs/verification/m5-local-release.md)
- [Architecture foundation](docs/architecture/m1-foundation.md)
- [Security policy](SECURITY.md)
- [Contributing guide](CONTRIBUTING.md)
- [README structure reference](https://github.com/othneildrew/Best-README-Template)

<p align="right">(<a href="#readme-top">back to top</a>)</p>
