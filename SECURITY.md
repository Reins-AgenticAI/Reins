# Security policy

Reins is a development-stage reference application. It is not approved to process production payments or real customer financial data.

## Prohibited data

Do not enter, upload, log, seed, or commit:

- primary account numbers or CVV values;
- bank account credentials;
- wallet private keys;
- production tokens or signing keys;
- real customer financial or identity data.

Use synthetic fixtures only.

## Secrets

Keep secrets in local environment variables or an approved secret manager. Never commit `.env`. Local development secrets must be replaced before any shared environment.

## Reporting

Report vulnerabilities privately to both repository owners. Do not open a public issue containing exploit details, secrets, or sensitive logs.

## Design rules

- Authorization paths fail closed.
- A language model cannot approve a payment.
- Logs exclude secrets and prohibited financial data.
- Authenticated and authorization-sensitive actions require server-side validation.
- Evidence must distinguish verified, reported, inferred, and missing facts.

