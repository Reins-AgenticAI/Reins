export type ReportInvestigation = {
  workflow: {
    id: string;
    startedAt: string;
    request: {
      requestId: string;
      title: string;
      requestingAgent: string;
      amountMinor: number;
      currency: string;
    };
  };
  decision?: { outcome: "ALLOW" | "DENY" | "ESCALATE"; decidedAt: string };
  lifecycle: { occurredAt: string; kind: string; amountMinor: number; currency: string }[];
};
export type ReportBudget = {
  limitMinor: number;
  availableMinor: number;
  committedMinor?: number;
  heldMinor?: number;
} | null;
export const monthLabel = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
const recordTime = (item: ReportInvestigation) =>
  Date.parse(item.decision?.decidedAt ?? item.workflow.startedAt);

export function buildReportModel(
  investigations: ReportInvestigation[],
  budget: ReportBudget,
  selectedMonth: string,
) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(selectedMonth)) throw new Error("Invalid reporting month");
  const start = Date.parse(`${selectedMonth}-01T00:00:00Z`);
  const date = new Date(start);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const end = Date.UTC(year, month + 1, 1);
  const previous = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 7);
  const valid = investigations.filter(
    (item) =>
      item.workflow.request.currency === "USD" &&
      Number.isSafeInteger(item.workflow.request.amountMinor) &&
      item.workflow.request.amountMinor >= 0 &&
      Number.isFinite(recordTime(item)),
  );
  const evidence = valid.filter((item) => recordTime(item) >= start && recordTime(item) < end);
  const approved = (items: ReportInvestigation[]) =>
    items.filter((item) => item.decision?.outcome === "ALLOW");
  const sum = (items: ReportInvestigation[]) =>
    items.reduce((total, item) => total + item.workflow.request.amountMinor, 0);
  const monthly = [previous, selectedMonth].map((period) => ({
    label: monthLabel(period),
    amountMinor: sum(
      approved(valid.filter((item) => new Date(recordTime(item)).toISOString().startsWith(period))),
    ),
  }));
  const lastDay = new Date(end - 1).getUTCDate();
  const firstSunday = 1 + ((7 - date.getUTCDay()) % 7);
  const weekly = [];
  for (
    let first = 1, last = firstSunday;
    first <= lastDay;
    first = last + 1, last = Math.min(last + 7, lastDay)
  ) {
    const items = approved(
      evidence.filter((item) => {
        const day = new Date(recordTime(item)).getUTCDate();
        return day >= first && day <= last;
      }),
    );
    const amountMinor = sum(items);
    weekly.push({
      label: `${date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })} ${first}–${last}`,
      amountMinor,
      averageMinor: items.length ? Math.round(amountMinor / items.length) : 0,
    });
  }
  const decisions = { ALLOW: 0, DENY: 0, ESCALATE: 0, PENDING: 0 };
  const sla = { within: 0, dueToday: 0, overdue: 0 };
  for (const item of evidence) {
    decisions[item.decision?.outcome ?? "PENDING"]++;
    if (item.decision?.outcome === "ESCALATE") {
      const due = recordTime(item) + 24 * 60 * 60 * 1000;
      if (due >= end) sla.within++;
      else if (due >= end - 24 * 60 * 60 * 1000) sla.dueToday++;
      else sla.overdue++;
    }
  }
  const snapshot = budget
    ? {
        limitMinor: budget.limitMinor,
        committedMinor: budget.committedMinor,
        heldMinor: budget.heldMinor,
        allocatedMinor: budget.limitMinor - budget.availableMinor,
        remainingMinor: budget.availableMinor,
      }
    : null;
  const totalMinor = sum(approved(evidence));
  return {
    selectedMonth,
    label: monthLabel(selectedMonth),
    monthly,
    weekly,
    totalMinor,
    decisions,
    sla,
    evidence,
    excludedCount: investigations.length - valid.length,
    budget: snapshot,
    planMinor: budget?.limitMinor ?? null,
    weeklyPlanMinor: budget ? Math.round(budget.limitMinor / weekly.length) : null,
    planVarianceMinor: budget ? totalMinor - budget.limitMinor : null,
  };
}
