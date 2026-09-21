# Evidence Atlas Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved Evidence Atlas light-theme Reins landing page with an accessible evidence path and responsive layout.

**Architecture:** Keep `page.tsx` as a server-rendered composition of local data and semantic sections. Put landing-only visual rules in a CSS module so existing assurance styles remain unchanged. Use inline SVG only as a decorative contour field while keeping the evidence sequence in accessible HTML.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS modules, Vitest, Biome.

**Spec:** `docs/superpowers/specs/2026-09-20-evidence-atlas-landing-design.md`

## Global Constraints

- Use synthetic data only.
- Do not add dependencies or alter payment, API, database, or assurance behavior.
- Keep the page server-rendered.
- Use `/assurance` for the sandbox action and real in-page fragment links for page navigation.
- Preserve accessible HTML evidence content independently of the decorative SVG.
- Match the approved refined Evidence Atlas mockup: warm white, ink, teal, evidence terrain, roster, shared budget, and three decision cards; omit mountains and stock imagery.
- Run `pnpm format` and `pnpm check` before handoff.

---

### Task 1: Establish Evidence Atlas rendering expectations

**Files:**
- Modify: `apps/web/src/app/page.test.tsx`

**Interfaces:**
- Consumes: the default `HomePage` export from `apps/web/src/app/page.tsx`.
- Produces: a rendering contract for the landing page’s navigation, synthetic-data disclosure, decision states, and evidence path.

- [ ] **Step 1: Replace the former foundation-page expectations with landing-page assertions**

```tsx
expect(markup).toContain("Every agent action leaves a trail.");
expect(markup).toContain('href="/assurance"');
expect(markup).toContain("Synthetic demonstration");
expect(markup).toContain("Evidence atlas");
expect(markup).toContain("ALLOW");
expect(markup).toContain("ESCALATE");
expect(markup).toContain("DENY");
```

- [ ] **Step 2: Run the focused test and verify it fails because the existing foundation page lacks the selected landing-page content**

Run: `pnpm --filter @reins/web exec vitest run src/app/page.test.tsx --configLoader native --pool=threads --maxWorkers=1`

Expected: failure on the new Evidence Atlas text assertion.

- [ ] **Step 3: Add assertions that each in-page navigation fragment exists and that visual terrain is hidden from assistive technology**

```tsx
const targets = ["product", "how-it-works", "evidence", "security"];
expect(targets.every((target) => markup.includes(`id="${target}"`))).toBe(true);
expect(markup).toContain('aria-hidden="true"');
```

- [ ] **Step 4: Run the focused test and verify the new assertions fail for the missing structure**

Run: `pnpm --filter @reins/web exec vitest run src/app/page.test.tsx --configLoader native --pool=threads --maxWorkers=1`

Expected: failure because the current page does not render the target IDs or decorative-terrain marker.

### Task 2: Build the server-rendered Evidence Atlas composition

**Files:**
- Modify: `apps/web/src/app/page.tsx`

**Interfaces:**
- Consumes: static typed arrays declared in the module for agents, evidence steps, and investigation cases.
- Produces: `HomePage`, a server-rendered root-page React component satisfying `page.test.tsx`.

- [ ] **Step 1: Define minimal typed static records for agent roster, evidence steps, and cases**

```tsx
type Decision = "ALLOW" | "ESCALATE" | "DENY";

type EvidenceStep = {
  label: string;
  detail: string;
  state: "complete" | "review";
};
```

- [ ] **Step 2: Render semantic header, hero, product, evidence, and security sections with only synthetic copy**

```tsx
<nav aria-label="Primary navigation">
  <a href="#product">Product</a>
  <a href="#how-it-works">How it works</a>
  <a href="#evidence">Evidence</a>
  <a href="#security">Security</a>
</nav>
```

- [ ] **Step 3: Render an `aria-hidden` SVG contour background and an ordered-list evidence path in the same product surface**

```tsx
<svg aria-hidden="true" focusable="false" viewBox="0 0 800 360" />
<ol aria-label="Evidence path">{/* typed steps */}</ol>
```

- [ ] **Step 4: Render decision cards with text labels, readable explanations, policy version, and evidence-bundle IDs**

```tsx
<article data-decision={caseItem.decision}>
  <p>{caseItem.decision}</p>
  <h3>{caseItem.title}</h3>
</article>
```

- [ ] **Step 5: Run the focused test and verify it passes**

Run: `pnpm --filter @reins/web exec vitest run src/app/page.test.tsx --configLoader native --pool=threads --maxWorkers=1`

Expected: all root-page rendering tests pass.

### Task 3: Apply the responsive Mineral Evidence visual system

**Files:**
- Create: `apps/web/src/app/page.module.css`
- Modify: `apps/web/src/app/page.tsx`

**Interfaces:**
- Consumes: semantic class names exported by `page.module.css`.
- Produces: responsive visual styling scoped to the root landing page only.

- [ ] **Step 1: Import the CSS module and apply classes to the server-rendered sections**

```tsx
import styles from "./page.module.css";

<main className={styles.page} id="main-content">...</main>
```

- [ ] **Step 2: Define visual tokens, focus treatment, and decision-state colors in the module**

```css
.page {
  --ink: #1e2524;
  --canvas: #fcfbf8;
  --teal: #0f766e;
  --line: #d7dcd7;
}

.page :focus-visible {
  outline: 3px solid #0f766e;
  outline-offset: 3px;
}
```

- [ ] **Step 3: Create the desktop atlas grid and mobile single-column breakpoint without hiding essential content**

```css
.atlasLayout { display: grid; grid-template-columns: minmax(0, 1fr) 17rem; }
@media (max-width: 760px) { .atlasLayout { grid-template-columns: 1fr; } }
```

- [ ] **Step 4: Run the focused test to verify styling work did not change rendered landmarks or copy**

Run: `pnpm --filter @reins/web exec vitest run src/app/page.test.tsx --configLoader native --pool=threads --maxWorkers=1`

Expected: all root-page rendering tests pass.

### Task 4: Verify the actual browser journey and quality gates

**Files:**
- Modify: none unless verification identifies a defect.

**Interfaces:**
- Consumes: the landing-page route and existing root scripts.
- Produces: evidence of desktop and mobile rendering plus repository quality-gate results.

- [ ] **Step 1: Start the local web application and capture the root page at desktop and narrow widths**

Run: `pnpm --filter @reins/web dev -- --port 3200`

Expected: `http://localhost:3200/` responds and both viewport captures show readable, non-overflowing content.

- [ ] **Step 2: Verify the Open sandbox link resolves to the existing assurance route**

Run: browser test that clicks the `Open sandbox` link.

Expected: browser navigates to `/assurance`.

- [ ] **Step 3: Run formatting**

Run: `pnpm format`

Expected: Biome exits successfully.

- [ ] **Step 4: Run the required repository quality gate**

Run: `pnpm check`

Expected: lint, database safety checks, type checks, tests, coverage, and builds succeed.
