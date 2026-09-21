# Local AI Fintech Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Deliver a coherent Control Room that demonstrates real local AI-agent context work while retaining a deterministic, fail-safe spend-policy verdict.

**Architecture:** A typed assurance-package workflow accepts a finance task and injected model client. The API route adapts it to local Ollama. A focused client Control Room presents views, starts the workflow, and exposes trace/evidence without rendering legacy demo panels.

**Tech Stack:** Next.js 16.3.5, React, TypeScript, Vitest, local Ollama `qwen3:4b`; no paid services or new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-09-20-local-ai-fintech-workflow-design.md`

## Global Constraints

- All fixtures are synthetic and money uses integer minor units.
- Ollama never decides ALLOW, ESCALATE, or DENY.
- Model timeout, malformed response, unsupported state, absent policy, or provider error can never yield ALLOW.
- Use the approved off-white, charcoal, pale-sage, and forest-teal system with no blue.
- Keep the Next page server rendered; use a child client component for interaction.
- Run `pnpm format` and `pnpm check`; test a local browser journey before reporting completion.

### Task 1: Typed deterministic local-agent workflow

**Files:**
- Create: `packages/assurance/src/local-agent-workflow.ts`
- Create: `packages/assurance/src/local-agent-workflow.test.ts`
- Modify: `packages/assurance/src/index.ts`

- [ ] Write tests for a seeded $48,000 Datacore renewal whose deterministic verdict is `ESCALATE`, even when a fake model describes it as safe.
- [ ] Run the focused test and observe failure because the workflow does not exist.
- [ ] Implement typed task validation, safe model-stage calls, deterministic checks, and typed trace output.
- [ ] Run the focused test until it passes.

### Task 2: Local Ollama API boundary

**Files:**
- Create: `apps/web/src/app/api/agent-run/route.ts`
- Create: `apps/web/src/app/api/agent-run/route.test.ts`

- [ ] Write route tests for a valid synthetic task and an unavailable-model response.
- [ ] Run the route tests and observe expected failure.
- [ ] Add a server-only Ollama client with a finite timeout and an explicit 503 unavailable result; it must not fabricate a decision.
- [ ] Run route tests until they pass.

### Task 3: Control Room replacement

**Files:**
- Create: `apps/web/src/app/assurance/control-room.tsx`
- Create: `apps/web/src/app/assurance/control-room.test.tsx`
- Modify: `apps/web/src/app/assurance/page.tsx`
- Modify: `apps/web/src/app/assurance/page.module.css`
- Modify: `apps/web/src/app/assurance/page.test.tsx`

- [ ] Write UI tests for the labelled view navigation, AI workflow entry point, synthetic finance copy, and absence of legacy grocery/agent-pool labels.
- [ ] Run the focused UI test and observe failure.
- [ ] Implement one request-first Control Room with a task composer, trace, policy receipt, accessible evidence chain, and one Agent registry view.
- [ ] Run UI tests until they pass.

### Task 4: Evidence-led quality verification

**Files:**
- Modify: `tasks/todo.md`
- Create: `docs/verification/2026-09-20-local-ai-fintech-workflow.md`

- [ ] Run formatting, checks, build, focused tests, and a browser journey at desktop and mobile widths.
- [ ] Run the installed `qwen3:4b` model once through the new endpoint and record the result as a live-local verification, or record the exact blocker.
- [ ] Review the final diff for synthetic-only data, deterministic authority, no duplicate roster, no old panels, and no unverified claims.
