# Product Requirements Document

# Reins

## Independent Policy Enforcement and Authorization Evidence for AI Agent Spend

**Version:** 1.2  
**Status:** Decision draft  
**Date:** 2026-09-16  
**Authors:** Sai Prathap Reddy Cheluri and Lekhashree Srinath Reddy  
**Ownership:** Shared product requirements document  
**Audience:** Product, Engineering, Security, Payments Risk, Legal and Compliance, Partnerships  
**Decision requested:** Approve the B2B platform wedge, the enforcement model, and a sandbox MVP built on one authoritative issuer path plus UCP and AP2 evidence handling.

---

## 1 Executive decision

Reins should proceed as a B2B policy enforcement and evidence service for agent platforms, wallets, issuers, and vertical software providers that already control a payment credential, signing step, or authorization callback.

Reins gives a principal one typed spending policy across connected payment providers. It shows which controls can actually be enforced on each path, makes deterministic ALLOW, ESCALATE, or DENY decisions at a mandatory control point, and links each decision to the resulting authorization, capture, settlement, refund, and order events.

The original concept remains valid, but the product cannot promise universal enforcement by translating policy into protocol objects. AP2, UCP, ACP, Visa TAP, card issuing systems, and wallet protocols expose different capabilities. Reins must publish the enforcement strength and unsupported semantics for every control instead of treating all adapters as equivalent.

The flagship outcome is independent proof that an agent payment stayed within delegated authority, including an explicit record of where that proof ends.

### Why now

- Agent payment products now provide cards, wallets, tokens, mandates, budgets, and approvals, but policy meaning and evidence remain provider specific.
- The September 2026 EMVCo Agentic Payments draft proposes shared Intent Services for cumulative budgets, recurring intent, lifecycle state, and retrieval. Reins should align with this framework rather than create a competing card intent standard.
- Crossmint, Ramp, and Stripe already cover generic agent cards and spend controls. Reins must differentiate through provider neutral coverage proof, hard enforcement integrations, and authorization to settlement evidence.

### Product boundary

Reins is not a card issuer, consumer wallet, merchant gateway, accounting suite, fraud engine, legal dispute service, or payment rail. It does not hold funds or store PAN, CVV, bank credentials, or private wallet keys.

---

## 2 Problem and customer

Agentic payment authority is fragmented across cards, wallets, commerce protocols, identity protocols, and mandate systems. Each provider uses different control fields, identifiers, decision deadlines, and lifecycle events. A platform using more than one provider cannot reliably answer three questions:

1. Which parts of the principal's policy were enforced before payment?
2. Which policy version and human authorization produced a specific charge?
3. Did the final capture, settlement, refund, and delivery match what was approved?

### Primary customer

The initial customer is an agent platform, wallet provider, embedded finance program, or vertical SaaS product that:

- lets customer or company agents initiate purchases;
- controls credential issuance, credential release, wallet signing, or issuer authorization;
- expects to support at least two payment paths within 12 months; and
- needs auditable controls for enterprise customers, risk teams, or procurement teams.

### Users and jobs

| User | Job | Required outcome |
|---|---|---|
| Platform payments lead | Add payment providers without rebuilding governance. | One policy model, adapter contract, and evidence API. |
| Finance or risk administrator | Set budgets, limits, merchants, approval thresholds, and exceptions. | Clear coverage before activation and explainable decisions. |
| Agent developer | Request spending authority safely. | Fast verdict, atomic reservation, typed errors, and idempotency. |
| Support or disputes analyst | Investigate a questioned charge. | Chronological evidence bundle with missing data clearly identified. |

### Deferred customers

- Direct consumers, because wallet distribution and funding relationships are already controlled by providers such as Link and Crossmint.
- Broad SMB expense management, because Ramp already combines budgets, approvals, cards, accounting, and audit trails.
- Card networks as the first customer, because production access depends on partnership and certification.

---

## 3 Market position

The market does not lack spend limits. It lacks a neutral way to prove that a policy was enforceable across providers and that the resulting financial events stayed within the approved authority.

### Protocol and provider roles

