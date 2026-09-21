# M1 foundation architecture

## Decision

Reins begins as a pnpm workspace with three modules: the Next.js web application, the Fastify HTTP application, and the PostgreSQL data module. The repository does not use Turborepo in M1 because pnpm already provides the required workspace orchestration and the project has no measured caching bottleneck.

## Module interfaces

The web module owns pages, the navy visual system, and the Better Auth route. Authentication is initialized lazily so static builds and unit tests do not require a database connection.

The API module exposes `buildApi`. Process startup is a separate implementation detail. Tests exercise the same Fastify interface through `inject` that production routes use over HTTP.

The database module exposes lazy database access, a connectivity check, and explicit shutdown. It hides the PostgreSQL pool and Drizzle setup. The Drizzle schema and migrations remain versioned source artifacts.

## Dependency direction

```text
web -> database
api -> Fastify only in M1
database -> PostgreSQL and Drizzle
```

The API will depend on domain modules only when M2 introduces deterministic policy behavior. Provider adapter seams are deferred until two implementations or a concrete external contract require them.

## Local runtime

Podman Compose runs PostgreSQL only. The development service binds to loopback port 5432. A separate test-profile service binds to loopback port 5433 with the `reins_test` database and synthetic credentials. Web and API processes run directly under Node.js for fast iteration. This keeps the local path free while avoiding container rebuilds for every source edit.

## Verification

Biome checks formatting and lint rules. TypeScript runs in strict mode. Vitest separates fast unit tests from integration tests and enforces a 90 percent minimum for statements, branches, functions, and lines across executable M1 logic.

Unit tests cover environment validation, deterministic API behavior, rendered server components, lazy authentication startup, and the database lifecycle through mocked PostgreSQL and Drizzle boundaries. Integration tests exercise Fastify over a real local HTTP socket, Better Auth through its Next.js route handler, and PostgreSQL connectivity and deletion cascades from the committed migration.

The process-only API entry point, declarative Drizzle schema, migration runner, and browser-only Better Auth proxy are excluded from unit coverage. They are covered by build validation, migration-integrity checks, PostgreSQL integration, or future browser authentication flows instead of implementation-coupled tests.

`pnpm check` is explicitly a database-free developer gate. `pnpm check:release` additionally validates the isolated local test target, applies committed migrations, and executes the PostgreSQL integration suite. CI runs the release gate. The integration suite fails when `DATABASE_URL` is missing, remote, targets anything other than `reins_test`, or carries query/fragment overrides; it never silently skips. Keeping that suite separate preserves lazy initialization without confusing absent integration evidence with successful verification.

The first hardening issue is documented in `docs/superpowers/plans/2026-09-18-m1-foundation.md`. Five acceptance scenario families in `docs/Reins_Milestone_Plan.md` organize milestone evidence. Existing regression tests remain and parameterized case counts are reported separately.
