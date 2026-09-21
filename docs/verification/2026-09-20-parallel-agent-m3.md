# M3 Verification: Deterministic Decision and Human Escalation

Date: 20 September 2026

## Outcome

M3 adds a deterministic decision boundary for the synthetic Reins workflow. A receipt binds the canonical request hash, frozen policy version and digest, evaluator version, budget reservation, optional human approval, reason codes, and outcome. The decision function has no language-model dependency.

The allowed outcomes are `ALLOW`, `ESCALATE`, and `DENY`. Hard violations deny. Missing context, stale policy, invalidated approval, or a required approval escalate. A matching, approved, unexpired approval permits an otherwise eligible request.

Human approvals are persisted with a pending, approved, rejected, or expired state. Their identity, expiration, request hash, organization, and workflow scope are checked before use. Receipts and approvals have PostgreSQL foreign keys and lifecycle constraints.

## Test evidence

| Check | Result |
| --- | --- |
| Domain decision and approval tests | 5 passed; 27 assurance-package tests passed |
| API decision and approval tests | 21 passed; API coverage thresholds passed |
| PostgreSQL integration tests | 8 files and 17 tests passed |
| Database generation | No schema changes after migration `0006_brief_metal_master.sql` |
| Development and isolated test migrations | Passed |
| PostgreSQL connection verification | Passed |
| Formatting | Passed with 96 pre-existing CSS warnings |

## Live local synthetic journey

The Fastify service ran against local PostgreSQL and the existing local Ollama advisory-agent setup. A synthetic institutional market-data request started a workflow in which all four advisory roles completed: Intake, Vendor Context, Budget Analysis, and Evidence.

The initial frozen decision returned `ESCALATE` with `APPROVAL_REQUIRED`. A human approval was created and resolved with the synthetic approver identity `user-finance-1`. The same request, policy, reservation, and approved approval then returned `ALLOW`.

Observed local request durations were 8.8 ms for the escalation decision, 5.2 ms to create the approval, 3.9 ms to resolve it, and 4.9 ms for the post-approval decision. These are single-machine synthetic observations, not a performance claim or production benchmark.

## Boundary and next milestone

This milestone does not connect to payment networks, merchants, credentials, or real money. The API accepts frozen synthetic policy and reservation snapshots; a production authorization service would retrieve and authorize these server-side. M4 remains responsible for reconciliation evidence and binding the Control Room to stored workflow records.
