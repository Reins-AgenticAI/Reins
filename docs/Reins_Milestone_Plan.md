# Reins assurance delivery milestones

Pivoted execution companion | 19 September 2026

Contributors: Sai Prathap Reddy Cheluri and Lekhashree Srinath Reddy.

Status: implementation complete on the primary contributor environment; independent reproduction was explicitly waived by the product owner on 21 September 2026.

Authority: the user's 19 September 2026 decision to reposition Reins as an independent policy-assurance, conformance-testing, and evidence-verification application. This roadmap replaces the previous control-plane implementation sequence. It does not authorize live payments, paid services, external publication, customer outreach, or a silent change to the Revision 1 PRD.

## Product decision

Reins will not compete as another agent banking platform, card issuer, wallet, payment orchestrator, or universal spend-control plane. Current products already provide large parts of that bundle.

Reins will be a local-first evaluation application for teams that use or assess agent-payment providers. It will compare an approved policy with provider capabilities, identify weakened or unsupported controls, run deterministic adversarial scenarios, reconcile simulated lifecycle events, and produce portable evidence that can be verified without trusting the Reins interface.

The commercial hypothesis remains unproven. The application can demonstrate engineering value with synthetic data, but it cannot prove customer demand, provider behavior, certification, or production readiness.

## Product boundary

In scope:

- A canonical, versioned policy model with deterministic normalization.
- Versioned provider capability profiles with source and confidence metadata.
- Control-by-control results: exact, narrower, broader, preflight-only, observe-only, unsupported, or unknown.
- A deterministic scenario runner and reference oracle for comparing provider behavior.
- Synthetic provider adapters with deliberately different constraints and failure behavior.
- Authorization, capture, settlement, reversal, refund, and order-event reconciliation.
- Portable evidence bundles, an offline verifier, an accessible timeline and table, and an optional Three.js graph.
- A reproducible local demonstration using synthetic data and development keys.

Out of scope:

- Issuing cards, holding funds, moving money, releasing credentials, or settling transactions.
- Claiming to protect routes that do not pass through an authoritative provider control.
- Live Visa, Mastercard, Catena, Crossmint, Ramp, Stripe, Lithic, bank, or wallet integrations as a release dependency.
- Scraping provider consoles, storing production credentials, or processing customer financial data.
- Provider certification, legal conclusions, reimbursement promises, or compliance certification.
- Public cloud hosting, paid monitoring, paid databases, paid APIs, paid models, or paid CI capacity.

## Free-resource policy

Every milestone must be installable, runnable, testable, and demonstrable locally without a paid account. An optional free sandbox may be explored later, but unavailable access, expiring credits, or a vendor trial cannot block a milestone or be counted as completed functionality.

| Need | Approved free resource | Boundary |
| --- | --- | --- |
| Package and runtime | Node.js, pnpm, TypeScript | Pin supported versions; no paid runtime service. |
| Web application | Next.js and React | Local execution is the required release path. |
| API | Fastify | Keep application construction separate from process startup for tests. |
| Persistence | Local PostgreSQL with Drizzle | No hosted database requirement. The local test database is required for the release gate. |
| Authentication | Better Auth with synthetic local identities | No paid identity provider or production account. |
| Tests | Vitest and local HTTP injection/browser checks | Local checks are authoritative; hosted CI is optional. |
| Cryptography | Node.js platform cryptography with development-only keys | No paid key-management service; never represent development keys as production-safe. |
| Visualization | Three.js plus semantic HTML timeline and table | Three.js is optional presentation, never the only investigation view. |
| Collaboration | Git and GitHub Free if the contributors choose to publish | Remote hosting and CI quotas cannot be required to run the product. |
| AI assistance | None required | No model may determine an evaluation result. A local model may assist drafting later but is not a release dependency. |

Free means zero additional software, API, hosting, or transaction fees for the local demonstration. Contributor time, existing hardware, electricity, internet, and any future production compliance or partnership costs are real costs and must not be described as free.

## Architecture direction

Retain the existing pnpm workspace, TypeScript, Next.js/React, Fastify, PostgreSQL/Drizzle, Better Auth, and Vitest foundation. Add Three.js only for the M4 evidence view. Do not add Turborepo, a second database, a message broker, a paid provider SDK, or a distributed-service split without measured need.

