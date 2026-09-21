# Reins: zero-cost development and pilot stack

**As of:** 2026-09-16  
**Scope:** development, collaboration, testing, demo hosting, identity, local policy drafting, observability, security scanning, and payment or protocol sandboxes  
**Source policy:** primary sources only. Product pricing and quotas are snapshots, not guarantees. "Free" cloud services are separated from software that can be run locally without a subscription.

## Executive conclusion

Reins can be built, tested, demonstrated, and collaboratively reviewed without paying for software or cloud services. The only defensible strictly zero-cost architecture is local-first:

- Run the application, PostgreSQL, identity, local model, and observability stack on contributor-owned computers.
- Use Podman Desktop instead of making the plan depend on Docker Desktop's conditional free license.
- Use a free private GitHub Organization for source control and voluntary pull-request review.
- Run critical checks locally and optionally within GitHub's free Actions allowance.
- Use an in-repository mock issuer as the authoritative integration for repeatable testing.
- Use free protocol specifications and payment sandboxes only as supplemental compatibility demonstrations.

An optional internet demo can use a free Render web service and a free Neon PostgreSQL database, but that is not an always-on pilot: Render sleeps after inactivity and Neon has storage, compute, egress, and retention limits. Free tiers may change or disappear.

The following cannot honestly be promised for zero cost: production card issuing, actual payment processing, direct Visa or Mastercard network participation, production-grade uptime, private-repository GitHub security enforcement, independent penetration testing, compliance certification, retained production backups, SMS delivery, a custom domain, or contractual support.

## 1. Meaning of zero cost

| Classification | Meaning | Suitable use |
|---|---|---|
| Local and open source | Software can run on hardware already owned, without a vendor subscription. Electricity, hardware, internet, and maintenance still have real costs. | Development, automated tests, demonstrations, evaluation datasets |
| Free hosted allowance | A vendor currently supplies a limited $0 tier. It can stop, sleep, throttle, pause, or change. Account creation may be required. | Convenience, collaboration, short demonstrations |
| Free sandbox | Test data and simulated transactions are free, but access may require account verification, product approval, or a partner relationship. | Adapter validation only |
| Not free | Live transactions, regulated access, dependable infrastructure, paid security controls, certification, or professional support. | Production and regulated pilots |

## 2. Recommended strictly zero-cost architecture

### 2.1 Application and runtime

