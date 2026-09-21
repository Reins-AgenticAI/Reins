# Reins Control Room UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fragmented sandbox visual presentation with the approved request-first Reins Control Room while preserving all current synthetic-agent behavior.

**Architecture:** Keep product logic and client interactions where they are. Recompose the server-rendered sandbox page around a dedicated scoped CSS module, while existing client tools remain isolated components. Use semantic HTML request, rule, receipt, evidence, agent, and budget views rather than a decorative graphic.

**Tech Stack:** Next.js App Router, React 19, TypeScript, CSS Modules, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-20-blue-editorial-product-ui-design.md`

## Global Constraints

- Use synthetic data only; do not store payment credentials or make external payment calls.
- Keep all approval behavior deterministic; a language model never grants spending authority.
- Preserve the current `/api` contracts and existing synthetic task, policy, simulation, and evidence behaviors.
- Keep the desktop and mobile UI keyboard accessible, visible-focusable, and WCAG 2.2 AA oriented.
- Use the approved off-white, charcoal, warm-gray, pale-sage, and deep forest-teal visual system; do not use blue, navy, purple, gradients, glass effects, or stock imagery.

---

### Task 1: Lock Control Room behavior

**Files:**
- Modify: `apps/web/src/app/assurance/page.test.tsx`
- Modify: `apps/web/src/app/assurance/page.tsx`

**Interfaces:**
- Produces a server-rendered `AssurancePage` with a request-first Control Room and existing synthetic behavior.

- [ ] **Step 1: Write the failing page contract tests**

```tsx
expect(markup).toContain("Agentic spend, governed by design.");
expect(markup).toContain("Agent spend requests");
expect(markup).toContain("Deterministic policy gate");
expect(markup).toContain("Policy receipt");
expect(markup).toContain("Evidence timeline");
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node_modules/.bin/vitest.cmd run apps/web/src/app/page.test.tsx --configLoader native --pool=threads --maxWorkers=1`

Expected: FAIL because the current stacked assurance workspace does not include the approved Control Room labels.

- [ ] **Step 3: Rebuild the server-rendered landing markup**

```tsx
<main className={styles.workspace}>
  <WorkspaceHeader />
  <section className={styles.requestWorkbench}>...</section>
  <section className={styles.toolShelf}>...</section>
</main>
```

Include typed local presentation data for the static request table, roster, budget, deterministic rule list, receipt, and evidence timeline.

- [ ] **Step 4: Run the landing tests to verify they pass**

Run: `node_modules/.bin/vitest.cmd run apps/web/src/app/page.test.tsx --configLoader native --pool=threads --maxWorkers=1`

Expected: PASS.

### Task 2: Style the Control Room to the selected visual lock

**Files:**
- Create: `apps/web/src/app/assurance/page.module.css`

**Interfaces:**
- Consumes the semantic class names from `AssurancePage`.
- Produces responsive desktop and mobile layout without modifying existing global styles used by interactive components.

- [ ] **Step 1: Add testable responsive markup hooks before styling**

```tsx
<section className={styles.requestWorkbench} aria-label="Agent spend requests">
  <div className={styles.requestTable} />
  <aside className={styles.agentColumn} />
