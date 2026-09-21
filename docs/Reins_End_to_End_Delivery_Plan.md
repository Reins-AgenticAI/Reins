# Reins: End-to-End Delivery and Gap-Closure Plan

Revision 1 planning companion | 17 September 2026

Shared product owners: Sai Prathap Reddy Cheluri and Lekhashree Srinath Reddy.

Status: proposal for agreement, not authorization to implement additional milestones. The source of approved product scope remains [Reins PRD Revision 1](Reins_PRD_Revision_1.md). This plan does not replace that document, change its revision, or certify the current application as production ready.

## 1. Executive assessment

Reins is viable as a focused engineering product, but its opportunity is narrower than the original pitch suggests. Agent budgets, card controls, approvals, deterministic rules, and transaction dashboards already exist. Reins should not be positioned as the first agent spending-control product or as a universal firewall for every payment protocol.

Recommended positioning: Reins helps an agent platform prove which customer spending rules were enforceable across its connected providers, apply a shared budget at mandatory control points, and investigate differences between approved authority and observed financial outcomes.

The first customer hypothesis is an agent platform or vertical software business serving SMB purchasing teams. The platform must control the payment execution path. Finance administrators and investigators are the daily users. Start with one purchasing workflow, not a consumer wallet, network gateway, or general expense-management suite.

The end product is a functioning local web application with authentication, organization permissions, policy management, deterministic authorization, human approval, a mock payment-provider lifecycle, reconciliation, verifiable evidence exports, and an optional Three.js evidence view. It includes reproducible setup, migrations, automated tests, failure demonstrations, and a documented integration contract. External sandboxes are optional and accurately labeled.

This is an end-to-end synthetic reference application. Live-money availability, issuer acceptance, legal readiness, and production reliability are separate achievements. No design or test suite makes a financial application bulletproof.

## 2. Market validation and defensibility

| Existing alternative | What primary documentation establishes | Implication for Reins |
|---|---|---|
| Crossmint agent payments | Agent payment infrastructure and scoped payment options, including card-based controls. | Do not describe all competing agent payment tools as crypto-only. Budgets and permissions are not a unique wedge. |
| Ramp Agent Cards | Agent-oriented payment controls within an existing spend-management platform. | A standalone agent-card dashboard is insufficient differentiation. |
| Lithic authorization rules | Programmable authorization rules and associated testing capabilities. | Deterministic policy execution and explainability are engineering requirements, not a moat by themselves. |
| Stripe Issuing | Real-time authorization callbacks, provider deadlines, and fallback behavior. | An integration must model provider behavior, not just return a local verdict. |
| Visa Intelligent Commerce Connect | Agent and merchant orchestration, spending controls, and multiple network/protocol integrations. | Calling Visa exclusively merchant-side would misstate the competition. Access and production eligibility remain separate questions. |
| AP2 and commerce protocols | Versioned exchange of authorization and commerce evidence. | Protocol support is interoperability work, not evidence that Reins can settle or block every payment. |

