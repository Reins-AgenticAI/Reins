# Financial-agent control and test architecture research

Date: 2026-09-21  
Scope: Primary-source patterns relevant to Reins. This is architecture guidance, not proof that Reins is a licensed payment product.

## What production-like means for Reins

Reins should be a control plane around a payment provider or a sandbox, not a card issuer, processor, wallet, or custodian. A real integration must use a provider's sandbox and webhook outcomes; the current application remains a synthetic, non-money demonstration until that adapter and the required commercial/compliance work exist.

The core invariant is: advisory agents may collect and summarize context, but deterministic, versioned policy plus an atomic budget reservation decides whether a request can proceed. This matches AP2, whose specification says role validation or processing **must** be deterministic code, even if the role is agentic. [AP2 specification](https://github.com/google-agentic-commerce/AP2/blob/main/docs/ap2/specification.md)

## External control patterns worth copying

| Pattern | First-party evidence | Reins requirement |
| --- | --- | --- |
| Idempotent execution | Stripe stores the first result for an idempotency key; a changed request with the same key errors, and a concurrent conflict may be retried. [Stripe idempotency](https://docs.stripe.com/api/idempotent_requests) | Persist a canonical request hash with every client idempotency key. Same key/same hash replays the receipt; same key/different hash returns conflict. |
| Draft, shadow, promote | Lithic drafts rules in shadow mode, measures them, then promotes an active version. [Rule lifecycle](https://docs.lithic.com/docs/auth-rule-lifecycle) | Policy changes are immutable versions: draft → shadow evaluation → reviewed promotion. No direct in-place mutation of an active policy. |
| Outcome explainability | Lithic logs per-transaction rule results, reports, and backtests. [Analytics and observability](https://docs.lithic.com/docs/analytics-and-observability) | Every receipt names policy version, evaluated checks, input evidence references, outcome, and reservation/settlement links. |
| Historical replay | Lithic backtests rules against historical traffic, but explicitly cautions that velocity data and upstream-declined traffic can be absent. [Backtesting authorization rules](https://docs.lithic.com/docs/backtesting-authorization-rules) | Keep a versioned synthetic corpus and separately generate contention/velocity scenarios. Do not claim replay proves concurrent-budget behavior. |
| Provider simulation and reconciliation | Lithic can simulate merchant authorization events and webhooks in sandbox. [Simulating transactions](https://docs.lithic.com/docs/simulating-transactions) Ramp's production guidance uses cleared transaction, refund, and reversal events for spend state. [Ramp virtual cards](https://docs.ramp.com/developer-api/v1/virtual-cards) | A future provider adapter consumes signed provider webhooks, deduplicates event IDs, and reconciles authorization, clearing, reversal, refund, and dispute states. No PAN/CVV is stored. |
| Agent mandate and receipts | AP2 binds checkout and payment mandates to a specific checkout and requires receipts; it also prohibits presenting another open mandate without a rejection receipt. [AP2 specification](https://github.com/google-agentic-commerce/AP2/blob/main/docs/ap2/specification.md) | Model the lifecycle explicitly: intent → policy decision/reservation → provider authorization → settlement/reversal → evidence bundle. Bind every later event to immutable request/receipt identifiers. |

## Agent design

The agents are deliberately narrow services, not autonomous decision-makers:

1. **Intake agent:** validates a natural-language task into a typed purchase request; cannot submit money movement.
2. **Vendor-risk agent:** retrieves synthetic/vendor-adapter facts such as allow-list match, merchant category, and unsupported controls.
3. **Budget-context agent:** reports available balance and concurrency context; it cannot reserve funds.
4. **Evidence agent:** builds a human-readable explanation and evidence references.
5. **Deterministic gate:** evaluates identity, mandate/policy version, merchant/MCC, amount, time window, approval condition, and atomically reserves integer minor units. It alone emits `ALLOW`, `ESCALATE`, or `DENY`.
6. **Reconciliation worker:** joins later provider events and identifies missing, duplicate, settled-over-authorized, reversed, or unmatched events.

Agents can run concurrently with bounded deadlines using `Promise.allSettled`; the gate only reads their advisory outputs after completion. A missing, malformed, late, or provider-failed advisory result becomes `ESCALATE`/`UNAVAILABLE`, never `ALLOW`. Parallel agent calls reduce wall time but do **not** mean one local GPU executes inference in parallel; latency reporting must show per-agent time, end-to-end time, and queueing.

## Test corpus and acceptance gates

Use only fictional businesses, vendors, users, accounts, and request identifiers. The corpus must contain labelled expected policy outcomes and event timelines.

| Test family | Representative cases | Required assertion |
| --- | --- | --- |
| Normal policy paths | permitted SaaS renewal under cap; new vendor over review threshold; MCC/vendor denied | Exact deterministic result and ordered receipt checks |
| Concurrent spend | two allowed requests racing for a shared remaining balance; N identical retries; distinct requests that collectively exceed balance | Sum of held/committed funds never exceeds budget; exactly one canonical receipt per idempotency key |
| Lifecycle mismatch | authorization followed by partial clearing, excess clearing, reversal, refund, duplicate/out-of-order webhook, missing settlement | Reconciliation classifies the mismatch and preserves raw event references; it does not silently rewrite history |
| Adversarial agent input | prompt injection in merchant description, malformed JSON, untrusted tool output, agent timeout, model unavailable | LLM text does not change decision; degraded output is not `ALLOW` |
| Policy change | draft rule, shadow corpus replay, promotion, rollback | Existing receipts preserve old policy version; new requests use the selected active version |
| Provider boundary | valid/invalid webhook signature, duplicate provider event ID, provider 429/5xx, delayed delivery | Deduplication and retry are safe; no provider failure turns into an approval |

Run three levels of testing:

1. **Unit:** deterministic gate, money arithmetic, canonical idempotency, policy compiler, provider adapter mapping.
2. **Integration:** PostgreSQL transaction tests for atomic reservation/release, idempotent replay, durable evidence, and provider webhook dedupe.
3. **End-to-end sandbox:** browser task → advisory workflow → gate → sandbox-provider event → reconciliation → evidence. Start against Reins fixtures; later use a real provider sandbox such as Lithic's simulated transaction/webhook facilities.

## Metrics to report, not invent

Report measurements by corpus version and run date instead of predeclared market numbers:

- deterministic replay mismatch count;
- invariant violations (`committed + held > budget`) — target is zero in every run;
- false `ALLOW` and false `DENY` against the labelled corpus;
- reconciliation join and mismatch-detection rates, split by event type;
- idempotency conflict/replay correctness;
- p50/p95/p99 per-agent and end-to-end latency, timeout rate, and queue wait;
- percentage of requests that required fallback/escalation because advisory context was unavailable.

## Gap to close before saying "real financial application"

The current product cannot honestly be presented as live financial infrastructure. It needs, at minimum: an authorized provider sandbox adapter, authenticated tenants and RBAC, verified webhook signatures, durable production-grade database/queue/observability, policy shadow/backtest workflow, incident/runbook controls, and legal/compliance review appropriate to the jurisdictions and payment role. Until then, describe it as a **production-informed control-plane prototype tested with synthetic data**, not as a payment processor or live payment product.