Use five small domain modules:

1. Policy model: validates and versions the intended controls.
2. Capability model: describes what a provider claims or demonstrates it can enforce.
3. Coverage analyzer: compares policy requirements with capabilities and refuses to hide weaker semantics.
4. Conformance runner: executes synthetic scenarios against adapters and a deterministic reference oracle.
5. Evidence model: records source-labelled lifecycle facts, findings, and portable verification material.

An adapter represents a test target. It must not imply a production integration. Provider profiles and fixtures must carry a provider name, source reference, observed date, schema version, and evidence status so marketing statements cannot silently become verified behavior.

## Milestone sequence

Each milestone has five acceptance scenario families. Parameterized cases may exercise multiple inputs inside one family. Existing regression tests remain. Five families provide focused release evidence, not exhaustive coverage or a guarantee of correctness.

### M1: Reliable local foundation

Status: locally complete; second-contributor reproduction was explicitly waived by the product owner on 21 September 2026.

Goal: provide honest application scaffolding, safe database targeting, executable quality gates, and reproducible local setup.

1. Developer quality: formatting, lint, metadata validation, types, database-free tests, and production builds pass without a live database.
2. Database safety: explicit integration and release checks reject missing, remote, non-test, or query-overridden database targets without exposing credentials.
3. Real database: committed migrations and integration tests execute against an isolated local PostgreSQL test database without skips.
4. Interface behavior: the API health route and responsive navy foundation interface work through actual HTTP/browser journeys.
5. Reproduction and accessibility: setup is repeated by both contributors and focused desktop, mobile, keyboard, reduced-motion, and high-contrast checks are recorded.

Current evidence: developer quality, target safety, API behavior, builds, local PostgreSQL migrations, database integration, and focused browser checks passed. Second-contributor reproduction was explicitly waived by the product owner on 21 September 2026.

### M2: Canonical policy and coverage analyzer

Depends on: M1 completion and an approved PRD revision for the assurance product.

Goal: let an authenticated organization define a policy, load versioned provider profiles, and see exactly where policy meaning is preserved or weakened.

Deliverables: organization-scoped policy lifecycle, canonical read-back, provider profile schema, source/provenance metadata, deterministic coverage analyzer, comparison interface, and synthetic fixtures for two contrasting providers.

1. Policy lifecycle: valid policies normalize and version; ambiguous money, missing currency, invalid windows, or unsupported required fields block activation.
2. Provider profile integrity: missing version, stale source status, contradictory capabilities, unknown controls, and tampered fixtures are rejected or visibly marked unverified.
3. Coverage semantics: exact, narrower, broader, preflight-only, observe-only, unsupported, and unknown results are deterministic, explained, and ordered by safety impact.
4. Fail-safe comparison: any required broader, unsupported, or unknown control prevents a provider profile from receiving an autonomous-compatible result; no omitted control is treated as satisfied.
5. User journey: a keyboard user can create a policy, compare the two synthetic providers, inspect reasons and provenance, and save a versioned assessment.

Exit: one policy corpus and two intentionally different synthetic provider profiles produce stable, explainable results. The interface must label profiles as simulations rather than real provider certification.

### M3: Provider conformance laboratory

Depends on: M2.

Goal: test claimed provider behavior against deterministic, adversarial payment-lifecycle scenarios without moving money.

Deliverables: typed adapter contract, scenario format, deterministic reference oracle, isolated synthetic adapters, replayable runner, result diff, and comparison report.

1. Deterministic execution: identical scenario, adapter version, policy version, clock, and starting state produce identical outputs and reason codes.
2. Authorization boundaries: threshold equality, wrong currency, merchant mismatch, revoked authority, expired approval, missing policy, timeout, and adapter error never become a false compatible result.
3. State and race behavior: concurrent attempts, duplicate idempotency keys, changed payloads, lost responses, and retries are compared with the reference oracle without hiding unknown exposure.
4. Lifecycle behavior: partial and multiple capture, reversal, expiry, refund, force-posted, duplicate, late, and out-of-order events produce explicit findings.
5. Comparative report: the same scenario corpus runs against both synthetic adapters and shows claim, observed result, oracle result, divergence, reproducibility data, and limitations.

