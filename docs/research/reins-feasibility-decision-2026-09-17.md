# Reins: free-resource feasibility check

Reviewed 2026-09-17. This is a bounded resource and financial feasibility check, not customer validation or a production-readiness assessment. No application code was changed or tested for this note.

## Verified first-party facts

| Resource | Verified fact | Implication for Reins |
| --- | --- | --- |
| Podman Desktop | The project describes itself as free and open source, supports Windows, Linux, and macOS, and supports Compose. | Local containers need no paid container-management subscription. Commercial support is optional. |
| PostgreSQL | Its license permits use, modification, and distribution for any purpose without a fee, subject to license notices. | A local database has no PostgreSQL license charge. This does not supply hosted infrastructure or support. |
| GitHub Actions | Standard hosted runners are free for public repositories. GitHub Free and Free organizations include 2,000 private-repository minutes per month, 500 MB artifact storage, and 10 GB cache storage per repository. Larger runners are charged. Without a valid payment method, usage blocks when the included allowance is exhausted. | Use ordinary Linux jobs, restrained retention, and no paid overage. If hosted quota is exhausted, run the same commands manually on each contributor's local machine; record results without calling them protected CI evidence. Publishing a repository is a separate owner decision, not required for the demo. |

Sources:

- [Podman Desktop](https://podman-desktop.io/)
- [PostgreSQL license](https://www.postgresql.org/about/licence/)
- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)

## Recommendation and assumptions

A local synthetic end-to-end demonstration is feasible with zero additional paid service fees. This assumes the contributors already have suitable computers, electricity, internet for initial downloads, and development access. Their time and existing Codex access are not free resources and must not be hidden inside the claim. We have not checked both machines' capacity in this review.

Keep the required runtime independent of paid AI, cloud databases, email delivery, domains, production issuer accounts, and cloud hosting. Use seeded users, in-app approvals, two local payment simulators, and deterministic policies. Any local-model feature should be optional so a GPU or additional RAM purchase is not needed for the core demonstration. After dependencies are downloaded, test the promised offline demo journey explicitly.

Zero service fees do not mean a zero-cost business. Operating live customer payments introduces ongoing hosting, recovery, incident-response, support, integration, and security-assurance work. The scope and price of those needs have not been established; no production cost estimate or profitability claim follows from this research.

## Independent critique: inference, not a sourced market fact

For two contributors under a no-additional-spend constraint, a broad inline multi-protocol payment company is too large a first commercial commitment. Supporting every protocol creates maintenance work without proving that one buyer has enough cross-provider pain to pay. A synthetic simulator also does not establish that real providers grant the access needed for mandatory enforcement.

The lower-risk approach is a narrow, complete local demonstrator plus customer discovery, with a potential read-only evaluation entry point before any production authorization dependency. Preserve deterministic controls and evidence as the project's technical core. Defer production availability promises, broad protocol certification, and real-money handling until a customer need, access path, operating budget, and accountable support model are established. This is a recommendation about risk and opportunity cost, not evidence that customers will or will not buy.

## Final recommendation and investment limits

Conditional go for a bounded synthetic demo and customer validation; no-go for committing now to a production multi-network payment service under permanent zero-spend constraints. This is a proposed sequencing change, not an amendment to the approved PRD or authorization to implement.

Keep one business workflow, USD, two synthetic agent clients, and two provider behaviors. Complete policy creation, supported-path coverage, shared reservations, approval, capture/refund reconciliation, and evidence export. Preserve identity, tenant checks, fail-safe behavior, and failure tests. Keep the requested Three.js view as a bounded optional view after the accessible evidence flow works. Defer live payments, broad protocol coverage, paid hosting, paid inference, and enterprise guarantees. Do not turn the product into a read-only tool solely on speculation about easier sales.

Treat existing Next.js, Fastify, PostgreSQL, Drizzle, Better Auth, and pnpm code as the starting point. Small typed module interfaces keep the change manageable without a rewrite or premature infrastructure.

Recommend a review after the first 40 combined contributor hours, not a promise that the application will be finished within 40 hours. That is a proposed opportunity-cost checkpoint, not an industry benchmark or agreed budget. Record actual effort and remaining work. Do not treat the earlier 12-week roadmap as a deadline independent of availability and scope.

Commercial expansion requires evidence of repeated customer pain, a named budget owner, an executable integration path, and customer participation in a measured evaluation. Two design partners are a proposed initial decision gate, not statistical proof. A paid evaluation or purchase provides stronger willingness-to-pay evidence than compliments or a non-binding letter. If qualified teams lack the need or will not participate, stop commercial expansion; the demo may remain worthwhile for the explicitly separate engineering/portfolio objective.

No revenue, price, sales-cycle, or production cost data has been established. Profitability cannot therefore be estimated responsibly. Future collected revenue would need to cover infrastructure, integration maintenance, support labor, security/recovery obligations, customer acquisition, and other applicable operating costs. Self-hosting transfers infrastructure responsibility, not all vendor cost or risk.

## Local verification during the decision review

No application source or PRD was changed. `pnpm format` passed with no fixes. `pnpm check` passed lint, migration metadata checks, type checks, and 29 tests; two database tests were skipped. The prior authentication timeout did not recur in this run, which is not a root-cause fix. The web build compiled, then failed with `spawn EPERM` during its TypeScript phase. The full check did not pass, and release readiness is not established.

Node and pnpm were found on this shell's PATH. Podman was not found on that PATH; this does not prove it is absent elsewhere. A system-memory query returned access denied. Hardware suitability, container setup, and offline execution on both contributor machines remain unverified. These findings affect the first setup checkpoint, not the license-based conclusion that a local implementation need not require paid services.
