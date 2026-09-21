# Parallel Agent Budget Architecture Research

## Verified market patterns

- Next.js is currently major version 16. The official August 2026 security release identifies 16.3.3 as the active LTS patch line. Reins currently declares 16.3.5, so any later framework change should be a measured dependency upgrade, not a move to a nonexistent "Next.js 26" version. Source: <https://nextjs.org/blog>.
- Lithic supports velocity rules on authorization events at card or account scope, but explicitly says their velocity computation is eventually consistent and should not be treated as balance or reconciliation-level accuracy. Source: <https://docs.lithic.com/docs/velocity-limit-rules>.
- Lithic also documents most-restrictive-rule precedence, shadow mode, rule lifecycle, and backtesting. These are appropriate patterns for the Reins policy version lifecycle, but not a substitute for Reins' own shared-budget reservation ledger. Sources: <https://docs.lithic.com/docs/about-authorization-intelligence>, <https://docs.lithic.com/docs/authorization-rules-v2>, <https://docs.lithic.com/docs/auth-rule-lifecycle>.
- Lithic warns that a clearing amount can exceed an earlier authorization and that force-posted charges can bypass an authorization. Reconciliation must therefore compare authorizations, reservations, and settlement independently. Source: <https://docs.lithic.com/docs/spend-limits>.
- Stripe exposes cardholder spending controls such as allowed merchant countries, blocked categories, and amount limits across time intervals. This supports treating provider controls as an adapter capability, rather than assuming all providers enforce the same semantics. Source: <https://docs.stripe.com/api/treasury/transactions/object>.

## Architecture conclusion

Use a central, serializable budget-reservation ledger as the only shared-spend authority. Parallel agents may only produce typed, untrusted context. The deterministic policy service atomically creates a reservation or rejects/escalates the request. Workers and providers consume immutable commands through an outbox and must be idempotent. Settlement is reconciled against the reservation after the decision; it is not assumed to match it.
