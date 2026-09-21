# Fintech Control Room Correction

## Evidence

- Ramp documents spend requests as a workflow that begins with a request, routes approvals, and preserves the resulting record. Its procurement guidance separates requests, purchase orders, vendor onboarding, approvals, and role-based actions. [Ramp procurement quick start](https://support.ramp.com/ramp-procurement-quick-start-guide/)
- Ramp describes spend management as controls before, during, and after a purchase, with limits, restrictions, approvals, receipt requirements, and review automation. [Ramp spend management overview](https://support.ramp.com/ramps-spend-management-platform-enhancing-your-companys-expense-control/)
- Ramp’s spend-request AI recommendations are advisory; reviewers retain final authority. [Ramp spend request approvals](https://support.ramp.com/setting-up-spend-request-approvals)
- Stripe Issuing real-time authorization flows require a direct webhook response within the provider timeout; authorization decisions cannot safely wait for an exploratory LLM workflow. [Stripe authorizations](https://docs.stripe.com/issuing/purchases/authorizations?issuing-authorization-type=incremental_authorization&locale=ja-JP)

## Product corrections

1. The Control Room should lead with a request queue, selected request, deterministic policy checks, immutable receipt, and chronological evidence—not disconnected demo panels.
2. One persistent roster owns agent identity and status. A task references that roster; it must not recreate a second competing “agent pool.”
3. Replace consumer grocery language with realistic synthetic finance work, such as reviewing a data-platform renewal against vendor, cost-center, annual-budget, and approval controls.
4. “Live agent” means a real local model runtime invokes typed, read-only synthetic-data tools and emits a visible trace. A simulated timer must be labeled a simulation, never live AI.
5. The deterministic policy engine remains the only authority for ALLOW, ESCALATE, and DENY. An LLM can prepare structured context and explanations but cannot make a payment decision.
6. Remove the current placeholder Three.js graph. Keep an accessible evidence chain; reintroduce a graph only after it represents actual relationships such as request → policy → approval → authorization → settlement → receipt.
7. Navigation requires readable labels and real destinations or view state. Decorative symbols with no action are not acceptable product navigation.

## Free local implementation boundary

- The product can offer an optional local-model connector such as Ollama. It requires the contributor to install the local runtime and a model; Reins must detect availability and show “not configured” rather than fabricate a live agent.
- The demo remains synthetic and local. It does not issue credentials, call a payment network, or claim a real-money agent transaction.