| Component | Choice | Cost status | Important limitation |
|---|---|---|---|
| Runtime | Node.js LTS | Local and open source | Node core is MIT licensed; bundled components retain their own open-source licenses. [Node license](https://github.com/nodejs/node/blob/main/LICENSE) |
| Package manager | pnpm | Local and open source | MIT for the package manager; review the repository's stated exception for the separate `pnpr/` directory. [pnpm license](https://github.com/pnpm/pnpm/blob/main/LICENSE) |
| Web application | Next.js and React | Local and open source | Next.js is MIT licensed. Hosting is a separate cost decision. [Next.js license](https://github.com/vercel/next.js/blob/canary/license.md) |
| API | Fastify | Local and open source | MIT licensed. Keep authorization logic in a framework-independent domain package. [Fastify repository](https://github.com/fastify/fastify) |
| Database | PostgreSQL | Local and open source | The permissive PostgreSQL License allows use, modification, and distribution without fee. Operational reliability is the team's responsibility. [PostgreSQL license](https://www.postgresql.org/about/licence/) |
| Database access | Drizzle ORM plus explicit SQL migrations | Local and open source | Apache-2.0 licensed. Test transaction and locking behavior against real PostgreSQL. [Drizzle repository](https://github.com/drizzle-team/drizzle-orm) |
| Containers | Podman Desktop and Podman Compose-compatible files | Local and open source | Podman is free and open source. Windows uses a Podman machine backed by WSL2, so Testcontainers and Compose behavior must be verified on each contributor machine. [Podman](https://podman.io/), [installation](https://podman.io/docs/installation) |

Docker Desktop is also free for personal use, education, noncommercial open source, and qualifying small businesses with both fewer than 250 employees and under $10 million in annual revenue. Larger professional and government use requires a subscription. Podman avoids making the project's zero-cost promise dependent on those organizational thresholds. [Docker Desktop license](https://docs.docker.com/subscription-billing/desktop-license/)

### 2.2 Identity

Use Better Auth inside the TypeScript application for the first demo. It is MIT licensed and can use the same PostgreSQL database. This minimizes memory use and local services while retaining a migration path to an external OpenID Connect provider. [Better Auth repository](https://github.com/better-auth/better-auth)

Use Keycloak only if the demo must prove external OIDC, SAML, identity brokering, or centralized administration. Keycloak is an Apache-2.0 open-source identity and access-management server supporting OpenID Connect, OAuth 2.0, and SAML. It is fully local but operationally heavier. [Keycloak](https://www.keycloak.org/), [repository](https://github.com/keycloak/keycloak)

The zero-cost pilot should use app-based TOTP or passkeys where supported. It should not depend on SMS or paid transactional-email delivery. A development mail catcher can demonstrate email flows locally, but it is not delivery to real users.

### 2.3 Local policy drafting

The strict baseline should work without any language model: users can build policies through a structured form, templates, and deterministic parsing. This preserves all core authorization behavior on machines unable to run a model.

For the natural-language drafting experience, run Ollama locally and request a JSON-schema-constrained response. Ollama documents structured outputs through the `format` field and recommends validating the result with Zod or Pydantic. [Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs)

A permissively licensed candidate is Qwen2.5 7B Instruct, whose official model repository carries Apache-2.0. The common Ollama quantization is about 4.7 GB, so it needs materially more working memory than the model file alone and can be slow without a suitable GPU. [Qwen2.5 7B license](https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF/blob/74ef91efd0899612867d6bb080ce5a2788ef6aa1/LICENSE), [Ollama model sizes](https://ollama.com/library/qwen2.5/tags)

The local model may only produce a draft. Reins must schema-validate it, run semantic checks, display a deterministic read-back, and require human activation. It must never approve or deny a transaction. Local inference removes API charges but does not remove model-error risk or hardware requirements.

### 2.4 Source control and collaboration

Use a free GitHub Organization with a private repository. GitHub Free supports unlimited private repositories and collaborators. Organization repositories also provide more useful repository roles than private repositories owned by personal accounts. [GitHub plans](https://docs.github.com/en/get-started/learning-about-github/githubs-plans), [organization repository roles](https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization)

The important limitation is enforcement. Protected branches, required reviews, required status checks, private-repository code scanning, and private-repository secret scanning are not all included for a private repository on GitHub Free. GitHub documents protected branches for private repositories as a paid-plan capability, while advanced code and secret protection are free primarily for public repositories. [protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges/managing-protected-branches/about-protected-branches), [Advanced Security availability](https://docs.github.com/en/get-started/learning-about-github/about-github-advanced-security)

Therefore the $0 private-repository workflow is process-based:

1. Each change starts from a GitHub issue.
2. Each contributor or Codex task uses a separate branch and worktree.
3. No contributor voluntarily pushes directly to `main`.
4. The other co-owner reviews every pull request.
5. Both co-owners approve changes to policy, authorization, reservation, signatures, evidence, or migrations.
6. CI evidence is attached to the pull request before merge.
7. Release tags identify demonstrated milestones.

This is suitable for a two-person portfolio project. It is not equivalent to enforced enterprise change control.

### 2.5 Continuous integration

GitHub Free includes 2,000 standard hosted-runner minutes per month and 500 MB of artifact storage for private repositories, with 10 GB of cache per repository. Standard runners are free for public repositories. Self-hosted runner execution does not consume hosted-runner minutes. Without a payment method, over-quota use is blocked instead of billed. [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)

Recommended $0 controls:

- Use Linux runners only.
- Run linting, type checks, unit tests, migration validation, and short integration tests on pull requests.
- Run long property, browser, load, and dynamic-security tests locally or on a manually started self-hosted runner.
- Retain artifacts for only a few days and upload only failed-test evidence.
- Set a zero-dollar spending budget or leave the account without a payment method if automatic charges must be impossible.

### 2.6 Security scanning

Private GitHub Advanced Security should not be assumed at $0. Use local or CI tools instead:

| Purpose | Free tool | Source-backed status |
|---|---|---|
| Static analysis | Semgrep Community Edition | Free, LGPL engine, no login required for community rules; some Semgrep-maintained rules have usage terms, so use them internally and review their licenses. [Semgrep CE](https://semgrep.dev/products/community-edition/) |
| Secrets | Gitleaks | MIT licensed and runnable locally or in CI. [official package](https://github.com/gitleaks/gitleaks/pkgs/container/gitleaks) |
| Dependencies, container images, misconfiguration, SBOM | Trivy | Apache-2.0 open-source scanner for filesystems, repositories, images, secrets, CVEs, licenses, and IaC. [Trivy repository](https://github.com/aquasecurity/trivy) |
| Dynamic web testing | OWASP ZAP | Free and open-source web application scanner. [ZAP](https://www.zaproxy.org/) |
| JavaScript dependencies | `pnpm audit` plus lockfile review | Registry advisories are useful but not a substitute for source review or threat modeling. |

These tools reduce risk but do not constitute a penetration test, compliance assessment, or security warranty.

### 2.7 Observability

Instrument the API and workers with OpenTelemetry. It is open source, vendor-neutral, and designed to export traces, metrics, and logs to different backends. [OpenTelemetry](https://opentelemetry.io/docs/what-is-opentelemetry/)

For local development:

- Keep structured JSON logs on local disk with explicit redaction and short retention.
- Use Prometheus for application and process metrics. Prometheus is open source under Apache-2.0 and is not intended to be the source of truth for billing or financial evidence. [Prometheus overview](https://prometheus.io/docs/introduction/overview/)
- Add Grafana OSS only when dashboards materially help. Grafana OSS is free to self-host but is AGPLv3, and self-hosting transfers security, upgrades, backups, and availability to the team. [Grafana OSS](https://grafana.com/oss/), [licensing](https://grafana.com/licensing/)
- Keep financial evidence in PostgreSQL and exported evidence bundles, not in the metrics or log platform.

## 3. Optional free cloud demonstration

Cloud deployment is optional. Local execution remains the authoritative $0 path.

### Recommended temporary demo

- Deploy the web application and API together on one Render free web service.
- Use one Neon free PostgreSQL project.
- Disable the local language model in the hosted environment and use structured policy forms or saved demonstration drafts.
- Use generated provider events and mock issuer webhooks, never real payment credentials.

Render's free web service sleeps after 15 minutes without inbound traffic and can take about a minute to wake. Its filesystem is ephemeral. Render's free PostgreSQL database expires after 30 days, so it should not be used; Neon is the less fragile free database option. [Render FAQ](https://render.com/docs/faq), [Render deployment limits](https://render.com/docs/your-first-deploy)

Neon's current Free plan states no time limit and no credit card requirement. It includes 0.5 GB storage per project, 100 compute-unit hours monthly per project, autoscaling to zero, 5 GB egress, a six-hour restore window, one day of metrics and logs, and community support. The database suspends after inactivity and the quota may change. [Neon pricing](https://neon.com/pricing)

### Other free tiers considered

| Service | Current free allowance | Why it is not the default |
|---|---|---|
| Vercel Hobby | Free compute and function quotas | Official terms restrict Hobby to personal, noncommercial use. Do not use it for a commercial SMB pilot. [Vercel Hobby](https://vercel.com/docs/plans/hobby) |
| Supabase Free | Two projects, 500 MB database per project, 50,000 MAU, 5 GB egress | Free projects pause after one week of inactivity. Useful for a demo, but adds another auth and platform model when local Better Auth plus PostgreSQL is sufficient. [Supabase billing](https://supabase.com/docs/guides/platform/billing-on-supabase), [pricing](https://supabase.com/pricing) |
| Cloudflare Workers and D1 | 100,000 Worker requests daily; D1 includes 5 million rows read and 100,000 rows written daily, with 5 GB total storage | D1 is SQLite-based, not PostgreSQL. Adopting it would change locking and transaction assumptions central to the reservation ledger. Free-limit exhaustion causes requests or queries to fail. [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) |
| Render PostgreSQL | Free instance available | The free database expires after 30 days and is inappropriate for retained evidence. [Render service types](https://render.com/docs/service-types) |

No free cloud tier should be described as production infrastructure. Do not place real customer financial data or cardholder data in a free demo environment.

## 4. Payment and protocol testing

### Mock issuer is mandatory

The only fully controllable zero-cost authorization rail is a Reins-owned simulator. It should reproduce authorization requests, duplicate delivery, reversals, partial and excess capture, refunds, timeouts, out-of-order webhooks, and concurrency. It is the source of repeatable acceptance tests and demonstrations.

### Stripe Issuing

Stripe documents an Issuing sandbox in which test cards, test funding, authorizations, captures, and real-time authorization webhooks can be simulated without real purchases. The cards work only within the account's sandbox. Access still requires a Stripe account and the Issuing product; production Issuing is subject to eligibility, approval, terms, geography, card-creation costs, and transaction fees. [Stripe Issuing testing](https://docs.stripe.com/issuing/testing), [Issuing availability and approval caveat](https://stripe.com/blog/issuing-self-serve)

Conclusion: useful as the first external sandbox when access is granted, but it cannot be a prerequisite for the zero-cost build.

### Visa

Visa says most Developer Center products are free in sandbox, while production requires commercial arrangements. A developer account is required. Visa TAP is explicitly a restricted product, so its assets or network participation cannot be assumed even though the public Trusted Agent Protocol material can inform an evidence adapter. [Visa Developer program](https://developer.visa.com/developer_program), [API browser and sandbox policy](https://developer.visa.com/apibrowser), [Visa TAP access restriction](https://developer.visa.com/capabilities/visa-tap/product-terms)

Conclusion: use public specifications and synthetic fixtures. Treat restricted sandbox and production access as a future partnership gate.

### Mastercard

Mastercard's public Agent Pay material states that trusted agents must be registered and verified and that partners are participating in deployments. The reviewed official material does not establish a public, self-service Agent Pay sandbox. [Agent Pay launch](https://www.mastercard.com/us/en/news-and-trends/press/2025/april/mastercard-unveils-agent-pay-pioneering-agentic-payments-technology-to-power-commerce-in-the-age-of-ai.html), [Agent Pay framework](https://www.mastercard.com/us/en/news-and-trends/stories/2025/agentic-commerce-framework.html)

Conclusion: build a contract-level mock adapter only. Do not claim a live Mastercard integration until credentials and written access exist.

### AP2 and ACP

The AP2 repository is Apache-2.0 and provides specifications, schemas, SDK code, and runnable samples. It is a protocol and evidence model, not a settlement rail. Its specification explicitly requires validation and processing to occur in deterministic code. [AP2 repository](https://github.com/google-agentic-commerce/AP2), [AP2 specification](https://github.com/google-agentic-commerce/AP2/blob/main/docs/ap2/specification.md)

ACP is maintained as an open specification with OpenAPI documents, JSON schemas, examples, and an Apache-2.0 repository. A local conformance adapter can therefore be built for $0, but actual payment delegation or merchant processing still depends on a payment provider. [ACP repository](https://github.com/agentic-commerce-protocol/agentic-commerce-protocol)

Conclusion: AP2 and ACP parsing, signing, verification, and evidence mapping are valid free deliverables. Calling them live cross-network payment enforcement would be inaccurate.

## 5. Revised zero-cost milestone sequence

| Milestone | $0 deliverable | Exit evidence |
|---|---|---|
| 0. Agreement | Approved PRD, threat model, terminology, architecture records, and free-resource constraint | Both co-owners approve scope |
| 1. Foundation | pnpm monorepo, Podman local environment, PostgreSQL, Better Auth, GitHub Free workflow, local security scripts | Both contributors reproduce the build locally |
| 2. Deterministic core | Policy schema, rule evaluator, coverage matrix, explanation trace, property tests | Golden decision corpus passes with zero unsafe ALLOW results |
| 3. Authorization simulator | Atomic reservations, idempotency, mock issuer, signed receipts, concurrency and failure simulation | Duplicate and concurrent requests cannot overspend |
| 4. User application | Shared admin console, policy form, approval inbox, audit timeline, optional Ollama drafting | End-to-end local workflow demonstrated |
| 5. Evidence and reconciliation | Authorization, capture, reversal, refund, mismatch cases, evidence export | Synthetic lifecycle and mismatch suite passes |
| 6. Open protocol adapters | AP2 and ACP schema validation, signing fixtures, protocol coverage report | Conformance fixtures and adversarial cases pass |
| 7. External sandbox | Stripe Issuing only if account access is granted; Visa or Mastercard only if approved | Sandbox evidence clearly labeled and reproducible |
| 8. Temporary internet demo | Render plus Neon, synthetic data only | Public demo works within documented free-tier constraints |

The project remains valuable if Milestones 7 and 8 are unavailable. Milestones 1 through 6 contain the portfolio's core engineering evidence.

## 6. Non-negotiable claim boundaries

- Say "local working prototype" or "free-tier demonstration," not "production platform."
- Say "AP2/ACP-compatible evidence adapter," not "network integration," unless a real authorized endpoint is exercised.
- Say "Stripe Issuing sandbox integration" only after Issuing sandbox access is verified.
- Say "Visa or Mastercard contract mock" until restricted credentials are issued.
- Never process real PAN, CVV, bank credentials, or customer financial data in the $0 environment.
- Do not claim PCI DSS compliance, SOC 2, regulatory approval, an SLA, or completed penetration testing.
- Treat free-tier quotas and eligibility as external risks reviewed before every public demonstration.

## Recommendation

Adopt the local-first stack for the agreed build plan:

> GitHub Free Organization + pnpm monorepo + Node.js + Next.js + Fastify + PostgreSQL + Drizzle + Better Auth + Podman Desktop + optional local Ollama + Vitest/Testcontainers/Playwright + OpenTelemetry/Prometheus + Semgrep CE/Gitleaks/Trivy/ZAP.

Use Render plus Neon only for a temporary synthetic-data demo. Make the Reins mock issuer the guaranteed integration, then add Stripe Issuing, Visa, or Mastercard adapters only when free sandbox access has actually been granted. This preserves a true $0 development path without overstating what free resources can deliver.
