# Stripe Test Evidence Integration Design

## Purpose

Add one opt-in Stripe Sandbox execution path to Reins. It proves the existing deterministic decision, idempotency, lifecycle evidence, and reconciliation contracts against a provider API without claiming live-money capability.

## Scope and boundary

- Stripe is a test-only provider. `STRIPE_SECRET_KEY` must start with `rk_test_`; live keys and non-restricted keys are rejected at startup.
- Reins remains authoritative for its policy decision. Stripe is called only from a server route after a persisted `ALLOW` receipt.
- The first slice creates an unconfirmed PaymentIntent. It does not collect a card, confirm a payment, capture money, create a Customer, or activate a Stripe account.
- The provider adapter records only Stripe object IDs, amount, currency, status, and received event IDs. It never stores a key, payment-method detail, or raw webhook body after signature verification.
- Stripe's API is evidence, not permission. An API error, webhook verification failure, duplicate event, currency mismatch, or amount mismatch creates visible `ESCALATE` / unverified evidence and cannot turn a Reins decision into ALLOW.

## Architecture

```text
Persisted Reins ALLOW receipt
          |
          v
POST /api/provider-executions/stripe-test
          |
          +-- validate receipt/request binding + idempotency key
          +-- StripePaymentProvider.createIntent()
          |       |  (server-only restricted test key)
          |       v
          |   Stripe PaymentIntent (unconfirmed)
          |
          v
Provider execution + PROVIDER lifecycle evidence

Stripe event delivery / Stripe CLI forwarding
          |
          v
POST /api/webhooks/stripe
          |
          +-- verify Stripe-Signature with STRIPE_WEBHOOK_SECRET
          +-- dedupe event ID
          +-- map known intent events to lifecycle evidence
          +-- reconcile amount, currency, request, and parent lineage
```

## Components

### `StripePaymentProvider`

The adapter is a small typed interface behind `createStripePaymentProvider(environment)`. It instantiates the current Stripe Node SDK client on the server. It accepts only an immutable Reins execution input: receipt ID, request hash, workflow ID, amount in integer minor units, ISO currency, and idempotency key.

It calls `paymentIntents.create` with server-generated metadata containing only Reins identifiers. It omits `payment_method_types`; Stripe's dashboard-configured dynamic payment methods remain the provider default. It passes Stripe's idempotency key header. A repeated Reins execution request returns the same locally persisted provider execution rather than making another Stripe call.

The adapter exposes `createIntent` and `retrieveIntent`. There is no generic Stripe client exposed to routes or agents.

### Provider execution route

`POST /api/provider-executions/stripe-test` is the explicit opt-in boundary. It loads the immutable receipt and linked request, requires a persisted `ALLOW`, rejects a missing/expired/revoked reservation, and creates or returns the idempotent Stripe execution. The route does not accept an amount, currency, or arbitrary Stripe metadata from the browser.

On success it appends a `PROVIDER` lifecycle event linked to the authorization evidence. On any non-success it records a failed/unverified provider execution with a stable reason code and returns an escalation-safe response.

### Stripe webhook route

`POST /api/webhooks/stripe` reads the raw request body and verifies `Stripe-Signature` before parsing event data. It accepts only the event types mapped by this slice: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, and `payment_intent.amount_capturable_updated`.

Event ID is the database idempotency key. Unknown event types are recorded as ignored provenance, not errors. A valid event whose metadata does not bind to the stored Reins execution is unverified; it must not mutate any other workflow. Valid mapped events append provider lifecycle evidence and invoke the existing reconciliation service.

## Data contracts

Add a provider-execution record with:

- provider (`STRIPE_TEST`), workflow ID, receipt ID, request hash
- execution idempotency key and Stripe PaymentIntent ID
- authorized amount/currency and last observed provider status
- creation/update timestamps and error reason code without provider payload dumps

Add a webhook-event receipt with provider, Stripe event ID, event type, associated execution ID when verified, received timestamp, and disposition (`APPLIED`, `DUPLICATE`, `IGNORED`, `UNVERIFIED`).

The existing lifecycle evidence format remains the normalized source for the UI and Three.js graph. Stripe-specific payloads do not leak into those views.

## Environment and operations

Required server-only variables:

```text
STRIPE_SECRET_KEY=rk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MODE=test
```

Validation rejects absent keys, keys other than `rk_test_`, and `STRIPE_MODE` other than `test`. Variables are documented in `.env.example` but never committed to `.env` or exposed with `NEXT_PUBLIC_`.

For local live event validation, the free Stripe CLI forwards test events to the webhook route. CI and ordinary unit tests use signed fixture payloads and do not call Stripe. A public deployment later stores the same variables as sensitive server environment variables and registers its HTTPS webhook endpoint manually; that is not part of this slice.

## Error handling

| Condition | Reins behavior |
| --- | --- |
| Missing/misconfigured Stripe environment | Provider execution unavailable; no Stripe call; request remains safe for escalation. |
| Receipt not ALLOW or cannot be bound | Reject execution; no Stripe call. |
| Duplicate execution request | Return existing provider execution; no second intent. |
| Stripe API timeout/non-2xx | Store provider failure reason; append unverified evidence; no approval upgrade. |
| Invalid webhook signature | Return 400; do not persist lifecycle state. |
| Duplicate webhook | Return success acknowledgement; do not append duplicate evidence. |
| Event/request mismatch | Store `UNVERIFIED`; reconciliation reports mismatch; no state mutation outside that execution. |

## Verification

1. Unit tests prove configuration rejects live, full-secret, and absent keys; adapter maps only allowed data and Stripe idempotency key.
2. Route tests prove DENY/ESCALATE cannot invoke Stripe, ALLOW executes once under retries, and provider failure stays escalation-safe.
3. Webhook tests prove signature verification, replay de-duplication, unknown-event handling, and amount/currency mismatch evidence.
4. Database integration tests prove concurrent repeated execution creates one provider execution and one PaymentIntent call.
5. An opt-in sandbox test creates one unconfirmed test PaymentIntent and retrieves it; its generated identifier and status are verified without logging a secret.

## Non-goals

- Live-mode Stripe, customer payment collection, test-card confirmation, capture, refunds, Connect, Stripe Issuing, tax, subscriptions, or wallet/provider protocol support.
- A claim that an unconfirmed PaymentIntent represents settlement, card authorization, or a real transaction.
- Webhook endpoint registration, Stripe CLI installation, or public deployment automation. Those are separate operational steps after the server implementation passes.
