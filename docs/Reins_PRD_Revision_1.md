# Product Requirements Document

# Reins

## Independent Policy Enforcement and Evidence for AI Agent Spend

**Revision:** 1  
**Status:** Under review  
**Last updated:** 17 September 2026  
**Contributors:** Sai Prathap Reddy Cheluri and Lekhashree Srinath Reddy  
**Ownership:** Shared product requirements document  
**Target launch:** MVP demonstration within 12 weeks of PRD approval  
**Decision requested:** Approve the user problem, MVP scope, evidence-based launch gates, and local-first zero-cost constraint.

---

## 1 Problem Statement and Context

### Background

AI agents can now initiate commerce through provider-specific cards, wallets, authorization callbacks, and mandate protocols. The emerging ecosystem includes AP2, ACP, UCP, Visa TAP, Mastercard Agent Pay, issuer APIs, and wallet-specific controls. These systems do not provide one customer-owned place to define policy, prove which controls were enforceable, or compare the approved authority with the final financial outcome.

The timing is important for two reasons. First, spend limits and merchant restrictions are becoming native provider features, so a product that only translates a budget is easy to replace. Second, current specifications increasingly treat verifiable intent, deterministic validation, receipts, and dispute evidence as core requirements. Reins therefore focuses on the harder cross-provider problem: authoritative enforcement where a mandatory control point exists, explicit disclosure where it does not, and evidence that connects policy to authorization and settlement.

### User Problem

An SMB finance team or agent platform supporting more than one payment path cannot reliably answer:

1. Which parts of the principal's policy were enforceable before the payment?
2. Which policy version, mandate, and human decision produced the authorization?
3. Did simultaneous agent requests exceed a shared budget?
4. Did capture, settlement, refund, or fulfillment remain within the approved authority?

Provider dashboards answer parts of these questions inside their own systems. They do not provide a neutral policy record, comparable enforcement coverage, or one investigation trail across providers. This creates financial exposure, slow investigations, and misleading claims that a policy was enforced when it may only have been checked after the fact.

### Product Proposition

Reins is an independent policy enforcement and evidence application for organizations that control a credential, signing step, wallet execution, or real-time authorization callback. It converts an approved policy into provider-specific constraints, makes deterministic ALLOW, ESCALATE, or DENY decisions at an authoritative control point, reserves shared budgets atomically, and reconciles the decision with downstream payment and order events.

Reins will state the strength of every control as authoritative, cooperative, observe-only, or unsupported. It will not claim prevention on a path it cannot block. The initial release is a production-grade local and sandbox reference application using synthetic data and free resources. It is not approval to process live customer money.

### Target Audience

| User | Primary job | Required outcome |
|---|---|---|
| SMB finance administrator | Define budgets, merchant rules, approval thresholds, and exceptions for purchasing agents. | A policy that is understandable, versioned, and enforceable on the selected path. |
| Agent platform or fintech product team | Add governed payments without rebuilding controls for every provider. | One canonical request and policy model with typed adapter boundaries. |
| Human approver | Review an exception or high-value request. | Frozen request details, clear policy reasons, expiry, and an explicit decision. |
| Support or risk analyst | Investigate a questioned agent payment. | A chronological evidence bundle that separates verified, reported, inferred, and missing facts. |

The first commercial hypothesis is B2B agent platforms, embedded finance programs, and vertical software providers. A standalone consumer product is deferred until a bank, issuer, or wallet partner owns funding, account access, and consumer support obligations.

## 2 Objectives and Success Metrics

### Objectives

| ID | Objective | Expected stakeholder value |
|---|---|---|
| O1 | Preserve policy meaning across connected providers. | Customers can see exactly which controls are enforceable and where coverage is weaker. |
| O2 | Prevent policy-breaking spend on authoritative paths. | Deterministic decisions and atomic reservations reduce avoidable financial exposure. |
| O3 | Reduce investigation time and uncertainty. | Every decision is linked to the available authorization, capture, settlement, refund, and order evidence. |
| O4 | Prove a credible MVP without paid infrastructure or network claims. | Both contributors can run, test, and demonstrate the same system locally. |
| O5 | Create a defensible integration wedge. | Provider-neutral coverage and evidence remain useful even as native spend controls improve. |

