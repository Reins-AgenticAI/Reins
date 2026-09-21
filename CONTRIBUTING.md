# Contributing to Reins

Sai Prathap Reddy Cheluri and Lekhashree Srinath Reddy are joint product owners. GitHub issues, commits, pull requests, reviews, and milestone approvals provide the contribution record. A separate contribution split is unnecessary unless an external institution requires one.

## Change workflow

1. Create or select an issue with acceptance criteria.
2. Create a branch named `codex/<issue>-<short-description>` or `feature/<issue>-<short-description>`.
3. Make the smallest change that satisfies the issue.
4. Run `pnpm check` and any database verification required by the change.
5. Open a pull request that links the issue and reports verification results.
6. Obtain review from the other contributor before merging.

Both owners must approve changes to policy evaluation, authorization, reservations, cryptography, evidence integrity, database migrations, authentication, or deployment configuration.

## Commit guidance

- Keep commits focused and reversible.
- Explain why a change is needed, not only what changed.
- Do not commit generated build output, environment files, secrets, or real financial data.
- Commit Drizzle migration SQL with the schema change that generated it.

## Pull request checklist

- The acceptance criteria are satisfied.
- Tests cover the changed behavior through its public interface.
- `pnpm check` passes.
- Database migrations are generated and verified when applicable.
- Security, privacy, and evidence claims remain accurate.
- User-facing changes follow the navy visual system and accessibility requirements.

