# M2-M4 Assurance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the synthetic, policy-assurance and evidence-verification vertical slice through M4.

**Architecture:** Keep pure deterministic domain logic in `packages/assurance`, persistence in Drizzle, and authenticated presentation in Next.js. Three.js is only a progressive enhancement over the accessible evidence table and timeline.

**Tech Stack:** TypeScript, Vitest, Next.js, React, Better Auth, PostgreSQL, Drizzle, Three.js, Node crypto.

**Spec:** `docs/superpowers/specs/2026-09-19-m2-m4-assurance-design.md`

## Global Constraints

- Synthetic data only; no payment credentials, live provider calls, paid services, or model-controlled decisions.
- Integer minor units for money and fail-closed behavior for unknown or unsupported controls.
- Organization isolation is mandatory for every persisted record.
- Semantic evidence views are primary; Three.js cannot be the only representation.
- Run formatting, lint, typecheck, unit tests, builds, migrations, and integration tests before completion.

### Task 1: Pure assurance domain

Create `packages/assurance/src/index.ts` and table-driven tests. Implement policy normalization, two synthetic profiles, stable coverage analysis, scenario execution, reconciliation, canonical evidence manifests, and offline verification. Add the workspace package and root scripts.

### Task 2: Database persistence

Add assurance schema tables and migration. Export schema from `packages/db`. Persist organizations, policy versions, assessments, scenario runs, lifecycle events, findings, and evidence manifests. Keep database initialization lazy.

### Task 3: Authenticated web workflow

Add organization-scoped assessment routes and an authenticated workspace. Validate request bodies through the pure domain package, never trust client organization IDs, and return explicit validation/coverage errors.

### Task 4: Conformance and evidence views

Add scenario-run and evidence-export routes plus semantic table and timeline components. Use synthetic fixtures and display provenance, uncertainty, and limitations.

### Task 5: Three.js progressive enhancement

Add a client-only relationship graph with explicit pickable nodes and accessible selection text. Respect reduced motion, resize from the canvas bounds, and preserve a no-WebGL fallback.

### Task 6: Verification and documentation

Update the PRD/roadmap status, run all required commands, inspect the rendered UI, and record passed, simulated, and pending claims in `docs/verification/`.
