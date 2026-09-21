import { createHash, generateKeyPairSync, sign, verify } from "node:crypto";

export type {
  BudgetReservationStore,
  Reservation,
  ReservationState,
  ReserveBudgetInput,
  ReserveBudgetResult,
} from "./budget-reservations";
export {
  commitReservation,
  expireReservations,
  InMemoryBudgetReservationStore,
  releaseReservation,
  reserveBudget,
} from "./budget-reservations";
export type {
  AdvisorySource,
  AgentTrace,
  FinanceTask,
  LocalModelClient,
  WorkflowResult,
} from "./local-agent-workflow";
export { runLocalAgentWorkflow } from "./local-agent-workflow";
export type { PolicyAgent } from "./policy-agent";
export { createPolicyAgent } from "./policy-agent";
export type {
  LifecycleEventKind,
  ReconciliationEvent,
  ReconciliationFinding,
} from "./reconciliation-v2";
export { reconcileLifecycle } from "./reconciliation-v2";
export type {
  ApprovalRecord,
  ApprovalStatus,
  DecisionInput,
  DecisionReasonCode,
  DecisionReceipt,
  SpendDecision,
} from "./spend-decision";
export { createApprovalRequest, evaluateSpendDecision, resolveApproval } from "./spend-decision";
export {
  edgeCaseDrafts,
  realisticPolicyRequests,
  syntheticLifecycleCases,
} from "./synthetic-fixtures";
export type {
  AdvisoryAgent,
  AdvisoryAgentName,
  AdvisoryAgentOutput,
  AdvisoryWorkflow,
  AgentTrace as AdvisoryAgentTrace,
  AgentTraceStatus,
  SpendWorkflowCommand,
  SpendWorkflowRequest,
  WorkflowStatus,
  WorkflowStore,
} from "./workflow-orchestrator";
export {
  advisoryAgentNames,
  createWorkflowOrchestrator,
  InMemoryWorkflowStore,
  WorkflowConflictError,
} from "./workflow-orchestrator";

export type ControlId =
  | "currency"
  | "per_transaction_amount"
  | "merchant_allowlist"
  | "approval_threshold"
  | "monthly_budget";
export type CoverageMode =
  | "EXACT"
  | "NARROWER"
  | "BROADER"
  | "PREFLIGHT_ONLY"
  | "OBSERVE_ONLY"
  | "UNSUPPORTED"
  | "UNKNOWN";
export type EvidenceStatus = "SYNTHETIC" | "UNVERIFIED" | "VERIFIED";

export type PolicyDraft = {
  name: string;
  currency: string;
  perTransactionLimitMinor: number;
  monthlyBudgetMinor: number;
  approvalThresholdMinor: number;
  allowedMerchants: string[];
};
export type CanonicalPolicy = PolicyDraft & {
  requiredControls: ControlId[];
  schemaVersion: "1";
  digest: string;
};
export type Capability = { mode: CoverageMode; rationale: string; constraint?: string };
export type ProviderProfile = {
  providerKey: string;
  displayName: string;
  schemaVersion: "1";
  sourceReference: string;
  observedAt: string;
  evidenceStatus: EvidenceStatus;
  digest: string;
  capabilities: Partial<Record<ControlId, Capability>>;
};
export type CoverageFinding = {
  control: ControlId;
  mode: CoverageMode;
  compatible: boolean;
  rationale: string;
};
export type CoverageAssessment = {
  providerKey: string;
  providerDigest: string;
  compatible: boolean;
  findings: CoverageFinding[];
};

const controls: ControlId[] = [
  "currency",
  "per_transaction_amount",
  "merchant_allowlist",
  "approval_threshold",
  "monthly_budget",
];
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export function normalizePolicy(input: PolicyDraft): CanonicalPolicy {
  const name = input.name.trim();
  const currency = input.currency.trim().toUpperCase();
  if (!name || !/^[A-Z]{3}$/.test(currency))
    throw new Error("Policy name and ISO currency are required");
  for (const amount of [
    input.perTransactionLimitMinor,
    input.monthlyBudgetMinor,
    input.approvalThresholdMinor,
  ]) {
    if (!Number.isSafeInteger(amount) || amount <= 0)
      throw new Error("Money values must be positive integer minor units");
  }
  if (input.approvalThresholdMinor > input.perTransactionLimitMinor)
    throw new Error("Approval threshold cannot exceed transaction limit");
  const allowedMerchants = [
    ...new Set(
      input.allowedMerchants.map((merchant) => merchant.trim().toLowerCase()).filter(Boolean),
    ),
  ].sort();
  const base = {
    name,
    currency,
    perTransactionLimitMinor: input.perTransactionLimitMinor,
    monthlyBudgetMinor: input.monthlyBudgetMinor,
    approvalThresholdMinor: input.approvalThresholdMinor,
    allowedMerchants,
    requiredControls: controls,
    schemaVersion: "1" as const,
  };
  return { ...base, digest: digest(base) };
}

