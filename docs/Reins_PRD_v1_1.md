# Product Requirements Document

# Reins

## Independent Policy Enforcement and Authorization Evidence for AI-Agent Spend

**Version:** 1.1  
**Status:** Evidence-based revision for validation  
**Date:** 2026-09-16  
**Authors:** Sai Prathap Reddy Cheluri and Lekhashree Srinath Reddy  
**Ownership:** Shared product requirements document  
**Primary audience:** Product, Engineering, Security, Payments Risk, Legal/Compliance, Partnerships  
**Decision requested:** Approve the revised wedge, enforcement model, validation gates, and sandbox MVP. Do not approve production money movement or broad "all rails" claims until the partner and legal gates in this document are met.

---

## 1. Executive decision

Reins should continue, but with a narrower and more defensible product definition.

Reins is not a universal payment rail, consumer wallet, card issuer, merchant acceptance gateway, or legal dispute service. It is an independent control plane that:

1. turns a principal's spending intent into a typed, versioned policy;
2. shows exactly which parts of that policy are enforceable on each connected payment path;
3. makes deterministic ALLOW, ESCALATE, or DENY decisions at the strongest available control point;
4. binds each decision to the credential, mandate, checkout, authorization, capture, settlement, refund, and fulfillment events that follow; and
5. produces a signed, replayable evidence graph explaining what was allowed, what happened, and where enforcement coverage was incomplete.

The v1.0 thesis - "one policy translated into every protocol-native mandate" - is directionally right but too strong. The protocols do not expose equivalent policy primitives, and some are commerce or identity protocols rather than authorization rails. Reins v1.1 therefore uses a canonical policy plus an explicit enforcement-coverage contract. It never silently drops a rule or implies that a cooperative SDK check is equivalent to network-level enforcement.

The launch wedge is B2B infrastructure for agent platforms, wallets, issuers, and vertical SaaS providers that already control a payment credential or authorization hook. A direct-to-consumer app and a broad SMB finance suite are deferred. Stripe, Crossmint, and Ramp now cover much of those surfaces and have better distribution.

Reins must also align with the new EMVCo Agentic Payments draft. EMVCo's proposed Intent Services cover persistent consumer intent, cumulative budgets, recurring purchases, lifecycle state, and authorized retrieval - directly overlapping the canonical-policy registry envisioned in v1.0. Reins should not create a competing card-intent standard. It should implement or interoperate with the final standard while differentiating through policy authoring, deterministic enforcement, cross-provider coverage proofs, reconciliation, and evidence.

### Product thesis

Existing payment products increasingly offer limits, approvals, and agent-bound credentials. The remaining gap is not "can an agent have a spending cap?" The gap is:

- Can one principal express policy consistently across multiple providers and payment methods?
- Can the system prove which controls were actually enforced, where, and at what strength?
- Can every financial event be traced back to the exact policy version and human authorization?
- Can a platform detect an enforcement downgrade, bypass, or post-authorization mismatch before it becomes an audit or support incident?

Reins wins only if it is better at those four jobs than a provider-native dashboard.

---

## 2. What changed since v1.0

The original architecture made the correct choice to keep language models off the authorization path. The revision preserves that. The following market and protocol changes require a scope reset:

