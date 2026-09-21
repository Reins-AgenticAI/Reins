# Evidence Atlas Landing Page Design

## Goal

Replace the public Reins home page with the approved light-theme Evidence Atlas landing page. It should explain the product through a synthetic agent-spend investigation without implying live-money capability or production readiness.

## Audience and user goal

Finance, risk, and agent-platform buyers should understand, in one screen, that Reins records the chain from an agent request through policy, human review, authorization, settlement, and an evidence bundle. The primary action opens the existing local sandbox; the secondary action jumps to the accessible evidence section.

## Visual direction

The approved source is the refined Evidence Atlas mockup generated on 20 September 2026. Preserve its warm-white canvas, deep ink typography, restrained teal active path, large left-aligned headline, live-agent roster, shared-budget context, three decision investigation cards, and light contour-map evidence terrain. The visual target must not drift into dark mode, navy, literal mountain imagery, stock photography, gradients, or glass panels.

The contour field is a static, decorative SVG on the landing page. It represents relationships between synthetic evidence records. It is not a claim of a live Three.js graph. The existing accessible timeline and tabular product views remain the authoritative investigation experience.

## Information architecture

1. Header with working in-page navigation: Product, How it works, Evidence, Security, and a link to `/assurance` labelled Open sandbox.
2. Hero with the approved statement, synthetic-data disclosure, and clear actions.
3. Evidence Atlas product surface containing an accessible linear evidence path, policy, approval, authorization, settlement, and evidence-bundle nodes.
4. Live agent roster and shared-budget context, explicitly identified as synthetic.
5. Investigation cards representing ALLOW, ESCALATE, and DENY with policy version and evidence-bundle identifiers.
6. A readable, non-visual evidence timeline and product boundary statement.

## Accessibility and content constraints

- Meet WCAG 2.2 AA contrast requirements.
- Use semantic headings, labelled navigation, keyboard-visible focus states, and real link targets.
- Never communicate a decision state through color alone; every state has a text label and icon.
- Provide a reduced-motion-safe static presentation; the page has no essential animation.
- Use synthetic people, agents, companies, spend amounts, and evidence identifiers only.
- Do not claim that Reins processes payments, holds funds, or offers live enforcement in this local demonstration.

## Technical constraints

- Keep the home page server-rendered.
- Use React and a page-specific CSS module; do not add packages.
- Do not change authorization, database, API, or assurance behavior.
- Add a focused rendering test for the public page and retain the existing quality gates.

## Acceptance criteria

- The root page renders the selected Evidence Atlas hierarchy with working in-page navigation and the `/assurance` sandbox link.
- The page explicitly labels all records as synthetic and clearly states its product boundary.
- The atlas has an accessible linear path and an accompanying evidence timeline; decorative terrain is hidden from assistive technology.
- ALLOW, ESCALATE, and DENY are text-labelled, visually distinct, and described by the test suite.
- Desktop and narrow mobile layouts remain readable without horizontal page overflow.