### Success Metrics

There is no published cross-network benchmark for policy-compiler precision, escalation recall, false approvals, or evidence join rates. Revision 1 therefore separates product KPIs, finite release gates, and external provider constraints. Alpha data will replace pilot hypotheses before a live beta target is approved.

| Measure | Revision 1 target | Type and measurement basis |
|---|---|---|
| Policy activation completion | Establish an alpha baseline from task-based sessions; approve the beta target after at least 20 completed sessions. | Product KPI. Count users who create, review, and activate a valid policy without engineering intervention. |
| Policy correction rate | Establish an alpha baseline by policy field and adapter before setting a beta target. | Product KPI. Measure material user edits between the first draft and activated canonical policy. |
| Evidence investigation time | Establish a baseline during M4 and approve a beta target before the external pilot. | Product KPI. Time a user from opening a seeded case to identifying the authorization-outcome mismatch. |
| Silent critical-control omission | 0 in the versioned release corpus. | Internal safety gate. An uncertain or unsupported required control must block activation or request correction. |
| Critical false ALLOW | 0 in the labeled critical release corpus. | Internal safety gate. Report the full confusion matrix and corpus version; this is not a claim of zero live statistical risk. |
| Deterministic replay mismatch | 0 in the release suite for identical normalized input, policy version, evaluator version, and state snapshot. | Internal correctness gate aligned with deterministic protocol validation. |
| Concurrent budget overspend | 0 in the versioned concurrency and retry suite. | Internal correctness gate measured against atomic reservation test cases. |
| Authorization deadline adherence | No late responses in provider contract tests; report end-to-end p50, p95, and p99. | External constraint. Stripe currently applies timeout behavior if a real-time Issuing response is not received within two seconds. |
| Supported-flow evidence completeness | All required artifacts are present or explicitly marked missing in every fully supported release fixture. | Internal conformance gate using finite, versioned synthetic fixtures. |
| Sandbox event join rate | Instrument and baseline separately for each adapter before assigning a beta target. | Product and integration KPI. Provider identifiers and lifecycle coverage vary, so one unsupported universal percentage would be misleading. |
| Accessibility | WCAG 2.2 Level AA across complete responsive core flows. | Product acceptance requirement defined by W3C. |

## 3 Scope and Features

### In Scope for Revision 1

- Structured policy creation, controlled-language parsing, confirmation, versioning, activation, and revocation.
- Optional local AI assistance for drafting only. A language model cannot activate a policy or approve a payment.
- A control-by-control adapter coverage report with exact, narrower, broader, preflight-only, observe-only, and unsupported states.
- Deterministic ALLOW, ESCALATE, and DENY decisions with stable reason codes and human-readable explanations.
- Atomic budget and velocity reservations with idempotency, expiry, adjustment, release, and deterministic replay.
- Human escalation bound to a frozen request hash, expiry, approver identity, and explicit outcome.
- A complete mock issuer lifecycle for authorization, timeout, duplicate, reversal, capture, refund, and mismatch scenarios.
- Version-pinned AP2 v0.2 mandate and receipt validation plus ACP or UCP evidence mapping. These adapters demonstrate compatibility and evidence handling, not payment settlement.
- One external issuer sandbox adapter if account access is available without cost. The MVP cannot depend on that access.
- Reconciliation across policy, mandate, decision, reservation, provider, order, authorization, capture, settlement, reversal, refund, and fulfillment events when the source exposes them.
- A signed evidence bundle, accessible timeline, tabular view, and optional Three.js relationship graph generated from the same evidence records.

### Core User Journeys

| Journey | User outcome | Required behavior |
|---|---|---|
| Create and activate policy | A finance administrator converts intent into an enforceable policy. | Reins validates required fields, presents canonical read-back and coverage, and blocks unsafe activation. |
| Authorize an agent request | An agent receives a fast, explainable verdict. | Reins verifies the caller, evaluates deterministic rules, reserves budget atomically, and returns a signed receipt. |
| Escalate an exception | A human decides on a frozen request without changing its meaning. | Approval expires, material request changes invalidate it, and providers that cannot wait use pre-approval or decline-and-retry. |
| Investigate an outcome | A support analyst understands what was authorized and what occurred. | Reins links available events, identifies mismatches, and distinguishes verified facts from reported, inferred, or missing facts. |

