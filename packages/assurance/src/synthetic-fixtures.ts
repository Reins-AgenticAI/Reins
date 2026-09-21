import type { LifecycleEvent, PolicyDraft } from "./index";

export const realisticPolicyRequests = [
  "Institutional market data: max $10,000 per renewal, $50,000 quarterly, USD only, Datacore approved.",
  "Developer tooling: max $1,500 per seat expansion, $12,000 monthly; require Finance approval above $5,000.",
  "Corporate travel: EUR bookings up to €900 per transaction, with a €2,000 monthly budget.",
  "Security log retention: approved vendors only; deny a renewal when merchant identity is absent.",
];

export const syntheticLifecycleCases: Array<{
  name: string;
  events: LifecycleEvent[];
  expectedFinding: string;
}> = [
  {
    name: "authorized institutional data renewal",
    events: [
      {
        id: "a-100",
        kind: "AUTHORIZATION",
        amountMinor: 4200,
        currency: "USD",
        source: "POLICY",
        occurredAt: "2026-09-20T09:00:00Z",
      },
      {
        id: "s-100",
        kind: "SETTLEMENT",
        amountMinor: 4200,
        currency: "USD",
        source: "PROVIDER",
        occurredAt: "2026-09-20T09:02:00Z",
        parentId: "a-100",
      },
    ],
    expectedFinding: "NONE",
  },
  {
    name: "over-capture after partial authorization",
    events: [
      {
        id: "a-101",
        kind: "AUTHORIZATION",
        amountMinor: 5000,
        currency: "USD",
        source: "POLICY",
        occurredAt: "2026-09-20T10:00:00Z",
      },
      {
        id: "s-101",
        kind: "SETTLEMENT",
        amountMinor: 6200,
        currency: "USD",
        source: "PROVIDER",
        occurredAt: "2026-09-20T10:02:00Z",
        parentId: "a-101",
      },
    ],
    expectedFinding: "OVER_SETTLEMENT",
  },
  {
    name: "provider settlement without authorization",
    events: [
      {
        id: "s-102",
        kind: "SETTLEMENT",
        amountMinor: 1800,
        currency: "USD",
        source: "PROVIDER",
        occurredAt: "2026-09-20T11:02:00Z",
      },
    ],
    expectedFinding: "MISSING_AUTHORIZATION",
  },
  {
    name: "currency mismatch",
    events: [
      {
        id: "a-103",
        kind: "AUTHORIZATION",
        amountMinor: 2000,
        currency: "USD",
        source: "POLICY",
        occurredAt: "2026-09-20T12:00:00Z",
      },
      {
        id: "s-103",
        kind: "SETTLEMENT",
        amountMinor: 2000,
        currency: "EUR",
        source: "PROVIDER",
        occurredAt: "2026-09-20T12:02:00Z",
        parentId: "a-103",
      },
    ],
    expectedFinding: "CURRENCY_MISMATCH",
  },
];

export const edgeCaseDrafts: PolicyDraft[] = [
  {
    name: "Zero amount",
    currency: "USD",
    perTransactionLimitMinor: 0,
    monthlyBudgetMinor: 100,
    approvalThresholdMinor: 50,
    allowedMerchants: ["shop"],
  },
  {
    name: "Threshold inversion",
    currency: "USD",
    perTransactionLimitMinor: 100,
    monthlyBudgetMinor: 500,
    approvalThresholdMinor: 101,
    allowedMerchants: ["shop"],
  },
  {
    name: "Currency malformed",
    currency: "US",
    perTransactionLimitMinor: 100,
    monthlyBudgetMinor: 500,
    approvalThresholdMinor: 50,
    allowedMerchants: ["shop"],
  },
];
