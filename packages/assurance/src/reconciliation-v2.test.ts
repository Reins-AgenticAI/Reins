import { describe, expect, it } from "vitest";
import { reconcileLifecycle } from "./reconciliation-v2";

const authorization = {
  id: "auth-1",
  kind: "AUTHORIZATION" as const,
  amountMinor: 10_000,
  currency: "USD",
  source: "POLICY" as const,
  occurredAt: "2026-09-20T10:00:00Z",
};
const settlement = {
  id: "settle-1",
  kind: "SETTLEMENT" as const,
  amountMinor: 10_000,
  currency: "USD",
  source: "PROVIDER" as const,
  occurredAt: "2026-09-20T10:01:00Z",
  parentId: authorization.id,
};

describe("reconcileLifecycle", () => {
  it("identifies duplicate delivery and broken lineage", () => {
    const findings = reconcileLifecycle([
      authorization,
      settlement,
      { ...settlement },
      { ...settlement, id: "orphan-1", parentId: "missing" },
    ]);

    expect(findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining(["DUPLICATE_EVENT", "BROKEN_LINEAGE"]),
    );
  });

  it("identifies a late child event and inconsistent currency", () => {
    const findings = reconcileLifecycle([
      authorization,
      { ...settlement, occurredAt: "2026-09-20T09:59:00Z", currency: "EUR" },
    ]);

    expect(findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining(["LATE_EVENT", "CURRENCY_MISMATCH"]),
    );
  });

  it("identifies partial and excess settlement against the authorization", () => {
    expect(
      reconcileLifecycle([authorization, { ...settlement, amountMinor: 8_000 }]).map((x) => x.code),
    ).toContain("PARTIAL_SETTLEMENT");
    expect(
      reconcileLifecycle([authorization, { ...settlement, amountMinor: 12_000 }]).map(
        (x) => x.code,
      ),
    ).toContain("EXCESS_SETTLEMENT");
  });

  it("accepts a complete reversal and refund with valid lineage", () => {
    const findings = reconcileLifecycle([
      authorization,
      settlement,
      {
        id: "reversal-1",
        kind: "REVERSAL",
        amountMinor: 2_000,
        currency: "USD",
        source: "PROVIDER",
        occurredAt: "2026-09-20T10:02:00Z",
        parentId: authorization.id,
      },
      {
        id: "refund-1",
        kind: "REFUND",
        amountMinor: 10_000,
        currency: "USD",
        source: "MERCHANT",
        occurredAt: "2026-09-20T10:03:00Z",
        parentId: settlement.id,
      },
    ]);

    expect(findings.map((finding) => finding.code)).toEqual(["LIFECYCLE_RECONCILED"]);
  });
});
