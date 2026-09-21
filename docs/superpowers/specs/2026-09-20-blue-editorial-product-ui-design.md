# Reins Control Room UI Design

## Goal

Make the local Reins sandbox feel like a credible spend-governance product: a request-first control room lets a user inspect agent activity, policy results, receipts, evidence, and shared budgets in one synthetic workspace.

## Visual lock

The user-selected Control Room mock is the sandbox layout authority.

- Use an off-white canvas, charcoal typography, warm gray borders, pale sage-gray panels, and deep forest-teal only for active controls and positive operational states.
- The workspace has a slim left navigation, compact top bar, request-first main canvas, right agent roster, and right shared-budget card.
- The primary canvas contains a spend-request table above aligned deterministic-policy, policy-receipt, and evidence-timeline panels.
- Avoid blue, navy, purple, gradients, glass effects, stock imagery, literal mountains, decorative AI effects, and oversized empty hero space.

## Sandbox behavior

- `/assurance` is a functional product workspace using the selected Control Room visual language.
- Preserve existing deterministic synthetic execution, policy coverage analysis, scenario replay, policy drafting, simulation, task control room, and evidence graph behavior.
- Recompose existing features so the initial visible workspace is a clear request-and-evidence control room instead of stacked unrelated panels.
- The primary top view includes spend requests, policy results, a deterministic policy gate, a policy receipt, and an evidence timeline. Existing interactive tools appear as labeled workspace sections beneath it.
- All records remain synthetic. Do not change decision logic, API contracts, or data-handling boundaries.

## Acceptance criteria

1. `/assurance` visually matches the selected Control Room mock at desktop width and cleanly reflows at 390px.
2. Existing interactive synthetic-agent behavior remains available and functional.
3. Existing route tests and new workspace composition tests pass.
4. Browser checks confirm keyboard-visible focus targets, task execution, simulation, and no horizontal overflow at 390px.
5. `pnpm format`, relevant Vitest tests, type-check, and production build complete successfully.
