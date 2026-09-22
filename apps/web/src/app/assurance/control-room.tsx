"use client";

import { controlRoomScenarios, getScenario, type ScenarioExecutionMode } from "@reins/assurance";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./page.module.css";

type Decision = "ALLOW" | "ESCALATE" | "DENY";
type RequestRecord = {
  requestId: string;
  title: string;
  requestingAgent: string;
  vendor: string;
  amountMinor: number;
  currency: string;
  costCenter: string;
};
type Trace = {
  sequence: number;
  agent: string;
  status: string;
  durationMs: number;
  output?: { summary: string };
};
type Investigation = {
  workflow: { id: string; request: RequestRecord; startedAt: string };
  traces: Trace[];
  decision?: {
    outcome: Decision;
    reasonCodes: string[];
    policyVersionId: string;
    reservationId: string;
    decidedAt: string;
  };
  lifecycle: {
    id: string;
    kind: string;
    amountMinor: number;
    currency: string;
    occurredAt: string;
  }[];
  findings: { code: string; severity: string; message: string }[];
};
type Budget = {
  limitMinor: number;
  availableMinor: number;
  heldMinor?: number;
  committedMinor?: number;
} | null;
type TaskResult = {
  requestId: string;
  decision: Decision;
  reason?: string;
  receiptId?: string;
  workflowId?: string;
  error?: string;
  traces: { agent: string; summary: string; durationMs: number; source: string }[];
};
type RunResult = { runId: string; results: TaskResult[]; budget: Budget; error?: string };
type QueueRow = RequestRecord & {
  workflowId?: string | undefined;
  decision?: Decision | undefined;
  error?: string | undefined;
  pending?: boolean;
};
type RosterAgent = { name: string; traceAgent?: string };
const initialAgents: RosterAgent[] = [
  { name: "Policy", traceAgent: "INTAKE" },
  { name: "Risk", traceAgent: "VENDOR_CONTEXT" },
  { name: "Budget", traceAgent: "BUDGET_ANALYSIS" },
  { name: "Evidence", traceAgent: "EVIDENCE" },
];
const money = (minor: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minor / 100);
const humanize = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());
const previewRows = (scenarioId: string, runId?: string): QueueRow[] =>
  (getScenario(scenarioId, runId)?.requests ?? []).map((task) => ({
    ...task,
    requestingAgent: task.agent,
  }));
const defaultScenario = "quarter-close-spend-controls";

export function stripeSandboxAvailability(
  result: { decision: Decision; workflowId?: string; receiptId?: string } | null,
) {
  return Boolean(result?.decision === "ALLOW" && result.workflowId && result.receiptId);
}

export async function runScenario(
  scenarioId: string,
  mode: ScenarioExecutionMode,
  runId: string,
): Promise<RunResult> {
  const response = await fetch("/api/scenario-run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scenarioId, mode, runId }),
  });
  const body = await response.json();
  // A partial 503 still carries completed, persisted decisions.
  if (!Array.isArray(body.results))
    throw new Error("Scenario unavailable. No results were returned.");
  return body as RunResult;
}

export function evidenceTimeline(investigations: Investigation[]) {
  return investigations
    .flatMap((item) => {
      const workflowId = item.workflow.id;
      const requestId = item.workflow.request.requestId;
      return [
        {
          id: `${workflowId}:start`,
          workflowId,
          requestId,
          at: item.workflow.startedAt,
          title: "Request recorded",
          detail: item.workflow.request.title,
        },
        ...(item.decision
          ? [
              {
                id: `${workflowId}:decision`,
                workflowId,
                requestId,
                at: item.decision.decidedAt,
                title: `Policy ${item.decision.outcome}`,
                detail:
                  item.decision.reasonCodes.map(humanize).join(", ") ||
                  "Deterministic policy receipt",
              },
            ]
          : []),
        ...item.lifecycle.map((event) => ({
          id: `${workflowId}:${event.id}`,
          workflowId,
          requestId,
          at: event.occurredAt,
          title: humanize(event.kind),
          detail: money(event.amountMinor, event.currency),
        })),
      ];
    })
    .filter((event) => Number.isFinite(Date.parse(event.at)))
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.id.localeCompare(b.id));
}