| Surface | What it provides | Reins treatment |
|---|---|---|
| EMVCo Agentic Payments draft | Proposed shared card intent and lifecycle services. | Align data and lifecycle semantics; no conformance claim before a final standard. |
| UCP and AP2 version 0 2 | Commerce context, checkout, payment handlers, mandates, and receipts. | P0 evidence and mandate adapter; strong only when Reins controls signing or credential release. |
| Stripe Issuing or similar processor | Card controls, real time authorization, and financial events. | P0 authoritative sandbox path. |
| ACP | Checkout and one time delegated payment allowance. | P1 checkout context and credential release adapter. |
| Visa TAP | Agent identity and signed transaction intent for merchant recognition. | P1 identity and evidence adapter, not a spend control rail. |
| Visa Intelligent Commerce and Mastercard Agent Pay | Network credentials, identity signals, and native program capabilities. | Partner gated roadmap. |
| Crossmint | Agent cards, wallets, limits, revocation, and checkout abstraction. | Direct competitor and possible integration endpoint. |
| Ramp Agents | Business budgets, approvers, payment methods, and audit trail. | Direct competitor for the SMB finance segment. |
| x402 and MPP wallet paths | Machine payment transport and receipts. | P2 second rail after the card lifecycle is complete. |

### Positioning

Reins should be sold as an independent control and evidence layer for multi provider agent spending. Its differentiation depends on four capabilities:

1. a precise, versioned policy model with control by control coverage;
2. production grade integrations at mandatory payment control points;
3. signed authorization to settlement lineage across providers; and
4. a conformance suite that exposes downgrade, bypass, and reconciliation failures.

The architecture alone is not a moat. Crossmint, Ramp, Stripe, issuer processors, and open source control planes can implement spend rules. Reins must earn differentiation through trusted integrations, evidence quality, and observed adapter failure data.

---

## 4 Goals and non goals

### Goals

| ID | Goal | Release measure |
|---|---|---|
| G1 | Preserve policy meaning across adapters. | Every control has a coverage state and reason; no silent omission. |
| G2 | Enforce autonomous spend at a mandatory control point. | Every pilot attempt uses an accepted hard path. |
| G3 | Prevent race condition overspend. | Atomic reservations and idempotency pass the concurrency suite. |
| G4 | Explain every decision. | Verdict includes policy version, rule IDs, facts, state, adapter, and strength. |
| G5 | Link authorization to outcome. | Supported events join automatically and seeded mismatches are detected. |
| G6 | Revoke honestly. | Reins stops new authority immediately and reports downstream acknowledgement separately. |

### Non goals

- Moving, holding, or settling money.
- Storing payment account credentials or wallet private keys.
- Claiming enforcement without a credential, signer, issuer callback, or equivalent mandatory hook.
- Automated chargeback filing or legal conclusions under Regulation E or Regulation Z.
- General fraud scoring or replacement of issuer and network fraud systems.
- A consumer wallet, corporate card program, accounting suite, or merchant acceptance gateway.
- Autonomous payment approval by a language model.

---

## 5 Product experience

### Policy creation

An administrator enters a rule in plain language or through structured controls. The compiler proposes a typed policy and highlights ambiguity. A deterministic validator rejects missing or contradictory critical fields. The administrator must confirm amount, currency, merchant scope, recurrence, expiry, approval threshold, and required enforcement strength before activation.

### Coverage review

Before activation, Reins shows each policy control against every selected adapter. The administrator can see whether the control is native, enforced by Reins, hard with documented exceptions, cooperative, observe only, or unsupported. A required unsupported control blocks autonomous activation.

### Payment decision

The agent or provider submits a canonical request. Reins authenticates the caller, verifies signatures and schema versions, evaluates policy and state, and atomically reserves budget. The deterministic engine returns ALLOW, DENY, or REQUIRE STEP UP with structured reason codes.

Human approval is bound to a frozen request hash. If a provider cannot hold an authorization while a person responds, the adapter must obtain approval before credential release or decline the request and require a new signed retry.

### Evidence and investigation

Reins links policy, mandate, approval, credential reference, order, authorization, capture, settlement, refund, and fulfillment events when the source exposes them. The investigation view separates cryptographically verified facts, provider reported facts, inferred links, and missing events.

