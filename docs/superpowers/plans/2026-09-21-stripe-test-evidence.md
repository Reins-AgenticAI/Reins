# Stripe Test Evidence Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in, server-only Stripe Sandbox PaymentIntent execution path with durable, signature-verified provider evidence.

**Architecture:** A narrow Stripe adapter receives only a persisted Reins ALLOW receipt and immutable request data. A database execution store enforces idempotency before invoking Stripe; a separate webhook route verifies raw signed events, deduplicates their IDs, and appends normalized lifecycle evidence for reconciliation.

**Tech Stack:** Next.js 16 route handlers, TypeScript, Stripe Node SDK, Drizzle ORM/PostgreSQL, Vitest, existing `@reins/assurance` reconciliation contracts.

**Spec:** `docs/superpowers/specs/2026-09-21-stripe-test-evidence-design.md`

## Global Constraints

- Use Stripe Sandbox only: reject absent keys, non-`rk_test_` keys, and all modes except `STRIPE_MODE=test`.
- Keep all Stripe credentials server-only; never use `NEXT_PUBLIC_`, log a secret, store a raw webhook payload, PAN, or payment method detail.
- Call Stripe only after a persisted deterministic `ALLOW` receipt; a timeout, provider failure, missing binding, or invalid event can never become Reins ALLOW.
- Use integer minor units, Reins request IDs as provider idempotency keys, and server-generated metadata only.
- Do not pass `payment_method_types` to Stripe. The first slice creates unconfirmed PaymentIntents only.
- Run `pnpm format` and `pnpm check`; for schema changes also run `pnpm db:generate`, `pnpm db:migrate`, and `pnpm db:verify`.

---

### Task 1: Install and isolate the Stripe server adapter

**Files:**
- Modify: `apps/web/package.json`, `pnpm-lock.yaml`, `.env.example`
- Create: `apps/web/src/lib/stripe-payment-provider.ts`
- Create: `apps/web/src/lib/stripe-payment-provider.test.ts`

**Interfaces:**
- Produces `createStripePaymentProvider(environment): StripePaymentProvider`.
- Produces `StripePaymentProvider.createIntent(input)` and `retrieveIntent(paymentIntentId)`.
- Consumes `STRIPE_SECRET_KEY`, `STRIPE_MODE`, and immutable Reins identifiers.

- [x] **Step 1: Add the current Stripe Node SDK to the web workspace**

Run:

```text
pnpm --filter @reins/web add stripe
```

Add documented non-secret variables to `.env.example`:

```text
STRIPE_MODE=test
# STRIPE_SECRET_KEY=rk_test_... (local/Vercel sensitive server variable only)
# STRIPE_WEBHOOK_SECRET=whsec_... (set after local Stripe CLI or Dashboard webhook setup)
```

- [x] **Step 2: Write adapter tests first**

Cover the following using an injected `Stripe` client factory rather than network calls:

```ts
expect(() => createStripePaymentProvider({ STRIPE_MODE: "test" })).toThrow("STRIPE_SECRET_KEY");
expect(() => createStripePaymentProvider({ STRIPE_MODE: "live", STRIPE_SECRET_KEY: "rk_test_x" })).toThrow("STRIPE_MODE");
expect(() => createStripePaymentProvider({ STRIPE_MODE: "test", STRIPE_SECRET_KEY: "sk_test_x" })).toThrow("restricted test key");
await provider.createIntent(input);
expect(client.paymentIntents.create).toHaveBeenCalledWith(
  expect.objectContaining({ amount: 4800000, currency: "usd", metadata: { reins_workflow_id: "wf-1", reins_receipt_id: "receipt-1", reins_request_hash: "hash-1" } }),
  { idempotencyKey: "stripe-execution:receipt-1" },
);
```

- [x] **Step 3: Implement the smallest typed adapter**

```ts
export type StripeIntentInput = Readonly<{
  receiptId: string;
  workflowId: string;
  requestHash: string;
  amountMinor: number;
  currency: string;
  idempotencyKey: string;
}>;

export interface StripePaymentProvider {
  createIntent(input: StripeIntentInput): Promise<Readonly<{ id: string; status: string }>>;
  retrieveIntent(id: string): Promise<Readonly<{ id: string; status: string; amount: number; currency: string }>>;
}
```

Instantiate the SDK only in `createStripePaymentProvider`. Normalize currency to lowercase only after validation. Send only the three listed `reins_*` metadata keys; never place agent prompts, titles, or names into Stripe metadata.

- [x] **Step 4: Run focused tests**

Run:

```text
pnpm --filter @reins/web vitest run src/lib/stripe-payment-provider.test.ts --configLoader native --pool=threads --maxWorkers=1
```

Expected: configuration, metadata, integer amount, idempotency, and provider-error tests pass without calling Stripe.

### Task 2: Persist provider executions and webhook receipts

