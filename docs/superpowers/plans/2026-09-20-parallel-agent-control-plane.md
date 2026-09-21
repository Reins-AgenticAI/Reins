# Parallel Agent Control Plane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Build a synthetic, local-first multi-agent spend workflow that runs advisory agents concurrently while preventing shared-budget overspend through one deterministic reservation authority.

**Architecture:** Next.js remains the Control Room. Fastify exposes workflow commands. Advisory agents run concurrently behind a typed orchestrator and write immutable context. The deterministic policy service is the sole decision authority, and PostgreSQL is the source of truth for atomic budget reservations, idempotency, workflow events, and evidence.

**Tech Stack:** Next.js 16.3.5, React, TypeScript, Fastify, PostgreSQL, Drizzle ORM, Ollama qwen3:4b, Vitest, Playwright, Podman Compose.

**Spec:** `docs/Reins_PRD_Revision_1.md`

## Global Constraints

- Synthetic data only; no live payment credentials or production tokens.
- AI-agent output is untrusted advisory context and can never produce an authorization result.
- Missing policy, missing required context, timeout, provider error, malformed model output, and budget conflict never become ALLOW.
- All monetary values use integer minor units.
- Every command and event is idempotent and replayable.
- The local release uses only free software and existing contributor hardware.

---

## Milestone 1: Atomic Budget Reservation Core

**Outcome:** Concurrent requests cannot reserve more than the shared budget, and duplicate requests return the original reservation.

**Files:**
- Create: `packages/assurance/src/budget-reservations.ts`
- Create: `packages/assurance/src/budget-reservations.test.ts`
- Modify: `packages/assurance/src/index.ts`
- Modify: `packages/db/src/schema/assurance.ts`
- Create: `packages/db/drizzle/0002_married_maddog.sql`
- Create: `packages/db/drizzle/0003_loose_captain_stacy.sql`

**Interfaces:**
- Produces: `BudgetReservationStore`, `reserveBudget()`, `commitReservation()`, `releaseReservation()`, and `expireReservations()`.
- Reservation states: `HELD`, `COMMITTED`, `RELEASED`, `EXPIRED`.

- [x] Write failing tests proving two parallel $20,000 requests cannot both reserve a $25,000 budget, a duplicate idempotency key returns the original reservation, and invalid amounts fail closed.
- [x] Run the focused test and confirm failure because the module is absent.
- [x] Implement the smallest typed reservation state machine and in-memory reference store used by deterministic tests.
- [x] Add PostgreSQL budget and reservation tables with non-negative constraints, unique idempotency scope, tenant-consistent budget references, immutable requested amount, and reservation expiry.
- [x] Generate/check the migration and rerun focused tests, type checks, and database checks.

## Milestone 2: Durable Orchestrator and Parallel Advisory Agents

**Outcome:** Intake, Vendor Context, Budget Analysis, and Evidence agents execute concurrently with deadlines and immutable trace records.

**Files:**
- Create: `packages/assurance/src/workflow-orchestrator.ts`
- Create: `packages/assurance/src/workflow-orchestrator.test.ts`
- Modify: `packages/db/src/schema/assurance.ts`
- Create: `packages/db/src/workflow-store.ts`
- Create: `packages/db/test/workflow-store.integration.test.ts`
- Create: `packages/db/drizzle/0004_bouncy_ink.sql`
- Create: `packages/db/drizzle/0005_aberrant_ben_grimm.sql`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/config.ts`
- Create: `apps/api/src/ollama-agents.ts`
- Modify: `apps/api/src/server.ts`
- Modify: `apps/api/test/app.test.ts`
- Create: `apps/api/test/ollama-agents.test.ts`
- Create: `packages/db/scripts/run-m2-live-demo.mjs`
- Modify: `.env.example`

- [x] Test parallel start, deterministic aggregation order, timeout handling, malformed outputs, retry idempotency, and cancellation.
- [x] Implement an injectable agent interface and `Promise.allSettled` orchestration with per-agent deadlines.
- [x] Persist workflow identity, canonical request hash, status, and append-only trace events in PostgreSQL.
- [x] Expose a Fastify workflow command that validates inputs and returns a workflow ID.
- [x] Verify no agent path can call the budget mutation interface or issue a decision.

## Milestone 3: Deterministic Decision and Human Escalation

**Outcome:** A frozen request, policy version, and budget snapshot produce a replayable ALLOW, ESCALATE, or DENY decision.

**Files:**
- Create: `packages/assurance/src/spend-decision.ts`
- Create: `packages/assurance/src/spend-decision.test.ts`
- Modify: `packages/db/src/schema/assurance.ts`
- Create: `packages/db/src/decision-store.ts`
- Create: `packages/db/test/decision-store.integration.test.ts`
- Create: `packages/db/drizzle/0006_brief_metal_master.sql`
- Modify: `apps/api/src/app.ts`
- Create: `apps/api/src/decision-service.ts`
- Create: `apps/api/test/decision-service.test.ts`

- [x] Test most-restrictive precedence, absent context, stale policy, budget conflict, approval expiry, and material request mutation.
- [x] Bind decisions to canonical request hash, policy version, evaluator version, reservation ID, and reason codes.
- [x] Add human-review state transitions with expiry and explicit approver identity.

## Milestone 4: Reconciliation, Evidence, and Control Room

**Outcome:** Users can trace request, context, reservation, decision, provider event, and settlement in one accessible investigation view.

**Files:**
- Modify: `packages/assurance/src/index.ts`
- Create: `packages/assurance/src/reconciliation-v2.test.ts`
- Create: `packages/assurance/src/reconciliation-v2.ts`
- Modify: `packages/db/src/schema/assurance.ts`
- Create: `packages/db/src/evidence-store.ts`
- Create: `packages/db/test/evidence-store.integration.test.ts`
- Create: `packages/db/drizzle/0007_tearful_falcon.sql`
- Create: `apps/web/src/app/api/control-room/route.ts`
- Create: `apps/web/src/app/api/control-room/route.test.ts`
- Modify: `apps/web/src/app/assurance/control-room.tsx`
- Modify: `apps/web/src/app/assurance/page.module.css`

- [x] Test duplicate, late, partial, excess, reversal, refund, currency, and broken-lineage cases.
- [x] Replace static Control Room data with workflow and evidence records.
- [x] Show parallel agent states, deterministic decision, reservation conflict, and settlement mismatch without duplicate rosters or decorative graphs.
- [x] Verify keyboard, reduced-motion, mobile, and WCAG 2.2 AA behavior.

## Milestone 5: Evals, Load, Recovery, and Reproducible Demo

**Outcome:** The portfolio demo proves the architecture using repeatable synthetic workloads and one local-model run.

**Files:**
- Create: `scripts/run-parallel-spend-eval.mjs`
- Create: `docs/verification/parallel-agent-control-plane.md`
- Modify: `README.md`

- [x] Automate the combined concurrent workload and end-to-end local AI evaluator as `scripts/run-parallel-spend-eval.mjs`.
- [x] Report the resulting local AI availability and latency metrics without invented production claims.
- [x] Document local setup, synthetic scope, known limitations, and guarded recovery steps.
- [x] Run `pnpm format`, `pnpm check`, database migration/verification, production builds, and browser journeys.