- The Universal Commerce Protocol (UCP) is now a major interoperability surface for discovery, checkout, orders, payment handlers, and AP2 mandate extensions. Omitting it makes a cross-protocol product incomplete. [UCP specification repository](https://github.com/Universal-Commerce-Protocol/ucp)
- On September 1, 2026, EMVCo published a draft Agentic Payments Framework introducing shared Intent Services for registering, retrieving, maintaining, and revoking persistent consumer intent across card-payment participants, including cumulative budgets, recurring purchases, and post-transaction activities. This standardization effort reaches into the center of Reins' original thesis. It is both the largest strategic threat and the clearest integration opportunity. The public-comment deadline is September 30, 2026. [EMVCo announcement](https://www.emvco.com/news/emvco-requests-feedback-on-framework-for-secure-interoperable-and-scalable-card-based-agentic-payments/)
- AP2 moved to the FIDO Alliance on April 29, 2026 and v0.2 uses Checkout and Payment Mandates, receipts, and deterministic verification responsibilities. Reins should target AP2 v0.2 rather than the older Intent/Cart vocabulary. [FIDO Alliance transfer announcement](https://fidoalliance.org/google-donates-agent-payments-protocol-to-fido-alliance/) and [AP2 v0.2 specification](https://github.com/google-agentic-commerce/AP2/blob/main/docs/ap2/specification.md)
- Visa Trusted Agent Protocol (TAP) is primarily a cryptographic agent-recognition and transaction-intent mechanism for merchants. It is not, by itself, a general spend-policy or settlement protocol. [Visa TAP specifications](https://developer.visa.com/capabilities/trusted-agent-protocol/trusted-agent-protocol-specifications)
- ACP is a commerce and delegated-payment interface. Its delegated allowance is currently one-time and scoped by amount, currency, merchant, checkout session, and expiry; it is not a cross-session monthly budget engine. [ACP Delegate Payment API](https://github.com/agentic-commerce-protocol/agentic-commerce-protocol/blob/main/spec/2026-01-30/openapi/openapi.delegate_payment.yaml)
- Stripe now offers Shared Payment Tokens, Link's wallet for agents, and Issuing for agents with single-use cards, controls, real-time authorization, monitoring, and reconciliation primitives. [Stripe agent wallet and issuing announcement](https://stripe.com/blog/giving-agents-the-ability-to-pay)
- Crossmint now offers scoped agent cards across Visa and Mastercard, stablecoin wallets, spend limits, order intents, revocation, and a checkout abstraction that selects protocols or browser automation. [Crossmint agent payment documentation](https://docs.crossmint.com/agents/how-agents-pay)
- Ramp now markets agent identity, budgets, human approvers, merchant restrictions, multiple payment methods, and end-to-end audit trails to finance teams. [Ramp Agents](https://agents.ramp.com/)
- PaySentry is an open-source project using nearly the same "multi-protocol payment control plane" framing across x402, ACP, AP2, and TAP. Its small adoption does not make it a commercial threat today, but it invalidates any claim that the architecture alone is novel. [PaySentry repository](https://github.com/mkmkkkkk/paysentry)

### Consequence

"Live" is not one status. Reins uses these labels in planning and external copy:

| Surface | Evidence-based status on 2026-09-16 | PRD treatment |
|---|---|---|
| EMVCo Agentic Payments | Public draft; comments close 2026-09-30 | ALIGNMENT only; no conformance claim |
| AP2 v0.2 | Active open specification, schemas, SDK samples, and ongoing FIDO standardization; not a settlement rail | P0 sandbox/reference adapter |
| UCP | Active open specification, SDKs, samples, and conformance work | P0 commerce context and order adapter |
| Visa TAP | Public specification and sample implementation | P1 identity/intent verifier, not spend-control rail |
| Visa Intelligent Commerce | Sandbox and partner capabilities; Visa says deployment is in progress and availability varies | Partner-gated roadmap |
| Visa Intelligent Commerce Connect | Select-partner pilot with broader 2026 rollout announced | Do not compete as merchant gateway |
| Mastercard Agent Pay | Live partner deployments and network program; not a universal self-serve API | Partner-gated roadmap |
| ACP | Open protocol with real production implementations; individual commerce experiences and direction can change | P1 checkout/delegated allowance adapter |
| Stripe Issuing for agents | Announced product surface on top of mature Issuing controls; availability depends on account/program | Candidate P0 sandbox substrate |
| Crossmint agentic cards | Public product/API with some staging or unstable lifecycle endpoints | Direct competitor; verify geography and network coverage |
| Ramp Agent Cards / Agents | Direct SMB overlap; first-party materials include alpha/early-access positioning | Direct competitor; avoid broad SMB suite wedge |

Spend caps, approval thresholds, and persistent card intent are becoming standards or table stakes. Reins must differentiate on provider neutrality, enforcement transparency, conformance testing, authorization-to-settlement lineage, and evidence quality.

---

## 3. Problem statement

AI agents can receive payment authority through provider-specific cards, tokens, wallets, commerce protocols, and mandate systems. Each system exposes different controls, identifiers, lifecycle events, and evidence. A platform operating more than one of them faces four failures:

1. **Semantic fragmentation:** A policy such as "$2,000 per month, $300 per transaction, ask above $150, only approved software vendors" cannot be represented with equal fidelity on every path.
2. **Enforcement ambiguity:** A UI may show a limit without revealing whether it is enforced by a network token, a credential provider, an issuer authorization webhook, a cooperative agent SDK, or only an after-the-fact monitor.
3. **Lineage loss:** Mandates, credentials, checkout sessions, authorizations, captures, settlements, refunds, and deliveries use different identifiers. Finance and support teams cannot reliably answer which policy authorized a charge.
4. **Bypass and downgrade risk:** An agent can use an ungoverned credential, a fallback browser path, a stale mandate, a retry, or a different provider unless the system owns a mandatory choke point and detects unsupported fallbacks.

The problem is not solved by translating JSON shapes. It is solved by preserving policy meaning, choosing a real enforcement point, and proving the complete transaction lineage.

---

## 4. Target customer and wedge

### Primary ICP for v1

Agent platforms, vertical SaaS products, wallet providers, and fintechs that:

- let customer-controlled or company-controlled agents initiate purchases;
- already control credential issuance, credential release, or an authorization callback;
- expect to support at least two payment paths within 12 months;
- need auditable controls for customers, risk teams, or enterprise procurement; and
- can integrate an SDK or API before production checkout.

Examples include a procurement-agent platform using issued cards today and AP2/UCP tomorrow, or a wallet provider serving both agentic card and stablecoin payments.

### Buyer

- Product or payments lead for the agent platform
- Head of risk or compliance for the embedded-finance program
- Engineering leader responsible for agent permissions and checkout reliability

### End users

- Finance administrator defining budgets and approval rules
- Individual principal delegating a limited purchase mandate
- Agent developer integrating the decision and evidence APIs
- Support or disputes analyst investigating a mismatch

### Deferred segments

- **Direct consumer wallet:** Deferred because Link and Crossmint already own trusted funding and approval surfaces.
- **Full SMB expense platform:** Deferred because Ramp already combines identities, budgets, multiple payment methods, accounting, and audit trails.
- **Issuer core or card network product:** Potential enterprise route, but partnership-led and outside the sandbox MVP.

---

## 5. Jobs to be done

### Platform operator

When my agents can spend through more than one provider, I need one policy model and one evidence trail so that I can add new rails without recreating governance and audit logic.

### Finance or risk administrator

When an agent requests or completes a payment, I need to know the rule, enforcement strength, human authorization, and resulting financial events so that I can trust automation and investigate exceptions.

### Agent developer

Before requesting a credential or payment, I need a fast, typed verdict and a reservation token so that concurrency, retries, and partial failures cannot overspend the budget.

### Support or disputes analyst

When a charge is questioned, I need a chronological evidence bundle linking policy, mandate, decision, credential, order, authorization, capture, and settlement without claiming a legal outcome Reins cannot determine.

---

## 6. Goals and non-goals

### Goals

| ID | Goal | Release measure |
|---|---|---|
| G1 | Preserve policy meaning across adapters. | No silent omission of a policy control; every control receives a coverage state and reason. |
| G2 | Enforce at a mandatory choke point. | 100% of autonomous pilot spend uses STRONG enforcement; COOPERATIVE and OBSERVE_ONLY paths cannot auto-approve. |
| G3 | Make deterministic, concurrency-safe decisions. | Same inputs and state produce the same verdict; atomic reservations prevent race-condition overspend. |
| G4 | Explain every decision from structured facts. | Every verdict contains rule IDs, policy version, inputs, state snapshot, adapter, and enforcement strength. |
| G5 | Link authorization to financial outcome. | At least 99.5% of events on the supported sandbox paths join automatically; all seeded mismatch classes are detected. |
| G6 | Revoke honestly. | No new Reins-issued reservation or credential after revocation; provider revocation status and acknowledgement are visible separately. |
| G7 | Survive protocol evolution. | Version-pinned schemas, conformance tests, and adapter capability manifests fail closed on incompatible change. |

### Non-goals for v1.1

- Moving, holding, or settling money
- Storing PAN, CVV, or bank login credentials
- Claiming automatic enforcement on a rail without a credential, verifier, or authorization hook controlled by Reins or its integration partner
- A direct integration with every card network
- Automated chargeback or Reg E/Reg Z filing
- Legal conclusions about whether a transaction is "unauthorized"
- General fraud scoring or replacement of network/issuer fraud systems
- A consumer wallet, corporate card program, accounting suite, or merchant acceptance gateway
- Delivery verification where the merchant or commerce protocol exposes no order/fulfillment event
- Fully autonomous approval based on an LLM or anomaly model

---

## 7. Product principles

1. **The model proposes; deterministic code decides.** The language model may parse policy text or summarize evidence. It has no authority to approve a payment.
2. **No silent downgrade.** Unsupported controls are visible. A required control that cannot be strongly enforced blocks autonomous activation.
3. **Enforcement strength is part of the verdict.** "Allowed" without where and how it is enforced is incomplete.
4. **Reserve before releasing spending power.** Budget is reserved atomically before a credential, mandate signature, or approval token is returned.
5. **Receipts over claims.** The product stores signed artifacts and immutable links, not marketing assertions about coverage.
6. **Detection is not prevention.** Observe-only adapters are labeled as such and cannot be included in the autonomous-spend numerator.
7. **Regulatory adjacency is not legal entitlement.** Evidence can support an investigation; Reins does not promise reimbursement or classify rights.
8. **Protocols are adapters, not the product.** The defensible core is the policy semantics, enforcement contract, conformance suite, and evidence graph.

---

## 8. Enforcement model

### 8.1 Enforcement strength

Each adapter declares one of six strengths for every policy control:

| Strength | Meaning | Autonomous use |
|---|---|---|
| STRONG_NATIVE | Enforced by a network, issuer, wallet, credential provider, or cryptographically verified mandate at transaction time. | Allowed |
| STRONG_REINS | Reins controls a mandatory credential-release, mandate-signing, or authorization callback before execution. | Allowed |
| HARD_WITH_EXCEPTIONS | Normal authorizations are blocked on deny, but documented provider/network paths such as stand-in, offline, force-posted, or late capture can create exposure. | Allowed only with explicit exception policy and monitoring |
| COOPERATIVE | The agent or merchant calls Reins, but can technically bypass it. | Human approval or test only |
| OBSERVE_ONLY | Reins sees the event after authorization or settlement. | Never counted as prevention |
| UNSUPPORTED | The control cannot be represented or checked with available data. | Blocks activation if required |

Strength is assigned per control, not per adapter. An adapter may enforce amount strongly while merchant category is observe-only. Every hard mode also publishes an exception manifest and estimated amount at risk; a successful authorization decision is not treated as proof of final capture or settlement.

### 8.2 Mandatory choke points

Reins may block execution only when integrated at one of these points:

1. **Credential issuance or release:** A token, virtual card, SPT, or session key is minted only after a Reins reservation.
2. **Trusted signing surface:** Reins or a trusted surface signs an AP2 open/closed mandate only after evaluation.
3. **Issuer or processor authorization callback:** The authorization is approved only after a Reins decision.
4. **Wallet transaction signing:** The wallet signs only after evaluation.

An SDK preflight call without one of these controls is cooperative and bypassable.

### 8.3 Decision lifecycle

1. `EVALUATE`: validate identity, signature, policy version, request fields, merchant data, and state.
2. `RESERVE`: atomically reserve the amount and velocity slot with an expiry.
3. `ESCALATE` if required: bind the approval to a frozen request hash; any material change creates a new request.
4. `RELEASE_CREDENTIAL_OR_SIGNATURE`: only after ALLOW or valid human approval.
5. `COMMIT`: convert the reservation when an authorization/capture event is received.
6. `RELEASE`: return unused budget on expiry, verified failure, void, or reversal.
7. `RECONCILE`: link capture, settlement, refund, and fulfillment events; flag discrepancies.

This reservation model closes the time-of-check/time-of-use and parallel-request gaps missing from v1.0.

`ESCALATE` is a policy result, not a promise that a card authorization can remain open. On a path that cannot pause for human input, the adapter must either obtain approval before credential release or decline and require a new, cryptographically bound retry. A late approval never revives or mutates the original network request.

---

## 9. Canonical policy model

The policy vocabulary remains closed and typed. Every monetary value is stored in integer minor units with ISO 4217 currency and an explicit FX policy.

```json
{
  "policy_id": "pol_...",
  "version": 4,
  "principal_id": "prn_...",
  "agent_id": "agt_...",
  "status": "active",
  "valid_from": "2026-09-16T00:00:00Z",
  "valid_until": "2026-10-16T00:00:00Z",
  "amount": {
    "currency": "USD",
    "per_transaction_minor": 15000,
    "rolling_limits": [
      {"window": "P1D", "max_minor": 30000},
      {"window": "P1M", "max_minor": 200000}
    ],
    "fx_mode": "deny_non_base_currency"
  },
  "velocity": [
    {"window": "PT10M", "max_count": 3},
    {"window": "P1D", "max_count": 10}
  ],
  "merchant": {
    "allow_ids": ["merchant_123"],
    "deny_ids": [],
    "allow_mcc": ["5411"],
    "new_merchant": "escalate",
    "unknown_mcc": "escalate"
  },
  "approval": {
    "threshold_minor": 5000,
    "approver_ids": ["usr_..."],
    "ttl_seconds": 300
  },
  "post_authorization_tolerance": {
    "type": "percent",
    "value": 10,
    "eligible_reasons": ["tax", "tip", "shipping"]
  },
  "recurrence": {
    "allowed": false
  },
  "required_strength": "STRONG_REINS",
  "fail_mode": "deny"
}
```

### 9.1 Compiler requirements

- The LLM outputs only the typed proposal and uncertainty annotations.
- A schema validator and deterministic semantic validator reject contradictory or incomplete proposals.
- Critical fields - amount, currency, beneficiary/merchant scope, recurrence, expiry, and approval threshold - require exact read-back confirmation.
- Ambiguity produces a targeted question, never a default guess.
- A policy diff shows changes from the active version.
- Activation requires explicit confirmation and a fresh authentication ceremony appropriate to risk.
- The compiler emits an adapter coverage report before activation.

### 9.2 Adapter coverage contract

For each control and adapter, the compiler returns:

- normalized meaning;
- native artifact field, if any;
- Reins-side check, if any;
- enforcement strength;
- unsupported or lossy semantics;
- required partner capability;
- test vector and schema version.

No artifact is described as equivalent unless its semantics and evaluation algorithm are equivalent.

---

## 10. Protocol and provider adapters

### 10.1 EMVCo Agentic Payments Intent Services - P0 alignment, P2 implementation

Role: Align the canonical policy, lifecycle, identifiers, and evidence graph with the September 2026 draft framework; implement the eventual specification through an issuer, network, processor, or wallet partner.

Immediate work:

- map Reins policy fields and lifecycle states to the draft Intent Service model;
- identify controls and evidence not covered by the draft;
- submit focused public comments before September 30, 2026, especially on policy-version binding, decision receipts, enforcement-strength disclosure, atomic budget reservation, revocation acknowledgements, and reconciliation identifiers;
- keep Reins-native fields in a namespaced extension rather than forking the standard;
- treat the draft as unstable and do not advertise conformance until a testable final specification and program exist.

Strategic boundary: if a final EMVCo Intent Service standard supplies the shared card-intent registry and state, Reins consumes it. Reins' product value then sits above and beside it: user-facing policy compilation, non-card and cross-provider coordination, strong-path decisioning, coverage proof, conformance, and evidence.

### 10.2 UCP + AP2 v0.2 - P0

Role: Reins acts as or integrates with a Credential Provider / Trusted Surface and verification delegate.

Capabilities:

- consume UCP profiles, checkout sessions, payment handlers, order events, and AP2 mandate extension;
- create and verify AP2 v0.2 Checkout and Payment Mandates and Receipts;
- evaluate open-mandate constraints deterministically;
- bind policy version, decision receipt, reservation, credential, and checkout hash;
- refuse unsupported schema versions;
- use official conformance suites where available.

Important boundary: AP2 provides mandate and dispute-evidence primitives but does not make Reins a network authorization switch. Strong enforcement requires Reins to control the signing or credential-provider step.

### 10.3 Stripe Issuing authorization path - P0 sandbox

Role: Strong Reins enforcement through a real-time authorization callback in test mode.

Capabilities:

- one agent-bound or transaction-bound virtual card per controlled scope;
- authorization webhook mapped to a reservation and policy version;
- deterministic approve/decline with idempotency;
- authorization, capture, reversal, refund, and dispute-event ingestion;
- reconciliation against ledger and evidence graph.

This is the P0 proof that Reins can actually block a card authorization. It is more important than claiming shallow support for four protocols.

### 10.4 ACP - P1

Role: Ingest checkout and delegated-payment allowance, and control credential release where Reins is the wallet/provider.

Capabilities:

- validate checkout and delegate-payment schemas;
- bind the one-time allowance to amount, currency, merchant, checkout session, and expiry;
- consume order/payment webhooks;
- reconcile merchant and PSP events.

Boundary: ACP itself does not supply monthly cross-merchant budgets. Those remain Reins state and require a mandatory credential-release or authorization hook.

### 10.5 Visa TAP - P1 identity/evidence adapter

Role: Verify trusted-agent identity and payer intent; contribute signals to the evidence graph.

Capabilities:

- verify RFC 9421 `Signature-Input` and `Signature` fields;
- require correct `agent-browser-auth` or `agent-payer-auth` tag for the interaction;
- validate timestamps, nonce, target authority/path, key ID, and algorithm;
- retrieve keys only from pinned, allowlisted directories with SSRF defenses;
- retain verification result and request hash.

Boundary: TAP is not represented as a native spend-cap engine or settlement feed. Visa Intelligent Commerce token controls require a separate partner integration.

### 10.6 Mastercard Agent Pay / Verifiable Intent - P2 partnership

Role: Future native token and intent integration through Mastercard or an approved intermediary.

P0/P1 work is limited to schema research, FIDO-aligned Verifiable Intent artifacts, and simulated fixtures clearly labeled as such. No production or "live" claim is permitted without credentials, test certification, and contractual access.

### 10.7 Stablecoin/x402/MPP - P2

Role: Add wallet-signing or receipt-ingestion adapters after the card/AP2 wedge proves demand.

This market already has strong wallet-native policy engines. Reins should integrate rather than rebuild custody or signing infrastructure.

---

## 11. Functional requirements

| ID | Requirement | Pri | Acceptance test |
|---|---|---|---|
| FR-1 | Plain-language compiler produces a typed policy, uncertainty list, and exact read-back. | P0 | Zero silent omission of critical fields in the labeled corpus; ambiguous inputs cannot activate. |
| FR-2 | Adapter coverage contract reports strength and semantic loss for every control. | P0 | Golden tests verify all coverage states; required UNSUPPORTED controls block autonomous activation. |
| FR-3 | Deterministic decision API returns ALLOW, ESCALATE, or DENY plus structured reasons. | P0 | Identical state and input replay identically across 10,000 runs; no model or external network call in core evaluator. |
| FR-4 | Atomic reservations protect rolling budgets and velocity under concurrency. | P0 | Parallel test with 100 simultaneous requests never exceeds cap or count. |
| FR-5 | Request and approval are bound to a canonical request hash. | P0 | Any change to amount, merchant, currency, items, recurrence, or expiry invalidates prior approval. |
| FR-6 | Revocation stops new Reins approvals and tracks downstream provider acknowledgement. | P0 | No new reservations after revocation; UI distinguishes local stop from provider-confirmed revocation. |
| FR-7 | UCP/AP2 v0.2 adapter verifies mandates, receipts, disclosure constraints, bindings, and versions. | P0 | Official samples and negative vectors pass; stale, replayed, unknown-key, wrong-checkout, and out-of-scope mandates fail. |
| FR-8 | Stripe Issuing sandbox adapter can approve or decline a real-time test authorization. | P0 | Over-cap and revoked-agent authorizations decline; allowed request commits to ledger; duplicate callback is idempotent. |
| FR-9 | Evidence graph links policy, decision, reservation, approval, credential/mandate, checkout/order, authorization, capture, settlement, refund, and fulfillment when present. | P0 | Seeded end-to-end paths produce a complete graph; missing nodes are explicit, not inferred. |
| FR-10 | Reconciliation classifies unmatched, over-authorized, duplicate, late-presented, partial-capture, reversal, refund, and delivery-state mismatches. | P0 | 100% of seeded cases detected with deterministic explanation. |
| FR-11 | Signed decision receipt can be verified offline. | P0 | Verification succeeds with published key and fails after any field mutation. |
| FR-12 | Approval UX shows frozen request, rule, amount, merchant, enforcement strength, expiry, and alternatives. | P0 | Usability test confirms approver can distinguish approve-once from policy change; expired approval cannot be reused. |
| FR-13 | Append-only audit records are periodically signed and externally anchored. | P0 | Record deletion/edit is detected even if an attacker can rewrite the local database and hash chain. |
| FR-14 | TAP verifier contributes identity/intent evidence without claiming spend enforcement. | P1 | Correct tags and signatures pass; replay, stale timestamp, wrong target, and untrusted key fail. |
| FR-15 | ACP adapter validates one-time allowance and links checkout/order/payment events. | P1 | Amount, merchant, session, currency, and expiry violations fail; completed checkout reconciles. |
| FR-16 | SDK provides evaluate, reserve, approve, commit, release, revoke, and evidence APIs. | P0 | A reference agent integrates the strong path in under one engineer-day with typed errors and idempotency. |
| FR-17 | Adapter conformance harness publishes machine-readable results. | P0 | CI blocks incompatible schema changes and any adversarial regression. |
| FR-18 | EMVCo Intent Service alignment map covers policy, lifecycle, state, identifiers, and extension gaps. | P0 | Every Reins field is mapped, namespaced as an extension, or explicitly excluded; no proprietary field is presented as an EMV standard field. |

---

## 12. Non-functional requirements

### Latency

- Core evaluation p99 under 50 ms at projected pilot load.
- Reservation p99 under 100 ms in a single region.
- End-to-end authorization budget is provider-specific and measured separately; Reins must not hide partner latency.
- Upstream deadlines are hard constraints: Stripe documents a two-second real-time authorization response window and Lithic documents a three-second custom authorization window. Adapter budgets must leave substantial network and provider margin; timeout is never converted to ALLOW. [Stripe real-time authorizations](https://docs.stripe.com/issuing/controls/real-time-authorizations) and [Lithic Auth Stream Access](https://docs.lithic.com/docs/digital-banking)

### Availability and fail mode

- Strong autonomous paths fail closed when policy state or reservation service is unavailable.
- Human-present purchases may offer a clearly labeled manual fallback only if the payment provider independently re-authenticates the user and the event is marked outside Reins enforcement.
- No path converts an error or timeout into ALLOW.

### Consistency

- Budget and velocity state require serializable or equivalent atomic semantics per policy scope.
- Idempotency keys are mandatory across evaluate, reserve, approval, credential release, and event ingestion.
- Event ordering tolerates delayed and duplicated provider webhooks.

### Security

- No PAN, CVV, bank credential, or user private key enters Reins logs, prompts, analytics, or support tooling.
- Reins signing keys are held in KMS/HSM with rotation and separation by environment and artifact type.
- User approvals use passkey/WebAuthn or provider-equivalent strong authentication for pilot.
- Public-key discovery is allowlisted, cached, pinned where possible, and protected from SSRF, redirects, private address ranges, and algorithm confusion.
- Structured decision reasons are the source of truth; an LLM may paraphrase them but cannot add facts.
- Every dependency and schema is version-pinned with SBOM, signature verification where available, and change review.

### Privacy and retention

- Store the minimum merchant, item, identity, and evidence data required for policy and audit.
- Separate consumer and business tenants; encrypt tenant data and sensitive metadata.
- Retention is configurable and documented by event class.
- Deletion requests preserve legally required integrity records through tombstones or segregated retention, subject to counsel.

### PCI posture

The architecture is intended to minimize PCI DSS scope, not declare it absent. Only qualifying EMV payment tokens outside the token service provider environment are automatically outside Account Data scope; connectivity and influence over a cardholder data environment can still create scope. A QSA or acquiring partner must validate the final data flow before external claims. [PCI SSC FAQ 1326](https://www.pcisecuritystandards.org/faqs/1326/) and [PCI SSC FAQ 1580](https://www.pcisecuritystandards.org/faqs/1580/)

---

## 13. Data model and evidence graph

### Core entities

- `Principal`: consumer or organization delegating authority
- `Agent`: stable agent identity, owner, operator, keys, and status
- `Policy`: typed, versioned intent and enforcement requirements
- `AdapterCapabilityManifest`: versioned control-by-control coverage
- `Decision`: canonical request, state snapshot, verdict, reasons, engine version
- `Reservation`: amount/count held against policy budget, expiry, lifecycle
- `Approval`: approver, authentication context, frozen request hash, outcome
- `Artifact`: mandate, token reference, signed decision receipt, TAP verification
- `Checkout` and `Order`: commerce state and merchant references
- `FinancialEvent`: authorization, capture, settlement, reversal, refund, dispute
- `FulfillmentEvent`: shipped, delivered, cancelled, returned, when available
- `ReconciliationCase`: mismatches, severity, explanation, status, evidence bundle
- `Revocation`: local status, downstream requests, acknowledgements, failures

### Required links

Every edge records source system, source event ID, ingestion time, event time, schema version, tenant, and confidence. A link inferred from fuzzy matching is never presented as cryptographically proven.

### Signed decision receipt

The receipt includes:

- principal and agent pseudonymous IDs;
- policy ID and version hash;
- request hash and normalized fields;
- verdict, reasons, enforcement strength, and adapter version;
- reservation ID and expiry;
- approval ID and authentication method when applicable;
- issued time, nonce, and Reins signing-key ID.

---

## 14. Reconciliation and dispute readiness

### 14.1 Event states

Reins distinguishes:

`requested -> reserved -> credential_released -> authorized -> captured -> settled -> refunded/reversed`

Order and fulfillment states are separate:

`checkout_created -> order_accepted -> shipped -> delivered -> returned/cancelled`

Settlement does not prove delivery, and a merchant order event does not prove settlement.

### 14.2 Mismatch classes

- authorization without reservation;
- capture without authorization;
- settled amount above authorized amount or explicit tolerance;
- duplicate authorization or capture;
- expired reservation used late;
- partial or multiple capture outside policy;
- reversal/refund missing or late;
- merchant or currency mismatch;
- fulfillment failure after capture;
- event present on an observe-only source but absent from the strong path;
- provider-reported agent transaction with no Reins policy lineage.

### 14.3 Evidence bundle

The bundle contains source artifacts, verification results, policy and decision records, event chronology, gaps, and a plain-language summary generated from structured facts. It states:

- what Reins can prove;
- what is provider-reported;
- what was inferred;
- which events are missing;
- which consumer or commercial account type is involved, if known; and
- that rights and liability require the financial institution's and counsel's determination.

### 14.4 Regulatory boundaries

- Regulation E covers consumer electronic fund transfers and error-resolution categories, but an EFT initiated by a person furnished an access device by the consumer is generally excluded from the definition of an unauthorized EFT until authority is revoked. Whether an AI agent's action falls within that framework is fact-specific. [CFPB Regulation E FAQ](https://www.consumerfinance.gov/compliance/compliance-resources/deposit-accounts-resources/electronic-fund-transfers/electronic-fund-transfers-faqs/)
- Incorrect or duplicate EFTs may still be errors even when the original delegation was authorized. [12 CFR 1005.11](https://www.consumerfinance.gov/rules-policy/regulations/1005/11/)
- Regulation Z billing-error procedures apply to covered consumer credit. They do not automatically apply to commercial card programs or every agent mistake. [12 CFR 1026.13](https://www.consumerfinance.gov/rules-policy/regulations/1026/13/)
- If Reins issues an access device without an agreement with the account-holding financial institution, counsel must assess the service-provider duties in 12 CFR 1005.14 before launch. The boundary between policy service, credential provider, and wallet issuer is therefore a product and regulatory decision. [12 CFR 1005.14](https://www.consumerfinance.gov/rules-policy/regulations/1005/14/)
- Reins does not market an evidence bundle as a guaranteed dispute outcome, insurance, or a legal filing.

---

## 15. Evaluation and success metrics

### 15.1 Policy compiler

Use a versioned corpus of at least 500 policies at MVP and expand with real pilot language. Include paraphrases, negation, conflicting rules, currency ambiguity, recurring payments, marketplaces, and adversarial prompt content.

| Metric | Target |
|---|---|
| Critical-field silent omission rate | 0 |
| Critical-field under-constraint rate | 0 on release gate set |
| Critical-field macro precision and recall | >= 0.98 each |
| Non-critical field macro F1 | >= 0.95 |
| Ambiguity detection recall | >= 0.95 |
| Read-back disagreement caught before activation | 100% in usability test |

Overall "accuracy" is not a release metric because over-constraining and under-constraining have different harm.

### 15.2 Decision engine

| Metric | Target |
|---|---|
| Adversarial bypasses on release gate set | 0 |
| Concurrency overspend on stress suite | 0 |
| Deterministic replay mismatch | 0 |
| p99 evaluator latency | < 50 ms |
| Idempotency failure under duplicate delivery | 0 |

### 15.3 Human escalation

Track precision and recall against labeled reviewer judgments, not precision alone.

| Metric | Target |
|---|---|
| Escalation precision | >= 0.90 |
| Escalation recall for labeled risky cases | >= 0.98 |
| False ALLOW rate on labeled risky cases | <= 0.5%, with 0 on critical classes |
| Median prompts per active user per week | <= 3 |
| Approval after material request change | 0 |

### 15.4 Enforcement coverage

| Metric | Target |
|---|---|
| Pilot autonomous attempts under STRONG_NATIVE, STRONG_REINS, or accepted HARD_WITH_EXCEPTIONS paths | 100% |
| Amount exposed to declared hard-path exceptions | Measured and reported by provider and exception type |
| Activated controls with unknown coverage | 0 |
| Provider downgrade not surfaced before credential release | 0 |
| Post-revocation Reins credential releases | 0 |

### 15.5 Reconciliation and evidence

| Metric | Target |
|---|---|
| Supported-path automatic event join rate | >= 99.5% |
| Seeded mismatch detection | 100% |
| Evidence bundle critical artifact completeness | 100% when source exposes artifacts |
| Cases with missing-source explanation | 100% |
| Unsupported legal conclusion in generated explanation | 0 |

---

## 16. Adversarial and edge-case suite

The standing suite includes:

- split transactions across agents, merchants, cards, and rails;
- simultaneous requests racing a rolling cap;
- retry after timeout where the first request later succeeds;
- replayed or expired mandate/signature/approval;
- cross-agent and cross-tenant credential reuse;
- currency conversion, zero-decimal currencies, and stale FX;
- merchant ID and MCC ambiguity, aggregators, marketplaces, and descriptor drift;
- tips, tax, shipping, incremental authorization, hotel/car-rental holds, fuel dispensers, and partial capture;
- recurring and merchant-initiated transactions;
- offline or delayed authorization and late presentment;
- refunds, reversals, chargebacks, and partial refunds;
- policy edit or revocation during checkout;
- agent key compromise and directory key rotation;
- malicious or compromised merchant callbacks;
- webhook duplication, reordering, omission, and forgery;
- prompt injection in product descriptions, merchant metadata, receipts, and support notes;
- adapter schema change, unsupported version, algorithm confusion, and malformed selective disclosure;
- local audit database rewrite, clock skew, and KMS unavailability;
- bypass through raw card, browser fallback, or unregistered wallet;
- approval fatigue and repeated just-under-threshold requests.

Any new bypass becomes a permanent regression vector.

---

## 17. Competitive position

| Category | Strong at | Gap Reins can target |
|---|---|---|
| EMVCo Agentic Payments draft | Potential common card-intent registry, cumulative budgets, recurring intent, lifecycle state | User policy UX, implementation, cross-provider/non-card coordination, enforcement proof, evidence graph |
| Visa / Mastercard native programs | Network identity, tokens, native controls, issuer/network reach | Provider-specific visibility and policy semantics |
| Stripe Link / Issuing / SPT | Consumer funding, credentials, cards, controls, authorization, monitoring | Cross-provider policy contract and independent evidence |
| Crossmint | Unified cards and stablecoins, order intents, scoped credentials, checkout execution | Independent governance across providers; verifiable coverage and enterprise evidence |
| Ramp Agents | Agent identity, budgets, approvers, multiple business payment methods, accounting trail | Portability outside Ramp and protocol-level mandate evidence |
| Coinbase / Skyfire and wallet engines | Machine-native and stablecoin spend controls | Card, commerce, and provider-neutral lineage |
| PaySentry and open-source control planes | Similar architecture and developer framing | Production-grade enforcement adapters, conformance, signed evidence, and partner trust |

### Defensible differentiation

Reins should not claim that its high-level architecture is unique. Its moat must be earned through:

1. a precise, versioned policy semantics and coverage standard;
2. production-grade strong-enforcement adapters;
3. a large adversarial conformance corpus;
4. signed authorization-to-settlement evidence across providers;
5. partner certifications and enterprise trust; and
6. longitudinal data on real adapter failure and mismatch patterns.

The positioning line is:

> Reins proves that every agent payment was within policy - and shows exactly where that proof stops.

---

## 18. Rollout and validation plan

### Phase 0 - Falsification and design partners (Weeks 0-2)

Deliverables:

- 15 interviews with agent-platform or wallet product/payment leads;
- 5 interviews with issuer, processor, or embedded-finance risk teams;
- 10 interviews with finance or operations admins who already run purchasing agents;
- integration-map confirmation for at least two strong choke points;
- an EMVCo draft mapping and focused public-comment submission before September 30, 2026;
- two design-partner letters stating the target workflow, data access, and willingness to pilot.

Exit gate:

- At least two partners will integrate before credential release or authorization.
- At least one partner values independent evidence enough to provide test events and engineering time.
- If demand is only for a dashboard or card controls, stop; Stripe, Crossmint, and Ramp are better positioned.

### Phase 1 - Core semantics and reservation engine (Weeks 2-6)

- typed policy and compiler read-back;
- adapter capability manifests;
- deterministic evaluator;
- atomic reservations and idempotency;
- signed decision receipts;
- audit signing and external anchoring;
- adversarial corpus v1.

Exit gate:

- Compiler and engine metrics meet Section 15 on synthetic data.
- Concurrency and replay tests have zero critical failures.

### Phase 2 - Strong-path sandbox proof (Weeks 6-10)

- Stripe Issuing test authorization adapter;
- UCP + AP2 v0.2 Credential Provider / Trusted Surface reference flow;
- evidence graph and reconciliation for both paths;
- approval UI and revocation state machine;
- public conformance report.

Exit gate:

- Demonstrate one blocked card authorization and one blocked mandate/credential release.
- Demonstrate one end-to-end allowed flow on each path with complete evidence.
- Detect all seeded mismatch and bypass scenarios.

### Phase 3 - Partner pilot readiness (Weeks 10-14)

- tenant isolation, incident response, retention controls, operational dashboards;
- threat-model review and penetration test;
- QSA/acquirer PCI scoping review;
- legal review of consumer/commercial copy and evidence exports;
- shadow mode with partner traffic, then limited enforcement.

Exit gate:

- 100% of autonomous pilot amount is under strong enforcement.
- No unresolved critical security or legal findings.
- Partner confirms operational fallback and support ownership.

### Production rollout

Production requires a separate approval after pilot data. The PRD does not assume a ten-week path to live multi-network enforcement.

---

## 19. Demo definition

The portfolio-quality demo should prove enforcement, not logo count.

### Required

1. User enters: "This procurement agent can spend $2,000 a month, no more than $300 per purchase, ask me above $150, only approved software vendors."
2. Compiler produces a typed policy, highlights ambiguities, and shows a control-by-adapter coverage report.
3. Two simultaneous $250 requests race the remaining $300 monthly budget; exactly one reserves successfully.
4. A $220 Stripe Issuing test authorization is held for approval and declines after expiry.
5. A valid UCP/AP2 checkout receives a signed mandate/decision receipt; an out-of-scope checkout fails.
6. A TAP-signed request is verified as agent identity/intent evidence but is visibly marked "not spend enforcement."
7. A capture above authorization tolerance creates a reconciliation case.
8. The evidence graph shows policy -> decision -> approval -> credential/mandate -> authorization -> capture -> settlement/order.
9. Revocation stops new Reins approvals and separately shows downstream provider acknowledgement.
10. The adversarial report publishes pass/fail results, including concurrency, replay, and bypass tests.

### Simulated and labeled

- Mastercard native Agent Pay token provisioning
- Visa Intelligent Commerce native token controls
- production network directories or certification unavailable to the project
- Reg E/Reg Z outcomes
- merchant delivery where no order feed is exposed

---

## 20. Business model hypotheses

These are experiments, not forecasts.

- Platform fee plus metered strong-path decisions
- Premium adapter and evidence-retention tiers
- Enterprise conformance testing and signed audit export
- White-label deployment for wallet, issuer, or vertical SaaS partners

Validation questions:

- Will a platform pay for provider neutrality before it has three rails?
- Is evidence/audit a budgeted pain or merely a security preference?
- Does the buyer prefer a hosted control plane, deployable data plane, or SDK?
- Will payment partners permit Reins in the authorization path and share identifiers needed for reconciliation?
- Is the most urgent buyer Risk, Payments, Product, or Finance?

No TAM, ROI, or avoided-loss claim should appear externally until supported by observed pilot data.

---

## 21. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Reins lacks a mandatory choke point | Product is bypassable and cannot be called a circuit breaker | Target only integrations that control credential release, signing, wallet execution, or authorization; label all others cooperative/observe-only. |
| Providers converge on their own cross-rail controls | Wedge narrows | Sell independent coverage proof, evidence, and conformance; track provider roadmaps quarterly. |
| EMVCo standardizes the shared card-intent layer | The original canonical-policy thesis becomes infrastructure, not product differentiation | Align early, submit feedback, implement rather than fork, and focus the product on enforcement, coverage, cross-provider evidence, and non-card coordination. |
| Crossmint, Stripe, or Ramp adds the same evidence layer | Distribution disadvantage | Partner where possible; focus on deployable, provider-neutral infrastructure and published conformance. |
| Protocols change quickly | Adapter breakage or false coverage | Version pinning, capability manifests, official conformance suites, schema-diff CI, fail closed. |
| LLM compiler under-constrains policy | Financial loss | Critical-field recall gates, read-back, deterministic validation, no activation on uncertainty. |
| Reservation service races or fails | Overspend or checkout outage | Atomic state, idempotency, leases, invariant tests, fail closed, regional architecture before production. |
| Merchant and MCC data are unreliable | Incorrect policy result | Source confidence, explicit unknown state, escalate/deny defaults, no invented category. |
| Evidence is mistaken for legal entitlement | Consumer harm and regulatory risk | Boundary copy, legal review, fact-only bundles, no automatic claims or reimbursement promises. |
| Token-only design is assumed outside PCI scope | Compliance surprise | QSA/acquirer review, data-flow diagrams, contractual responsibility matrix, no absolute claim. |
| Hash chain is rewritten with the database | False tamper-evidence | Periodic signing and external anchoring outside the primary trust domain. |
| Fail-closed behavior causes abandonment | Conversion loss | Limit autonomous pilot to high-confidence paths; measure and expose provider-specific failure reasons; human-present authenticated fallback only by explicit design. |

---

## 22. Open questions that block production

1. Which partner gives Reins a mandatory credential-release or authorization hook first?
2. Will Reins operate as an AP2 Credential Provider, Trusted Surface, verification delegate, or a combination?
3. Which identifier set can reliably join authorization, capture, settlement, and order events on each provider?
4. How are tips, incremental authorizations, hotel/fuel holds, subscriptions, and merchant-initiated transactions represented in policy?
5. What is the FX source, timestamp, spread tolerance, and fail behavior for non-base currency?
6. What provider revocation acknowledgements exist, and what SLA can be stated without overclaiming?
7. What evidence retention is required contractually, legally, and operationally for consumer vs commercial use?
8. Which data and system components remain in PCI scope after final integration?
9. Can strong-path latency and availability meet provider authorization SLAs?
10. What deployment model will partners accept: hosted SaaS control plane, customer-hosted data plane, or library?
11. Who owns user support when Reins denies a transaction that a provider would have approved?
12. What independent security or compliance attestation is required before a partner sends production events?

---

## 23. Source-of-truth references

- [EMVCo Agentic Payments Framework announcement](https://www.emvco.com/news/emvco-requests-feedback-on-framework-for-secure-interoperable-and-scalable-card-based-agentic-payments/)
- [EMVCo Agentic Payments Framework draft resource](https://www.emvco.com/resources/emv-agentic-payments-framework-for-specifications-v1-0-draft-comment-period-ends-30-sept-2026/)
- [AP2 v0.2 specification](https://github.com/google-agentic-commerce/AP2/blob/main/docs/ap2/specification.md)
- [FIDO Alliance AP2 transfer announcement](https://fidoalliance.org/google-donates-agent-payments-protocol-to-fido-alliance/)
- [Universal Commerce Protocol](https://github.com/Universal-Commerce-Protocol/ucp)
- [Visa Trusted Agent Protocol](https://developer.visa.com/capabilities/trusted-agent-protocol/trusted-agent-protocol-specifications)
- [Agentic Commerce Protocol](https://github.com/agentic-commerce-protocol/agentic-commerce-protocol)
- [Stripe agentic commerce and Issuing for agents](https://stripe.com/blog/giving-agents-the-ability-to-pay)
- [Mastercard Agent Pay for Machines](https://www.mastercard.com/us/en/news-and-trends/press/2026/june/mastercard-launches-agent-pay-for-machines.html)
- [Crossmint agent payment documentation](https://docs.crossmint.com/agents/how-agents-pay)
- [Ramp Agents](https://agents.ramp.com/)
- [Skyfire payment rules](https://docs.skyfire.xyz/docs/features)
- [Coinbase Agentic Wallets](https://www.coinbase.com/developer-platform/products/agentic-wallets)
- [CFPB Regulation E FAQ](https://www.consumerfinance.gov/compliance/compliance-resources/deposit-accounts-resources/electronic-fund-transfers/electronic-fund-transfers-faqs/)
- [12 CFR 1005.11](https://www.consumerfinance.gov/rules-policy/regulations/1005/11/)
- [12 CFR 1005.14](https://www.consumerfinance.gov/rules-policy/regulations/1005/14/)
- [12 CFR 1026.13](https://www.consumerfinance.gov/rules-policy/regulations/1026/13/)
- [PCI SSC FAQ 1326](https://www.pcisecuritystandards.org/faqs/1326/)
- [PCI SSC FAQ 1580](https://www.pcisecuritystandards.org/faqs/1580/)

---

## 24. Final recommendation

Proceed only under the revised wedge:

- developer- and partner-first, not direct consumer;
- EMVCo-aligned, with no proprietary fork of the emerging Intent Service model;
- strong enforcement at credential, signing, wallet, or authorization choke points;
- UCP/AP2 v0.2 plus one real card authorization path before adding protocol logos;
- control-by-control coverage proof with no silent downgrade;
- authorization-to-settlement evidence graph as the flagship differentiator;
- legal, PCI, security, and partner gates before production claims.

The idea remains valuable, but the durable product is not "one more spend limit." It is independent proof that delegated spend stayed within authority across heterogeneous payment systems.