Sources: [Crossmint](https://docs.crossmint.com/agents/how-agents-pay), [Ramp](https://docs.ramp.com/developer-api/v1/agent-cards), [Lithic](https://docs.lithic.com/docs/authorization-rules-v2), [Stripe agent Issuing](https://docs.stripe.com/issuing/agents), [Visa](https://corporate.visa.com/en/products/intelligent-commerce-connect.html), [AP2 specification](https://github.com/google-agentic-commerce/AP2/blob/main/docs/ap2/specification.md). Stripe also documents agent-oriented controls and reconciliation, so those cannot be claimed as absent from incumbent offerings. Documentation is evidence of described capability, not proof of unrestricted account access, free commercial use, or production integration by Reins. See the [dated competitor research](research/reins-competitive-validation-2026-09-17.md) for availability details.

### Differentiation hypotheses to validate

1. Policy fidelity across providers: show the exact coverage and semantic differences for each required rule before activation. A required merchant restriction must not disappear merely because a connector only supports amount limits.
2. Shared exposure accounting: combine committed spend and outstanding reservations across integrated execution paths. Explicitly exclude bypass paths from prevention claims.
3. Authorization-to-outcome evidence: explain which policy, request, approval, and provider events support a decision, and where capture or settlement departed from it.
4. Portable verification: export a signed, versioned bundle with an offline verifier, explicit missing evidence, and source provenance. A Reins signature attests to the bundle, not automatically to the truth of every upstream assertion.
5. Integration conformance: provide reusable failure fixtures so a platform can test a new adapter against the same behavioral contract. This can be a distribution channel for a small team.

These are candidate differentiators as a combination, not verified exclusive features. Native providers could add them. Defensibility would come from trustworthy integrations, a well-tested event model, adoption, and accumulated conformance knowledge, not merely from supporting many protocol names.

Before expanding scope, conduct five to eight formative interviews with platform engineers and finance operators and observe an actual investigation workflow with synthetic or redacted examples. This sample size is a planning choice, not a statistical market benchmark. Compare the proposed workflow with their existing provider dashboard and internal scripts. Record integration authority, frequency of cross-provider cases, investigation time, willingness to adopt, and why the incumbent solution is insufficient. Reconsider the positioning if customers rarely need multiple providers or will not route execution through Reins.

## 3. Current implementation versus the intended product

Repository inspection found a foundation, not the complete payment-control application.

| Area | Present evidence | Remaining work |
|---|---|---|
| Workspace | pnpm workspace, TypeScript, shared packages, formatting and check scripts. | Preserve the simple structure; align runtime requirements and verify setup on both machines. |
| Web | Next.js and React application shell. | Functional policy, approval, transaction, investigation, and settings flows. |
| API | Fastify construction separated from startup; health endpoint. | Authenticated, tenant-scoped domain endpoints and provider callbacks. |
| Identity and database | Better Auth setup, Drizzle/PostgreSQL, authentication tables. | Organization membership, roles, agent credentials, policy versions, budget ledger, approvals, lifecycle events, cases, and evidence. |
| Tests and CI | Unit/integration structure, coverage checks, PostgreSQL CI service. | Business safety cases, provider contracts, browser journeys, recovery, load, and security testing. |
| Database-test behavior | Some tests skip when the database URL is absent. | A release job must fail if required database tests cannot run; a skipped suite is not a pass. |
| Roadmap copy | Application shell refers to Three.js in M5; current PRD places evidence experience in M4. | Align user-facing claims with actual milestone scope. |

Repository checks were run during this planning pass. `pnpm format` passed without changes. `pnpm check` passed formatting/lint, migration metadata validation, and type checking, then failed in the web coverage test run: `src/lib/auth.lazy.test.ts` exceeded its 5,000 ms test timeout. API tests passed 10 cases; database tests passed 7 and skipped 2; web tests passed 11 and failed 1. The command stopped before the build. The timeout's root cause has not been established, and skipped database tests are not verified database behavior. Resolve these M1 verification gaps before calling the foundation fully checked. No application fix was made in this planning pass. An existing coverage percentage is not evidence that unimplemented payment behavior is safe.

## 4. Product behavior and scope decisions

For the first complete slice, use a synthetic USD purchasing workflow: a calendar-month budget, an explicit business timezone, approved merchants, a per-request human-approval threshold, an agent identity, and revocation. Propose USD-only execution for the first release; reject unsupported currencies instead of silently converting. This is a scope clarification to agree before changing FR1, not an already approved narrowing of the PRD.

Example: a $200 monthly budget with human approval required above $50. A $40 request can be authorized and reserved automatically. A $75 request requires a valid approval, then a fresh policy and budget check. Exactly $50 does not trigger an “above $50” threshold. An approved $40 request that later captures $47 produces an excess-capture case, not a retroactive claim that Reins prevented the extra $7.

The application must distinguish a policy verdict from a provider's financial outcome. Reins ALLOW means its own conditions were satisfied and budget reserved; it does not mean that the provider accepted, captured, or settled the payment. Reins DENY does not erase an externally observed charge.

Define rule precedence explicitly: a hard prohibition wins over an approval threshold, and a human approval cannot override a hard budget, revoked agent, missing required control, or invalid request. Any permitted exception must be an explicit policy feature with its own bounded authority, not an unrestricted approve button. Evaluate all relevant rules and retain stable reason codes for the decision.

Recommended V1 budget accounting is gross committed spend plus unresolved reservations. Refunds are recorded but do not automatically replenish spending authority. Document the treatment of taxes, shipping, partial capture, cancellations, month boundaries, and reversals. Different accounting semantics later require a new policy version and tests.

For provider coverage, use two independent dimensions instead of mixing labels:

- Control-point strength: authoritative, cooperative, observe-only, unsupported.
- Translation fidelity: exact, narrower, broader, unsupported.

Attach the mechanism, version, data freshness, known fallback exceptions, and reason. Preflight-only is a mechanism limitation, not a synonym for authoritative. Block autonomous activation when a required rule would be silently weakened. Conservative narrowing must be visible and explicitly accepted.

Select AP2 v0.2 validation and ACP evidence mapping for the planned protocol milestone; defer UCP until a customer need warrants it. Pin the actual specification revision and fixtures at implementation time. Different protocols have different roles and cannot be treated as interchangeable payment networks.

## 5. Critical gaps and acceptance tests

| Gap or failure mode | Required design decision | Test that demonstrates the protection |
|---|---|---|
| Execution bypasses Reins | Only claim prevention where an unavoidable credential, execution, or callback gate exists. | A bypass scenario is shown as uncovered; the UI never labels it protected. |
| Tenant or role confusion | Verify organization, actor, agent scope, and resource ownership on every operation, including exports and worker jobs. | A user from organization A cannot read, approve, mutate, or export organization B data. |
| Concurrent spending | Atomically evaluate and reserve every applicable budget in PostgreSQL; lock consistently and retry transaction conflicts safely. | Three concurrent $80 attempts against $200 cannot all reserve successfully. |
| Duplicate requests | Scope idempotency by organization and operation; bind it to a canonical request hash. | A retry returns the same outcome; reuse with a different payload is rejected. |
| Human approval races | Bind approval to request hash, policy version, identity, expiry, and one-time consumption. Recheck policy, revocation, and budget on execution. | Changed cart, expired approval, revoked policy, and simultaneous redemptions cannot execute with stale authority. |
| Approval deadline | Use pre-approval or decline-and-retry where the provider cannot wait. Do not hold a callback open for a human. | Slow human action cannot result in an accidental timeout approval. |
| Unknown provider outcome | Keep exposure reserved when a request may have executed before the connection failed. Resolve via provider evidence or explicit investigation. | A lost response does not free funds for another request and cause double exposure. |
| Crash between database and provider work | Use a durable outbox, provider idempotency where available, and recoverable attempt states. Never hold database locks during provider network calls. | Crash before dispatch, after dispatch, and before acknowledgment; recovery does not duplicate payment intent. |
| Duplicate or out-of-order callbacks | Preserve raw synthetic source events, deduplicate by stable source identifiers, and derive state through validated transitions. | Refund-before-capture delivery, duplicate capture, reversal, and late settlement yield consistent results. |
| Partial and excess capture | Keep authorized, captured, settled, reversed, and refunded amounts distinct. Record unexpected external events even if they violate a policy. | Multi-capture and over-capture produce accurate balances and cases rather than dropping evidence. |
| Untrusted classifications | Derive merchant/category/currency from the best available verified source; never trust an agent's unsupported label. | Relabeling a disallowed purchase as groceries does not bypass controls. |
| Revocation and kill switch | Check current revocation immediately before authority release; suspend by agent, policy, adapter, or organization. | New authority stops; already executed transactions remain visible and reconcile normally. |
| Signing, replay, and key rotation | Follow each protocol's verification rules; bind issuer, audience, expiry, nonce, and protected fields as applicable. Separate development signing keys from payment credentials. | Invalid, expired, wrong-audience, replayed, and retired-key messages fail correctly. |
| Evidence tampering | Append-only application permissions, deterministic serialization, signed manifests, and verifiable artifact hashes. | Protected-field mutation fails verification; missing artifacts are identified. Explain limits against a fully compromised signing system. |
| Money and time ambiguity | Integer minor units, safe serialization, explicit currency and timezone, and versioned calendar-period rules. | Boundary amounts, integer limits, month rollover, leap dates, and daylight-saving transitions are covered. |
| Silent dependency drift | Pin contracts, validate configuration, monitor adapter freshness, and reject unknown critical schema changes. | A changed required field or stale capability does not become ALLOW. |
| Operational blindness | Persist reason codes, correlation IDs, event lag, unknown exposure, reconciliation backlog, and provider timeout metrics without secrets. | Failure injection creates an actionable local alert or visible operational exception. |
| Lost database or signing material | Document local backup, restore, migration recovery, and key handling. | Restore a backup and verify historical bundles and ledger totals on a clean environment. |

Atomic reservations prevent Reins from granting excessive authority within its control boundary. They cannot guarantee that a network will never post a late or excess financial event. Report those two outcomes separately.

PostgreSQL's default isolation is not automatically sufficient for multi-row financial invariants. Choose row locking or serializable transactions based on the implemented invariant, with bounded retries and contention tests. See [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html).

## 6. Technical architecture and free-resource choices

Keep a modular monolith: one web application, one API, and PostgreSQL. A background worker may run as a separate process from the same codebase when reliable delivery requires it. Do not introduce microservices, Kafka, Redis, a vector database, or Turborepo without demonstrated need.

```text
Finance user / approver                 Agent client
          |                                 |
      Next.js web                     Authenticated API
          |                                 |
          +------------ Fastify ------------+
                           |
          Policy + authorization + evidence modules
                           |
                PostgreSQL transaction boundary
            budgets / ledger / approvals / inbox / outbox
                           |
                 Durable adapter dispatch and ingestion
                           |
          Mock issuer | protocol fixtures | optional sandbox
```

| Component | Planned choice | Reason and cost boundary |
|---|---|---|
| Runtime and language | Node.js 24, TypeScript, pnpm workspaces | Align development with existing CI. pnpm installs dependencies and manages the workspace; no Turborepo is needed yet. |
| Frontend | Existing Next.js and React; server components by default | Keep current investment. Client components only for interactive forms, live views, and the graph. |
| UI foundation | Existing styles and navy tokens; accessible components where needed | Consistency without a second design framework or paid template. |
| API | Existing Fastify with typed schemas and generated API documentation | Small testable endpoints; construction remains separate from startup for `inject` tests. |
| Database | PostgreSQL 17 and existing Drizzle migrations | Durable transactional state and a real relational ledger. Pin a reviewed image version or digest for reproducibility. |
| Authentication | Existing self-hosted Better Auth; server-side organization authorization | Authentication is not tenant isolation. Approval permissions require explicit domain checks. |
| Policy execution | Pure deterministic TypeScript evaluator plus transactional reservation service | No language model in the payment authority path. |
| Optional AI drafting | Local Ollama with a hardware-appropriate, license-reviewed model and structured output | No paid inference requirement. Structured entry remains fully functional when AI is disabled. |
| Evidence visualization | Three.js; add React Three Fiber only if it simplifies the implementation | Optional, lazy-loaded selected-case graph. No WebGL dependency for core work. |
| Tests | Vitest, fast-check, Playwright, axe-core, and a local load tool such as k6 | Unit, property, browser, accessibility, and performance coverage using free tooling. |
| Local runtime | Podman Desktop and Compose | Existing-machine development without a paid container subscription. Bind development services to localhost. |
| Collaboration and CI | GitHub Free, Issues, pull requests, Actions standard runners | Public and private repository capabilities differ; control artifact retention and usage. |
| Security verification | Dependency audit, Gitleaks, container scan, and targeted OWASP ZAP checks | Automated signals plus manual threat review; not a substitute for an independent live-launch assessment. |
| Operations | Structured redacted logs, health/readiness checks, local metrics and tracing | Add an observability backend only when a measured operational need justifies it. |

Existing lockfile versions are starting points, not a claim that all dependencies are current or vulnerability-free. Review compatibility, advisories, licenses, and exact versions during the next approved implementation issue.

Zero additional software/cloud spend is achievable for the local synthetic application. Hardware, electricity, internet, existing Codex access, and future commercial payment arrangements are not free. The application must not depend on the user's Codex subscription at runtime. Do not promise free public production hosting, managed backups, uptime, transactional email delivery, commercial issuer access, or security certification.

Use local logs or a local email catcher for development messages; do not expose them publicly. An internet-facing pilot requires a separate verified identity, abuse-prevention, account-recovery, and operational design. Provider sandboxes can be enabled only after access and pricing are checked; no payment card or paid plan is required for the core demo.

Relevant sources: [Podman Desktop](https://podman-desktop.io/), [Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs), [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions). JSON-schema-constrained model output still requires semantic validation and explicit user confirmation.

### Required zero-paid-service demo

The complete demonstration must work without an external issuer account, paid API, cloud database, paid model, payment card, or public hosting. After initial dependency and container downloads, the required synthetic scenarios must run without internet access. Local Git remains usable without GitHub; CI can be reproduced locally if hosted quotas are exhausted.

| Demo dependency | Free local replacement | What remains real |
|---|---|---|
| Merchant checkout | Synthetic catalog, orders, merchants, and receipts | Request validation, policy evaluation, and stored event lineage. |
| Payment provider | Two local provider simulators with different control and lifecycle capabilities | Adapter boundaries, shared budget ledger, webhook verification using development keys, retries, and reconciliation. |
| Purchasing agent | Scripted local agent clients calling the real API; optional local-model client later | Agent authentication, scoped authority, decisions, and evidence. A scripted client is labeled as such. |
| Financial data | Seeded organizations, users, agents, policies, and monetary events | Real PostgreSQL persistence, tenant isolation, and calculations using integer minor units. |
| Human approval | Two local user sessions in different browser profiles | Real role checks, expiry, request binding, and audit entries. |
| Notifications | In-app inbox and local development mail capture if needed | Approval and case state transitions, without paid email delivery. |
| Evidence and visualization | Local signed files, verifier, timeline/table, and Three.js | Export integrity, provenance labels, and accessible equivalent views. |
| Demonstration sharing | Local live presentation or a screen recording using existing/free software | Reproducible proof without a publicly exposed financial application. |

Use a deterministic seed and an explicit demo reset operation restricted to the dedicated synthetic database. Do not provide a reset operation against arbitrary connection strings. Planned commands such as `demo:seed`, `demo:scenario`, and `demo:verify` are proposed implementation work, not commands that exist today.

The scripted presentation must include: a valid automatic purchase; a human-approved exception; a hard denial; simultaneous requests across two simulated routes competing for one budget; a replayed request; a lost provider response that retains its reservation; a late excess capture that opens a case; a refund; an unsupported required control that blocks activation; and a tampered evidence export that fails verification. Also show organization isolation and equivalent graph/table evidence.

For the cross-provider budget demonstration, configure the approval threshold so it does not mask the budget condition, or obtain the required approvals first. Reset between independent financial scenarios using the dedicated fixture database, and show the selected seed and current scenario. This makes the demo repeatable without pretending that simulated integrations establish real network certification.

The local user journey, persistence, authorization engine, and evidence system are implemented software, not slide-only mockups. Only external commerce and payment execution are simulated. Any optional AI model must have a suitable license and fit existing hardware; inability to run that model must not break the core demo.

### Module boundaries

Keep public interfaces narrow: policy validation and activation; authorization of a canonical request; approval of a frozen request; ingestion of a provider event; reconciliation of a transaction; export and verification of evidence. Keep locking, ledger updates, canonicalization, and retry mechanics behind these interfaces.

Introduce an adapter seam where mock and external behavior genuinely differ, not one abstraction per protocol acronym. Core records include Organization, Membership, Agent, PolicyVersion, AuthorizationRequest, Decision, Approval, Reservation, ProviderAttempt, LifecycleEvent, ReconciliationCase, and EvidenceManifest. Carry organization ownership through every record and enforce unique keys at the database boundary.

## 7. Product and interaction design

Design direction: a calm finance-operations workbench for administrators, approvers, and investigators. Prioritize policy clarity and transaction evidence over decorative analytics. Use the existing navy system in navigation, headings, and actions, with readable light content surfaces. Keep dense operational tables scannable. Motion is restrained and optional. The signature interaction is a linked view of the rule, the decision, and the resulting financial evidence.

Primary navigation: Overview, Policies, Approvals, Transactions, Investigations, Connections, and Settings. Overview should answer what needs action now: pending approvals, unresolved exposure, breached outcomes, and unhealthy integrations. Avoid vanity charts that do not change a decision.

Policy creation follows structured input, canonical read-back, control coverage, simulation, and explicit activation. Optional plain-language drafting fills this same flow; it does not replace it. Show why a rule is unsupported and what the user can do next.

Approval details show merchant, total including available taxes and shipping, currency, agent, request hash reference, policy version, expiry, budget impact, and the triggering rule. An approval action must not silently change an amount or merchant. Show whether it is an exception and whether exceptions are permitted.

Investigation details use an accessible timeline and table as the primary experience. Show expected and observed amounts side by side, original event time and receipt time, source, verification status, missing artifacts, and a clear next action. Separate verified, reported, inferred, and missing evidence rather than blending all of them into a confidence score.

The Three.js view is an optional selected-case relationship graph: policy to request to decision to approval to authorization to capture/refund. Load it only on request, bound the graph size, avoid continuous camera motion, and preserve the selected record when switching to the table. Every relationship must also be navigable without WebGL. Do not put the graph on the payment-critical path.

Specify loading, empty, error, stale-data, expired-approval, and permission-denied states in each flow. Test keyboard use, focus restoration, screen readers, zoom, reduced motion, and narrow-screen approvals. Automated contrast checks alone do not establish [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/) conformance. Visual tokens belong in design documentation, not stakeholder problem statements.

## 8. Evaluation and testing strategy

### Layered verification

| Layer | What to test | Evidence required |
|---|---|---|
| Unit | Policy boundaries, reason codes, normalization, expiry, signature protection, state transitions. | Reproducible interface-level tests; no dependency on a running database. |
| Property-based | Retry invariance, conservation of ledger amounts, deterministic replay, revocation, and generated event sequences. | Recorded seeds and minimal counterexamples. |
| Database integration | Real migrations, organization isolation, unique keys, atomic reservations, contention, outbox recovery. | Real PostgreSQL in CI; mandatory tests cannot silently skip. |
| Provider contract | Duplicate, delayed, dropped, reordered, malformed, and unsupported-version messages. | A versioned synthetic issuer and protocol fixture suite. |
| Browser end-to-end | Create policy, authorize, approve, revoke, reconcile, export and verify. | Playwright journeys backed by the actual API and test database for critical flows. |
| Accessibility and usability | Full keyboard journeys, accessible graph equivalent, mobile approval, error recovery. | Automated checks plus documented manual observations. |
| Security | Cross-tenant access, privilege escalation, request replay, signature failures, CSRF, injection, SSRF, secret handling. | Threat model mapped to tests; findings triaged before release. |
| Performance and recovery | Deadline adherence, contention, queue lag, process restart, backup restore, database outage. | Published environment, load shape, percentiles, failure count, and recovery result. |

Mocks validate our implementation assumptions, not actual provider certification. Keep simulator expectations independent from the authorization implementation so the same bug cannot trivially generate both the answer and its oracle. Use golden fixtures, separately reviewed expected results, property tests, and external sandbox contracts when accessible.

[Playwright](https://playwright.dev/docs/intro) supplies browser automation and failure traces. [fast-check](https://fast-check.dev/docs/introduction/) generates and shrinks property-test counterexamples. Start load experiments at explicit small concurrency levels such as 1, 10, and 100 clients; these are test conditions, not promised production capacity.

### Metrics without invented market benchmarks

- Safety: zero critical false ALLOW decisions and zero silent critical-control omissions in the identified release corpus. Report corpus size, class distribution, version, uncovered scenarios, and observed failures. Zero on finite tests is not zero future risk.
- Decision quality: a full ALLOW/ESCALATE/DENY confusion matrix, unsafe-allow rate, missed-escalation rate, unnecessary escalation rate, and false-denial rate. Define denominators and report by scenario class and adapter. Human escalation is not automatically a correct result if policy requires DENY.
- Determinism: compare the same normalized input, policy/evaluator versions, decision time, and stored state snapshot. Replaying against today's mutable balance is a different decision, not a valid determinism test.
- AI drafting: field-level precision and recall, omitted critical fields, unsupported-field handling, and user corrections before activation. No model confidence score permits autonomous approval.
- Evidence: eligible-event join rate with unmatched and unjoinable events separately counted; mismatch-detection recall and false-positive rate; completeness of required artifacts or explicit missing markers.
- Experience: unaided policy activation, correction rate, approval comprehension, and time to correctly explain a seeded mismatch. Use the PRD's 20 completed alpha sessions to establish a baseline, not to imply population-level statistical certainty.
- Performance: end-to-end latency and timeout rate at documented load, including validation, database, network, and provider work. A fast pure evaluator alone does not satisfy a callback deadline.

No sourced universal standard establishes 98% policy accuracy, 99.5% event joins, or a 50 ms evaluator as the correct market target for Reins. Those numbers should not reappear as external benchmarks. Stripe's documented two-second callback deadline is a provider contract constraint; its fallback and late financial behavior must also be tested. See [Stripe real-time authorizations](https://docs.stripe.com/issuing/controls/real-time-authorizations).

The existing unit coverage threshold is a regression signal. Keep it, but do not substitute line coverage for financial invariants, failure tests, or realistic journeys. Release reports must show executed and skipped tests explicitly; an empty or skipped corpus cannot satisfy a zero-failure gate.

## 9. Milestones and how Codex will be used

The existing 12-week window is an estimate conditional on contributor availability, scope, and learning. It is not an industry delivery standard or a guaranteed completion date. Re-estimate after the first full vertical slice.

| Milestone | Goal | Exit demonstration |
|---|---|---|
| M1: foundation verification, weeks 1-2 | Confirm repeatable setup, API/database boundaries, CI, and documented current limitations. | Both contributors reproduce installation and checks, with mandatory database tests executed. |
| M2: policy and decision core, weeks 3-4 | Deliver a usable tenant-scoped policy-to-decision slice with atomic budget accounting. | Create a policy, reject unsupported required controls, authorize a synthetic request, explain it, and defeat concurrent overspend and duplicate retries. |
| M3: authorization and approval, weeks 5-7 | Complete mock-provider lifecycle and safe human approval. | Expiry, revocation, callback deadlines, ambiguous outcomes, crash recovery, signatures, and reversal tests pass. |
| M4: evidence experience, weeks 8-10 | Make discrepancies investigable and evidence portable. | A user finds seeded mismatches, verifies an exported bundle, and uses equivalent timeline/table/Three.js views. |
| M5: conformance and release, weeks 11-12 | Demonstrate versioned protocol handling and accurate integration claims. | AP2/ACP fixtures, distinct simulated provider behavior, optional sandbox evidence, restore exercise, security review, and measured baselines are published locally. |

Authentication and tenant/role enforcement must precede multi-user policy or approval functionality. Treat this as an explicit dependency in M2, not a late security polish item. Begin customer validation early so findings can change scope before expensive adapter work.

For each approved issue, Codex will inspect the relevant code and requirements, define acceptance cases, add a failing behavior test, implement the smallest coherent change, run focused tests and required repository checks, review the diff for safety and unrelated edits, and produce a verification summary. The other contributor reviews consequential authorization, ledger, migration, and security changes before merge. Codex review supplements that review; it is not independent human approval.

Required repository commands remain `pnpm format` and `pnpm check`. Database changes additionally require `pnpm db:generate`, `pnpm db:migrate`, and `pnpm db:verify`, with the mandatory database integration job enabled. Run broader browser, security, and failure suites as they are introduced. Distinguish commands that passed, failed, skipped, or could not run.

Do not build all milestones in one unrestricted Codex request. Use narrowly scoped issues, preserve the locked product requirements, and explicitly review any proposed scope change. No application code is changed by this planning document.

## 10. Two-contributor GitHub workflow

Use one shared repository, with both contributors having appropriate ownership and recovery access. Develop in separate clones or worktrees, not simultaneous edits to one shared checkout. Use one issue and one `codex/<issue>-description` branch per change; create a pull request with acceptance criteria, test evidence, screenshots where relevant, and migration notes.

The author is accountable for the change; the other product owner reviews it. A two-person project should not require two non-author approvals. Rotate implementation and review so both understand the policy and ledger. Co-authorship is appropriate only when both actually contributed, and the PR history supplies detailed attribution. Shared contributor names are sufficient in the PRD.

GitHub Free supports protected branches for public repositories; equivalent private-repository protection requires an eligible paid plan. If the project is intentionally public, use required checks, peer review, and protection against bypass. If private and strictly free, document the limitations and use a disciplined manual merge policy rather than claiming enforced protection. Repository publication requires a separate user decision; this plan does not publish it. See [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

Use GitHub Issues and a simple project board for backlog, in progress, review, and done. Keep secrets outside git, commit only synthetic fixtures, review CI permissions, pin third-party actions to reviewed immutable commits where practical, and keep artifacts short-lived. Public standard-runner Actions usage is free; private repositories have included limits and storage constraints, so monitor usage and prevent paid overage. Do not describe all GitHub features or compute as unlimited.

## 11. Proposed PRD corrections and release boundary

The PRD is already much closer to the correct scope than the original pitch. It still needs targeted clarification after agreement:

1. Replace categorical statements that provider dashboards do not offer neutral/cross-provider evidence with a narrower, research-supported customer hypothesis. Competitor absence has not been proven.
2. Separate control-point strength from translation fidelity, and include fallback exceptions in the coverage report.
3. Specify the first supported policy profile, currency, timezone, gross/net budget semantics, and treatment of uncertain exposure.
4. Add explicit organization authorization, approval authority, and durable provider-attempt handling to acceptance criteria.
5. Resolve AP2 plus ACP for the planned first protocol scope; keep UCP as a later option rather than an ambiguous release choice.
6. Require non-skipped database safety tests and independently reviewed scenario labels as release evidence.
7. Keep customer-discovery and live-launch questions explicit. Make local build decisions in the technical plan, but do not fabricate answers that require provider access or customer research.

Keep Revision 1, the requested ten-page PRD limit, contributor names, existing document styling, regular-weight justified body text, and linked contents when the Word document is next revised. Do not insert this technical plan wholesale into the stakeholder PRD.

The release is ready for its claimed local/sandbox purpose only when both contributor environments work, mandatory tests execute, the core user journeys complete, the ledger survives retries and failures, exports verify, integration claims match actual access, and the demonstration exposes limitations rather than hiding them.

A real-money launch remains gated on a partner-controlled execution path, verified commercial access, production identity and key management, privacy and payment-data scoping, jurisdiction-specific legal review, independent security assessment, incident response, backups, recovery objectives, and funded operations. Free tooling reduces development cost; it does not eliminate those obligations.