---

## 6 Policy and enforcement

### Canonical controls

The P0 policy supports:

- per transaction and rolling amount limits in integer minor units;
- currency and explicit foreign exchange behavior;
- transaction count velocity;
- merchant, category, country, and beneficiary scope;
- recurrence and merchant initiated transaction rules;
- approval threshold, approver set, authentication method, and expiry;
- allowed post authorization increases for tips, tax, shipping, or incremental capture;
- validity window, revocation state, and required enforcement strength.

### Enforcement strength

| Strength | Meaning | Autonomous use |
|---|---|---|
| STRONG NATIVE | A network, issuer, wallet, credential provider, or verified mandate enforces the control. | Allowed. |
| STRONG REINS | Reins controls credential release, signing, wallet execution, or authorization. | Allowed. |
| HARD WITH EXCEPTIONS | Normal denies block payment, but stand in, offline, force posted, or late events can create exposure. | Allowed only with an accepted exception policy and monitoring. |
| COOPERATIVE | A cooperating agent or merchant calls Reins but can bypass it. | Human present or test only. |
| OBSERVE ONLY | Reins receives the event after authorization or settlement. | Never counted as prevention. |
| UNSUPPORTED | The control cannot be represented or evaluated with available data. | Blocks activation when required. |

Each hard adapter publishes its exception types, failure behavior, decision deadline, revocation behavior, and estimated amount at risk. Detection is never labeled as prevention.

### Decision lifecycle

1. Validate identity, schema, signature, policy version, request fields, and current state.
2. Evaluate deterministic rules and provider capability requirements.
3. Atomically reserve the amount and velocity slot with an expiry.
4. Require step up approval when policy requires it.
5. Release the credential, signature, or authorization only after a valid allow decision.
6. Commit, adjust, or release the reservation from downstream events.
7. Reconcile capture, settlement, refund, and fulfillment against the approved request.

Core evaluation must complete within 50 milliseconds at pilot load. The adapter must also preserve margin inside the upstream provider deadline. A timeout or unavailable policy service never becomes an allow decision.

---

## 7 Product requirements

| ID | Requirement | Priority | Acceptance condition |
|---|---|---|---|
| FR1 | Compile plain language into a typed policy with uncertainty and exact read back. | P0 | Critical ambiguity blocks activation; labeled test corpus has no silent critical omission. |
| FR2 | Publish control by control adapter coverage. | P0 | Required unsupported controls block autonomous activation. |
| FR3 | Return deterministic verdicts and reason codes. | P0 | Identical state and input replay identically across 10,000 runs. |
| FR4 | Reserve budgets and velocity atomically. | P0 | One hundred simultaneous requests never exceed the configured limit. |
| FR5 | Bind approval to a canonical request hash. | P0 | Any material request change invalidates prior approval. |
| FR6 | Support immediate local revocation and downstream status tracking. | P0 | No new Reins authority after revocation; provider status remains visible. |
| FR7 | Verify UCP and AP2 mandates, receipts, versions, signatures, and bindings. | P0 | Official samples pass and negative replay, key, scope, and schema vectors fail. |
| FR8 | Integrate one issuer sandbox authorization path. | P0 | Over cap and revoked requests decline; allowed requests commit idempotently. |
| FR9 | Build an evidence graph across decision and financial events. | P0 | Seeded end to end cases produce a complete graph or explicit missing nodes. |
| FR10 | Detect reconciliation mismatches. | P0 | Seeded duplicate, late, partial, over capture, refund, currency, and lineage cases are classified. |
| FR11 | Produce a signed decision receipt. | P0 | Offline verification succeeds and any protected field mutation fails. |
| FR12 | Provide SDK operations for evaluate, reserve, approve, commit, release, revoke, and evidence. | P0 | A reference agent integrates a hard path within one engineer day. |

### MVP integrations

The MVP uses one real issuer or processor sandbox, preferably Stripe Issuing or Lithic, plus UCP and AP2 evidence handling. Visa and Mastercard native programs remain partner gated. A second wallet based rail is added only after the first authorization, capture, refund, and reconciliation lifecycle is complete.

