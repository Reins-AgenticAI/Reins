# Milestone 2 Verification: Durable Parallel Advisory Agents

Date: 20 September 2026

## Verified outcome

Milestone 2 adds one durable synthetic workflow for four advisory roles: Intake, Vendor Context, Budget Analysis, and Evidence. The orchestrator dispatches all four roles concurrently, bounds every call with a deadline, normalizes results into a fixed order, and stores the workflow and immutable trace events in PostgreSQL.

The agents provide context only. Their interface has no budget mutation capability and their output schema has no authorization decision. Any extra model `decision` field is discarded. Malformed output, timeout, provider failure, and cancellation are recorded as non-success traces and never become ALLOW.

## Acceptance evidence

| Acceptance area | Result | Evidence |
| --- | --- | --- |
| Parallel orchestration | Passed | Tests prove all four agents start before any is released and results are aggregated in canonical role order. |
| Failure isolation | Passed | Timeout, malformed output, provider error, pre-dispatch cancellation, and in-flight cancellation produce explicit trace states. |
| Idempotency | Passed | Identical canonical requests replay without invoking agents again. Reusing a key with a changed request raises a conflict. |
| Durable storage | Passed | PostgreSQL integration tests cover begin, duplicate replay, mutation conflict, concurrent completion replay, ordered event persistence, and database constraints. |
| API contract | Passed | `POST /workflows` validates its complete body, returns workflow identity and traces, returns 409 for mutation conflicts, and fails closed with 503 when orchestration is unavailable or fails. |
| Local AI boundary | Passed | Four qwen3:4b Ollama roles returned advisory summaries with reasoning disabled and bounded output. No payment credentials, production provider, or paid service was used. |

## Live local-model run

The final synthetic fintech request renewed a market-data platform through the real local Fastify, Ollama, and PostgreSQL path.

| Role | Status | Observed duration |
| --- | --- | ---: |
| Intake | SUCCEEDED | 3,170 ms |
| Vendor Context | SUCCEEDED | 5,885 ms |
| Budget Analysis | SUCCEEDED | 1,786 ms |
| Evidence | SUCCEEDED | 4,514 ms |

Workflow ID: `b7e3d5e3-4038-461f-b7eb-a8c45e294c8c`

Overall API response time was approximately 6.0 seconds. This is a single local demonstration, not a production latency benchmark.

Two earlier capacity probes are retained as evidence of the failure path. With unbounded local-model reasoning, the first run timed out all four roles at 30 seconds. A second 120-second run completed two roles and timed out two because the local Ollama runtime queued work on shared hardware. Disabling model reasoning and bounding generated tokens produced the final successful run without weakening the timeout behavior.

## Automated verification

- Assurance coverage: 22 tests passed; 96.33 percent statements, 91.08 percent branches, 97.29 percent functions, and 97.74 percent lines.
- API coverage: 18 tests passed; 96.66 percent statements, 93.22 percent branches, 100 percent functions, and 98.21 percent lines.
- Database integration: 16 tests across 7 files passed against the isolated PostgreSQL test database.
- Repository coverage: all package thresholds passed, including 22 existing web tests.
- Drizzle generation reported 15 tables and no ungenerated schema changes.
- Development and isolated-test migrations applied successfully.
- PostgreSQL connection verification passed.
- Concurrent calls that complete the same workflow serialize at the database transaction boundary and return the same persisted result.

## Scope boundary

This milestone does not authorize spending, reserve a budget, contact a payment provider, or expose the workflow in the Control Room. The durable advisory trace is the input to Milestone 3, where a deterministic evaluator will own ALLOW, ESCALATE, and DENY. Milestone 4 will connect persisted workflow and evidence records to the professional Control Room UI.

The demonstrated timing reflects one contributor machine and one local model. It does not establish production throughput, horizontal scaling, customer demand, regulatory compliance, or live-payment readiness.