function profile(input: Omit<ProviderProfile, "digest">): ProviderProfile {
  return { ...input, digest: digest(input) };
}

export const syntheticProfiles: ProviderProfile[] = [
  profile({
    providerKey: "synthetic-exact",
    displayName: "Synthetic Exact Rail",
    schemaVersion: "1",
    sourceReference: "fixture://synthetic-exact/v1",
    observedAt: "2026-09-19",
    evidenceStatus: "SYNTHETIC",
    capabilities: {
      currency: { mode: "EXACT", rationale: "Rejects currency mismatches before authorization" },
      per_transaction_amount: { mode: "EXACT", rationale: "Enforces the integer minor-unit limit" },
      merchant_allowlist: { mode: "EXACT", rationale: "Checks the normalized merchant allowlist" },
      approval_threshold: {
        mode: "EXACT",
        rationale: "Escalates at or above the policy threshold",
      },
      monthly_budget: { mode: "EXACT", rationale: "Reserves against the versioned monthly budget" },
    },
  }),
  profile({
    providerKey: "synthetic-preflight",
    displayName: "Synthetic Preflight Rail",
    schemaVersion: "1",
    sourceReference: "fixture://synthetic-preflight/v1",
    observedAt: "2026-09-19",
    evidenceStatus: "SYNTHETIC",
    capabilities: {
      currency: { mode: "EXACT", rationale: "Checks currency only before submission" },
      per_transaction_amount: {
        mode: "NARROWER",
        rationale: "Supports a stricter provider maximum",
        constraint: "Provider ceiling may be lower",
      },
      merchant_allowlist: {
        mode: "PREFLIGHT_ONLY",
        rationale: "Checks the merchant before submission but cannot guarantee enforcement",
      },
      approval_threshold: {
        mode: "UNKNOWN",
        rationale: "No authoritative threshold evidence is available",
      },
      monthly_budget: { mode: "UNSUPPORTED", rationale: "No shared budget primitive is exposed" },
    },
  }),
];

export function analyzeCoverage(
  policy: CanonicalPolicy,
  provider: ProviderProfile,
): CoverageAssessment {
  const findings = policy.requiredControls.map((control) => {
    const capability = provider.capabilities[control];
    const mode = capability?.mode ?? "UNKNOWN";
    const compatible = mode === "EXACT" || mode === "NARROWER";
    return {
      control,
      mode,
      compatible,
      rationale: capability?.rationale ?? "The provider profile omits this required control",
    };
  });
  return {
    providerKey: provider.providerKey,
    providerDigest: provider.digest,
    compatible: findings.every((finding) => finding.compatible),
    findings,
  };
}

export type Scenario = {
  id: string;
  name: string;
  amountMinor: number;
  currency: string;
  merchant: string;
  expected: "ALLOW" | "ESCALATE" | "DENY";
};
export type ScenarioResult = Scenario & {
  actual: Scenario["expected"];
  passed: boolean;
  reason: string;
};
export const scenarioCorpus: Scenario[] = [
  {
    id: "within-limit",
    name: "Allowed merchant below threshold",
    amountMinor: 2500,
    currency: "USD",
    merchant: "fresh-market",
    expected: "ALLOW",
  },
  {
    id: "threshold",
    name: "Approval threshold",
    amountMinor: 6000,
    currency: "USD",
    merchant: "fresh-market",
    expected: "ESCALATE",
  },
  {
    id: "wrong-currency",
    name: "Wrong currency",
    amountMinor: 2500,
    currency: "EUR",
    merchant: "fresh-market",
    expected: "DENY",
  },
  {
    id: "unknown-merchant",
    name: "Unknown merchant",
    amountMinor: 2500,
    currency: "USD",
    merchant: "unknown-shop",
    expected: "DENY",
  },
];
export function runScenarios(
  policy: CanonicalPolicy,
  scenarios = scenarioCorpus,
): ScenarioResult[] {
  return scenarios.map((scenario) => {
    let actual: Scenario["expected"] = "ALLOW";
    let reason = "Within policy limits";
    if (scenario.currency !== policy.currency) {
      actual = "DENY";
      reason = "Currency does not match the policy";
    } else if (!policy.allowedMerchants.includes(scenario.merchant)) {
      actual = "DENY";
      reason = "Merchant is not on the allowlist";
    } else if (scenario.amountMinor > policy.perTransactionLimitMinor) {
      actual = "DENY";
      reason = "Amount exceeds the per-transaction limit";
    } else if (scenario.amountMinor >= policy.approvalThresholdMinor) {
      actual = "ESCALATE";
      reason = "Amount meets the approval threshold";
    }
    return { ...scenario, actual, passed: actual === scenario.expected, reason };
  });
}

