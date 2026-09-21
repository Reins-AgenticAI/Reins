# M5 Verification: Reproducible Synthetic Release

Date: 20 September 2026

## End-to-end coverage

The completed M1 through M4 suites cover concurrent shared-budget overspend prevention, idempotent duplicate delivery, advisory-agent timeout handling, expired reservations, deterministic decision replay, human escalation, lifecycle mismatch detection, and persisted Control Room rendering.

The live local browser journey at `http://localhost:3000/assurance` loaded the persisted M3 workflow. It displayed four stored agent traces, an ESCALATE receipt, the policy and reservation bindings, and the `APPROVAL_REQUIRED` reason. The Evidence view correctly reported `MISSING_AUTHORIZATION` for that particular workflow because it has no synthetic settlement events.

## Recovery exercise

The guarded local `reins_test` exercise passed on 20 September 2026:

```text
pnpm db:reset:test
pnpm db:migrate:test
pnpm db:backup:test m5-recovery.dump
pnpm db:restore:test m5-recovery.dump
pnpm test:integration:db
```

The reset refused anything except the isolated local test target. Backup and restore completed, followed by 9 PostgreSQL test files and 18 tests passing.

## Quality gate

`pnpm check` passed after M4. It ran formatting, schema checks, TypeScript, coverage-gated tests, and production builds. The current suite includes 27 assurance tests, 24 web tests, 21 API tests, and 18 PostgreSQL integration tests. The formatter continues to report 96 pre-existing CSS warnings but no errors.

Existing measured local evaluation data is in `docs/verification/2026-09-20-latency-evaluation.md`. It reports a synthetic deterministic-domain p99 of 0.0898 ms and a local development API p99 of 36.0862 ms. These are observed local measurements, not production capacity or payment-network claims.

## Local AI-agent evaluation

The local Ollama runtime was invoked directly with `qwen3:4b` and returned the requested readiness marker. A subsequent synthetic finance `POST /api/agent-run` (`POST-OLLAMA-1`) completed with a deterministic `ALLOW`, four stored advisory-agent traces, and a measured application duration of 91,875 ms. No money, credentials, merchant, or external provider was involved.

Separately, `pnpm eval:agents` sent three concurrent synthetic finance workflows to the same local route. All three returned `503 Local model unavailable`; no agent trace was accepted. Observed end-to-end durations were 60,492 ms, 91,787 ms, and 116,964 ms, with a total run duration of 117,002 ms.

This is an observed capacity boundary, not a benchmark claim. The local model can complete one workflow, but the present local configuration cannot sustain three simultaneous four-agent workflows inside the configured deadline. It fails closed: it did not invent agent context or turn model unavailability into an approval. A production design would require a bounded queue, per-model concurrency limit, and an independently measured throughput target before making capacity claims.

## Final local hardening

The local route now has one active-workflow slot and one waiting slot. A third simultaneous workflow is rejected with `429 Local agent queue is full`; it is not allowed to grow an unbounded inference backlog. Focused tests prove serialization and saturation, while route tests cover malformed input, model outage, malformed model output, and deterministic escalation.

The browser journey at `http://localhost:3000/assurance` was rechecked after the redesign. The persisted request is visible with its deterministic receipt, four trace records, evidence timeline, agent registry, and shared-budget context. The `New synthetic request` dialog opens and presents three finance scenarios: market-data renewal, developer tooling expansion, and unapproved cloud capacity. It explicitly discloses that Ollama is advisory and the data is synthetic.

## Limitations

This is a local synthetic portfolio release. It does not process money, hold payment credentials, certify a provider, or establish a production availability or latency SLO. A second-contributor reproduction remains a collaboration task outside this local verification.
