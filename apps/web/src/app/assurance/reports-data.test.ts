import { describe, expect, it } from "vitest";
import { buildReportModel, type ReportInvestigation } from "./reports-data";

export const reportFixture = (
  id: string,
  at: string,
  amountMinor: number,
  outcome: "ALLOW" | "DENY" | "ESCALATE" = "ALLOW",
): ReportInvestigation => ({
  workflow: {
    id,
    startedAt: at,
    request: {
      requestId: id,
      title: `Synthetic ${id}`,
      requestingAgent: "Engineering",
      amountMinor,
      currency: "USD",
    },
  },
  decision: { outcome, decidedAt: at },
  lifecycle: [],
});
const fixtures = [
  reportFixture("sep", "2026-09-30T23:59:59Z", 12345),
  ...[4, 5, 12, 19, 26].map((day, index) =>
    reportFixture(
      `oct-${day}`,
      `2026-10-${String(day).padStart(2, "0")}T12:00:00Z`,
      (index + 1) * 10000,
    ),
  ),
  reportFixture("denied", "2026-10-12T12:00:00Z", 99999, "DENY"),
  reportFixture("overdue", "2026-10-29T12:00:00Z", 300, "ESCALATE"),
  reportFixture("due", "2026-10-30T12:00:00Z", 300, "ESCALATE"),
  reportFixture("within", "2026-10-31T12:00:00Z", 300, "ESCALATE"),
  reportFixture("nov", "2026-11-01T00:00:00Z", 100000),
];
const budget = {
  limitMinor: 200000,
  availableMinor: 80000,
  heldMinor: 20000,
  committedMinor: 100000,
};

describe("report model", () => {
  it("filters decisions by UTC reporting month and sums approved spend in minor units", () => {
    const model = buildReportModel(fixtures, budget, "2026-10");
    expect(model.monthly).toEqual([
      { label: "Sep 2026", amountMinor: 12345 },
      { label: "Oct 2026", amountMinor: 150000 },
    ]);
    expect(model.weekly.map((week) => [week.label, week.amountMinor])).toEqual([
      ["Oct 1–4", 10000],
      ["Oct 5–11", 20000],
      ["Oct 12–18", 30000],
      ["Oct 19–25", 40000],
      ["Oct 26–31", 50000],
    ]);
    expect(model.decisions).toEqual({ ALLOW: 5, DENY: 1, ESCALATE: 3, PENDING: 0 });
    expect(model.evidence).toHaveLength(9);
    expect(buildReportModel(fixtures, budget, "2026-09").totalMinor).toBe(12345);
    expect(model.planVarianceMinor).toBe(-50000);
  });
  it("keeps current committed and held reservations visible without treating holds as available", () => {
    expect(buildReportModel(fixtures, budget, "2026-10").budget).toEqual({
      committedMinor: 100000,
      heldMinor: 20000,
      allocatedMinor: 120000,
      remainingMinor: 80000,
      limitMinor: 200000,
    });
    expect(buildReportModel([], null, "2026-10").budget).toBeNull();
  });
  it("groups escalations under the synthetic 24-hour SLA at month end", () => {
    expect(buildReportModel(fixtures, budget, "2026-10").sla).toEqual({
      within: 1,
      dueToday: 1,
      overdue: 1,
    });
  });
  it("computes weekly mean request amounts and excludes non-USD and invalid records", () => {
    const foreign = reportFixture("eur", "2026-10-03T12:00:00Z", 9900);
    foreign.workflow.request.currency = "EUR";
    const pending = reportFixture("pending", "2026-10-03T12:00:00Z", 200);
    delete pending.decision;
    const model = buildReportModel(
      [
        reportFixture("a", "2026-10-01T00:00:00Z", 10001),
        reportFixture("b", "2026-10-04T23:59:59Z", 20000),
        foreign,
        pending,
        reportFixture("bad", "invalid", 50),
      ],
      null,
      "2026-10",
    );
    expect(model.weekly[0]?.averageMinor).toBe(15001);
    expect(model.totalMinor).toBe(30001);
    expect(model.decisions.PENDING).toBe(1);
    expect(model.excludedCount).toBe(2);
    expect(model.planVarianceMinor).toBeNull();
  });
  it("keeps empty months empty and uses calendar week boundaries across years", () => {
    const model = buildReportModel([], null, "2027-01");
    expect(model.monthly.map((item) => item.label)).toEqual(["Dec 2026", "Jan 2027"]);
    expect(model.weekly.map((item) => item.label)).toEqual([
      "Jan 1–3",
      "Jan 4–10",
      "Jan 11–17",
      "Jan 18–24",
      "Jan 25–31",
    ]);
    expect(model.totalMinor).toBe(0);
    expect(model.evidence).toEqual([]);
    expect(() => buildReportModel([], null, "invalid")).toThrow("Invalid reporting month");
  });
});
