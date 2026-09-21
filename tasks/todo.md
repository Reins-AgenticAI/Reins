# Previous completed task: feasibility decision

Scope: recommend whether and how to pursue Reins under the existing free-resource and synthetic-demo constraints. No application implementation or PRD amendment.

- [x] Inspect the existing delivery plan and commercial/free-stack research.
- [x] Challenge market assumptions, initial scope, opportunity cost, and live-payment claims.
- [x] Verify current free-resource constraints against primary sources and inspect the research note.
- [x] Prepare a bounded recommendation with success criteria, stop conditions, and remaining uncertainties.

Completion evidence: source-linked feasibility note and a self-contained recommendation. Software correctness is not being re-certified by this decision review.

Evidence: `docs/research/reins-feasibility-decision-2026-09-17.md`. Format passed without changes; full check failed at web build `spawn EPERM`, after 29 passed tests and two skipped database tests. No application implementation or PRD changes.

## Active implementation: REINS-001

## Active correction: local AI Control Room

## Active architecture: parallel agent control plane

## Active architecture: hosted advisory deployment

- [x] Add a server-only advisory-provider adapter with simulation, local Ollama, and optional Groq implementations.
- [x] Preserve deterministic decisioning and safe failure semantics for every provider outcome.
- [x] Document Vercel variables, managed-database requirement, local development, and portfolio-only constraints.
- [x] Run focused provider/route tests, full quality checks, and a simulation-mode browser journey.

Design: `docs/superpowers/specs/2026-09-20-hosted-advisory-deployment-design.md`.

Completion evidence: simulation, local Ollama, and Groq selection tests; missing key, unsupported provider, malformed response, non-2xx, idempotency, and decision-boundary route tests; web coverage at 90.38% branches; Next.js production build; and a local browser run of synthetic request `SR-2049` yielding ALLOW with a receipt, synthetic advisory labels, and a budget change from $451,160.00 to $450,320.00. The deployment has not been published and no Groq account or key was created.

### Final local demo hardening (in progress)

- [x] Add a bounded local-model queue so concurrent workflow requests are serialized or rejected explicitly rather than timing out unpredictably.
- [x] Replace the remaining legacy Control Room presentation with the approved request-first fintech console and one accessible evidence rail.
- [x] Add a synthetic fintech scenario catalog and repeatable evaluation report for contention, vendor, approval, and settlement cases.
- [x] Re-run local browser, unit, integration, migration, build, accessibility, and recovery checks after the final changes.

- [x] M1: atomic shared-budget reservation and concurrency proof.
- [x] M2: durable parallel advisory-agent orchestration. Completed and verified on 20 September 2026.
- [x] M3: deterministic decision and human escalation. Completed and verified on 20 September 2026.
- [x] M4: reconciliation evidence and live Control Room. Completed and verified on 20 September 2026.
- [x] M5: evals, recovery, and reproducible demo. Completed with a successful single-workflow local Ollama post test and a recorded fail-closed concurrent-capacity boundary on 20 September 2026.

Plan: `docs/superpowers/plans/2026-09-20-parallel-agent-control-plane.md`.

M1 evidence: `docs/verification/2026-09-20-parallel-agent-m1.md`. Domain tests, real PostgreSQL concurrency and lifecycle tests, generated migration checks, database migration and connection verification, coverage gates, type checks, and production builds passed.

M2 evidence: `docs/verification/2026-09-20-parallel-agent-m2.md`. Four local Ollama advisory roles ran concurrently through the Fastify workflow command, PostgreSQL stored the workflow and ordered traces, idempotency and fail-closed cases passed, and all four roles completed in the final bounded live run.

M3 evidence: `docs/verification/2026-09-20-parallel-agent-m3.md`. Frozen synthetic request, policy, reservation, and approval bindings now create deterministic, persisted ALLOW, ESCALATE, or DENY receipts. The local end-to-end journey verified an approval-required escalation followed by an approved human review and a bound ALLOW receipt.

M4 evidence: `docs/verification/2026-09-20-parallel-agent-m4.md`. Lifecycle events and reconciliation findings are persisted and joined with workflow traces and the deterministic receipt. The Control Room now reads that investigation payload instead of static demo rows.

