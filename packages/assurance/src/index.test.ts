import { describe, expect, it } from "vitest";
import {
  analyzeCoverage,
  createEvidenceManifest,
  normalizePolicy,
  reconcile,
  runScenarios,
  scenarioCorpus,
  signEvidence,
  syntheticProfiles,
  verifyEvidenceManifest,
  verifyEvidenceSignature,
} from "./index.js";

describe("assurance domain corpus", () => {
  it("normalizes policy, refuses weaker coverage, runs adversarial scenarios, and verifies evidence", () => {
    const policy = normalizePolicy({
      name: "  Grocery policy ",
      currency: "usd",
      perTransactionLimitMinor: 10000,
      monthlyBudgetMinor: 50000,
      approvalThresholdMinor: 5000,
      allowedMerchants: ["Fresh-Market", "fresh-market"],
    });
    const [exactProfile, weakerProfile] = syntheticProfiles;
    if (!exactProfile || !weakerProfile) throw new Error("Synthetic profile fixture is incomplete");
    expect(policy.allowedMerchants).toEqual(["fresh-market"]);
    expect(analyzeCoverage(policy, exactProfile).compatible).toBe(true);
    const weaker = analyzeCoverage(policy, weakerProfile);
    expect(weaker.compatible).toBe(false);
    expect(weaker.findings.map((finding) => finding.mode)).toContain("UNKNOWN");
    expect(runScenarios(policy).every((scenario) => scenario.passed)).toBe(true);
    const events = [
      {
        id: "a",
        kind: "AUTHORIZATION",
        amountMinor: 1000,
        currency: "USD",
        source: "POLICY",
        occurredAt: "2026-09-19T00:00:00Z",
      },
      {
        id: "s",
        kind: "SETTLEMENT",
        amountMinor: 1200,
        currency: "USD",
        source: "PROVIDER",
        occurredAt: "2026-09-19T00:01:00Z",
        parentId: "a",
      },
    ] as const;
    expect(reconcile([...events]).map((finding) => finding.code)).toContain("OVER_SETTLEMENT");
    const manifest = createEvidenceManifest(policy, [weaker], runScenarios(policy), [...events]);
    expect(verifyEvidenceManifest(manifest).valid).toBe(true);
    const bundle = signEvidence(manifest);
    expect(verifyEvidenceSignature(bundle)).toBe(true);
    expect(verifyEvidenceManifest({ ...manifest, manifestDigest: "tampered" }).valid).toBe(false);
    expect(verifyEvidenceSignature({ ...bundle, signature: "tampered" })).toBe(false);
    expect(() => normalizePolicy({ ...policy, currency: "" })).toThrow();
    expect(() => normalizePolicy({ ...policy, monthlyBudgetMinor: 0 })).toThrow();
    expect(() => normalizePolicy({ ...policy, approvalThresholdMinor: 10001 })).toThrow();
    const baseScenario = scenarioCorpus[0];
    if (!baseScenario) throw new Error("Scenario fixture is incomplete");
    expect(
      runScenarios(policy, [
        { ...baseScenario, id: "over-limit", amountMinor: 20000, expected: "DENY" },
      ])[0]?.passed,
    ).toBe(true);
    expect(reconcile([]).map((finding) => finding.code)).toContain("MISSING_AUTHORIZATION");
    expect(
      reconcile([
        {
          id: "capture",
          kind: "CAPTURE",
          amountMinor: 1,
          currency: "USD",
          source: "PROVIDER",
          occurredAt: "2026-09-19T00:00:00Z",
        },
      ]).map((finding) => finding.code),
    ).toContain("BROKEN_LINEAGE");
    expect(
      reconcile([
        {
          id: "a",
          kind: "AUTHORIZATION",
          amountMinor: 1,
          currency: "USD",
          source: "POLICY",
          occurredAt: "2026-09-19T00:00:00Z",
        },
        {
          id: "s",
          kind: "SETTLEMENT",
          amountMinor: 1,
          currency: "EUR",
          source: "PROVIDER",
          occurredAt: "2026-09-19T00:01:00Z",
          parentId: "a",
        },
      ]).map((finding) => finding.code),
    ).toContain("CURRENCY_MISMATCH");
    expect(
      reconcile([
        {
          id: "a",
          kind: "AUTHORIZATION",
          amountMinor: 1,
          currency: "USD",
          source: "POLICY",
          occurredAt: "2026-09-19T00:00:00Z",
        },
      ])[0]?.code,
    ).toBe("LIFECYCLE_RECONCILED");
  });
});
