# Parallel Agent Control Plane: Milestone 1 Verification

Date: 20 September 2026

## Verified outcome

The atomic budget-reservation core is implemented for synthetic local use. PostgreSQL is the authoritative shared-budget ledger. Concurrent holds use one conditional update, successful requests create a reservation in the same transaction, and lifecycle transitions are restricted to held reservations.

This milestone does not implement the parallel advisory-agent orchestrator, final policy decision service, provider execution, reconciliation workflow, or live Control Room binding. Those remain Milestones 2 through 5.

## Acceptance evidence

| Acceptance condition | Evidence | Result |
| --- | --- | --- |
| Prevent concurrent overspend | Two parallel 2,000,000-minor-unit requests against 2,500,000 available produce one `HELD` and one `INSUFFICIENT_BUDGET`; 500,000 remains. | Passed against PostgreSQL |
| Retry safely | An identical organization-scoped idempotency key returns the original reservation without a second debit. | Passed against PostgreSQL |
| Reject mutated retry | Reusing the key with a changed request hash or amount raises `Idempotency key reused with different request`; available funds remain unchanged. | Passed against PostgreSQL |
| Enforce tenant integrity | PostgreSQL rejects a reservation whose organization differs from the referenced budget organization. | Passed against PostgreSQL |
| Preserve reservation lifecycle | `RELEASED` and `EXPIRED` restore funds; `COMMITTED` remains consumed; non-held transitions fail. | Passed in domain and PostgreSQL tests |
| Fail closed | Non-positive or unsafe money values, missing identifiers, missing budgets, and invalid transitions do not create a hold. | Passed in domain tests |
| Preserve integer money | Budget limits, available amounts, and reservations use integer minor units. | Verified by types, schema, and tests |

## Commands run

- `pnpm format`: exit 0. Biome reported 95 existing CSS warnings and no errors.
- `pnpm check`: exit 0 when run with permission for Next.js worker processes. Lint, schema check, all TypeScript checks, coverage thresholds, API build, and Next.js production build passed.
- `pnpm --filter @reins/assurance test:unit`: 6 files and 17 tests passed.
- `dotenv -e .env.test -- pnpm --filter @reins/db test:integration`: 6 files and 15 tests passed, including the three PostgreSQL reservation scenarios.
- `pnpm db:generate`: schema matched the generated migration; no additional migration was required.
- `pnpm db:migrate`: migrations applied successfully to the configured local development database.
- `pnpm db:migrate:test`: the isolated test target was validated and migrations applied successfully.
- `pnpm db:verify`: PostgreSQL connection verified.

## Implementation artifacts

- Domain contract and reference store: `packages/assurance/src/budget-reservations.ts`
- Domain tests: `packages/assurance/src/budget-reservations.test.ts`
- PostgreSQL adapter: `packages/db/src/budget-reservations.ts`
- PostgreSQL tests: `packages/db/test/budget-reservations.integration.test.ts`
- Schema: `packages/db/src/schema/assurance.ts`
- Generated migration: `packages/db/drizzle/0002_married_maddog.sql`
- Tenant-integrity migration: `packages/db/drizzle/0003_loose_captain_stacy.sql`

## Known limitations

- The test proves correctness for the synthetic scenarios and local PostgreSQL configuration; it is not a production throughput or availability certification.
- The integration adapter is excluded from the database unit-coverage calculation because it requires PostgreSQL. Its behavior is covered by the real database suite instead.
- The repository has no initial Git commit, so a conventional tracked diff and merge-base review are unavailable.
- Second-contributor reproduction is still pending.