M5 evidence: `docs/verification/2026-09-20-parallel-agent-m5.md`. The full synthetic quality gate, browser journey, guarded recovery exercise, and local AI evaluator ran. One local Ollama-backed workflow completed with four traces; the concurrent evaluator recorded its current local capacity boundary without fabricating AI output.

- [x] Replace legacy synthetic accordions with one request-first fintech Control Room.
- [x] Add a typed, local-Ollama agent workflow that cannot alter deterministic policy authority.
- [x] Replace duplicate/placeholder visualizations with a single agent registry and accessible evidence chain.
- [x] Verify deterministic tests and one live-local model journey separately.

Plan: `docs/superpowers/plans/2026-09-20-local-ai-fintech-workflow.md`.

User authorized milestone planning and starting implementation on 18 September 2026. Roadmap: `docs/Reins_Milestone_Plan.md`. Executable plan: `docs/superpowers/plans/2026-09-18-m1-foundation.md`.

- [x] Inspect existing code, lessons, product requirements, and applicable skills.
- [x] Create full milestone sequence with five acceptance checks per milestone.
- [x] Create local branch `codex/reins-001-foundation`; no initial commit exists, so preserve the existing untracked tree rather than create a misleading baseline commit.
- [x] M1: code implemented and local PostgreSQL verified; second-contributor reproduction remains pending.
- [x] Revise and align Revision 1 with the independent assurance product before M2 implementation.
- [x] M2: canonical policy, synthetic provider capability profiles, and deterministic coverage analyzer.
- [x] M3: synthetic conformance corpus and deterministic reference oracle.
- [x] M4: lifecycle reconciliation, evidence verification, accessible investigation, and progressive Three.js graph.
- [x] M5: local reproducible assurance release verified on this contributor environment.
- [ ] M5 follow-up: backup/restore exercise. Second-contributor reproduction was explicitly waived by the product owner on 21 September 2026.

Interpretation of the test limit: five acceptance scenario families per milestone; at most five new top-level tests for M1, with literal input tables where relevant. Existing regression tests are preserved. A small test count does not prove exhaustive coverage.

Final evidence: `docs/verification/2026-09-18-m1.md`. `pnpm format` passed. `pnpm check` passed with 33 tests and both builds. The final `pnpm check:release` repeated those checks successfully, then stopped at the missing test-database configuration as intended. Real database migrations and integration remain pending, not passed. The user explicitly chose to leave database verification pending; do not install a runtime to complete it without new direction.

| M1 acceptance check | Status | Evidence |
| --- | --- | --- |
| Developer quality | Passed | Format, lint, metadata, types, 33 selected regression tests, API and web builds |
| Database safety | Passed | Two table-driven guard tests; missing configuration stops explicit integration and test migration commands |
| Real database | Pending | No local PostgreSQL runtime; verification deferred by user |
| Interface behavior | Passed | Two API HTTP integration tests, three page checks, actual local browser journey |
| Reproduction and accessibility | Partial | Setup documented; desktop, 390px, 320px and keyboard inspected; second contributor has not reproduced setup |

Independent scoped review completed; its mobile grid finding was fixed and visually rechecked. No commit, push, merge, paid service, or production integration was performed. Later milestones remain planned, not implemented.

## Roadmap pivot: 19 September 2026

The user approved repositioning Reins from a competing multi-rail payment control plane to an independent policy-assurance, conformance-testing, and evidence-verification application. Updated roadmap: `docs/Reins_Milestone_Plan.md`. Market evidence: `docs/research/reins-market-overlap-2026-09-19.md`.

- [x] Remove payment movement, credential release, live-provider integration, and universal control-plane claims from milestone scope.
- [x] Make local synthetic operation without paid accounts a non-negotiable completion requirement.
- [x] Re-sequence M2 through M5 around coverage analysis, conformance testing, evidence verification, and reproducible release.
- [ ] Update and approve the PRD before implementing M2.
- [ ] Create the M2 file-level implementation plan only after the PRD is aligned.

No M2 implementation is authorized by this roadmap update. M1 remains partially complete because real PostgreSQL verification and second-contributor reproduction are pending.

Superseded on 20 September 2026: the user later authorized installing the required free local resources. Local PostgreSQL migrations, connection verification, and the new reservation integration suite now pass; second-contributor reproduction remains pending.