### Prioritized Product Requirements

| ID | Requirement | Priority | Acceptance condition |
|---|---|---|---|
| FR1 | Create and version a canonical spend policy with amount, currency, merchant or beneficiary, category, recurrence, time window, agent, approval, revocation, and exception controls. | P0 | Missing or ambiguous critical controls prevent activation. |
| FR2 | Publish adapter coverage for every active control and never silently broaden a required constraint. | P0 | Unsupported or unsafe broader coverage blocks autonomous activation. |
| FR3 | Make every payment decision through deterministic code independent of a language model. | P0 | Identical inputs and state replay to the same verdict, reasons, and protected receipt fields. |
| FR4 | Reserve aggregate amount and transaction capacity atomically before authority is released. | P0 | Concurrent, duplicate, and retried requests cannot exceed the policy limit in the release suite. |
| FR5 | Bind escalation to the canonical request hash, policy version, approver, and expiry. | P0 | A material change or expired approval requires a new decision. |
| FR6 | Provide a provider-independent request, decision receipt, and lifecycle event contract. | P0 | The mock issuer and each adapter use the same typed domain interface. |
| FR7 | Reconcile authorized intent with downstream financial and order outcomes. | P0 | Seeded duplicate, excess, partial, late, refund, currency, and lineage mismatches are classified. |
| FR8 | Produce a verifiable evidence bundle without making a legal liability or reimbursement conclusion. | P0 | Protected-field mutation fails verification and missing evidence is explicit. |
| FR9 | Present evidence through an accessible timeline and table, with a Three.js graph as an equivalent optional view. | P1 | All views use the same records and relationships; core investigation remains usable without WebGL or motion. |
| FR10 | Protect sensitive data and fail safely. | P0 | No PAN, CVV, bank credential, wallet private key, production token, or real customer financial data is stored in the MVP. Timeouts, missing policies, unsupported controls, and provider errors never become Reins ALLOW decisions. |
| FR11 | Meet the approved design system and WCAG 2.2 Level AA across core flows. | P0 | Automated and manual accessibility checks pass for policy, authorization, approval, and investigation journeys. |

### Out of Scope

- Issuing cards, holding funds, settling payments, or operating a payment network.
- Storing payment account data, bank credentials, wallet private keys, or production secrets.
- General fraud scoring or replacement of issuer and network fraud systems.
- A merchant checkout gateway, accounting suite, expense platform, or standalone consumer wallet.
- Automated chargeback filing, reimbursement promises, or legal conclusions under Regulation E, Regulation Z, or other law.
- Direct Visa or Mastercard production integration without written access, certification, and commercial agreement.
- Production uptime commitments, managed key infrastructure, independent penetration testing, or regulated live-money operations within the zero-cost MVP.

## 4 Assumptions and Dependencies

### Assumptions

- A payment can be authoritatively controlled only when Reins or an integrated provider controls credential release, signing, wallet execution, mandate verification, or a required authorization callback.
- The initial customer values comparable coverage and evidence across providers more than a new proprietary payment protocol.
- Structured policy entry remains the dependable release path. Local AI drafting is optional and always subject to deterministic validation and user confirmation.
- All MVP demonstrations use synthetic data and development keys. Production data and credentials remain prohibited.
- Zero cost means no software subscription or cloud charge. Contributor hardware, electricity, internet, and future partner or compliance costs are outside that definition.

### Dependencies and Constraints

| Dependency or constraint | Product impact | Revision 1 response |
|---|---|---|
| AP2, ACP, UCP, and provider schemas continue to evolve. | Adapter behavior and evidence fields can change. | Pin supported versions, reject unknown critical versions, and maintain conformance fixtures. |
| Authoritative provider sandboxes may require accounts, approval, or contracts. | A live external path cannot be guaranteed at zero cost. | Make the mock issuer the release dependency and label external adapters as conditional. |
| Real-time authorization windows are provider controlled. | Slow evaluation or human review can miss the network deadline. | Test end-to-end adapter deadlines and use pre-approval or decline-and-retry when a provider cannot wait. |
| Final financial outcomes can differ from Reins or provider decisions. | Approval alone does not prove the captured or settled result. | Ingest lifecycle events and reconcile all observed outcomes, including late or fallback events. |
| A live launch introduces security, privacy, PCI, legal, and operational obligations. | A free local MVP is not a live production environment. | Require separate architecture, threat model, compliance, key management, recovery, and operations approval before real-money use. |
| Collaboration uses GitHub Free and local open-source tooling. | Some paid private-repository enforcement and hosted reliability controls are unavailable. | Keep contribution mechanics in CONTRIBUTING.md, use pull requests and local security checks, and preserve a local-first demonstration. |

