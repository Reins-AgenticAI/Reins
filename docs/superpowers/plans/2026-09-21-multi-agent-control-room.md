# Multi-Agent Control Room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-request Control Room with a persisted multi-agent scenario runner and the approved graph-first Reports page.

**Architecture:** A typed scenario catalogue feeds a new batch route that invokes the existing single-workflow route semantics for each request. Parallel mode uses `Promise.allSettled`; Sequential mode awaits each request in catalogue order. The database remains the authority for workflow, decision, reservation, and evidence state; UI derives every queue, budget, receipt, timeline, and report datum from API responses.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, Drizzle/PostgreSQL, existing `@reins/assurance` and `@reins/db` packages.

**Spec:** `docs/superpowers/specs/2026-09-21-multi-agent-control-room-design.md`

## Global Constraints

- Synthetic data only; never store credentials or expose production payment execution.
- Only deterministic code can decide ALLOW, ESCALATE, or DENY.
- Use integer minor units for money; preserve idempotency and atomic database reservation semantics.
- Timeout, provider error, malformed advisory output, unsupported control, and missing policy fail closed.
- Preserve current Reins off-white, ink, teal, neutral-border visual system and WCAG 2.2 AA contrast.
- Keep Stripe Sandbox disabled for public deployments.
- Do not modify `apps/web/next-env.d.ts` unless the framework build regenerates it.

---

## File map

- Create `packages/assurance/src/control-room-scenarios.ts`: scenario catalogue and typed scenario/mode contracts.
- Create `packages/assurance/src/control-room-scenarios.test.ts`: catalogue and outcome expectations.
- Modify `packages/assurance/src/index.ts`: export the scenario contract.
- Create `apps/web/src/app/api/scenario-run/route.ts`: validate a run command and execute unique synthetic tasks.
- Create `apps/web/src/app/api/scenario-run/route.test.ts`: route, mode, fail-closed, and response tests.
- Modify `apps/web/src/app/api/agent-run/route.ts`: export a testable `runSyntheticTask` service with no module-wide queue bottleneck for simulation.
- Modify `apps/web/src/app/api/control-room/route.ts`: return recent workflow investigations and budget summary, not only one latest workflow.
- Modify `apps/web/src/app/assurance/control-room.tsx` and `page.module.css`: approved Control Room, agent roster, evidence, report and accessible chart views.
- Modify `apps/web/src/app/assurance/control-room.test.tsx` and `page.test.tsx`: server-rendered content and UI state helpers.
- Modify `packages/db/test/evidence-store.integration.test.ts`: make duplicate lifecycle event behavior explicit and consistent with store idempotency.
- Modify `scripts/run-parallel-spend-eval.mjs`: read real trace status fields and report non-null traces.
- Modify `README.md`: local run, scenario test, and explicit synthetic-only boundaries.

## Task 1: Repair the PostgreSQL evidence release blocker

**Files:**
- Modify: `packages/db/test/evidence-store.integration.test.ts:83-99`
- Modify only if the test demonstrates unsafe behavior: `packages/db/src/evidence-store.ts:54-73`

**Consumes:** `PostgresEvidenceStore.append` uses `onConflictDoNothing`, which makes identical provider event IDs idempotent.

**Produces:** A documented test contract: an identical lifecycle delivery returns the existing semantic event and does not add a second record; a colliding ID with changed fields fails explicitly.

- [ ] Write two failing assertions: identical duplicate append results in exactly two lifecycle records; changed duplicate payload rejects with an event-conflict error.
- [ ] Run `pnpm --filter @reins/db test:integration -- evidence-store.integration.test.ts` and capture the current duplicate behavior.
- [ ] Add a lookup of the existing lifecycle row when insert conflicts; compare immutable fields (`kind`, `amountMinor`, `currency`, `source`, `occurredAt`, `parentEventId`). Return the stored event for an exact replay and throw `Lifecycle event conflicts with existing event` for a changed replay.
- [ ] Re-run the focused integration test and verify both cases pass.
- [ ] Run `pnpm check:release`; expected result: all release commands exit 0.
- [ ] Commit: `fix: preserve lifecycle event idempotency`.

## Task 2: Define the finance scenario catalogue

**Files:**
- Create: `packages/assurance/src/control-room-scenarios.ts`
- Create: `packages/assurance/src/control-room-scenarios.test.ts`
- Modify: `packages/assurance/src/index.ts`

**Consumes:** `FinanceTask` from `local-agent-workflow.ts` and deterministic policy merchant/amount rules.

**Produces:** `ControlRoomScenario`, `ScenarioExecutionMode`, `controlRoomScenarios`, and `getScenario(id)`.

- [ ] Write tests expecting `quarter-close-spend-controls` to include four unique request IDs, the expected `ALLOW`, `ALLOW`, `DENY`, `ESCALATE` decision mix, and unique idempotency keys per run nonce.
- [ ] Run `pnpm --filter @reins/assurance test -- control-room-scenarios.test.ts`; expected: failing module import.
- [ ] Implement the immutable catalogue with Engineering/Datacore $840, Research/Datacore $4,800, Platform/BuildKit $18,500, and Compliance AML provider $7,200 records; include an explicit `category`, vendor, cost centre, and deterministic expected outcome.
- [ ] Export the types and catalogue from `packages/assurance/src/index.ts`.
- [ ] Re-run focused tests; expected: all pass.
- [ ] Commit: `feat: add multi-agent finance scenarios`.

## Task 3: Batch orchestration and persisted response

