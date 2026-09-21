# M4 Verification: Reconciliation Evidence and Control Room

Date: 20 September 2026

## Outcome

M4 adds immutable synthetic lifecycle events and a read model that joins workflow traces, the most recent deterministic decision receipt, scoped approval data, lifecycle events, and reconciliation findings.

The reconciliation engine identifies duplicate delivery, child events that predate a parent, partial settlement, settlement exceeding authorization, currency mismatch, missing authorization, and broken lineage. Valid reversals and refunds with correct lineage preserve a reconciled lifecycle result.

The Control Room no longer contains static request rows or a static agent roster. It requests the latest persisted synthetic investigation from a local Next.js route and renders Requests, Agents, and Evidence from that payload. Empty and unavailable states fail closed and do not infer a decision.

## Verification evidence

| Check | Result |
| --- | --- |
| Reconciliation domain tests | 4 test families passed; duplicate, late, partial, excess, reversal, refund, currency, and lineage paths covered |
| Lifecycle database integration | Passed; chronological read model, excess settlement finding, and duplicate database protection verified |
| Control Room API route tests | 2 passed; persisted payload and unavailable fail-closed response covered |
| Full repository quality gate | Passed: format, schema check, type checks, coverage, 27 assurance tests, 24 web tests, 21 API tests, and production builds |
| Isolated PostgreSQL suite | 9 files and 18 tests passed after migration `0007_tearful_falcon.sql` |
| Browser journey | Passed against persisted M3 synthetic workflow at `http://localhost:3000/assurance` |

## Browser observations

The persisted workflow shown in the Control Room had four completed advisory traces, an `ESCALATE` receipt, the stored policy and reservation identifiers, and the `APPROVAL_REQUIRED` reason. The Agents tab showed the four persisted traces and measured durations. The Evidence tab correctly surfaced `MISSING_AUTHORIZATION` because this existing workflow has no synthetic lifecycle events yet.

The integration suite independently persisted an authorization and a larger settlement, then returned `EXCESS_SETTLEMENT` from the same read model.

## Boundary

All data remains synthetic and local. Lifecycle events are a synthetic-provider seam, not a card-network or merchant integration. M5 is responsible for repeatable workload evaluation, recovery exercises, and the reproducible demo runbook.