**Files:**
- Modify: `packages/db/src/schema/assurance.ts`, `packages/db/src/schema/index.ts`, `packages/db/src/index.ts`
- Create: `packages/db/src/stripe-execution-store.ts`
- Create: `packages/db/test/stripe-execution-store.integration.test.ts`
- Modify through generation: the next Drizzle migration SQL file, matching snapshot file, and `packages/db/drizzle/meta/_journal.json` produced by `pnpm db:generate`

**Interfaces:**
- Produces `PostgresStripeExecutionStore`.
- Produces `beginExecution`, `completeExecution`, `failExecution`, `findExecutionByIntent`, and `recordWebhookReceipt`.
- Consumes the persisted workflow and decision receipt identifiers from existing schema.

- [x] **Step 1: Write real-PostgreSQL integration tests first**

Assert all cases against the test database:

```ts
const [first, second] = await Promise.all([
  store.beginExecution(input),
  store.beginExecution(input),
]);
expect([first.created, second.created].filter(Boolean)).toHaveLength(1);
expect(await store.recordWebhookReceipt(event)).toMatchObject({ disposition: "APPLIED" });
expect(await store.recordWebhookReceipt(event)).toMatchObject({ disposition: "DUPLICATE" });
```

Also assert a receipt ID or request hash mismatch throws and no execution row is created.

- [x] **Step 2: Add database tables with database-enforced uniqueness**

Add `stripe_provider_execution` with foreign keys to `organization`, `workflow_run`, and `decision_receipt`; unique indexes on `(organization_id, execution_idempotency_key)` and `stripe_payment_intent_id` when populated. Add `stripe_webhook_receipt` with unique `(organization_id, stripe_event_id)` and nullable execution reference.

Use text IDs, integer minor-unit amounts, three-letter uppercase currency checks, statuses `PENDING | CREATED | FAILED`, and an optional stable error code. Do not create JSON payload columns.

- [x] **Step 3: Implement transactional store operations**

`beginExecution` acquires an advisory transaction lock on `organizationId:idempotencyKey`, returns the existing matching execution, and rejects a different receipt/request binding. `completeExecution` records the PaymentIntent ID and status exactly once. `recordWebhookReceipt` inserts once and reports `DUPLICATE` on the unique conflict without appending evidence itself.

- [x] **Step 4: Generate and verify the schema migration**

Run:

```text
pnpm db:generate
pnpm db:migrate
pnpm db:verify
pnpm --filter @reins/db vitest run test/stripe-execution-store.integration.test.ts --pool=threads --maxWorkers=1
```

Expected: generated migration is reversible by the existing test reset process and concurrent execution maps to one persisted row.

### Task 3: Add the explicit Stripe Sandbox execution route

**Files:**
- Create: `apps/web/src/app/api/provider-executions/stripe-test/route.ts`
- Create: `apps/web/src/app/api/provider-executions/stripe-test/route.test.ts`
- Modify: `packages/db/src/index.ts` only if Task 2 exports require it

**Interfaces:**
- Consumes `POST { workflowId: string; receiptId: string }`.
- Produces `{ executionId, paymentIntentId, providerStatus, idempotent }` only for a bound ALLOW receipt.
- Consumes `PostgresDecisionStore`, `PostgresWorkflowStore`, `PostgresStripeExecutionStore`, `PostgresEvidenceStore`, and `StripePaymentProvider`.

- [x] **Step 1: Write route tests before route code**

Mock database stores and the provider. Cover:

```ts
await expect(post({ workflowId: "wf-1", receiptId: "receipt-deny" })).resolves.toMatchObject({ status: 409 });
expect(provider.createIntent).not.toHaveBeenCalled();

await expect(post({ workflowId: "wf-1", receiptId: "receipt-allow" })).resolves.toMatchObject({ status: 201 });
expect(provider.createIntent).toHaveBeenCalledOnce();

await post({ workflowId: "wf-1", receiptId: "receipt-allow" });
expect(provider.createIntent).toHaveBeenCalledOnce();
```

Also cover missing/misconfigured provider (503), provider failure (502 with stable `PROVIDER_UNAVAILABLE` response), and receipt/workflow request-hash mismatch (409). Assert all failure tests append no successful provider lifecycle event.

- [x] **Step 2: Implement immutable execution binding**

Load the workflow, receipt, and held reservation by IDs server-side. Require `receipt.decision === "ALLOW"`, matching organization/workflow/request hash, and a valid reservation. Build the Stripe adapter input from those stored records only.

- [x] **Step 3: Append normalized provider evidence after creation**

On first successful intent creation, append:

```ts
{
  id: `stripe:intent:${paymentIntentId}`,
  kind: "ORDER",
  amountMinor: storedAmountMinor,
  currency: storedCurrency,
  source: "PROVIDER",
  occurredAt: now,
  parentId: `auth-${workflowId}`,
}
```

Use the persisted execution state to prevent a second append under retry. Do not call `confirm`, `capture`, or any refund endpoint.

- [x] **Step 4: Run route tests and existing regressions**