---

## 8 Data reconciliation and evidence

### Required identifiers

Every event records tenant, principal, agent, policy version, decision, reservation, adapter, source system, source event ID, request hash, event time, ingestion time, schema version, and verification status. Provider identifiers remain separate from Reins identifiers and are joined through explicit edges.

### Mismatch classes

Reins must detect authorization without reservation, capture without authorization, amount above approved tolerance, duplicate authorization or capture, late use of an expired reservation, partial or multiple capture outside policy, missing or late reversal or refund, merchant or currency mismatch, fulfillment failure after capture, and provider reported agent spend with no Reins policy lineage.

### Evidence bundle

The export contains source artifacts, verification results, policy and decision records, approval authentication, event chronology, missing evidence, and a plain language summary generated only from structured facts. It states what Reins verified, what a provider reported, what was inferred, and what remains unknown. It does not promise reimbursement or a legal outcome.

---

## 9 Security privacy and regulatory boundaries

- The language model can propose policy text and summarize evidence but cannot approve a payment.
- No PAN, CVV, bank credential, or wallet private key enters prompts, logs, analytics, or support tooling.
- Signing keys use KMS or HSM protection, rotation, environment separation, and least privilege.
- Public key retrieval is allowlisted and protected against server side request forgery, redirects, private address ranges, replay, and algorithm confusion.
- Policy state and reservations use serializable or equivalent atomic semantics and mandatory idempotency keys.
- Strong autonomous paths fail closed. Human present fallback requires independent provider authentication and is marked outside Reins enforcement.
- The architecture is intended to minimize PCI DSS scope, but a QSA or acquiring partner must validate the production data flow.
- Regulation E and Regulation Z rights depend on account type, facts, financial institution findings, and law. Reins provides evidence for error resolution and does not classify a transaction as legally unauthorized.
- If Reins issues an access device without an agreement with the account holding institution, counsel must assess 12 CFR 1005.14 before launch.

---

## 10 Success metrics

| Area | Metric | Pilot target |
|---|---|---|
| Coverage | Autonomous attempts on accepted hard paths | 100 percent |
| Coverage | Activated required controls with unknown coverage | 0 |
| Compiler | Critical field silent omission | 0 on release set |
| Compiler | Critical field precision and recall | At least 0.98 each |
| Decision | Deterministic replay mismatch | 0 |
| Decision | Concurrency overspend | 0 |
| Decision | Evaluator latency | p99 below 50 ms |
| Escalation | Recall for labeled risky cases | At least 0.98 |
| Escalation | False allow on critical cases | 0 |
| Evidence | Supported path automatic event join | At least 99.5 percent |
| Evidence | Seeded mismatch detection | 100 percent |
| Evidence | Unsupported legal conclusions in export | 0 |

Accuracy alone is not a release metric because over constraint and under constraint have different consequences. The compiler and escalation evaluations report precision and recall by critical policy field and risk class.

---

## 11 Rollout and decision gates

| Phase | Timing | Deliverable | Exit gate |
|---|---|---|---|
| Customer validation | Weeks 0 to 2 | Interviews, EMVCo mapping, two integration maps, and design partner letters. | Two partners offer a mandatory control point; one values independent evidence enough to pilot. |
| Core engine | Weeks 2 to 6 | Policy model, compiler, deterministic evaluator, reservations, signed receipts, and conformance tests. | Compiler, replay, concurrency, and security gates pass. |
| Sandbox proof | Weeks 6 to 10 | One issuer sandbox path plus UCP and AP2 evidence flow, approval UI, revocation, and reconciliation. | One blocked card request, one blocked mandate or credential release, and complete allowed flows. |
| Pilot readiness | Weeks 10 to 14 | Tenant isolation, operations, incident response, legal review, PCI review, and penetration test. | No unresolved critical issue; partner confirms support and fallback ownership. |

Production requires a separate approval based on pilot data. The PRD does not assume a fourteen week path to broad multi network enforcement.

### Demo definition