The PRD intentionally does not prescribe package versions, database topology, deployment design, or repository approval mechanics. Those implementation choices belong in the technical design, architecture records, security plan, and contribution guide. The product constraints that affect scope remain here: deterministic authorization, provider-neutral contracts, synthetic data, free local execution, versioned evidence, and accessibility.

### Delivery Milestones

| Milestone | Product outcome | Exit evidence | Target window |
|---|---|---|---|
| M1 Foundation | Repeatable local development, typed service boundaries, database migrations, and tested application shells. | Format, type, unit, integration, migration, build, and setup checks pass. | Weeks 1-2 |
| M2 Policy and decision core | Users can create versioned policies and receive deterministic decisions with atomic reservations. | Policy corpus, replay, idempotency, concurrency, and fail-safe suites pass. | Weeks 3-4 |
| M3 Authorization and escalation | The mock issuer supports complete authorization, retry, timeout, approval, and reversal behavior. | End-to-end contract and failure-path tests pass with signed decision receipts. | Weeks 5-7 |
| M4 Evidence experience | Users can investigate lifecycle outcomes through reconciliation, export, an accessible timeline, and the Three.js evidence graph. | Seeded mismatch, evidence integrity, accessibility, and browser journey tests pass. | Weeks 8-10 |
| M5 Protocol validation and MVP release | Version-pinned protocol fixtures and any available external sandbox demonstrate accurately labeled coverage. | Conformance report, security review, reproducible local package, and metric baselines are complete. | Weeks 11-12 |

## 5 Open Questions

These questions do not block the local MVP, but they must be resolved before an external beta or live-money launch.

| Question | Why it matters | Resolution point |
|---|---|---|
| Which customer segment should be the first design partner: agent platforms, embedded finance providers, or issuer programs? | It determines distribution, control points, and the first evidence workflow. | Before M3 scope is finalized. |
| Which external issuer or wallet sandbox should be the first authoritative integration? | It determines the initial provider contract, deadline, and lifecycle semantics. | Before M5 begins. |
| Which controls are mandatory for the first beta policy profile? | It defines the minimum hard-enforcement claim and the release corpus. | Before M2 exit. |
| What authentication strength is required for human approval in the first external pilot? | It affects authority evidence, identity integration, and operational risk. | Before external beta design. |
| What evidence retention and export formats will target partners accept? | It affects storage, privacy, retrieval, and investigation usefulness. | During design-partner validation. |
| What funded security, compliance, infrastructure, and support plan is required for live transactions? | A reliable regulated launch cannot be represented as a zero-cost activity. | Before any production readiness review. |

### Research Basis

The structure follows current PRD guidance that centers metadata, user problem, objectives, success measures, assumptions, requirements, open questions, and explicit non-goals. The metric design follows NIST guidance to select and document evaluation methods in context rather than presenting unsupported universal thresholds. AP2 v0.2 supports deterministic verification, exact schema versioning, mandate and receipt binding, and dispute evidence. Stripe documents a two-second real-time Issuing response window and requires monitoring timeout and provider fallback behavior. WCAG 2.2 Level AA is the accessibility requirement for the complete user experience.

- [Atlassian product requirements template](https://www.atlassian.com/software/confluence/templates/product-requirements)
- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)
- [AP2 v0.2 specification](https://github.com/google-agentic-commerce/AP2/blob/main/docs/ap2/specification.md)
- [Stripe Issuing real-time authorizations](https://docs.stripe.com/issuing/controls/real-time-authorizations)
- [Google SRE guidance on user-centered and iterative SLOs](https://sre.google/workbook/implementing-slos/)
- [W3C Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/)
