# Multi-Agent Control Room and Reports Design

## Purpose

Replace the single-request Sandbox experience with a credible synthetic multi-agent finance-control workspace. Preserve the existing Reins visual language: warm off-white surface, deep ink typography, muted forest-teal controls, thin neutral borders, and accessible contrast.

## Scope

The application will present a Control Room where a user can run a selected synthetic scenario in either parallel or sequential mode, inspect each request, add advisory agents, and see shared-budget safety and evidence outcomes. Payment authority remains deterministic; agents may request or advise but never override policy or atomic reservations.

The default scenario is `Quarter-close spend controls` with four concurrent requests:

| Requesting agent | Purpose | Expected result |
| --- | --- | --- |
| Engineering | Developer-seat expansion | ALLOW |
| Research | Market-data renewal | ALLOW |
| Platform | Cloud-capacity commitment | DENY |
| Compliance | AML data-provider exception | ESCALATE |

The UI must distinguish requesting agents from advisory agents. The initial advisory roles are policy, risk, budget, and evidence. New agents may be added as advisory roles only and must not gain decision authority.

## Control Room

- Show a scenario selector, Parallel and Sequential controls, and a Run scenario action.
- Show a live request queue with unique request ID, requesting agent, purpose, amount, and decision.
- Show atomic shared-budget state: committed, held, available, and rejected amount.
- Show a unified chronological evidence timeline and a path to each receipt.
- Show an agent roster with role, state, and an Add advisory agent action.
- Do not expose fault injection as a business-user workflow. It belongs to automated engineering tests.
- Keep Stripe test-intent creation opt-in after an ALLOW result; public/demo deployments retain it disabled.

## Reports

Reports are graph-first, with evidence records as a drill-down layer.

- A functional reporting-month selector controls the displayed reporting period.
- Controlled spend uses a two-column monthly comparison with visible dollar axes and direct amount labels.
- Average weekly spend uses a five-column histogram, visible dollar axis, amount above each column, and date range below: Oct 1-4, Oct 5-11, Oct 12-18, Oct 19-25, Oct 26-31.
- Weekly controlled spend uses a labeled histogram with a weekly-plan reference line, direct amount labels, and a monthly plan variance.
- Budget remaining uses a labeled two-segment stacked bar: committed and remaining.
- Auto-approval uses a centered decision-mix ring with direct legend counts.
- Review backlog uses a labeled SLA workload bar: within SLA, due today, overdue.
- The evidence table remains below visual summaries and supports investigation drill-down.

Charts use restrained deep teal, sage, slate, moss, and clay accents; semantic decision colors are reserved for decisions and exceptions. All charts need textual equivalents and must not convey meaning through color alone.

## Data and safety

- Synthetic data only.
- Every scenario run receives unique idempotency keys and request IDs.
- Parallel runs must use the existing atomic reservation interface. If reservations conflict, the request must receive a deterministic non-ALLOW outcome.
- Agent workflow failures, malformed advisory output, missing policy, timeout, and provider errors fail closed.
- Charts show persisted data where available. Seeded fixtures may be used only when labelled synthetic.

## Verification

- Unit tests cover scenario catalogue validation, parallel/sequential orchestration selection, and report-data transformations.
- Integration tests cover parallel shared-budget contention, idempotent replay, agent failure isolation, and evidence ordering.
- Browser journeys cover selecting a month, running each mode, adding an advisory agent, opening a receipt, and observing budget/queue/report updates.
- Accessibility checks cover keyboard use, form labels, chart text alternatives, responsive layout, and WCAG 2.2 AA contrast.
- `pnpm format`, `pnpm check`, and `pnpm check:release` must pass before release readiness is claimed. The existing evidence-store integration failure is a release blocker to resolve before that claim.

## Non-goals

- Live money movement, payment credentials, and live external provider authorization.
- A language model approving payments.
- Fault injection as a customer-facing control.
- Decorative 3D reporting charts.