Exit: the complete corpus runs locally and produces the same signed result manifest on repeat execution with the same development key and inputs. Passing means conformance to the declared fixture contract, not certification of a real vendor.

### M4: Evidence verification and investigation

Depends on: M3.

Goal: reconstruct what policy allowed, what a simulated provider did, and what later lifecycle events reported, while keeping provenance and uncertainty visible.

Deliverables: normalized evidence records, lineage relationships, discrepancy classifier, signed portable bundle, standalone offline verifier, accessible investigation timeline/table, and optional Three.js graph.

1. Provenance: every material fact is labelled verified, provider-reported, Reins-observed, inferred, conflicting, or missing, with source and timestamp.
2. Reconciliation: seeded amount, currency, merchant, duplicate, partial, over-capture, refund, late-event, and broken-lineage cases are classified with non-violation fixtures.
3. Portable verification: an intact bundle verifies offline; protected-field mutation, missing artifacts, wrong keys, unsupported versions, and broken references fail or produce an explicit incomplete result.
4. Investigation journey: a user can move from policy control to coverage result, scenario execution, provider event, lifecycle outcome, and finding using persisted synthetic data.
5. View parity: the semantic table, timeline, and Three.js graph use the same evidence records; the complete investigation remains usable without WebGL, color, pointer input, or motion.

Exit: another local process can verify an exported bundle without application database access or network connectivity.

### M5: Reproducible assurance release

Depends on: M4.

Goal: package a truthful end-to-end synthetic evaluation product that both contributors can operate without paid resources.

Deliverables: deterministic seed and reset, pinned fixtures, evaluation report, local release commands, backup/restore exercise, security and accessibility review, performance observations, and limitations register.

1. Complete workflow: create a policy, compare profiles, run the conformance corpus, investigate divergences, export evidence, verify it offline, reset, and repeat through the real application and database.
2. Reproduction: both contributors install and run the seeded demonstration from documented prerequisites without paid credentials, vendor accounts, or runtime internet after dependency installation.
3. Security and isolation: cross-organization access, malformed fixtures, path manipulation, signature errors, secret logging, and unsafe database targets fail safely using synthetic data only.
4. Accessibility and resilience: complete keyboard operation, responsive layouts, reduced motion, high contrast, no-WebGL operation, worker restart, and database backup/restore are exercised and recorded.
5. Truthful release report: measured runtime and corpus results, fixture versions, environment, known gaps, pending checks, and unsupported claims are published without extrapolating synthetic results to real providers.

Exit: `pnpm check:release` and the documented end-to-end demonstration pass locally on both contributor environments. No optional provider sandbox may substitute for a failed local requirement.

## Commercial validation gate

Commercial validation runs alongside development but is not simulated by code. Before describing Reins as a commercial product, evidence must show that more than one unrelated qualified team:

- Uses or is actively integrating at least two agent-payment providers or control paths.
- Encounters a concrete policy-comparison, conformance, or evidence problem that native tools do not resolve adequately.
- Can provide sanitized policy and lifecycle examples or participate in a structured evaluation.
- Accepts an independent assurance tool in its security and operating model.
- Identifies a budget owner and a measurable benefit such as avoided integration work, faster incident analysis, or detected control gaps.

If this evidence does not emerge, stop expanding commercial features. Complete Reins as a transparent engineering portfolio and open local conformance harness rather than inventing demand.

## Delivery controls

- The Revision 1 PRD still describes an enforcement application. Update and approve the PRD before implementing M2 so product scope and execution do not conflict.
- Create a file-level implementation plan only when a milestone begins. Do not invent future interfaces before prerequisite evidence exists.
- Report each acceptance family as passed, failed, or pending, with commands, fixtures, and limitations.
- Preserve existing regression tests. The five-family structure limits milestone scope, not the number of necessary low-level assertions.
- Use one issue and branch per change. Critical policy, verifier, security, and evidence work requires review by the other product owner before merge.
- No milestone may depend on a payment transaction, production credential, paid service, time-limited credit, or invitation-only sandbox.
- Do not claim compatibility with a named provider unless behavior was tested against authorized provider documentation or a permitted sandbox and the exact version and boundary are stated.
