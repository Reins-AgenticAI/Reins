export type LifecycleEventKind =
  | "AUTHORIZATION"
  | "CAPTURE"
  | "SETTLEMENT"
  | "REVERSAL"
  | "REFUND"
  | "ORDER";

export type ReconciliationEvent = Readonly<{
  id: string;
  kind: LifecycleEventKind;
  amountMinor: number;
  currency: string;
  source: "POLICY" | "PROVIDER" | "MERCHANT";
  occurredAt: string;
  parentId?: string;
}>;

export type ReconciliationFinding = Readonly<{
  code:
    | "DUPLICATE_EVENT"
    | "MISSING_AUTHORIZATION"
    | "BROKEN_LINEAGE"
    | "LATE_EVENT"
    | "CURRENCY_MISMATCH"
    | "PARTIAL_SETTLEMENT"
    | "EXCESS_SETTLEMENT"
    | "LIFECYCLE_RECONCILED";
  severity: "INFO" | "WARNING" | "ERROR";
  message: string;
  eventIds: readonly string[];
}>;

const linkedKinds = new Set<LifecycleEventKind>(["CAPTURE", "SETTLEMENT", "REVERSAL", "REFUND"]);

function finding(
  code: ReconciliationFinding["code"],
  severity: ReconciliationFinding["severity"],
  message: string,
  eventIds: readonly string[],
): ReconciliationFinding {
  return Object.freeze({ code, severity, message, eventIds: Object.freeze([...eventIds]) });
}

export function reconcileLifecycle(
  events: readonly ReconciliationEvent[],
): readonly ReconciliationFinding[] {
  const findings: ReconciliationFinding[] = [];
  const ids = new Set<string>();
  const duplicateIds = new Set<string>();
  for (const event of events) {
    if (ids.has(event.id)) duplicateIds.add(event.id);
    ids.add(event.id);
  }
  if (duplicateIds.size)
    findings.push(
      finding("DUPLICATE_EVENT", "ERROR", "A lifecycle event was delivered more than once", [
        ...duplicateIds,
      ]),
    );

  const byId = new Map(events.map((event) => [event.id, event]));
  const authorization = events.find((event) => event.kind === "AUTHORIZATION");
  if (!authorization)
    findings.push(
      finding("MISSING_AUTHORIZATION", "ERROR", "No authorization event anchors the lifecycle", []),
    );

  const broken = events.filter(
    (event) => linkedKinds.has(event.kind) && (!event.parentId || !byId.has(event.parentId)),
  );
  if (broken.length)
    findings.push(
      finding(
        "BROKEN_LINEAGE",
        "ERROR",
        "A lifecycle event does not reference a known parent",
        broken.map((event) => event.id),
      ),
    );

  const late = events.filter((event) => {
    const parent = event.parentId ? byId.get(event.parentId) : undefined;
    return parent ? Date.parse(event.occurredAt) < Date.parse(parent.occurredAt) : false;
  });
  if (late.length)
    findings.push(
      finding(
        "LATE_EVENT",
        "WARNING",
        "A child event precedes its parent timestamp",
        late.map((event) => event.id),
      ),
    );

  if (authorization && events.some((event) => event.currency !== authorization.currency))
    findings.push(
      finding(
        "CURRENCY_MISMATCH",
        "ERROR",
        "Lifecycle events use inconsistent currencies",
        events.map((event) => event.id),
      ),
    );

  if (authorization) {
    const settled = events
      .filter((event) => event.kind === "SETTLEMENT")
      .reduce((sum, event) => sum + event.amountMinor, 0);
    if (settled > authorization.amountMinor)
      findings.push(
        finding("EXCESS_SETTLEMENT", "ERROR", "Settled amount exceeds authorized amount", [
          authorization.id,
          ...events.filter((event) => event.kind === "SETTLEMENT").map((event) => event.id),
        ]),
      );
    else if (settled > 0 && settled < authorization.amountMinor)
      findings.push(
        finding("PARTIAL_SETTLEMENT", "WARNING", "Settled amount is lower than the authorization", [
          authorization.id,
          ...events.filter((event) => event.kind === "SETTLEMENT").map((event) => event.id),
        ]),
      );
  }

  return Object.freeze(
    findings.length
      ? findings
      : [
          finding(
            "LIFECYCLE_RECONCILED",
            "INFO",
            "Synthetic lifecycle is internally consistent",
            events.map((event) => event.id),
          ),
        ],
  );
}