export function ControlRoom() {
  const [view, setView] = useState("Requests");
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [budget, setBudget] = useState<Budget>(null);
  const [loaded, setLoaded] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [scenarioId, setScenarioId] = useState(defaultScenario);
  const [mode, setMode] = useState<ScenarioExecutionMode>("parallel");
  const [running, setRunning] = useState(false);
  const activeRun = useRef(false);
  const [runRows, setRunRows] = useState<QueueRow[] | null>(null);
  const [results, setResults] = useState<TaskResult[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [runMessage, setRunMessage] = useState("");
  const [runError, setRunError] = useState("");
  const [agents, setAgents] = useState(initialAgents);
  const [agentDialog, setAgentDialog] = useState(false);
  const [stripeMessage, setStripeMessage] = useState("");
  const [stripeRunning, setStripeRunning] = useState(false);
  const loadVersion = useRef(0);
  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    try {
      const response = await fetch("/api/control-room");
      if (!response.ok) throw new Error("Evidence unavailable");
      const payload = (await response.json()) as {
        investigations: Investigation[];
        budget: Budget;
      };
      if (version !== loadVersion.current) return;
      setInvestigations(payload.investigations);
      setRunRows(
        (current) =>
          current?.map((row) => {
            const saved = payload.investigations.find(
              (item) => item.workflow.request.requestId === row.requestId,
            );
            return saved?.decision
              ? {
                  ...row,
                  workflowId: saved.workflow.id,
                  decision: saved.decision.outcome,
                  error: undefined,
                  pending: false,
                }
              : row;
          }) ?? null,
      );
      setBudget(payload.budget);
      setUnavailable(false);
    } catch {
      if (version === loadVersion.current) {
        setUnavailable(true);
        setBudget(null);
      }
    } finally {
      if (version === loadVersion.current) setLoaded(true);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const rows: QueueRow[] =
    runRows ??
    investigations.map((item) => ({
      ...item.workflow.request,
      workflowId: item.workflow.id,
      decision: item.decision?.outcome,
    }));
  const selected = rows.find((row) => row.requestId === selectedId) ?? rows[0];
  const investigation = investigations.find((item) => item.workflow.id === selected?.workflowId);
  const selectedResult = results.find((item) => item.requestId === selected?.requestId);
  const selectedRunId = selected?.requestId.split(":").slice(1).join(":");
  const timelineInvestigations = runRows
    ? investigations.filter((item) => runRows.some((row) => row.workflowId === item.workflow.id))
    : selectedRunId
      ? investigations.filter((item) =>
          item.workflow.request.requestId.endsWith(`:${selectedRunId}`),
        )
      : investigation
        ? [investigation]
        : [];
  const rejectedMinor = rows.reduce(
    (sum, row) => sum + (row.decision === "DENY" && !row.error ? row.amountMinor : 0),
    0,
  );
  const execute = async () => {
    if (activeRun.current) return;
    activeRun.current = true;
    ++loadVersion.current;
    setRunning(true);
    setRunError("");
    setRunMessage("");
    setStripeMessage("");
    setResults([]);
    const runId = crypto.randomUUID();
    const pending = previewRows(scenarioId, runId).map((row) => ({ ...row, pending: true }));
    setRunRows(pending);
    setSelectedId(pending[0]?.requestId ?? "");
    try {
      const response = await runScenario(scenarioId, mode, runId);
      setResults(response.results);
      setRunRows(
        pending.map((row) => {
          const result = response.results.find((item) => item.requestId === row.requestId);
          return {
            ...row,
            pending: false,
            workflowId: result?.workflowId,
            decision: result?.error ? undefined : result?.decision,
            error: result?.error ?? (!result ? "TASK_UNAVAILABLE" : undefined),
          };
        }),
      );
      setBudget(response.budget);
      const failed = response.results.filter((item) => item.error).length;
      setRunMessage(`${response.results.length - failed} requests completed.`);
      if (failed || response.error)
        setRunError(
          failed
            ? `${failed} request${failed === 1 ? " is" : "s are"} unavailable. Completed decisions are retained.`
            : "Shared budget unavailable. Completed decisions are retained.",
        );
    } catch {
      setRunRows(pending.map((row) => ({ ...row, pending: false, error: "TASK_UNAVAILABLE" })));
      setRunError(
        "Scenario unavailable. No decision is inferred; refresh persisted evidence before retrying.",
      );
    } finally {
      await load();
      activeRun.current = false;
      setRunning(false);
    }
  };
  const executeStripe = async () => {
    if (!selectedResult || !stripeSandboxAvailability(selectedResult) || stripeRunning) return;
    setStripeRunning(true);
    setStripeMessage("");
    try {
      const response = await fetch("/api/provider-executions/stripe-test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workflowId: selectedResult.workflowId,
          receiptId: selectedResult.receiptId,
        }),
      });
      const body = await response.json();
      setStripeMessage(
        response.ok
          ? `Evidence recorded · ${humanize(body.providerStatus)}`
          : (body.error ?? "Stripe Sandbox unavailable. No payment was created."),
      );
      if (response.ok) await load();
    } catch {
      setStripeMessage("Stripe Sandbox unavailable. No payment was created.");
    } finally {
      setStripeRunning(false);
    }
  };
  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#control-main">
        Skip to workspace
      </a>
      <aside className={styles.sidebar} aria-label="Control Room navigation">
        <a className={styles.brand} href="/">
          Reins
        </a>
        <a className={styles.backLink} href="/">
          ← Product site
        </a>
        <nav>
          {["Requests", "Agents", "Evidence"].map((item, index) => (
            <button
              className={view === item ? styles.activeNav : ""}
              aria-current={view === item ? "page" : undefined}
              key={item}
              onClick={() => setView(item)}
              type="button"
            >
              <span aria-hidden="true">{["▦", "◌", "▤"][index]}</span>
              {item}
              {item === "Requests" && <b>{rows.length || 4}</b>}
            </button>
          ))}
        </nav>
        <p>
          Synthetic workspace
          <br />
          No payment credentials
        </p>
      </aside>
      <div className={styles.content}>
        <header className={styles.topbar}>
          <p>
            <a href="/">Product site</a>
            <span>/</span>
            <strong>{view}</strong>
          </p>
          <div>
            <span className={styles.environment}>
              <i />
              Synthetic environment
            </span>
            <span className={styles.profile}>JD</span>
            <span className={styles.profileName}>
              <strong>Jordan Diaz</strong>
              <small>Finance Ops</small>
            </span>
          </div>
        </header>
        <main className={styles.workspace} id="control-main">
          <section className={styles.heading}>
            <div>
              <p>Spend requests</p>
              <h1>Agentic spend, governed by design.</h1>
              <span>
                Review, resolve, and retain a checked record of every synthetic agent request.
              </span>
            </div>
          </section>
          <ScenarioControls
            scenarioId={scenarioId}
            setScenarioId={setScenarioId}
            mode={mode}
            setMode={setMode}
            running={running}
            execute={() => void execute()}
          />
          <div className={styles.runStatus} role="status">
            {running
              ? "Scenario running. Advisory context cannot override deterministic policy."
              : runMessage ||
                (loaded
                  ? rows.length
                    ? "Persisted synthetic evidence"
                    : "No persisted requests. Run the scenario to produce decisions."
                  : "Loading persisted evidence…")}
          </div>
          {(unavailable || runError) && (
            <div className={styles.unavailable} role="alert">
              {runError}
              {unavailable && (
                <p>
                  Evidence refresh unavailable. Displayed records may be stale; current budget is
                  unknown.{" "}
                  <button type="button" onClick={() => void load()}>
                    Refresh evidence
                  </button>
                </p>
              )}
            </div>
          )}
          <div className={styles.controlGrid}>
            <div className={styles.mainColumn}>
              {view === "Agents" ? (
                <section className={styles.detailCard}>
                  <h2>Advisory agents</h2>
                  <p>
                    Policy, risk, budget, and evidence roles supply context only. Manage the roster
                    beside this workspace. Locally added names do not execute or change policy.
                  </p>
                </section>
              ) : view === "Evidence" ? (
                <section className={styles.detailCard}>
                  <h2>Lifecycle findings</h2>
                  {investigation?.findings.length ? (
                    investigation.findings.map((finding) => (
                      <p key={finding.code}>
                        {finding.severity} · {finding.message}
                      </p>
                    ))
                  ) : (
                    <p>No lifecycle findings stored for the selected request.</p>
                  )}
                </section>
              ) : null}
              <RequestQueue
                rows={rows}
                selectedId={selected?.requestId ?? ""}
                select={(id) => {
                  setSelectedId(id);
                  setStripeMessage("");
                }}
                running={running}
              />
              <section className={styles.detailGrid} aria-label="Selected request investigation">
                <article className={styles.detailCard}>
                  <header>
                    <div>
                      <h2>Deterministic policy gate</h2>
                      <p>{selected?.title ?? "Select a completed request."}</p>
                    </div>
                    {selected?.decision && <Badge value={selected.decision} />}
                  </header>
                  <ol className={styles.checks}>
                    {investigation?.decision ? (
                      <>
                        <li>
                          <span>1</span>
                          <div>
                            <strong>Policy evaluation</strong>
                            <small>{investigation.decision.policyVersionId}</small>
                          </div>
                          <b>{investigation.decision.outcome}</b>
                        </li>
                        {investigation.decision.reasonCodes.map((reason, index) => (
                          <li key={reason}>
                            <span>{index + 2}</span>
                            <div>
                              <strong>{humanize(reason)}</strong>
                              <small>Recorded deterministic reason</small>
                            </div>
                          </li>
                        ))}
                      </>
                    ) : (
                      <li>
                        <div>
                          <strong>No persisted receipt loaded</strong>
                          <small>
                            {selected?.error
                              ? "Task unavailable; no approval inferred."
                              : "Run the scenario or select a persisted request."}
                          </small>
                        </div>
                      </li>
                    )}
                  </ol>
                </article>
                <article className={styles.detailCard} id="policy-receipt">
                  <header>
                    <div>
                      <h2>Policy receipt</h2>
                      <p>Immutable decision binding.</p>
                    </div>
                  </header>
                  <dl className={styles.receipt}>
                    {[
                      ["Request", selected?.requestId ?? "Not run"],
                      ["Policy", investigation?.decision?.policyVersionId ?? "Not loaded"],
                      ["Reservation", investigation?.decision?.reservationId ?? "Not loaded"],
                      [
                        "Decision",
                        selected?.decision ?? (selected?.error ? "UNAVAILABLE" : "PENDING"),
                      ],
                      [
                        "Reason",
                        investigation?.decision?.reasonCodes.map(humanize).join(", ") ||
                          selectedResult?.reason ||
                          "No receipt",
                      ],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  {selected?.workflowId && (
                    <a
                      className={styles.receiptLink}
                      href={`/api/control-room?workflowId=${encodeURIComponent(selected.workflowId)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open persisted receipt ↗
                    </a>
                  )}
                  {selectedResult && stripeSandboxAvailability(selectedResult) && (
                    <section className={styles.stripeSandbox}>
                      <strong>Stripe Sandbox evidence</strong>
                      <p>
                        Opt-in unconfirmed test intent. No card or money movement. Disabled on
                        public deployments.
                      </p>
                      <button
                        type="button"
                        className={styles.stripeButton}
                        disabled={stripeRunning}
                        onClick={() => void executeStripe()}
                      >
                        {stripeRunning
                          ? "Creating test intent…"
                          : "Create unconfirmed Stripe Sandbox intent"}
                      </button>
                      <span role="status">{stripeMessage}</span>
                    </section>
                  )}
                </article>
                <article className={styles.detailCard}>
                  <header>
                    <div>
                      <h2>Evidence timeline</h2>
                      <p>Chronological records for the selected run.</p>
                    </div>
                  </header>
                  <ol className={styles.evidence}>
                    {evidenceTimeline(timelineInvestigations).map((event) => (
                      <li key={event.id}>
                        <span />
                        <time dateTime={event.at}>
                          {new Date(event.at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </time>
                        <div>
                          <strong>{event.title}</strong>
                          <small>{event.detail}</small>
                          <button
                            className={styles.receiptLink}
                            type="button"
                            onClick={() => setSelectedId(event.requestId)}
                          >
                            {event.requestId}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ol>
                  {!timelineInvestigations.length && (
                    <p className={styles.emptyNote}>No timestamped evidence loaded for this run.</p>
                  )}
                </article>
              </section>
            </div>
            <aside className={styles.rightColumn}>
              <section className={styles.sideCard}>
                <header>
                  <h2>Advisory agent roster</h2>
                  <span>{agents.length} roles</span>
                </header>
                <ul>
                  {agents.map((agent) => {
                    const trace = investigation?.traces.find(
                      (item) => item.agent === agent.traceAgent,
                    );
                    return (
                      <li key={agent.name}>
                        <span className={styles.agentAvatar}>{agent.name.slice(0, 2)}</span>
                        <div>
                          <strong>{agent.name}</strong>
                          <small>Advisory only{!agent.traceAgent ? " · local name" : ""}</small>
                          {trace?.output && <small>{trace.output.summary}</small>}
                        </div>
                        <span className={styles.online}>
                          {trace
                            ? humanize(trace.status)
                            : agent.traceAgent
                              ? "Ready"
                              : "Not connected"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <button
                  className={styles.addAgent}
                  type="button"
                  onClick={() => setAgentDialog(true)}
                >
                  Add advisory agent
                </button>
              </section>
              <section className={styles.sideCard}>
                <header>
                  <h2>Shared budget</h2>
                  <span>synthetic</span>
                </header>
                <div className={styles.budgetNumber}>
                  <strong>{budget ? money(budget.availableMinor) : "Unavailable"}</strong>
                  <b>
                    {budget && budget.limitMinor > 0
                      ? `${((budget.availableMinor / budget.limitMinor) * 100).toFixed(1)}%`
                      : "—"}
                    <small>available</small>
                  </b>
                </div>
                <div className={styles.budgetMeter}>
                  <span
                    style={{
                      width:
                        budget && budget.limitMinor > 0
                          ? `${Math.max(0, Math.min(100, (budget.availableMinor / budget.limitMinor) * 100))}%`
                          : "0%",
                    }}
                  />
                </div>
                <dl className={styles.budgetFacts}>
                  {[
                    ["Committed", budget?.committedMinor],
                    ["Held", budget?.heldMinor],
                    ["Available", budget?.availableMinor],
                    [runRows ? "Rejected · this run" : "Rejected · loaded queue", rejectedMinor],
                  ].map(([label, amount]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{typeof amount === "number" ? money(amount) : "Unavailable"}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            </aside>
          </div>
        </main>
      </div>
      {agentDialog && (
        <AddAgentDialog
          close={() => setAgentDialog(false)}
          add={(name) =>
            setAgents((current) =>
              current.some((agent) => agent.name.toLowerCase() === name.toLowerCase())
                ? current
                : [...current, { name }],
            )
          }
        />
      )}
    </div>
  );
}

export function ScenarioControls({
  scenarioId,
  setScenarioId,
  mode,
  setMode,
  running,
  execute,
}: {
  scenarioId: string;
  setScenarioId: (id: string) => void;
  mode: ScenarioExecutionMode;
  setMode: (mode: ScenarioExecutionMode) => void;
  running: boolean;
  execute: () => void;
}) {
  return (
    <section className={styles.scenarioControls} aria-label="Scenario execution">
      <div>
        <label htmlFor="scenario">Scenario</label>
        <select
          id="scenario"
          value={scenarioId}
          onChange={(event) => setScenarioId(event.target.value)}
        >
          {controlRoomScenarios.map((item) => (
            <option value={item.id} key={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <fieldset>
        <legend>Execution mode</legend>
        {(["parallel", "sequential"] as const).map((value) => (
          <label key={value}>
            <input
              type="radio"
              name="execution-mode"
              value={value}
              checked={mode === value}
              onChange={() => setMode(value)}
            />
            {humanize(value)}
          </label>
        ))}
      </fieldset>
      <button
        type="button"
        className={styles.runScenario}
        disabled={running}
        aria-busy={running}
        onClick={execute}
      >
        {running ? "Running scenario…" : "Run scenario"}
      </button>
    </section>
  );
}

export function RequestQueue({
  rows,
  selectedId,
  select,
  running,
}: {
  rows: QueueRow[];
  selectedId: string;
  select: (id: string) => void;
  running: boolean;
}) {
  const visibleRows = rows.length ? rows : previewRows(defaultScenario);
  return (
    <section className={styles.requestCard} aria-label="Request queue" aria-busy={running}>
      <div className={styles.tabs}>
        <strong>All requests · {visibleRows.length}</strong>
        <span />
        <small>
          {rows.length ? "Latest synthetic requests" : "Scenario preview · not executed"}
        </small>
      </div>
      <section
        className={styles.tableWrap}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users must be able to scroll the wide request table.
        tabIndex={0}
        aria-label="Scrollable request queue"
      >
        <table>
          <thead>
            <tr>
              {["Request ID", "Requesting agent", "Purpose", "Vendor", "Amount", "Decision"].map(
                (title) => (
                  <th scope="col" key={title}>
                    {title}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr
                key={row.requestId}
                className={selectedId === row.requestId ? styles.selectedRow : undefined}
              >
                <td>
                  <button
                    type="button"
                    className={styles.requestSelect}
                    onClick={() => select(row.requestId)}
                    aria-pressed={selectedId === row.requestId}
                    title={row.requestId}
                  >
                    {row.requestId}
                  </button>
                </td>
                <td>
                  <i className={styles.agentDot} />
                  {row.requestingAgent}
                </td>
                <td>{row.title}</td>
                <td>{row.vendor}</td>
                <td>{money(row.amountMinor, row.currency)}</td>
                <td>
                  {row.error ? (
                    "UNAVAILABLE"
                  ) : row.decision ? (
                    <Badge value={row.decision} />
                  ) : row.pending ? (
                    "RUNNING"
                  ) : rows.length ? (
                    "PENDING"
                  ) : (
                    "NOT RUN"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  );
}

function AddAgentDialog({ close, add }: { close: () => void; add: (name: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => {
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`${styles.workflow} ${styles.agentDialog}`}
      onCancel={close}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLInputElement | HTMLButtonElement>(
            "input, button",
          ),
        ).filter((control) => !control.disabled);
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      aria-labelledby="agent-title"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) {
            add(name.trim());
            close();
          }
        }}
      >
        <h2 id="agent-title">Add advisory agent</h2>
        <p>
          Local roster name only. This agent is not connected to execution and cannot approve
          spending.
        </p>
        <label className={styles.scenarioLabel} htmlFor="agent-name">
          Agent name
        </label>
        <input
          id="agent-name"
          name="agent-name"
          required
          maxLength={40}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <div className={styles.dialogActions}>
          <button type="button" onClick={close}>
            Cancel
          </button>
          <button type="submit" disabled={!name.trim()}>
            Add advisory agent
          </button>
        </div>
      </form>
    </dialog>
  );
}

function Badge({ value }: { value: Decision }) {
  return (
    <span
      className={
        value === "ALLOW"
          ? styles.statusALLOW
          : value === "DENY"
            ? styles.statusDENY
            : styles.statusESCALATE
      }
    >
      {value}
    </span>
  );
}
