# Stripe Sandbox Test Evidence

## Scope

This verification covers the opt-in, Stripe Sandbox-only evidence integration. It creates unconfirmed PaymentIntents after a persisted deterministic `ALLOW` receipt. It does not process a card, confirm, capture, refund, or move money.

## Required environment

- `STRIPE_MODE=test`
- A server-only restricted `rk_test_` key with PaymentIntents read and write access
- `RUN_STRIPE_SANDBOX_TEST=1` only when intentionally running the external sandbox smoke check

## Verification sequence

1. Run adapter, execution, signed-webhook, route, and PostgreSQL execution-store tests.
2. Apply and verify the generated database migrations in development and test databases.
3. Run `pnpm stripe:sandbox:verify`. The command creates and retrieves one unconfirmed 100-cent Sandbox PaymentIntent, logs only an identifier suffix and safe state fields, and requires the explicit opt-in environment variable.
4. Run `pnpm check` for the repository quality gate.

## Acceptance boundaries

- Missing, live, or nonrestricted keys fail before an SDK client is created.
- Only a matching persisted `ALLOW` receipt and held reservation can initiate an intent.
- A provider error never changes Reins policy outcome to `ALLOW`.
- Retries reuse the persisted provider execution and idempotently restore the provider evidence event.
- Webhooks must pass signature verification and metadata, amount, currency, and binding checks before evidence is appended.

## Results

Verified locally on 21 September 2026:

- Adapter, execution service, signed-webhook, and route tests passed. The web suite passed 57 tests with 98.00 percent statement coverage and 90.56 percent branch coverage for the measured application surface.
- The isolated PostgreSQL execution-store integration test passed after applying migrations to the test database. Development database migration and connection verification also passed.
- The production build passed, including Next.js type checking and route generation.
- The explicit opt-in `pnpm stripe:sandbox:verify` check created and retrieved one unconfirmed USD 1.00 Stripe Sandbox PaymentIntent. Its returned state was `requires_payment_method`.
- The Control Room browser journey ran an idempotent eligible request, exposed the Sandbox action only after its persisted `ALLOW` receipt was returned, created one unconfirmed USD 840.00 Sandbox intent, and appended the normalized `ORDER` evidence event.

The integration has not confirmed a payment, used a card, captured funds, or been tested with a live key. A Stripe CLI or Dashboard webhook endpoint remains a local operator configuration step when live signed event forwarding is desired. Public deployment keeps Stripe Sandbox execution disabled until an authenticated authorization boundary is introduced.
