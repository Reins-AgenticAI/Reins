# M5 local release runbook

This runbook is intentionally local and synthetic. It never uses production payment data or credentials.

```text
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm db:migrate:test
pnpm db:reset:test
pnpm db:backup:test m5-reins-test.dump
pnpm db:restore:test m5-reins-test.dump
pnpm check:release
pnpm dev
```

Open `/assurance`, create an account with a synthetic email, sign in, create an assessment through the local workflow, inspect the coverage and lifecycle evidence, and retrieve the saved evidence bundle through the authenticated API. The reset command is guarded to `127.0.0.1:5432/reins_test`; it refuses every other target.

The backup and restore commands use local PostgreSQL utilities and are guarded to `127.0.0.1:5432/reins_test`; they never accept a production target.

Local verification on 2026-09-19 passed the guarded reset, backup, restore, isolated migration, database integration suite (2 tests), web integration suite (3 tests), and `pnpm check:release` (format, lint, typecheck, coverage, builds, and database integration). This is a primary-environment reproduction; a human second-contributor run is still an external collaboration step. The application remains a synthetic assurance demonstration, not a payment processor or provider certification system.