</div>
```

- [ ] **Step 2: Implement CSS tokens and desktop composition**

```css
.workspace { --teal: #164f45; --ink: #17221f; --line: #dfe3dc; background: #fbfaf7; }
.requestWorkbench { display: grid; grid-template-columns: minmax(0, 1fr) 300px; }
.requestTable { border: 1px solid var(--line); box-shadow: 0 12px 32px rgb(23 34 31 / 6%); }
```

Implement the slim navigation, compact top bar, request table, agent roster, shared budget, semantic decision badges, deterministic gate, receipt, and timeline.

- [ ] **Step 3: Implement mobile reflow and reduced-motion behavior**

```css
@media (max-width: 900px) { .requestWorkbench { grid-template-columns: 1fr; } .requestTable { overflow-x: auto; } }
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto; } }
```

- [ ] **Step 4: Run formatter and landing tests**

Run: `pnpm format` then `node_modules/.bin/vitest.cmd run apps/web/src/app/assurance/page.test.tsx --configLoader native --pool=threads --maxWorkers=1`

Expected: formatter completes without errors; tests pass.

### Task 3: Preserve and expose existing interactive synthetic tools

**Files:**
- Modify: `apps/web/src/app/assurance/page.tsx`
- Modify: `apps/web/src/app/assurance/page.test.tsx`

**Interfaces:**
- Consumes `CommandCenter`, `TaskControlRoom`, `PolicyDraftPanel`, `SimulationStudio`, and `EvidenceGraph` without changing their exported component names or API requests.
- Produces an accessible `AssurancePage` whose top workspace contains request list, policy gate, receipt, and lifecycle evidence.

- [ ] **Step 1: Write failing sandbox composition tests**

```tsx
expect(markup).toContain("Agent spend requests");
expect(markup).toContain("Deterministic policy gate");
expect(markup).toContain("Policy receipt");
expect(markup).toContain("Evidence timeline");
expect(markup).toContain("Synthetic environment");
```

- [ ] **Step 2: Run sandbox tests to verify the new contract fails**

Run: `node_modules/.bin/vitest.cmd run apps/web/src/app/assurance/page.test.tsx --configLoader native --pool=threads --maxWorkers=1`

Expected: FAIL until the Control Room exposes the named evidence sections.

- [ ] **Step 3: Recompose the server page with CSS-module sections**

```tsx
<main className={styles.workspace}>
  <WorkspaceHeader />
  <section className={styles.requestWorkbench}>...</section>
  <section className={styles.toolShelf}>
    <CommandCenter />
    <TaskControlRoom />
    <PolicyDraftPanel />
    <SimulationStudio />
  </section>
</main>
```

Retain the current imported module calls for coverage, scenarios, evidence manifest verification, and reconciliation. Only present their outputs in the approved product layout.

- [ ] **Step 4: Add the scoped blue editorial workspace styles**

Use a compact sidebar at desktop sizes, a responsive top bar, tabular request rows, rule/receipt/timeline columns, and 390px single-column fallback. Do not change `globals.css` styles used by existing interactive components.

- [ ] **Step 5: Run assurance tests**

Run: `node_modules/.bin/vitest.cmd run apps/web/src/app/assurance/page.test.tsx --configLoader native --pool=threads --maxWorkers=1`

Expected: PASS.

### Task 4: Run workflow and visual verification

**Files:**
- Create: `docs/verification/control-room-desktop.png`
- Create: `docs/verification/control-room-mobile.png`

**Interfaces:**
- Consumes the local Next server at `http://localhost:3000`.
- Produces visual evidence only; no production code behavior changes.

- [ ] **Step 1: Run all affected unit tests**

Run: `node_modules/.bin/vitest.cmd run apps/web/src/app/assurance/page.test.tsx --configLoader native --pool=threads --maxWorkers=1`

Expected: PASS.

- [ ] **Step 2: Exercise existing sandbox interactions in a headless browser**

Use Playwright to visit `/assurance`, select Parallel mode, launch a task, wait for “Task accepted”, pause it, resume it, then run the simulation “Unknown merchant” case.

Expected: task controls remain functional and the synthetic simulation produces a decision result.

- [ ] **Step 3: Verify visual and mobile acceptance criteria**

Capture `/assurance` at 1440px and 390px; assert `document.documentElement.scrollWidth <= document.documentElement.clientWidth` at 390px; inspect both renders.

- [ ] **Step 4: Run project quality gates**

Run: `pnpm format`, `pnpm check`, and `apps/web/node_modules/.bin/next.cmd build`.

Expected: all complete successfully. If Windows sandbox process isolation blocks Next worker spawning, rerun the same local command with the narrowest required execution permission and report that environmental requirement.
