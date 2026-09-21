# Reins M2-M4 Assurance Design

## Decision

Reins is a local-first assurance workbench for teams evaluating agent-payment controls. It does not issue cards, move funds, or approve live transactions. The implemented slice uses synthetic provider profiles and lifecycle events, deterministic TypeScript decisions, PostgreSQL persistence, and an accessible investigation view.

## Architecture

- `packages/assurance` owns pure policy normalization, capability coverage, conformance scenarios, reconciliation, and evidence verification.
- `packages/db` persists organizations, policies, assessments, scenarios, events, findings, and evidence manifests with Drizzle.
- `apps/web` exposes authenticated organization-scoped routes and a server-rendered workspace. Client code is limited to form submission and the optional graph.
- Better Auth remains the identity boundary. Missing sessions, missing policy controls, malformed fixtures, and provider errors fail closed.
- The Three.js graph is a progressive enhancement. The semantic table and timeline are complete without JavaScript, WebGL, color, or motion.

## Domain contracts

Policy controls are explicit: currency, per-transaction amount, merchant allowlist, approval threshold, and monthly budget. Capability outcomes are `EXACT`, `NARROWER`, `BROADER`, `PREFLIGHT_ONLY`, `OBSERVE_ONLY`, `UNSUPPORTED`, or `UNKNOWN`. Only exact and narrower coverage can be autonomous-compatible; all other outcomes are visible blockers.

Provider fixtures include a schema version, source reference, observed date, evidence status, and SHA-256 digest. They are labelled synthetic and are not vendor certification. Conformance scenarios execute against a deterministic oracle and synthetic adapters. Evidence facts carry provenance, timestamps, lineage, and uncertainty. Exported manifests can be verified offline from the canonical JSON and development public key.

## User flow

1. A local user creates an account and enters a policy in minor currency units.
2. Reins normalizes and versions the policy, then compares it with two synthetic capability profiles.
3. The user runs the fixed scenario corpus and reviews divergences from the oracle.
4. Reins reconciles synthetic authorization, capture, settlement, reversal, refund, and order events.
5. The user opens the accessible evidence table/timeline or the optional Three.js relationship graph and exports a verifiable evidence bundle.

## Verification

Three acceptance families are maintained per milestone: pure domain corpus, authenticated persistence/isolation, and accessible end-to-end rendering. Existing M1 regression tests remain. Release claims distinguish implemented, simulated, tested, and unverified behavior.