Run:

```text
pnpm --filter @reins/web vitest run src/app/api/provider-executions/stripe-test/route.test.ts src/app/api/agent-run/route.test.ts --configLoader native --pool=threads --maxWorkers=1
```

Expected: only ALLOW reaches the provider; retries result in exactly one provider call and one evidence event.

### Task 4: Verify Stripe webhooks and reconcile lifecycle evidence

**Files:**
- Create: `apps/web/src/app/api/webhooks/stripe/route.ts`
- Create: `apps/web/src/app/api/webhooks/stripe/route.test.ts`
- Modify: `packages/db/src/stripe-execution-store.ts`
- Modify: `packages/db/src/evidence-store.ts` only if an idempotent append helper is needed

**Interfaces:**
- Consumes raw Stripe request body plus `stripe-signature` header.
- Produces `200` for valid applied/duplicate/ignored events, `400` for invalid signatures, and `500` only for unexpected storage failures.
- Maps verified intent events to existing normalized `ReconciliationEvent` values.

- [x] **Step 1: Write signed-webhook tests first**

Use `stripe.webhooks.generateTestHeaderString` and fixed fixture bodies. Cover: invalid signature returns 400/no writes; duplicate event stores one receipt/evidence item; unknown event returns 200 with `IGNORED`; amount or currency mismatch stores `UNVERIFIED` and does not overwrite execution binding.

- [x] **Step 2: Implement raw-body verification and mapping**

Call `stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)` before `JSON.parse` or field access. Allow only these event types:

```ts
const mappedKinds = {
  "payment_intent.amount_capturable_updated": "AUTHORIZATION",
  "payment_intent.succeeded": "SETTLEMENT",
  "payment_intent.payment_failed": "REVERSAL",
  "payment_intent.canceled": "REVERSAL",
} as const;
```

For every mapped event, locate execution by PaymentIntent ID, validate provider metadata and stored amount/currency, record webhook receipt, then append normalized evidence only when disposition is `APPLIED` and binding is verified.

- [x] **Step 3: Re-run reconciliation through the existing evidence store**

Retrieve the investigation after each applied event and assert the existing `reconcileLifecycle` result reports either reconciled lifecycle data or explicit `EXCESS_SETTLEMENT`, `PARTIAL_SETTLEMENT`, `CURRENCY_MISMATCH`, or broken-lineage findings. Do not add Stripe-only reconciliation logic.

- [x] **Step 4: Run webhook and evidence tests**

Run:

```text
pnpm --filter @reins/web vitest run src/app/api/webhooks/stripe/route.test.ts --configLoader native --pool=threads --maxWorkers=1
pnpm --filter @reins/db vitest run test/evidence-store.integration.test.ts test/stripe-execution-store.integration.test.ts --pool=threads --maxWorkers=1
```

Expected: invalid/replayed/mismatched events cannot create a false settled evidence record.

### Task 5: Document safe local validation and complete the quality gate

**Files:**
- Modify: `README.md`, `.env.example`, `tasks/todo.md`
- Create: `docs/verification/2026-09-21-stripe-test-evidence.md`

**Interfaces:**
- Documents local-only commands and explicit `STRIPE_MODE=test` requirement.
- Records verification evidence without secret values, raw payloads, or test-card details.

- [x] **Step 1: Document local setup and operational boundary**

Add these exact outcomes to the README:

```text
1. Put a restricted `rk_test_` key with PaymentIntents read/write in local `.env`.
2. Set `STRIPE_MODE=test`.
3. Run the provider-execution route against a persisted ALLOW receipt.
4. Use Stripe CLI forwarding only after installing/configuring it separately; paste only `whsec_...` into local `.env`.
5. Never use the integration for live money, test-card confirmation, or customer data.
```

- [x] **Step 2: Add the opt-in Sandbox smoke test script**

Create a script that is skipped unless `RUN_STRIPE_SANDBOX_TEST=1`; it verifies mode/key prefix, creates one unconfirmed PaymentIntent with a unique test idempotency key, retrieves it, then emits only `intent created/retrieved` status and redacted ID suffix. It must never run in `pnpm test` or CI by default.

- [x] **Step 3: Run complete local verification**

Run:

```text
pnpm format
pnpm check
pnpm db:generate
pnpm db:migrate
pnpm db:verify
RUN_STRIPE_SANDBOX_TEST=1 pnpm --filter @reins/web stripe:sandbox:verify
```

Record exact pass/fail status and any provider constraints in `docs/verification/2026-09-21-stripe-test-evidence.md`. Never record a key, secret, full PaymentIntent ID, request body, or raw webhook event.

- [x] **Step 4: Review the final change set**

Run `git status --short` and inspect only Stripe-related files. Confirm `.env` remains ignored, no `sk_`, `rk_`, `whsec_`, PAN, or raw event fixture appears outside `.env`/`.env.example` comments, and all tests were actually run before declaring completion.
