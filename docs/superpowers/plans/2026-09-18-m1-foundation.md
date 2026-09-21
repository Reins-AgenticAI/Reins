# REINS-001 Foundation Hardening Implementation Plan

For agentic workers: use the executing-plans workflow inline, with a scoped independent review. The repository has no initial commit, so commit-based worktree/review packaging cannot be used safely without first sweeping up existing user-owned files. Preserve those files and work on the local feature branch instead.

Goal: remove misleading readiness claims and make database release verification mandatory and safe.

Architecture: retain the existing web/API/database modules and lazy database initialization. Separate database-free developer validation from an explicit release gate that requires an isolated local PostgreSQL test database.

Tech stack: existing pnpm, TypeScript, Next.js 16.3.5, React, Fastify, Vitest, PostgreSQL/Drizzle. No new production dependency.

Spec: `docs/Reins_Milestone_Plan.md`, M1, and `docs/Reins_PRD_Revision_1.md`.

## Global constraints

- Use synthetic data only.
- Never make payment approval depend on a language model.
- Keep database initialization lazy so builds and unit tests do not require PostgreSQL.
- Preserve unrelated changes in the working tree.
- Keep user-facing design within the documented navy palette and WCAG 2.2 AA contrast.
- Add at most five new top-level tests for this milestone. Retain existing regression tests and report parameterized cases honestly.

## Task 1: Safe database test gate

Files: create `packages/db/test/database-target.ts`, `packages/db/test/database-target.test.ts`, and `packages/db/test/verify-target.ts`; modify `packages/db/test/database.integration.test.ts`, `packages/db/package.json`, root `package.json`, `compose.yaml`, `.gitignore`, `.github/workflows/ci.yml`, `README.md`; create `.env.test.example`.

Interface: `requireLocalTestDatabaseUrl(value: string | undefined): string`. Returns the supplied URL only when its protocol is postgres/postgresql, hostname is localhost/127.0.0.1/[::1], database path is exactly `/reins_test`, and query/fragment are absent. All rejected values throw a fixed message without echoing credentials. Test-target guarding is test infrastructure, not a production database restriction.

- [x] Add two tests first: accepted loopback fixtures return unchanged; rejected missing/malformed/remote/non-test/query-overridden fixtures throw the fixed safe error. Expected URLs and rejected values are literals, independent from the implementation.

```ts
expect(requireLocalTestDatabaseUrl('postgresql://reins:local@127.0.0.1:5433/reins_test'))
  .toBe('postgresql://reins:local@127.0.0.1:5433/reins_test');
expect(() => requireLocalTestDatabaseUrl(undefined)).toThrow(/local reins_test database/);
expect(() => requireLocalTestDatabaseUrl('postgresql://reins:secret@remote.invalid/reins_test'))
  .toThrow(/local reins_test database/);
```

- [x] Run `pnpm --filter @reins/db test:unit` and observe the missing interface failure before implementation.
- [x] Implement the small URL validator and rerun the same command.
- [x] Replace the integration suite's conditional skip with `requireLocalTestDatabaseUrl(process.env.DATABASE_URL)` before connecting. Run the explicit integration command with no database URL and verify nonzero exit without skipping or credential disclosure.
- [x] Exclude only real-database integration from the database package's database-free coverage command; leave it explicit in `test:integration`. Add `db:migrate:test` target validation before migration; root commands load `.env.test`. Add `check:release` to require general checks, test migrations, and real database integration.
- [x] Keep development PostgreSQL on loopback. Add a profiled isolated test PostgreSQL service on loopback port 5433, database `reins_test`, with synthetic credentials. Add an ignored `.env.test` and a tracked `.env.test.example`. CI uses the same test database name and the release gate.
- [ ] Verify real PostgreSQL only if available; do not replace it with SQLite/PGlite or report a skipped test as passing. Document exact setup and safety constraints.

## Task 2: Truthful navy foundation experience

Files: `apps/web/src/app/page.tsx`, `apps/web/src/app/page.test.tsx`, `apps/web/src/app/globals.css` only. Preserve layout/auth interfaces.

Interface: existing default `HomePage()` remains a server-rendered page. Working links target implemented on-page sections. No simulated values appear as live balances or completed release status.

- [x] Replace the existing page test with three focused checks, failing before the implementation: synthetic-only/no readiness certification; navigation target integrity; planned workflow and accessible disclosure coverage. Existing unrelated tests remain untouched.

```tsx
const markup = renderToStaticMarkup(<HomePage />);
expect(markup).toContain('Synthetic data only');
expect(markup).not.toContain('Foundation baseline verified');
expect(markup).toContain('href="#setup"');
expect(markup).toContain('id="setup"');
```

- [x] Build the responsive navy workspace introduction with setup, milestone sequence, and explicit planned capabilities. Use semantic landmarks, a skip link, visible focus, reduced-motion and high-contrast behavior. No fake working controls, external font dependency, new UI library, or client rendering is needed.
- [x] Run web unit tests; main agent verifies full checks, local desktop/mobile rendering, keyboard navigation, and real HTTP response. Record unavailable browser evidence explicitly.

## Task 3: Verify and review

- [x] Run `pnpm format` and `pnpm check`. Diagnose `spawn EPERM` by checking the same build outside the restricted process boundary; do not disable TypeScript or tests to force a pass.
- [ ] Run migration generation, test-target migration and real PostgreSQL verification if the runtime is available. An unavailable runtime leaves M1's database acceptance pending.
- [x] Review changed files and obtain scoped independent spec/quality review. Address actionable findings and rerun affected checks.
- [x] Update `tasks/todo.md` with actual evidence for all five M1 acceptance checks and remaining milestones. No push, merge, publication, or wholesale initial commit.

Verification record: `docs/verification/2026-09-18-m1.md`. Migration generation passed with no schema changes. Actual migration and PostgreSQL integration remain pending at the user's request; this milestone is not fully complete.
