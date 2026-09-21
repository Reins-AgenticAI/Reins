# Agentic Spend Guardian: market and standards research

**As of:** 2026-09-16  
**Scope:** buyer-side and issuer-side policy enforcement, agentic-payment protocols, authorization evidence, reconciliation, disputes, and adjacent competitors  
**Source policy:** primary sources only: protocol repositories/specifications, standards bodies, official product documentation or announcements, and regulator text. Company claims are treated as evidence of positioning or announced availability, not independent proof of scale, reliability, or coverage.

## Executive conclusion

The core problem is real, but the original framing is now too broad and parts of the claimed whitespace have closed.

The market does **not** consist of four equivalent payment protocols that merely need translation. It consists of several different layers:

- ACP and UCP describe commerce and checkout interactions.
- AP2 and Mastercard Verifiable Intent describe delegation, user intent, and evidence.
- Visa Trusted Agent Protocol (TAP) primarily identifies an agent and conveys trusted intent to a merchant.
- Visa Intelligent Commerce and Mastercard Agent Pay provide network and credential capabilities.
- MPP and x402 are HTTP payment transports, especially for programmatic and machine-to-machine transactions.
- Issuing processors such as Stripe, Lithic, and Adyen provide the actual real-time authorization choke points at which a third party can approve or decline card transactions.

Consequently, a policy compiler cannot create hard enforcement merely by translating a plain-language rule into each protocol's object. Hard enforcement exists only where Reins controls, or is consulted by, a payment credential provider, issuer/processor authorization hook, wallet signer, or merchant checkout. An agent-side SDK without one of those choke points is bypassable.

The strongest current wedge is therefore:

> **A neutral intent-state, policy-decision, and evidence/reconciliation control plane for issuers, agent platforms, and regulated fintechs, with explicitly labeled hard-enforcement adapters.**

This wedge should align with two standards developments rather than invent a private mandate system:

1. FIDO is developing agentic-payment standards from Google's AP2 and Mastercard's Verifiable Intent contributions. Google donated AP2 on **2026-04-28**, not in May; FIDO says the contributions are being reviewed and developed through its working groups rather than already constituting a finished FIDO standard. [Google announcement](https://blog.google/products-and-platforms/platforms/google-pay/agent-payments-protocol-fido-alliance/), [FIDO announcement](https://fidoalliance.org/fido-alliance-to-develop-standards-for-trusted-ai-agent-interactions/)
2. On **2026-09-01**, EMVCo released a public draft for card-based agentic payments that proposes interoperable **Intent Services** to register, reference, retrieve, and manage persistent consumer-authorized intent, explicitly including recurring purchases and cumulative budgets. Public comments close on **2026-09-30**. This is almost exactly the architectural seam Reins needs to implement, and it is also the clearest commoditization threat to a proprietary Reins mandate store. [EMVCo announcement](https://www.emvco.com/news/emvco-requests-feedback-on-framework-for-secure-interoperable-and-scalable-card-based-agentic-payments/), [draft resource](https://www.emvco.com/resources/emv-agentic-payments-framework-for-specifications-v1-0-draft-comment-period-ends-30-sept-2026/)

The closest direct competitive changes are:

- **Crossmint** now publicly offers agentic cards with spend limits, merchant/category rules, revocation, Visa Intelligent Commerce integration, and a broader card-plus-stablecoin agent payment stack. It is no longer merely adjacent. Its public card documentation still includes staging and `/unstable` endpoints in places, so production coverage by network and geography needs diligence. [Crossmint Visa launch](https://webflow.crossmint.com/announcement/agentic-cards-api-launch-visa-basistheory), [agentic cards](https://www.crossmint.com/products/agentic-cards), [agent payments model](https://docs.crossmint.com/agents/how-agents-pay)
- **Ramp Agent Cards** provide single-use, merchant-scoped, amount-capped credentials with existing corporate spend controls and approval chains. Ramp describes the product as alpha or early access in several first-party pages, but the overlap with the SMB wedge is direct. [Ramp API guide](https://docs.ramp.com/developer-api/v1/agent-cards), [Ramp product explanation](https://ramp.com/blog/virtual-cards-for-ai-agents)
- **Stripe, Lithic, and Adyen** already expose deterministic spend rules and real-time issuer authorization hooks. They are potential substrates and partners, but also make a generic policy engine easier for incumbents to ship. [Stripe real-time authorizations](https://docs.stripe.com/issuing/controls/real-time-authorizations), [Lithic Authorization Rules](https://docs.lithic.com/docs/authorization-rules-v2), [Adyen payment authorization](https://docs.adyen.com/issuing/authorisation)

No reviewed primary source documents the full combination of independent policy ownership, hard enforcement over multiple externally provided card and on-chain rails, protocol-neutral intent state, and cross-rail authorization-to-settlement evidence. That is a defensible hypothesis, **not proof that no competitor exists**.

## 1. Verification of the supplied market claims

### 1.1 “Visa TAP, Mastercard Agent Pay, Google's AP2, and Stripe/OpenAI ACP are all live right now”

**Verdict: directionally true, but materially imprecise.** “Live” combines an open specification, a network program, pilots, production merchant experiences, and products still in deployment.

| Item | What the primary source establishes | Accurate status as of 2026-09-16 |
|---|---|---|
| Visa TAP | Visa announced TAP on 2025-10-14 and made its specification and sample implementation available in the Developer Center and GitHub. It uses cryptographic HTTP message signatures so merchants can recognize an agent and its transaction-specific intent. The announcement says the initial specifications apply to the Visa network in this phase. | Public specification and sample implementation; not a universal consent ledger or issuer authorization hook. [Visa announcement](https://corporate.visa.com/en/sites/visa-perspectives/newsroom/visa-unveils-trusted-agent-protocol-for-ai-commerce.html), [official repository](https://github.com/visa/trusted-agent-protocol) |
| Visa Intelligent Commerce | Visa's developer page exposes a sandbox and lists agent-specific tokens, authenticated Payment Instructions, and transaction signals. The same page says the product is in development and deployment and may not be available in all markets. | Buildable in sandbox/partner channels; do not describe the entire portfolio as globally GA. [Visa developer page](https://developer.visa.com/capabilities/visa-intelligent-commerce) |
| Visa Intelligent Commerce Connect | Announced 2026-04-08 as a protocol-, network-, and token-vault-agnostic on-ramp supporting TAP, MPP, ACP, and UCP. Visa explicitly says it is in pilot with select partners and rolling out further during 2026. | Select-partner pilot, not broad GA. [Visa announcement](https://usa.visa.com/about-visa/newsroom/press-releases.releaseId.22276.html) |
| Mastercard Agent Pay | Announced 2025-04-29 with Agentic Tokens and consumer controls. Mastercard reported live transactions and issuer enablement in 2026, but much public material remains program/partner-led rather than a self-serve universal API. | Live pilots and partner deployments; not evidence of universal availability. [Launch announcement](https://newsroom.mastercard.com/news/press/2025/april/mastercard-unveils-agent-pay-pioneering-agentic-payments-technology-to-power-commerce-in-the-age-of-ai/), [2026 market update](https://www.mastercard.com/us/en/news-and-trends/stories/2026/mastercard-agentic-commerce-vision.html) |
| Google AP2 | AP2 v0.1 launched as an open protocol on 2025-09-16. AP2 v0.2, released 2026-04-28, added Human Not Present flows. Its repository supplies specifications, schemas, SDK code, and samples; it is not itself a settlement rail. | Active open specification and reference code, under continuing FIDO standardization. [Google launch](https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol), [AP2 releases](https://github.com/google-agentic-commerce/AP2/releases), [AP2 repository](https://github.com/google-agentic-commerce/AP2) |
| OpenAI/Stripe ACP | ACP launched 2025-09-29 and powered a real Instant Checkout experience in ChatGPT. OpenAI later said the initial Instant Checkout did not provide the desired flexibility and shifted to merchant-owned checkout while expanding ACP for discovery. ACP also powers Stripe integrations such as Microsoft Copilot Checkout. | The protocol and production implementations are real, but OpenAI's initial integrated-checkout product changed direction in March 2026. [OpenAI launch](https://openai.com/index/buy-it-in-chatgpt/), [OpenAI March 2026 update](https://openai.com/index/powering-product-discovery-in-chatgpt/), [Stripe/Microsoft deployment](https://stripe.com/newsroom/news/microsoft-copilot-and-stripe) |

The PRD should replace “all live” with a per-adapter maturity label: `SPEC`, `SANDBOX`, `PRIVATE/PARTNER PILOT`, `EARLY ACCESS`, or `PRODUCTION`.

### 1.2 “They don't talk to each other”

**Verdict: fragmentation remains, but the absolute claim is obsolete.**

- AP2 v0.2 says it is explicitly compatible with UCP, and UCP includes an AP2 Mandates extension. [AP2 specification](https://github.com/google-agentic-commerce/AP2/blob/main/docs/ap2/specification.md), [UCP specification](https://ucp.dev/2026-04-08/specification/overview/)
- Visa Intelligent Commerce Connect accepts TAP, MPP, ACP, and UCP through one merchant-side integration, although it is still in pilot. [Visa announcement](https://usa.visa.com/about-visa/newsroom/press-releases.releaseId.22276.html)
- Stripe says its Agentic Commerce Suite works across ACP and UCP so merchants do not need separate integrations, while its MPP support handles machine payments. [Stripe implementation lessons](https://stripe.com/blog/10-lessons), [Stripe Sessions 2026](https://stripe.com/blog/everything-we-announced-at-sessions-2026)
- FIDO is developing shared work from AP2 and Verifiable Intent, and EMVCo is coordinating with FIDO, OpenID, OpenWallet, and W3C. [FIDO announcement](https://fidoalliance.org/fido-alliance-to-develop-standards-for-trusted-ai-agent-interactions/), [EMVCo announcement](https://www.emvco.com/news/emvco-requests-feedback-on-framework-for-secure-interoperable-and-scalable-card-based-agentic-payments/)

The still-open problem is not simply wire-protocol conversion. It is **semantic and enforcement interoperability**: one durable expression of budget, delegation, revocation, state, and evidence that has equivalent outcomes wherever a transaction is actually authorized.

### 1.3 “AP2 moved to the FIDO Alliance in May 2026”

**Verdict: correct event, wrong date and too-final wording.** Google and FIDO announced the contribution on **2026-04-28**; FIDO described AP2 and Verifiable Intent as contributions that its working groups would review and further develop. A FIDO explainer followed in May. [Google announcement](https://blog.google/products-and-platforms/platforms/google-pay/agent-payments-protocol-fido-alliance/), [FIDO announcement](https://fidoalliance.org/fido-alliance-to-develop-standards-for-trusted-ai-agent-interactions/), [FIDO explainer](https://fidoalliance.org/building-the-trust-layer-for-agentic-payments-with-ap2-and-verifiable-intent/)

### 1.4 “Mastercard Agent Pay for Machines already includes permissioning and is multi-rail”

**Verdict: the capability claim is verified; broad production availability is not.**

Mastercard announced Agent Pay for Machines on **2026-06-11**. Its product page says spending limits and execution rules are defined through verifiable authorization, and describes settlement across preferred currencies and rails, including fiat and stablecoins. Public access is “contact your Mastercard representative,” so the PRD should track it as a partner product rather than assume a generally available API. [Mastercard announcement](https://www.mastercard.com/us/en/news-and-trends/stories/2026/mastercard-connections-takeaways.html), [product page](https://www.mastercard.com/us/en/business/artificial-intelligence/mastercard-agent-pay/agent-pay-for-machines.html)

“MPP” must not be expanded as a Mastercard protocol. **Machine Payments Protocol (MPP)** was co-authored by Tempo and Stripe and launched on 2026-03-18. It uses HTTP payment authentication for agents and supports multiple payment methods through pluggable methods. [Stripe announcement](https://stripe.com/blog/machine-payments-protocol), [official MPP repository](https://github.com/tempoxyz/mpp)

### 1.5 “Crossmint is adjacent, not competing”

**Verdict: no longer supportable.**

Crossmint announced the public launch of a Visa Intelligent Commerce agentic cards API on **2026-06-02** for eligible US-issued Visa debit and credit cards. Its product pages advertise agent-bound scoped credentials, limits, merchant/category rules, revocation, card-network support, stablecoin wallets, and a unified agentic checkout surface. Its documentation describes explicit user delegation and card or wallet enforcement. That overlaps the core Reins promise even if Crossmint does not publicly document the same independent cross-rail policy IR or dispute-evidence product. [launch announcement](https://webflow.crossmint.com/announcement/agentic-cards-api-launch-visa-basistheory), [product page](https://www.crossmint.com/products/agentic-cards), [docs](https://docs.crossmint.com/agents/how-agents-pay)

The documentation also shows staging and `/api/unstable` endpoints for some card lifecycle operations, which is a diligence flag rather than evidence the product is unusable. [Crossmint card lifecycle docs](https://docs.crossmint.com/agents/payment-methods/cards/remove-cards)

## 2. Protocol map and what Reins can actually enforce

| Layer | Standards/products | Native primitive | Natural Reins integration | Enforcement reality |
|---|---|---|---|---|
| Commerce and checkout | ACP, UCP | catalog, cart/checkout, orders, fulfillment, payment-handler negotiation | ingest merchant, SKU, cart, totals, shipping, and order context | Useful policy context; usually not the final issuer decision point. Merchants can accept or reject checkout. |
| Delegation and intent | AP2, Verifiable Intent, emerging EMV Intent Services | signed mandates/intent, constraints, lifecycle, selective disclosure, receipts | canonical policy, signed approval, reservation, revocation, evidence index | Hard only if credential provider, network, PSP, merchant, or issuer verifies it. |
| Agent identity and merchant trust | Visa TAP, Mastercard acceptance framework/Web Bot Auth | agent identity, request signatures, trusted intent/consumer identifiers | verify agent identity and bind evidence to an agent/session | Does not itself enforce a global monthly budget. |
| Network credential programs | Visa Intelligent Commerce, Mastercard Agent Pay, Stripe Shared Payment Tokens | scoped payment credentials/tokens, network signals | compile policy into credential scope; ingest authorization signals | Strong where Reins participates before credential issuance or at authorization. Usually partner-gated. |
| HTTP machine-payment transport | MPP, x402 | payment challenge, payment credential, receipt; sessions for some methods | client/wallet policy gate and receipt ingestion | Hard only at wallet signer/facilitator; the transport is not a user policy service. |
| Issuer processing | Stripe Issuing, Lithic, Adyen and similar | spending rules, real-time authorization webhook/stream, captures and transaction webhooks | deterministic PDP/PIP, reservation ledger, reconcile capture | Strongest near-term enforcement point, but applies only to cards or accounts issued/processed through that partner. |

### AP2 specifics that matter to the design

AP2 v0.2 defines Checkout and Payment Mandates, each with open and closed forms for autonomous and human-present transactions. Verification by merchant, credential provider/network, and merchant payment processor is deterministic, even when another role uses an LLM. The specification permits a role to delegate its verification responsibilities to a provider, which is a plausible role for Reins. It also states that mandate selection is currently ad hoc and that a future query language could improve practical interoperability. [AP2 v0.2 specification](https://github.com/google-agentic-commerce/AP2/blob/main/docs/ap2/specification.md)

AP2's dispute section is highly relevant but incomplete as a product: it says mandates and receipts can provide a non-repudiable picture, while retrieval, retention, and their exact use in dispute resolution are out of scope. That out-of-scope retrieval and evidence operations layer is a credible Reins wedge. [AP2 v0.2 specification](https://github.com/google-agentic-commerce/AP2/blob/main/docs/ap2/specification.md)

### Visa specifics that matter to the design

TAP answers “is this a recognized agent, and is this request signed and bound to this merchant/action?” Visa Intelligent Commerce's Payment Instructions are the closer analogue to a consumer authorization policy, and Visa says its signals can compare original instructions with authorized purchases for dispute resolution. These must be modeled as separate adapters. [TAP repository](https://github.com/visa/trusted-agent-protocol), [Visa Intelligent Commerce developer page](https://developer.visa.com/capabilities/visa-intelligent-commerce)

### ACP and UCP specifics that matter to the design

ACP and UCP are not substitutes for an issuer policy hook. ACP lets the merchant accept or decline an order and carry a secure delegated payment token; Stripe Shared Payment Tokens can be seller-, amount-, and time-scoped. UCP uses capability discovery and pluggable payment handlers, and requires manual finalization unless an AP2 mandates extension is supported. [Stripe ACP explanation](https://stripe.com/blog/developing-an-open-standard-for-agentic-commerce), [Stripe Agentic Commerce Suite](https://stripe.com/blog/agentic-commerce-suite), [UCP checkout specification](https://ucp.dev/2026-01-23/specification/checkout/)

### The mandatory enforcement taxonomy

Every adapter in the PRD should declare one of these modes:

1. **Hard / authoritative:** a deny prevents credential issuance, signing, issuer authorization, or merchant execution.
2. **Hard with exceptions:** normal authorizations are enforceable, but offline/force-posted captures, network stand-in decisions, or late settlement can still create exposure.
3. **Preflight:** Reins advises or stops a cooperating agent, but another agent or leaked credential can bypass it.
4. **Observe-only:** Reins receives events after the transaction and can alert/reconcile but cannot prevent it.

Any headline claim of “enforced across protocols” must be calculated from actual hard-enforcement coverage, not from the number of parser/adapters implemented.

## 3. Competitive and adjacent landscape

### 3.1 Direct or near-direct products

| Provider | First-party documented capability | Overlap | Remaining opening for Reins |
|---|---|---|---|
| Crossmint | Agentic card credentials, limits/rules, revocation, Visa integration, claimed Mastercard/Amex support, stablecoin wallets with scoped signers, card and wallet checkout. | Direct overlap with agent payment credentials and policy enforcement. | Independent policy ownership across payment providers; enterprise controls; protocol conformance; authorization-to-settlement evidence and dispute workflow; verified production network/geography coverage. [Visa launch](https://webflow.crossmint.com/announcement/agentic-cards-api-launch-visa-basistheory), [product](https://www.crossmint.com/products/agentic-cards), [docs](https://docs.crossmint.com/agents/how-agents-pay) |
| Ramp | Agent Cards are single-use PAN/CVV credentials scoped to one merchant and amount, backed by existing funds/spend controls and approval permissions. Ramp also unifies token/API cost data with corporate spend. | Direct SMB spend-governance competitor and likely stronger distribution to finance teams. | Protocol-neutral control plane outside Ramp-issued cards; consumer use; cross-rail evidence; issuer/agent-platform infrastructure rather than expense-management suite. [Agent Cards API](https://docs.ramp.com/developer-api/v1/agent-cards), [product status](https://ramp.com/blog/virtual-cards-for-ai-agents), [AI spend controls](https://ramp.com/blog/ai-agent-spending-controls) |
| Nekuda | Public product describes an agent wallet that uses the user's card, requires explicit approval for every transaction, and locks approval to merchant and amount; company material discusses signed mandates and network-token infrastructure. | Competes on wallet, authorization, and mandate positioning. | Autonomous policy within bounded mandates, enterprise administration, external issuer integrations, cross-rail reconciliation. [wallet](https://openclaw.nekuda.ai/), [mandate thesis](https://nekuda.ai/blog/why-ai-agents-break-the-old-rules/) |
| Skyfire | Wallet funding, agent/API payments, dashboard, and rules by provider, time period, and amount. | Competes for programmatic API/agent payments and developer-controlled budgets. | Traditional card networks, issuer-grade decisioning, standards-based mandates, consumer dispute evidence. [Skyfire docs](https://docs.skyfire.xyz/docs/features) |
| Coinbase Agentic Wallet | Standalone agent wallet for stablecoin/on-chain spending with per-session and per-transaction caps, sanctions/KYT controls, and x402 support. | Strong on-chain agent-spend control. | Cards, bank rails, merchant checkout protocols, network dispute processes, unified policy across off-chain instruments. [Coinbase docs](https://docs.cdp.coinbase.com/agentic-wallet/cli/welcome) |

### 3.2 Platforms that can commoditize or power Reins

| Provider | First-party documented capability | Strategic implication |
|---|---|---|
| Stripe | Issuing controls support amount, interval, MCC, country, and merchant restrictions; synchronous authorization webhooks approve or decline within a two-second window. Stripe also offers SPTs and protocol-agnostic ACP/UCP merchant infrastructure. | Excellent MVP substrate; also capable of building much of the product. Partner distribution or differentiated evidence semantics are essential. [spending controls](https://docs.stripe.com/issuing/controls/spending-controls), [real-time authorization](https://docs.stripe.com/issuing/controls/real-time-authorizations), [agentic suite](https://stripe.com/blog/agentic-commerce-suite) |
| Lithic | Authorization Rules provide deterministic conditional, velocity, challenge, custom-code, shadow, and backtest functions. Custom rules are deterministic, synchronous, isolated, and cannot call external services; Auth Stream Access supports customer logic with a three-second decision window. | Demonstrates that deterministic policy, backtesting, and explainable rule results are already table stakes for issuer infrastructure. Strong build partner or competitor. [Authorization Rules](https://docs.lithic.com/docs/authorization-rules-v2), [custom code](https://docs.lithic.com/docs/custom-code-rules), [digital banking/ASA](https://docs.lithic.com/docs/digital-banking) |
| Adyen | Issuing transaction rules and relayed authorization let a program decline or score transactions; its event model covers authorization, adjustment, capture, refund, and disputes. | Viable enterprise partner; reinforces the need to normalize processor-specific lifecycle semantics. [authorization](https://docs.adyen.com/issuing/authorisation), [transaction rules](https://docs.adyen.com/issuing/authorisation/transaction-rules) |
| Forter | Official documentation now describes full ACP merchant checkout orchestration and a UCP tokenization handler, with optional fraud validation and payment orchestration. | Merchant-side checkout and fraud are crowded. Reins should remain buyer/issuer-side and consume merchant context rather than compete as a merchant checkout gateway. [agentic checkout docs](https://docs.forter.com/checkout-and-payments), [UCP integration docs](https://docs.forter.com/google-ucp-integration) |
| Visa Intelligent Commerce Connect | One merchant-side integration for TAP, MPP, ACP, and UCP, currently in pilot. | Refutes a durable merchant protocol-translation moat. Reins should not position as another merchant acceptance gateway. [Visa announcement](https://usa.visa.com/about-visa/newsroom/press-releases.releaseId.22276.html) |

### 3.3 Market gap that remains supportable

The supportable claim is narrower than “nobody does cross-rail controls”:

> No reviewed first-party product publicly documents an independent, customer-owned policy and intent-state plane that (a) expresses one policy across third-party card, bank, and on-chain credentials, (b) proves where enforcement was authoritative versus advisory, and (c) normalizes authorization, settlement, and dispute evidence across those rails.

This should be tested in design-partner interviews and technical diligence; it should not be stated as an absolute market fact.

## 4. Reconciliation and evidence: the strongest product flank

Simple caps and allowlists are already common. The operationally difficult problem is what happens after authorization.

Card processors document that an approved authorization can be followed by partial capture, multiple captures, overcapture, late capture, adjustment, refund, or a forced capture without a valid authorization. Adyen says an issuer must process capture requests, including after authorization expiry, and that force captures can bypass the balance check. Stripe says spend controls and real-time authorization controls do not apply to capture, and refunds are not always linkable to the original authorization. [Adyen payment stages](https://docs.adyen.com/issuing/payment-stages), [Adyen authorization holds](https://docs.adyen.com/issuing/payment-stages/authorisation-holds), [Stripe Issuing transactions](https://docs.stripe.com/issuing/purchases/transactions?locale=en-GB)

This means an “ALLOW” decision is not the same as the final financial outcome. Reins should implement an event-sourced obligation/evidence graph:

`user intent -> compiled policy/version -> mandate/delegation -> reservation -> credential -> authorization attempts -> network decision -> capture(s)/settlement -> refund/reversal -> dispute outcome`

Required mismatch classes include:

- no mandate or unverifiable mandate;
- amount, currency, payee, merchant, MCC, item/SKU, time-window, or recurrence variance;
- duplicate/replay or multiple transactions against a single-use intent;
- approved amount versus aggregate multicapture amount;
- overcapture, tip, hotel/car-rental/fuel adjustment, tax/shipping change, and FX variance;
- force-posted or offline presentment;
- authorization expired but later captured;
- refund not linked to original authorization;
- protocol receipt exists but rail confirmation is absent, or vice versa;
- issuer/network fallback decision while Reins was unavailable.

The product should produce a signed, verifiable **evidence bundle**, not a legal conclusion: original human text, canonical policy, compiler output, consent/authentication evidence, mandate and receipts, deterministic decision and reason codes, authorization/capture lifecycle, hashes/signatures/key versions, reconciliation results, and any human approval. AP2 explicitly leaves retrieval and retention outside its specification, making this operational layer valuable. [AP2 specification](https://github.com/google-agentic-commerce/AP2/blob/main/docs/ap2/specification.md)

## 5. Regulatory and scheme adjacency

This section is product scoping, not legal advice. The PRD needs a formal counsel workstream before production.

### 5.1 United States: Regulation E

Regulation E applies to electronic fund transfers that debit or credit an account established primarily for personal, family, or household purposes. Business asset accounts are therefore outside this consumer-account definition. [CFPB definition](https://www.consumerfinance.gov/rules-policy/regulations/1005/2/), [CFPB coverage](https://www.consumerfinance.gov/rules-policy/regulations/1005/3/)

An “unauthorized EFT” is not simply “the agent made a bad purchase.” CFPB guidance says the term excludes transfers initiated by a person to whom the consumer furnished the access device, unless the consumer has notified the institution that the person's authority is revoked. An agent acting outside a policy may create strong evidence of lack of authority, but the legal classification is fact- and law-dependent. Regulation E separately treats an incorrect EFT as an error and requires investigation when a covered consumer reports an error. [CFPB EFT FAQ](https://www.consumerfinance.gov/compliance/compliance-resources/deposit-accounts-resources/electronic-fund-transfers/electronic-fund-transfers-faqs/), [error-resolution rule](https://www.consumerfinance.gov/rules-policy/regulations/1005/11/)

If Reins issues an access device and has no agreement with the account-holding institution, 12 CFR 1005.14 can impose special duties on an EFT service provider. This makes the choice between “policy/evidence service,” “credential provider,” and “wallet/access-device issuer” a regulatory-perimeter decision, not merely architecture. [12 CFR 1005.14](https://www.consumerfinance.gov/rules-policy/regulations/1005/14/)

**PRD wording:** “Reg E evidence and error-resolution support” is defensible. “Reg E-compliant disputes” or “guaranteed unauthorized-transaction protection” is not.

### 5.2 United States: Regulation Z

For consumer open-end credit, a billing error can include a transaction not made by the consumer or a person with actual, implied, or apparent authority, or goods/services not accepted or delivered as agreed. Authorization depends on state or other applicable law. [12 CFR 1026.13](https://www.consumerfinance.gov/rules-policy/regulations/1026/13/)

Business-purpose credit is generally exempt from Regulation Z, although the card issuance and unauthorized-use liability provisions of 12 CFR 1026.12(a)-(b) still apply to all credit cards. The billing-error procedure in 1026.13 does not generally apply to a business-purpose card. [12 CFR 1026.3](https://www.consumerfinance.gov/rules-policy/regulations/1026/3/), [12 CFR 1026.12](https://www.consumerfinance.gov/rules-policy/regulations/1026/12/)

The product must therefore separate consumer debit, consumer credit, business card, prepaid, bank transfer, and crypto evidence profiles rather than advertise one generic “Reg E dispute bundle.”

### 5.3 European Union

Under PSD2, remote electronic payments generally require strong customer authentication with dynamic linking to a specific amount and payee. PSD2 also places the burden on the payment service provider to prove authentication and accurate execution when the user denies authorizing a transaction; use of a recorded payment instrument alone is not necessarily sufficient proof of authorization. [PSD2 Article 97](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32015L2366), [PSD2 Article 72 in the same directive](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32015L2366)

The PSD3/Payment Services Regulation package had a provisional political agreement in November 2025 and committee approval in May 2026, but the European Parliament still described it as “close to adoption” in its June 2026 status. It should be tracked as pending legislation, not current law. The agreed direction includes PSP-provided spending limits/blocking measures and stronger fraud duties, which makes Reins relevant but also gives PSPs incentives to build native controls. [European Parliament agreement](https://www.europarl.europa.eu/news/en/press-room/20251121IPR31540/payment-services-deal-more-protection-from-online-fraud-and-hidden-fees), [legislative status](https://www.europarl.europa.eu/legislative-train/theme-an-economy-that-works-for-people/file-payment-services-and-electronic-money-services-%28directive%29)

### 5.4 PCI DSS and data handling

PCI DSS can apply to entities that store, process, or transmit cardholder data and to service providers that can impact the security of the cardholder-data environment even if they do not directly store the data. Tokenization does not automatically remove scope when systems can exchange tokens for PANs or influence the cardholder-data environment. [PCI SSC standard page](https://www.pcisecuritystandards.org/standards/pci-dss/), [PCI service-provider FAQ](https://www.pcisecuritystandards.org/faqs/1580/), [PCI tokenization guidance](https://listings.pcisecuritystandards.org/documents/Tokenization_Guidelines_Info_Supplement.pdf)

The MVP should outsource vaulting and avoid raw PAN/CVV, but still obtain a formal PCI scope assessment.

## 6. Concrete PRD changes

### P0: change the product claim and customer

1. Replace the consumer-first “works across any protocol” claim with: **“Reins enforces policies wherever it has an authoritative adapter and produces comparable evidence everywhere else.”**
2. Make the primary ICP an issuer, issuing processor, regulated fintech, or agent platform that controls a credential or transaction chokepoint. Defer a standalone consumer app until bank/network distribution exists.
3. Make an SMB expense-management product a secondary market. Ramp already has the natural distribution, corporate cards, spend policies, and agent cards.

### P0: align with the standards trajectory

4. Add an **Intent Service** bounded context aligned to the EMVCo September 2026 draft: intent registration, stable references, lifecycle state, cumulative-budget state, authorized retrieval, revocation, and post-transaction updates.
5. Make AP2 v0.2 and Verifiable Intent import/export formats for the canonical model; do not copy their schemas into a proprietary immutable API.
6. Add an action before 2026-09-30 to submit EMVCo feedback and seek FIDO/EMVCo participation or a member design partner.

### P0: define the canonical policy and compiler honestly

7. Define a versioned canonical policy IR with integer minor units and explicit currency/FX basis; payee and merchant identity; MCC/category; item/SKU constraints; per-transaction and aggregate amount/count windows; recurrence; time and geography; agent/provider identity; permitted instrument/rail; approval quorum; revocation; purpose/cost center; and exception tolerance.
8. Every adapter must emit a capability matrix: `EXACT`, `NARROWER`, `BROADER`, `PREFLIGHT_ONLY`, or `UNSUPPORTED` for each constraint. Compilation must fail closed by default when a target cannot preserve a required hard constraint.
9. Keep the LLM outside the authorization path. The LLM can parse a draft policy; deterministic code validates, normalizes, simulates, and enforces it. AP2 itself requires deterministic validation for payment roles. [AP2 specification](https://github.com/google-agentic-commerce/AP2/blob/main/docs/ap2/specification.md)
10. Require user confirmation of the canonical policy, not merely the original prose, with a human-readable diff when it changes.

### P0: make decisioning and budget state production-safe

11. Implement an atomic reservation ledger before issuing credentials or approving transactions; settle, release, or adjust reservations from downstream events. Include idempotency keys, monotonic versions, duplicate suppression, replay protection, and concurrency tests.
12. Define upstream timeout budgets and explicit fail-open/fail-closed behavior. Stripe uses a two-second real-time authorization deadline and Lithic documents a three-second custom authorization window, so the internal target should leave substantial network margin. [Stripe real-time authorization](https://docs.stripe.com/issuing/controls/real-time-authorizations), [Lithic ASA summary](https://docs.lithic.com/docs/digital-banking)
13. Separate `ALLOW`, `DENY`, and `REQUIRE_STEP_UP` from the delivery mechanism. If a rail cannot pause an authorization for human approval, use pre-authorized credential issuance or decline-and-retry rather than pretending an asynchronous escalation can hold the network request.
14. Log a stable policy version, facts used, rule IDs, decision reason codes, and enforcement mode for every attempt.

### P0: elevate reconciliation and evidence to the headline feature

15. Model authorization and settlement as a lifecycle, not a single transaction row. Support adjustment, partial/multiple/over/force capture, reversal, expiry, refund, chargeback, and late presentment.
16. Create cryptographically verifiable evidence bundles and retrieval APIs keyed by transaction, intent, mandate, credential, authorization, and settlement references.
17. State that evidence assists issuer, network, and statutory processes but does not determine legal authorization or guarantee recovery.

### P0: add regulatory and security workstreams

18. Add a regulatory-perimeter decision record for each product mode: policy/evidence processor, credential provider, wallet/access-device issuer, program manager, or funds custodian. Map licensing and consumer duties by jurisdiction and rail.
19. Split retention and disclosure profiles for consumer debit, consumer credit, business cards, prepaid, bank transfer, and crypto.
20. Add PCI scope assessment, key-management/HSM design, signature canonicalization and golden vectors, key rotation/revocation, webhook authentication/replay defense, selective disclosure, least-data retention, and data-subject deletion exceptions.
21. Add threats for prompt injection, compromised agents, confused deputy/sub-agent delegation, mandate replay/double-spend, parser differentials, merchant alias/MCC ambiguity, policy time-of-check/time-of-use races, fallback approvals, and evidence tampering.

### P1: build the smallest credible proof

22. Build one authoritative issuer path in a Stripe Issuing or Lithic sandbox, plus one AP2/UCP path for context and evidence. A demo across four simulated adapters is less credible than one real hard-enforcement loop.
23. Add a second genuinely different rail only after the first lifecycle is correct: for example, an on-chain wallet signer with x402/MPP receipts. This proves cross-rail policy and reconciliation without depending immediately on Visa and Mastercard production partnerships.
24. Treat Visa Intelligent Commerce and Mastercard Agent Pay as partner-gated roadmap items with written entry/availability milestones, not committed MVP dependencies.

## 7. Evaluation plan

Accuracy alone is insufficient because false allows and false denies have different costs.

### Compiler

- exact semantic preservation rate by adapter and field;
- unsupported-constraint detection recall;
- unsafe-broadening rate, with a target of zero for hard policies;
- golden-vector and cross-language signature/canonicalization conformance;
- adversarial paraphrase and ambiguity abstention rate.

### Decision engine

- false-allow rate and loss-weighted false-allow cost;
- false-deny rate and legitimate spend blocked;
- escalation precision, recall, and human completion latency;
- P50/P95/P99 decision latency and timeout/fallback rate;
- deterministic replay rate, targeted at 100% for identical policy, facts, state, and engine version;
- double-spend and concurrent-reservation failure rate, targeted at zero in stress/property tests.

### Reconciliation/evidence

- automatic authorization-to-capture match rate;
- time to detect a variance;
- false mismatch rate;
- percentage of events with complete provenance and verified signatures;
- evidence retrieval completeness and time;
- analyst time to assemble a dispute case;
- outcome tracking by reason and evidence type, without claiming legal causality.

### Coverage

- percentage of spend attempts under authoritative enforcement;
- percentage under hard-with-exceptions, preflight, and observe-only modes;
- number of live credentials/issuers/rails, not merely protocol parsers;
- amount at risk in fallback or non-authoritative paths.

## 8. Build-versus-partner recommendation

### Build

- canonical policy IR and compiler safety model;
- deterministic PDP and atomic budget/reservation ledger;
- Intent Service lifecycle aligned with EMVCo/AP2/VI;
- evidence graph, reconciliation, explanation, and audit export;
- adapter conformance suite, simulator, and evaluation harness;
- human approval orchestration and policy administration.

### Partner

- card issuing, BIN sponsorship, network tokenization, and issuer processing;
- PCI vaulting and sensitive payment credential handling;
- user authentication/passkeys and HSM/KMS services;
- KYC/KYB/AML/sanctions screening;
- network dispute submission and scheme connectivity;
- regulated custody, stablecoin on/off ramps, and money movement.

### Do not build in the first release

- a general merchant checkout gateway competing with Visa ICC, Stripe, or Forter;
- a new proprietary mandate credential when AP2/VI/EMVCo are converging;
- a card program and wallet custody stack simultaneously;
- an LLM-based authorization engine;
- legal conclusions about whether a transaction is “unauthorized.”

## 9. Recommended positioning

Avoid:

> “One app that translates rules into TAP, AP2, Agent Pay, and ACP and enforces them everywhere.”

Use:

> **“Reins is the independent intent and evidence control plane for agent-initiated spend. It turns approved policy into deterministic decisions at connected credential and issuer choke points, tracks what was authorized versus what actually settled, and produces portable evidence across agentic commerce protocols and payment rails.”**

The strongest headline is not “we also have spend caps.” It is:

> **One policy state. Verifiable enforcement coverage. Authorization-to-settlement proof.**

## 10. Go/no-go view

**Go, with a repositioned and narrower PRD.** The need for persistent intent, authorization boundaries, and post-transaction evidence is validated by AP2, Verifiable Intent, and the new EMVCo framework. However, Crossmint, Ramp, network programs, and issuer processors make a generic spend-control product insufficient.

Proceed only if the team can validate all three conditions in the next design-partner phase:

1. At least one issuer/processor or agent platform will provide an authoritative integration point rather than an observe-only feed.
2. Buyers value independent evidence and cross-provider policy state enough to purchase it instead of using native issuer/card controls.
3. Reins can implement EMVCo/AP2/VI-compatible intent state without becoming a custodial wallet or payment service in the first release.

If those conditions fail, the fallback should be a narrower reconciliation/evidence product for agentic transactions, not a claim of universal enforcement.