export type LifecycleEvent = {
  id: string;
  kind: "AUTHORIZATION" | "CAPTURE" | "SETTLEMENT" | "REVERSAL" | "REFUND" | "ORDER";
  amountMinor: number;
  currency: string;
  source: "POLICY" | "PROVIDER" | "MERCHANT";
  occurredAt: string;
  parentId?: string;
};
export type EvidenceFinding = {
  code: string;
  severity: "INFO" | "WARNING" | "ERROR";
  message: string;
  eventIds: string[];
};
export function reconcile(events: LifecycleEvent[]): EvidenceFinding[] {
  const findings: EvidenceFinding[] = [];
  const auth = events.find((event) => event.kind === "AUTHORIZATION");
  const settled = events
    .filter((event) => event.kind === "SETTLEMENT")
    .reduce((sum, event) => sum + event.amountMinor, 0);
  if (!auth)
    findings.push({
      code: "MISSING_AUTHORIZATION",
      severity: "ERROR",
      message: "No authorization event anchors the lifecycle",
      eventIds: [],
    });
  if (auth && settled > auth.amountMinor)
    findings.push({
      code: "OVER_SETTLEMENT",
      severity: "ERROR",
      message: "Settled amount exceeds authorized amount",
      eventIds: [
        auth.id,
        ...events.filter((event) => event.kind === "SETTLEMENT").map((event) => event.id),
      ],
    });
  if (events.some((event) => event.currency !== (auth?.currency ?? event.currency)))
    findings.push({
      code: "CURRENCY_MISMATCH",
      severity: "ERROR",
      message: "Lifecycle events use inconsistent currencies",
      eventIds: events.map((event) => event.id),
    });
  if (
    events.some(
      (event) => !event.parentId && ["CAPTURE", "SETTLEMENT", "REFUND"].includes(event.kind),
    )
  )
    findings.push({
      code: "BROKEN_LINEAGE",
      severity: "WARNING",
      message: "A lifecycle event has no parent reference",
      eventIds: events.filter((event) => !event.parentId).map((event) => event.id),
    });
  if (!findings.length)
    findings.push({
      code: "LIFECYCLE_RECONCILED",
      severity: "INFO",
      message: "Synthetic lifecycle is internally consistent",
      eventIds: events.map((event) => event.id),
    });
  return findings;
}

export type EvidenceManifest = {
  schemaVersion: "1";
  policyDigest: string;
  assessments: CoverageAssessment[];
  scenarios: ScenarioResult[];
  events: LifecycleEvent[];
  findings: EvidenceFinding[];
  manifestDigest: string;
};
export function createEvidenceManifest(
  policy: CanonicalPolicy,
  assessments: CoverageAssessment[],
  scenarios: ScenarioResult[],
  events: LifecycleEvent[],
): EvidenceManifest {
  const base = {
    schemaVersion: "1" as const,
    policyDigest: policy.digest,
    assessments,
    scenarios,
    events,
    findings: reconcile(events),
  };
  return { ...base, manifestDigest: digest(base) };
}
export function verifyEvidenceManifest(manifest: EvidenceManifest): {
  valid: boolean;
  reason: string;
} {
  const { manifestDigest, ...base } = manifest;
  return digest(base) === manifestDigest
    ? { valid: true, reason: "Manifest digest matches canonical evidence" }
    : { valid: false, reason: "Manifest digest does not match canonical evidence" };
}

export function signEvidence(manifest: EvidenceManifest): {
  manifest: EvidenceManifest;
  signature: string;
  publicKey: string;
} {
  const keys = generateKeyPairSync("ed25519");
  const payload = Buffer.from(JSON.stringify(manifest));
  return {
    manifest,
    signature: sign(null, payload, keys.privateKey).toString("base64url"),
    publicKey: keys.publicKey.export({ type: "spki", format: "der" }).toString("base64url"),
  };
}
export function verifyEvidenceSignature(bundle: ReturnType<typeof signEvidence>): boolean {
  return verify(
    null,
    Buffer.from(JSON.stringify(bundle.manifest)),
    { key: Buffer.from(bundle.publicKey, "base64url"), format: "der", type: "spki" },
    Buffer.from(bundle.signature, "base64url"),
  );
}
