# Codex instructions for Reins

## Scope

Implement only the approved issue and milestone. The current source of product scope is `docs/Reins_PRD_Revision_1.md`.

## Required commands

Run from the repository root:

```text
pnpm format
pnpm check
```

For database changes also run:

```text
pnpm db:generate
pnpm db:migrate
pnpm db:verify
```

## Architecture

- Keep policy and authorization behavior behind small, typed interfaces.
- Add an adapter seam only when behavior actually varies.
- Keep Next.js pages server rendered unless interactivity requires a client component.
- Keep Fastify construction separate from process startup so tests use `inject`.
- Keep database initialization lazy so builds and unit tests do not require PostgreSQL.
- Do not add Turborepo until measurements justify it.

## Security

- Use synthetic data only.
- Never store PAN, CVV, bank credentials, wallet private keys, or production tokens.
- Never make payment approval depend on a language model.
- Never turn a timeout, missing policy, unsupported control, or provider error into ALLOW.
- Do not log secrets or full authorization payloads.

## Quality

- Test behavior through the module interface.
- Validate environment input at startup or first use.
- Use integer minor units for money when financial types are introduced.
- Preserve idempotency and deterministic replay requirements.
- Keep user-facing design within the documented navy palette and WCAG 2.2 AA contrast.

## Collaboration

- Use one issue and branch per change.
- Do not merge critical changes without review from the other product owner.
- Preserve unrelated changes in the working tree.

