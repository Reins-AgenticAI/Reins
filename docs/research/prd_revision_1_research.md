# Reins PRD Revision 1 research

Research date: 17 September 2026

This note uses primary or first-party sources only. It separates externally imposed requirements from Reins product choices and internal release gates. No percentage below is presented as a market benchmark unless an official source actually defines it.

## Executive findings

1. The requested six-part structure is consistent with mainstream PRD guidance: metadata, problem and users, objectives and success measures, scope and requirements, assumptions and dependencies, and open questions. Atlassian's PRD template also covers target date, status, team, objectives, success metrics, assumptions, user stories, supporting artifacts, open questions, and out-of-scope items. [Atlassian PRD template](https://www.atlassian.com/software/confluence/templates/product-requirements)
2. A stakeholder PRD should emphasize the problem, intended outcomes, users, scope, constraints, product requirements, measurable success, and dependencies. Aha distinguishes user requirements, owned from the product perspective, from system requirements and technology selections typically owned by engineering. [Aha requirements management guide](https://www.aha.io/roadmapping/guide/requirements-management)
3. The full technology stack, package versions, repository review policy, document color palette, and detailed architecture belong in linked engineering, collaboration, and design documents. The PRD should retain only technology constraints that change product scope or feasibility, such as the zero-cost constraint, protocol compatibility, privacy boundaries, deterministic authorization, and required accessibility. This is an editorial recommendation based on the PRD purposes and ownership boundaries described by Atlassian, Aha, and Productboard. [Atlassian PRD template](https://www.atlassian.com/software/confluence/templates/product-requirements), [Aha requirements management guide](https://www.aha.io/roadmapping/guide/requirements-management), [Productboard PRD guide](https://www.productboard.com/blog/product-requirements-document-guide/)
4. The previous targets of 0.98 precision and recall, a 99.5 percent evidence join rate, and a 50 millisecond core latency are not supported by an official market benchmark found in the sources reviewed. They should not be represented as industry-standard targets.
5. Stripe does impose a documented provider deadline: an Issuing real-time authorization response not received within two seconds is handled according to timeout or Autopilot settings. This is an external integration constraint, not evidence that a 50 millisecond internal evaluator target is an industry norm. [Stripe Issuing real-time authorizations](https://docs.stripe.com/issuing/controls/real-time-authorizations)
6. AP2 v0.2 provides strong specification support for Reins' deterministic decision and evidence design. It requires role-specific verification, requires validation and processing to occur in deterministic code, binds mandates to signed checkout data, returns receipts, and defines dispute verification. [AP2 v0.2 specification](https://github.com/google-agentic-commerce/AP2/blob/main/docs/ap2/specification.md)
7. WCAG 2.2 Level AA is a defensible product requirement. Level AA conformance means satisfying all Level A and Level AA success criteria for the full page and its responsive variations. [WCAG 2.2](https://www.w3.org/TR/WCAG22/)

## Recommended stakeholder PRD structure

The following structure can fit within ten pages and follows the user's requested format while preserving the information stakeholders need:

1. Header and metadata
   - Product name
   - Contributors and accountable product owner
   - Status
   - Target launch window
   - Revision and last updated date
2. Problem statement and context
   - Background and urgency
   - User problem
   - Target audience and primary use cases
3. Objectives and success metrics
   - Product and business objectives
   - Launch KPIs
   - Safety and release guardrails, clearly labeled as internal gates
4. Scope and product requirements
   - In scope
   - User journeys and prioritized requirements
   - Nonfunctional requirements that affect product acceptance
   - Out of scope
5. Assumptions and dependencies
   - Zero-cost and local-first constraint
   - External protocol, provider, and sandbox dependencies
   - Delivery milestones summarized as outcome, exit evidence, and target window
6. Open questions
   - Only genuinely unresolved, non-blocking questions
   - Owner and target resolution date when an item exists
7. Source notes
   - A compact list of the official standards and provider constraints cited in the PRD

Atlassian describes a PRD as the guide to a product or feature's purpose, features, and functionality, and its template explicitly includes metadata, objective, success metrics, assumptions, requirements, supporting artifacts, open questions, and out-of-scope boundaries. [Atlassian PRD template](https://www.atlassian.com/software/confluence/templates/product-requirements)

Productboard recommends a concise PRD centered on the outcome, target user, product description, and planned releases rather than an excessively long document. Its current guide lists problem context, users, requirements, constraints, acceptance criteria, success measures, dependencies, and rollout considerations as common components. [Productboard PRD glossary](https://www.productboard.com/glossary/product-requirements-document/), [Productboard PRD guide](https://www.productboard.com/blog/product-requirements-document-guide/)

## What belongs in this PRD

### Keep in the stakeholder document

- The user and business problem.
- The reason Reins is needed now.
- Target users and primary jobs to be done.
- Product outcomes and measurable launch criteria.
- Prioritized capabilities and user-visible behavior.
- Product-level safety behavior, including no silent approval when a required policy, control, or provider result is missing.
- Scope, non-goals, assumptions, external dependencies, and protocol constraints.
- Release milestones expressed as the outcome, exit evidence, and target window.
- Accessibility as a product acceptance requirement.

These elements align with Atlassian's and Productboard's first-party PRD guidance. [Atlassian PRD template](https://www.atlassian.com/software/confluence/templates/product-requirements), [Productboard PRD guide](https://www.productboard.com/blog/product-requirements-document-guide/)

### Move to linked supporting documents

- Package-by-package technology stack and versions: engineering design or architecture decision records.
- Database schemas, API contracts, deployment topology, retry design, and observability implementation: technical design.
- GitHub branch and approval mechanics: `CONTRIBUTING.md` or the engineering working agreement.
- Exact application colors and hexadecimal values: design system or UI specification.
- Detailed test matrices and every quality threshold: verification and evaluation plan.
- A section titled "Build decisions locked for Revision 1": replace it with the smaller PRD sections "Constraints" and "Dependencies". Record technical decisions and their rationale in architecture decision records.

Aha states that user requirements express the user-facing why and what, while engineering focuses on the how and owns system requirements such as third-party technology choices and error handling. [Aha requirements management guide](https://www.aha.io/roadmapping/guide/requirements-management)

The approved navy styling of the Word artifact can still match the reference document. That is document presentation, not a product requirement. In the PRD body, a concise requirement such as "The user experience must use the approved design system and conform to WCAG 2.2 Level AA" is enough; the palette belongs in the linked design specification. W3C defines Level AA conformance as satisfying all Level A and Level AA success criteria. [WCAG 2.2 conformance requirements](https://www.w3.org/TR/WCAG22/#conformance-reqs)

## Success metric findings

### Separate three kinds of measures

| Measure type | Meaning | Reins treatment |
| --- | --- | --- |
| External requirement | A deadline or behavior imposed by a protocol or provider | Cite it directly and test the adapter against it |
| Product KPI | A user or business outcome observed after users interact with Reins | Baseline in alpha when no trustworthy data exists, then set the beta target |
| Internal release gate | A safety, correctness, or conformance condition chosen by Reins | Label it as an internal gate, identify the corpus or test environment, and do not call it a market benchmark |

This distinction matters because NIST says AI risk measurement methods and metrics should be selected for the most significant risks, assessed for appropriateness, updated over time, and tied to the deployment context. [NIST AI RMF Core, Measure function](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/)

### Defensible Revision 1 metric set

The stakeholder PRD should use a short table. Detailed confusion matrices and load-test distributions belong in the evaluation plan.

| Metric | Recommended Revision 1 treatment | Basis |
| --- | --- | --- |
| Policy activation completion | Measure the percentage of users who create, review, and activate a policy; baseline during internal alpha and set a beta target from observed data | Product KPI; no authoritative agentic-payment benchmark was found |
| Policy correction rate | Measure the percentage of compiled policies changed by the user before activation; baseline during alpha and segment by policy type | Product KPI for compiler usefulness; NIST calls for context-specific measurement rather than one universal threshold [NIST AI RMF Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/) |
| Silent critical-control omission | Zero in the versioned release corpus; an unsupported or uncertain critical control must block activation or request correction | Internal safety gate derived from Reins' fail-safe product policy, not a market benchmark |
| Critical false ALLOW | Zero in the labeled critical release corpus; report all confusion-matrix counts and the corpus version | Internal safety gate, not a claim that live statistical error is mathematically zero |
| Deterministic replay | Zero mismatches for identical normalized input, policy version, evaluator version, and state snapshot in the release suite | Internal correctness gate supported by AP2's requirement that role validation and processing occur in deterministic code [AP2 v0.2 specification](https://github.com/google-agentic-commerce/AP2/blob/main/docs/ap2/specification.md) |
| Authorization deadline adherence | No late responses in provider contract tests; report end-to-end p50, p95, and p99 without inventing a universal 50 millisecond target | Stripe requires a real-time authorization response within two seconds [Stripe Issuing real-time authorizations](https://docs.stripe.com/issuing/controls/real-time-authorizations) |
| Supported-flow evidence completeness | Every required mandate, decision, provider result, settlement event, and verification result is present in all fully supported synthetic release fixtures | Internal conformance gate based on the supported fixture contract; AP2 defines linked mandates, receipts, and dispute verification [AP2 v0.2 specification](https://github.com/google-agentic-commerce/AP2/blob/main/docs/ap2/specification.md) |
| Live or sandbox evidence join rate | Instrument and baseline by adapter before assigning a numeric beta target; report unmatched reasons separately | No official cross-network benchmark was found, and joinability depends on identifiers exposed by each provider |
| Evidence bundle time | Measure time from a dispute request to a complete, verifiable bundle; baseline in alpha before setting a beta target | Product outcome supported by AP2's dispute-evidence model, but AP2 does not publish a time target [AP2 v0.2 specification](https://github.com/google-agentic-commerce/AP2/blob/main/docs/ap2/specification.md) |
| Accessibility | WCAG 2.2 Level AA across full responsive flows | W3C conformance requirement [WCAG 2.2](https://www.w3.org/TR/WCAG22/) |

### Why the previous numeric targets are not defensible as market benchmarks

- `precision >= 0.98` and `recall >= 0.98`: neither the AP2 specification nor the official provider documentation reviewed defines such thresholds. NIST recommends selecting and documenting metrics in deployment context; it does not prescribe a universal precision or recall target for this product category. [NIST AI RMF Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/)
- `evidence join rate >= 99.5%`: AP2 defines the evidence objects and verification relationships, but it does not specify a cross-provider join-rate service level. [AP2 v0.2 specification](https://github.com/google-agentic-commerce/AP2/blob/main/docs/ap2/specification.md)
- `core evaluator p99 < 50 ms`: Stripe documents a two-second end-to-end webhook response deadline, not a 50 millisecond decision-engine benchmark. [Stripe Issuing real-time authorizations](https://docs.stripe.com/issuing/controls/real-time-authorizations)
- `100%` on synthetic fixtures can be valid when it states deterministic conformance to a finite, versioned test corpus. It must be labeled as a release gate, not as proof of production performance.

No accepted market-wide benchmark was found for compiler precision, compiler recall, cross-network reconciliation join rate, or false-ALLOW rate. The relevant official materials define security semantics, verification duties, or provider deadlines, not statistical product-quality thresholds. FIDO also describes the agentic commerce specifications as work underway, built from AP2 and Verifiable Intent contributions that are still being evaluated and developed through its standards process. [FIDO agentic AI work](https://fidoalliance.org/fido-alliance-agentic-ai/)

## Payment authorization timing and reliability

Stripe's official Issuing documentation establishes the clearest externally imposed timing constraint found:

- Stripe sends an `issuing_authorization.request` to the configured synchronous webhook for a real-time decision.
- The integration responds directly with an approve or decline decision.
- If Stripe does not receive the decision within two seconds, Stripe applies the configured timeout or Autopilot behavior.
- Stripe recommends monitoring `webhook_error` and `webhook_timeout`; an approved result alone does not prove integration health because Autopilot can approve during an error.
- Stripe also warns that in some network communication failures, Stripe may decline while the card network approves, and the transaction might still be captured.

All five statements are documented on [Stripe Issuing real-time authorizations](https://docs.stripe.com/issuing/controls/real-time-authorizations).

PRD implication: define provider-deadline adherence, explicit timeout behavior, late-response observability, and post-authorization reconciliation as requirements. Do not reduce this to a component-only latency target. Reins should treat provider timeout, missing policy, unsupported required control, or verification error as non-ALLOW within the decision layer, while separately reconciling any provider or network outcome that occurs outside that decision.

## AP2 findings relevant to Reins

The current official AP2 repository identifies the specification as v0.2. The terminology in Revision 1 should align with that version rather than mixing older Intent and Cart names into the current adapter contract. AP2 v0.2 defines Checkout Mandates and Payment Mandates, each with open and closed forms for autonomous and human-present flows. [AP2 v0.2 specification](https://github.com/google-agentic-commerce/AP2/blob/main/docs/ap2/specification.md)

The official specification supports these Reins requirements:

- Five defined roles have different processing and verification responsibilities: Shopping Agent, Credential Provider, Merchant, Merchant Payment Processor, and Trusted Surface.
- A Trusted Surface must be non-agentic.
- Validation and processing described for a role must occur in deterministic code even if the surrounding role is agentic.
- A Checkout Mandate provides cryptographic proof that an agent is authorized to purchase a merchant-signed checkout and is bound to that checkout by a cryptographic hash.
- A Payment Mandate provides authorization evidence to the Credential Provider, Network, and Merchant Payment Processor and is bound to the checkout.
- Implementations must match the exact versioned `vct` value, which makes explicit adapter versioning a product dependency.
- In autonomous flows, the user signs open mandates containing constraints; the agent signs a closed mandate, and verifiers evaluate that the closed mandate conforms to the constraints.
- Autonomous open mandates should use the shortest practical expiration, and an agent must not present another open mandate until it has received a rejection receipt for the previous attempt.
- Dispute verification recomputes and compares hashes and receipt references before the mandate data is used as evidence.

These requirements are in the [AP2 v0.2 specification](https://github.com/google-agentic-commerce/AP2/blob/main/docs/ap2/specification.md).

AP2 is a security layer within a commerce protocol, not the catalog, checkout, or payment-settlement system itself. The specification explicitly leaves commerce APIs outside AP2's scope. The Reins PRD should therefore avoid claiming that an AP2 adapter alone provides end-to-end payment processing. [AP2 v0.2 specification](https://github.com/google-agentic-commerce/AP2/blob/main/docs/ap2/specification.md)

FIDO states that AP2 and Mastercard Verifiable Intent are initial contributions to agentic commerce standards work, and that the Payments Technical Working Group is still evaluating and developing those foundations. This supports listing specification evolution as a dependency and using version-pinned adapters. [FIDO Alliance announcement](https://fidoalliance.org/fido-alliance-to-develop-standards-for-trusted-ai-agent-interactions/), [FIDO agentic AI work](https://fidoalliance.org/fido-alliance-agentic-ai/)

## Accessibility basis

WCAG 2.2 is a W3C Recommendation. Level AA conformance requires all Level A and Level AA success criteria, applies to full pages, and includes responsive variations automatically presented for different screen sizes. W3C recommends WCAG 2.2 as the current target. [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [W3C WCAG overview](https://www.w3.org/WAI/standards-guidelines/wcag/)

PRD implication: retain one concise nonfunctional requirement for WCAG 2.2 Level AA across the complete responsive product flows. Move color hex codes, component tokens, motion rules, and implementation-level contrast checks to the design system and accessibility test plan.

## Milestone format

The milestone table should communicate delivery, not collaboration governance. Use:

| Milestone | Product or capability outcome | Exit evidence | Target window |
| --- | --- | --- | --- |
| M1 | Foundation supports repeatable local development | Build, test, migration, and setup checks pass | Date or sprint |
| M2 | Deterministic policy and authorization core is usable through typed interfaces | Safety invariants, replay, concurrency, and failure-path suites pass | Date or sprint |
| M3 | Policy creation and first protocol adapter produce reviewable, versioned mandates | Supported policy corpus and adapter conformance suite pass | Date or sprint |
| M4 | Real-time decision and human escalation flows work within provider constraints | Contract, timeout, escalation, and accessibility tests pass | Date or sprint |
| M5 | Authorization, settlement, and evidence records reconcile into a verifiable case view | Seeded mismatch and evidence verification suites pass | Date or sprint |
| M6 | Release candidate meets the product KPIs and launch guardrails | Launch checklist and operating evidence complete | Date or sprint |

Contributor approval rules do not need to repeat in every milestone. Put shared contributors in metadata and review policy in the collaboration guide. Aha's roadmap guidance notes that executives need a strategic view while delivery teams need detailed releases, features, timing, and status, which supports keeping the PRD milestone view concise. [Aha product roadmap components](https://www.aha.io/roadmapping/guide/product-roadmap/what-is-included-product-roadmap)

## Production-ready wording for unresolved decisions

An approved production-intent PRD can still contain open questions, but they should not be generic permission requests such as "approve before build." Open questions should be genuine unknowns that can be resolved during delivery, with an owner and date, and should be marked blocking only when development cannot safely continue. Atlassian's template explicitly uses an open-question table to track answers and dates. [Atlassian PRD template](https://www.atlassian.com/software/confluence/templates/product-requirements)

For Revision 1:

- Set status to `Approved for implementation` only if the two contributors have actually approved the scope.
- State the zero-cost constraint as a locked product constraint, not an unresolved decision.
- Use the chosen local-first stack in the engineering design without repeating its package list in the stakeholder PRD.
- Keep unresolved external access items, such as live network sandbox eligibility, as dependencies or risks rather than reasons to delay all product development.
- Replace the "Build decisions locked" section with concise assumptions, constraints, and dependencies.

## Primary sources

- [Atlassian product requirements template](https://www.atlassian.com/software/confluence/templates/product-requirements)
- [Productboard PRD guide](https://www.productboard.com/blog/product-requirements-document-guide/)
- [Productboard PRD glossary](https://www.productboard.com/glossary/product-requirements-document/)
- [Aha requirements management guide](https://www.aha.io/roadmapping/guide/requirements-management)
- [Aha product roadmap components](https://www.aha.io/roadmapping/guide/product-roadmap/what-is-included-product-roadmap)
- [Stripe Issuing real-time authorizations](https://docs.stripe.com/issuing/controls/real-time-authorizations)
- [AP2 v0.2 specification](https://github.com/google-agentic-commerce/AP2/blob/main/docs/ap2/specification.md)
- [FIDO Alliance agentic standards announcement](https://fidoalliance.org/fido-alliance-to-develop-standards-for-trusted-ai-agent-interactions/)
- [FIDO Alliance agentic AI work](https://fidoalliance.org/fido-alliance-agentic-ai/)
- [NIST AI RMF Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [W3C WCAG overview](https://www.w3.org/WAI/standards-guidelines/wcag/)
