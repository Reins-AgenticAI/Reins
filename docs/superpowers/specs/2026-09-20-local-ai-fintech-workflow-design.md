# Local AI Fintech Workflow Design

## Purpose

Replace the disconnected synthetic demo panels with one professional Control Room where a finance operator can submit a synthetic B2B spend-review task, see locally executed AI-agent work, and inspect the deterministic policy result and evidence trail.

## Product boundary

The workflow is a local demonstration only. It never creates a payment, stores credentials, or claims provider enforcement. Ollama is used only to structure and explain synthetic task context. A deterministic policy evaluator remains the only authority that returns ALLOW, ESCALATE, or DENY. Model errors, timeouts, malformed output, missing policy, and unavailable local models never become ALLOW.

## Experience

The default view is a request-first Control Room with an off-white canvas, charcoal typography, pale sage surfaces, and restrained forest-teal interaction states. There is no blue or decorative WebGL graph. A labelled, keyboard-accessible sidebar switches among Requests, Agents, Policies, Evidence, and Budgets. The agent registry exists once, in the Agents view; other views use role chips rather than duplicate rosters.

The default task is a synthetic Datacore data-platform renewal. The task composer supports a single selected agent or the standard multi-agent review. The trace shows Intake, Vendor Context, Budget Analyst, deterministic Policy Gate, and Evidence agents, including source, status, safe output summary, and latency. The interface explicitly distinguishes a live local-model result from an unavailable model.

## Architecture

`packages/assurance` owns typed workflow inputs, deterministic policy evaluation, and an injectable local-model client interface. A server route owns the Ollama HTTP boundary and returns no success payload when the model cannot be reached. A client Control Room component owns view selection and task-run state. The Next page supplies static synthetic finance fixtures and stays server rendered.

## Verification

Unit tests use a complete fake local-model client to prove: model prose cannot alter the deterministic ESCALATE verdict; a malformed or unavailable model result fails safely; and each agent trace is reported. Route tests cover validation and unavailable-model responses. UI tests cover the default finance workflow and removal of legacy consumer/duplicate UI. A final manual browser journey runs against the installed local `qwen3:4b` Ollama model, clearly reported separately from deterministic automated tests.

## Acceptance criteria

- A user can select Requests, Agents, Policies, Evidence, and Budgets with actual sidebar controls.
- A synthetic finance task runs through four local AI-agent stages plus a deterministic policy decision, when Ollama is reachable.
- The shown verdict remains ESCALATE for the seeded $48,000 renewal regardless of agent prose.
- If Ollama is unavailable, the UI shows an unavailable state and no authorization result is fabricated.
- The old grocery copy, duplicate agent pool, native-looking accordion tools, and placeholder Three.js graph are absent from the Control Room.
- Changed UI works with keyboard navigation and reduced motion, has a responsive mobile layout, and passes existing repository quality checks.
