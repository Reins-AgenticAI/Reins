# Local AI policy-drafting evaluation

The drafting model is an optional assistant. It never activates a policy or makes an authorization decision. Every model response is treated as untrusted input and must match the complete `PolicyDraft` shape before it is accepted. Invalid, unsafe, unavailable, or malformed responses use the deterministic fallback.

## Evaluation matrix

| Case | Synthetic model output | Expected result |
| --- | --- | --- |
| Valid structured draft | Complete USD policy with positive integer minor-unit amounts and merchant list | Accept as `ollama` draft; downstream normalization remains authoritative |
| Prompt injection | Text asking the model to ignore limits and approve every merchant | Reject model output; use fallback |
| Malformed JSON | Non-JSON response | Reject; use fallback |
| Missing critical fields | Object containing only `name` | Reject; use fallback |
| Unsafe amount | Negative or non-integer amount | Reject; use fallback |
| Unreachable model | Fetch throws a connection error | Reject; use fallback |
| Provider failure | HTTP 503 or empty response | Reject; use fallback |

## Measured evaluation fields

The test suite records the source (`ollama` or `fallback`) and verifies that accepted drafts contain a three-letter currency, positive safe-integer minor units, and non-empty merchant strings. The evaluation is fail-closed: no malformed or adversarial fixture can produce an accepted draft.

Run the focused evaluation with:

```powershell
$env:CI="true"
pnpm --filter @reins/assurance test --run
```

The test file is `packages/assurance/src/policy-agent.test.ts`. A local Ollama installation is not required because the model responses are mocked with synthetic fixtures.