The demo must prove one race safe budget decision, one human approval bound to an immutable request, one denied issuer authorization, one verified UCP or AP2 mandate flow, one visible TAP identity signal without false spend enforcement, one reconciliation mismatch, and one revocation with separate downstream acknowledgement.

---

## 12 Risks and open decisions

### Principal risks

| Risk | Impact | Mitigation |
|---|---|---|
| No mandatory payment control point | Product is bypassable. | Pilot only where Reins or a partner controls credential release, signing, wallet execution, or authorization. |
| Providers add equivalent cross rail evidence | Differentiation narrows. | Emphasize neutral coverage proof, deployable infrastructure, conformance, and observed failure data. |
| EMVCo standardizes the intent layer | Canonical registry becomes infrastructure. | Align early and differentiate above the shared standard. |
| Merchant or category data is unreliable | Incorrect policy result. | Record confidence, preserve unknown state, and use explicit escalate or deny defaults. |
| Fail closed behavior harms conversion | Users bypass the product. | Restrict the pilot to high confidence paths and report provider specific failure causes. |
| Evidence is mistaken for legal entitlement | Consumer and regulatory harm. | Use fact only exports, legal review, and no reimbursement promises. |

### Decisions required before production

1. Which partner provides the first mandatory credential or authorization hook?
2. Which AP2 role will Reins perform, and who owns the trusted signing surface?
3. Which identifiers can join order, authorization, capture, settlement, and refund events?
4. How will tips, incremental authorization, subscriptions, and merchant initiated transactions be represented?
5. What downstream revocation acknowledgements and service levels can be stated?
6. Which deployment model will partners accept: hosted control plane, customer hosted data plane, or library?
7. Which components remain in PCI scope after the production integration?
8. Who owns customer support when Reins denies a transaction a provider would otherwise approve?

---

## 13 Source references

- [EMVCo Agentic Payments Framework announcement](https://www.emvco.com/news/emvco-requests-feedback-on-framework-for-secure-interoperable-and-scalable-card-based-agentic-payments/)
- [EMVCo Agentic Payments Framework draft](https://www.emvco.com/resources/emv-agentic-payments-framework-for-specifications-v1-0-draft-comment-period-ends-30-sept-2026/)
- [AP2 version 0 2 specification](https://github.com/google-agentic-commerce/AP2/blob/main/docs/ap2/specification.md)
- [FIDO Alliance AP2 transfer announcement](https://fidoalliance.org/google-donates-agent-payments-protocol-to-fido-alliance/)
- [Universal Commerce Protocol](https://github.com/Universal-Commerce-Protocol/ucp)
- [Visa Trusted Agent Protocol](https://developer.visa.com/capabilities/trusted-agent-protocol/trusted-agent-protocol-specifications)
- [Agentic Commerce Protocol](https://github.com/agentic-commerce-protocol/agentic-commerce-protocol)
- [Stripe Issuing real time authorizations](https://docs.stripe.com/issuing/controls/real-time-authorizations)
- [Crossmint agent payment documentation](https://docs.crossmint.com/agents/how-agents-pay)
- [Ramp Agents](https://agents.ramp.com/)
- [CFPB Regulation E FAQ](https://www.consumerfinance.gov/compliance/compliance-resources/deposit-accounts-resources/electronic-fund-transfers/electronic-fund-transfers-faqs/)
- [12 CFR 1005 11](https://www.consumerfinance.gov/rules-policy/regulations/1005/11/)
- [12 CFR 1005 14](https://www.consumerfinance.gov/rules-policy/regulations/1005/14/)
- [12 CFR 1026 13](https://www.consumerfinance.gov/rules-policy/regulations/1026/13/)
- [PCI SSC FAQ 1326](https://www.pcisecuritystandards.org/faqs/1326/)
- [PCI SSC FAQ 1580](https://www.pcisecuritystandards.org/faqs/1580/)

---

## 14 Final recommendation

Approve the sandbox MVP only if a design partner provides a mandatory credential, signing, wallet, or authorization control point. Build one complete card lifecycle and one UCP or AP2 evidence flow before adding protocol logos. Keep market research, detailed schemas, legal analysis, and the full adversarial catalog as companion documents so the core PRD remains concise and decision focused.