**Files:**
- Modify: `apps/web/src/app/api/agent-run/route.ts`
- Create: `apps/web/src/app/api/scenario-run/route.ts`
- Create: `apps/web/src/app/api/scenario-run/route.test.ts`

**Consumes:** Task 2 catalogue, existing `runLocalAgentWorkflow`, `reserveBudgetInDatabase`, workflow and decision stores.

**Produces:** `POST /api/scenario-run` accepting `{scenarioId, mode, runId}` and returning ordered per-request results plus shared budget.

- [ ] Write route tests for valid Parallel and Sequential commands, invalid mode (400), unknown scenario (400), and unavailable dependency (503 with no ALLOW result).
- [ ] Write a route test where two parallel tasks compete for a constrained shared budget; assert exactly one reservation succeeds and no response is incorrectly ALLOW.
- [ ] Extract the body of current `POST /api/agent-run` into an exported `runSyntheticTask(input, dependencies)` function; retain the old endpoint as a thin validator and caller.
- [ ] Implement the scenario route with a `runId` appended to each catalogue request ID/idempotency key. Parallel uses `Promise.allSettled`; Sequential awaits each call. Convert rejected task promises to a synthetic non-ALLOW error result with no receipt.
- [ ] Query the budget after all tasks finish and return it with the ordered results.
- [ ] Run focused route tests, then `pnpm check`.
- [ ] Commit: `feat: run persisted multi-agent scenarios`.

## Task 4: Control Room data query and UI interaction

**Files:**
- Modify: `apps/web/src/app/api/control-room/route.ts`
- Modify: `apps/web/src/app/assurance/control-room.tsx`
- Modify: `apps/web/src/app/assurance/page.module.css`
- Modify: `apps/web/src/app/assurance/control-room.test.tsx`

**Consumes:** Task 3 scenario response and existing investigation/evidence records.

**Produces:** A live queue, scenario selector, Parallel/Sequential mode, advisory agent roster, budget state, and evidence timeline bound to persisted results.

- [ ] Write UI tests for the four request rows, Parallel/Sequential controls, agent-add control, and absence of customer-visible fault-injection controls.
- [ ] Change `/api/control-room` to return a bounded ordered list of latest investigations for the synthetic organization and current budget.
- [ ] Replace the one-request modal with scenario selector and mode control. Submit to `/api/scenario-run`; disable run only while this run is active; refresh queue/budget after it completes.
- [ ] Render requesting agents separately from advisory traces, use direct non-color decision labels, and render a per-run unified timeline in chronological order.
- [ ] Add only advisory agent names locally in the UI; do not inject them into the deterministic decision path.
- [ ] Verify keyboard dialog handling, focus return, labels, busy state, and narrow viewport layout.
- [ ] Run web-focused tests and `pnpm check`.
- [ ] Commit: `feat: add multi-agent control room`.

## Task 5: Graph-first Reports view

**Files:**
- Create: `apps/web/src/app/assurance/reports-data.ts`
- Create: `apps/web/src/app/assurance/reports-data.test.ts`
- Modify: `apps/web/src/app/assurance/control-room.tsx`
- Modify: `apps/web/src/app/assurance/page.module.css`

**Consumes:** persisted workflow/decision/budget/lifecycle records from Task 4.

**Produces:** month-selectable report model with chart data and accessible equivalents.

- [ ] Write data-model tests for monthly comparison, weekly spend buckets, budget committed/remaining totals, decision counts, and review-SLA grouping from fixed synthetic fixtures.
- [ ] Implement pure `buildReportModel(investigations, budget, selectedMonth)` using integer minor units until display formatting.
- [ ] Add the Reports navigation view with a real `<select>` month control, two-dimensional column charts with amounts above bars and money axes, weekly date labels, stacked budget bar, centered auto-approval ring with legend, SLA bar, and evidence table.
- [ ] Add an off-screen chart summary and visible direct labels so no outcome relies on color; preserve user access to the table.
- [ ] Run web tests and manually inspect desktop and 375px viewport.
- [ ] Commit: `feat: add graph-first reports`.

## Task 6: End-to-end proof and evaluator repair

**Files:**
- Modify: `scripts/run-parallel-spend-eval.mjs`
- Modify: `README.md`
- Modify/create: `scripts/verify-control-room.mjs`

**Consumes:** Tasks 1-5.

**Produces:** reproducible local evidence for parallel requests, UI behavior, and release status.

- [ ] Change evaluator trace parsing to use `status` from persisted/returned trace records instead of reading an absent field; assert no reported trace status is null.
- [ ] Add browser script: open `/assurance`, select Parallel, run scenario, wait for four rows, assert expected decision labels, check changed budget, select Reports, change month, and assert chart/table text.
- [ ] Add README commands for starting PostgreSQL, running local app/API, invoking scenario eval, running browser verification, and the synthetic-only/Stripe-disabled deployment boundary.
- [ ] Run `pnpm format`, `pnpm check`, `pnpm check:release`, `pnpm eval:agents`, and the browser verifier against a fresh local server.
- [ ] Record exact command outputs in the delivery note; do not claim hosted readiness.
- [ ] Commit: `test: verify multi-agent control room`.

## Plan self-review

- Spec coverage: Tasks 2-4 implement multi-agent scenarios, agent roles, atomic budget display, queue, and timeline. Task 5 implements Reports. Task 1 and Task 6 satisfy release and verification requirements.
- Scope: live-money behavior, public Stripe execution, fault injection UI, and deployment are excluded.
- Type consistency: scenario tasks use `FinanceTask`; task execution returns persisted workflow IDs; report model derives only from persisted investigations and budget data.
