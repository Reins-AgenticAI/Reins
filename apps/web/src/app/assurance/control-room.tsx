"use client";

import { useCallback, useEffect, useState } from "react";
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
type Trace = { sequence: number; agent: string; status: string; durationMs: number };
type Investigation = {
  workflow: { id: string; request: RequestRecord };
  traces: Trace[];
  decision?: {
    outcome: Decision;
    reasonCodes: string[];
    policyVersionId: string;
    reservationId: string;
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
type Budget = { limitMinor: number; availableMinor: number } | null;
type AgentResult = {
  decision: Decision;
  reason: string;
  receiptId: string;
  traces: {
    agent: string;
    summary: string;
    durationMs: number;
    source: "simulation" | "live_local_model" | "hosted_model";
  }[];
  workflowId: string;
};

type StripeExecutionResult = {
  executionId: string;
  paymentIntentId: string;
  providerStatus: string;
  idempotent: boolean;
};

const views = ["Requests", "Agents", "Evidence"] as const;
type View = (typeof views)[number];
export const requestComposerDescription =
  "Select a realistic finance case. Configured advisory source provides context; policy remains deterministic.";
export function sourceLabel(source: AgentResult["traces"][number]["source"]) {
  if (source === "simulation") return "Synthetic advisory output";
  if (source === "live_local_model") return "Local Ollama advisory output";
  return "Hosted advisory output";
}
export function stripeSandboxAvailability(result: AgentResult | null) {
  return Boolean(result?.decision === "ALLOW" && result.workflowId && result.receiptId);
}
const scenarios: RequestRecord[] = [
  {
    requestId: "SR-2048",
    title: "Institutional market-data renewal",
    requestingAgent: "Research Agent",
    vendor: "Datacore",
    amountMinor: 4_800_000,
    currency: "USD",
    costCenter: "482",
  },
  {
    requestId: "SR-2049",
    title: "Developer tools seat expansion",
    requestingAgent: "Engineering Agent",
    vendor: "Datacore",
    amountMinor: 84_000,
    currency: "USD",
    costCenter: "481",
  },
  {
    requestId: "SR-2050",
    title: "Unapproved cloud capacity commitment",
    requestingAgent: "Platform Agent",
    vendor: "BuildKit",
    amountMinor: 3_600_000,
    currency: "USD",
    costCenter: "490",
  },
];
const money = (minor: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minor / 100);
const humanize = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());

export function ControlRoom() {
  const [view, setView] = useState<View>("Requests");
  const [investigation, setInvestigation] = useState<Investigation | null>();
  const [budget, setBudget] = useState<Budget>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [scenario, setScenario] = useState(0);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [stripeResult, setStripeResult] = useState<StripeExecutionResult | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [stripeRunning, setStripeRunning] = useState(false);
  const load = useCallback(async () => {
    setUnavailable(false);
    const response = await fetch("/api/control-room").catch(() => undefined);
    if (!response?.ok) return setUnavailable(true);
    const payload = (await response.json()) as {
      investigation: Investigation | null;
      budget: Budget;
    };
    setInvestigation(payload.investigation);
    setBudget(payload.budget);
  }, []);
  useEffect(() => void load(), [load]);
  const execute = async () => {
    const selected = scenarios[scenario];
    if (!selected) return;
    setRunning(true);
    setRunError(null);
    setResult(null);
    setStripeResult(null);
    setStripeError(null);
    const response = await fetch("/api/agent-run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...selected,
        agent: selected.requestingAgent,
        category: "Technology",
      }),
    }).catch(() => undefined);
    setRunning(false);
    if (!response?.ok) {
      const body = await response?.json().catch(() => undefined);
      return setRunError(
        body?.error === "Local agent queue is full"
          ? "The local model is busy. Wait for the active workflow to finish."
          : "The local model is unavailable. No decision was produced.",
      );
    }
    setResult((await response.json()) as AgentResult);
    void load();
  };
  const executeStripeSandbox = async () => {
    const approvedResult = result;
    if (
      !approvedResult ||
      approvedResult.decision !== "ALLOW" ||
      !approvedResult.workflowId ||
      !approvedResult.receiptId
    )
      return;
    setStripeRunning(true);
    setStripeError(null);
    const response = await fetch("/api/provider-executions/stripe-test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workflowId: approvedResult.workflowId,
        receiptId: approvedResult.receiptId,
      }),
    }).catch(() => undefined);
    setStripeRunning(false);
    if (!response?.ok) {
      const body = await response?.json().catch(() => undefined);
      return setStripeError(
        body?.error ?? "Stripe Sandbox is unavailable. No payment was created.",
      );
    }
    setStripeResult((await response.json()) as StripeExecutionResult);
    void load();
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
          {views.map((item, index) => (
            <button
              className={view === item ? styles.activeNav : ""}
              key={item}
              onClick={() => setView(item)}
              type="button"
            >
              <span aria-hidden="true">{["▦", "◌", "▤"][index]}</span>
              {item}
              {item === "Requests" && <b>1</b>}
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
            <a href="/">Product site</a> <span>/</span> <strong>{view}</strong>
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
            <button onClick={() => setComposerOpen(true)} type="button">
              New synthetic request <span>＋</span>
            </button>
          </section>
          {unavailable ? (
            <State
              title="Control Room unavailable"
              detail="The local evidence store could not be read. This screen does not infer a decision."
            />
          ) : investigation === undefined ? (
            <State
              title="Loading persisted evidence"
              detail="Reading the latest local synthetic workflow."
            />
          ) : view === "Requests" ? (
            <Requests budget={budget} investigation={investigation} />
          ) : view === "Agents" ? (
            <Agents traces={investigation?.traces ?? []} />
          ) : (
            <Evidence findings={investigation?.findings ?? []} />
          )}
        </main>
      </div>
      {composerOpen && (
        <Composer
          close={() => setComposerOpen(false)}
          execute={() => void execute()}
          result={result}
          runError={runError}
          running={running}
          scenario={scenario}
          setScenario={setScenario}
          stripeError={stripeError}
          stripeResult={stripeResult}
          stripeRunning={stripeRunning}
          executeStripeSandbox={() => void executeStripeSandbox()}
        />
      )}
    </div>
  );
}

function Requests({
  budget,
  investigation,
}: {
  budget: Budget;
  investigation: Investigation | null;
}) {
  if (!investigation)
    return (
      <State
        title="No persisted investigation"
        detail="Run the local synthetic workflow, then refresh the evidence store."
      />
    );
  const { request } = investigation.workflow;
  const outcome = investigation.decision?.outcome;
  const timeline = [
    ...investigation.traces.map((trace) => ({
      id: `t-${trace.sequence}`,
      title: humanize(trace.agent),
      detail: `${humanize(trace.status)} · ${trace.durationMs} ms`,
    })),
    ...investigation.lifecycle.map((event) => ({
      id: event.id,
      title: humanize(event.kind),
      detail: `${money(event.amountMinor, event.currency)} · ${new Date(event.occurredAt).toLocaleTimeString()}`,
    })),
  ];
  return (
    <div className={styles.controlGrid}>
      <div className={styles.mainColumn}>
        <section className={styles.requestCard}>
          <div className={styles.tabs}>
            <button className={styles.selectedTab} type="button">
              All requests <b>1</b>
            </button>
            <span />
            <button type="button">Last 7 days</button>
          </div>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Agent</th>
                  <th>Description</th>
                  <th>Vendor</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{request.requestId}</td>
                  <td>
                    <i className={styles.agentDot} />
                    {humanize(request.requestingAgent)}
                  </td>
                  <td>{request.title}</td>
                  <td>{request.vendor}</td>
                  <td>{money(request.amountMinor, request.currency)}</td>
                  <td>{outcome ? <Badge value={outcome} /> : "PENDING"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section className={styles.detailGrid}>
          <article className={styles.detailCard}>
            <header>
              <div>
                <h2>Deterministic policy gate</h2>
                <p>Every control must pass before autonomous approval.</p>
              </div>
              {outcome && <Badge value={outcome} />}
            </header>
            <ol className={styles.checks}>
              {[
                "Agent identity",
                "Budget availability",
                "Vendor and risk",
                "Amount and limits",
              ].map((check, index) => (
                <li key={check}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{check}</strong>
                    <small>
                      {index === 2
                        ? "Approved vendor and risk context"
                        : "Bound to the immutable request"}
                    </small>
                  </div>
                  <b>CHECKED</b>
                </li>
              ))}
            </ol>
          </article>
          <article className={styles.detailCard}>
            <header>
              <div>
                <h2>Policy receipt</h2>
                <p>Immutable decision binding.</p>
              </div>
            </header>
            <dl className={styles.receipt}>
              <div>
                <dt>Request</dt>
                <dd>{request.requestId}</dd>
              </div>
              <div>
                <dt>Policy</dt>
                <dd>{investigation.decision?.policyVersionId ?? "Not evaluated"}</dd>
              </div>
              <div>
                <dt>Reservation</dt>
                <dd>{investigation.decision?.reservationId ?? "Not recorded"}</dd>
              </div>
              <div>
                <dt>Decision</dt>
                <dd>{outcome ?? "PENDING"}</dd>
              </div>
              <div>
                <dt>Reason</dt>
                <dd>
                  {investigation.decision?.reasonCodes.map(humanize).join(", ") ?? "No receipt"}
                </dd>
              </div>
            </dl>
          </article>
          <article className={styles.detailCard}>
            <header>
              <div>
                <h2>Evidence timeline</h2>
                <p>{timeline.length} immutable local records.</p>
              </div>
            </header>
            <ol className={styles.evidence}>
              {timeline.map((item, index) => (
                <li key={item.id}>
                  <span />
                  <time>{String(index + 1).padStart(2, "0")}</time>
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </div>
                </li>
              ))}
            </ol>
          </article>
        </section>
      </div>
      <aside className={styles.rightColumn}>
        <section className={styles.sideCard}>
          <header>
            <h2>Agent roster</h2>
            <span>
              <i />
              {investigation.traces.length} recorded
            </span>
          </header>
          <ul>
            {investigation.traces.map((trace) => (
              <li key={trace.sequence}>
                <span className={styles.agentAvatar}>{trace.agent.slice(0, 2)}</span>
                <div>
                  <strong>{humanize(trace.agent)}</strong>
                  <small>Advisory context only</small>
                </div>
                <span className={styles.online}>
                  <i />
                  {humanize(trace.status)}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className={styles.sideCard}>
          <header>
            <h2>Shared budget</h2>
            <span>synthetic</span>
          </header>
          <div className={styles.budgetNumber}>
            <strong>
              {budget ? money(budget.availableMinor, request.currency) : "Unavailable"}
            </strong>
            <b>
              {budget ? `${((budget.availableMinor / budget.limitMinor) * 100).toFixed(1)}%` : "—"}
              <small>remaining</small>
            </b>
          </div>
          <div className={styles.budgetMeter}>
            <span
              style={{
                width: budget ? `${(budget.availableMinor / budget.limitMinor) * 100}%` : "0%",
              }}
            />
          </div>
          <dl className={styles.budgetFacts}>
            <div>
              <dt>Cost center</dt>
              <dd>{request.costCenter}</dd>
            </div>
            <div>
              <dt>Reservation</dt>
              <dd>
                {outcome === "DENY"
                  ? "Released"
                  : investigation.decision?.reservationId
                    ? "Held"
                    : "Not recorded"}
              </dd>
            </div>
          </dl>
        </section>
      </aside>
    </div>
  );
}

function Agents({ traces }: { traces: Trace[] }) {
  return (
    <section className={styles.pageView}>
      <p>Local advisory roles</p>
      <h1>Agent registry.</h1>
      <span>Each role can supply context, but none can alter the deterministic decision.</span>
      <div className={styles.agentGrid}>
        {traces.map((trace) => (
          <article key={trace.sequence}>
            <b>{trace.agent.slice(0, 2)}</b>
            <div>
              <h2>{humanize(trace.agent)}</h2>
              <p>
                {humanize(trace.status)} · {trace.durationMs} ms
              </p>
              <small>
                <i /> Persisted workflow trace
              </small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
function Evidence({ findings }: { findings: Investigation["findings"] }) {
  return (
    <section className={styles.pageView}>
      <p>Lifecycle reconciliation</p>
      <h1>Evidence, not decoration.</h1>
      <span>
        Findings compare synthetic authorization and settlement events without claiming external
        payment enforcement.
      </span>
      <div className={styles.ruleList}>
        {findings.length ? (
          findings.map((finding, index) => (
            <div key={finding.code}>
              <b>{index + 1}</b>
              <span>{finding.message}</span>
              <small>{finding.severity}</small>
            </div>
          ))
        ) : (
          <div>
            <b>1</b>
            <span>No lifecycle findings stored for this request.</span>
            <small>Pending</small>
          </div>
        )}
      </div>
    </section>
  );
}
function Composer({
  close,
  execute,
  result,
  runError,
  running,
  scenario,
  setScenario,
  executeStripeSandbox,
  stripeError,
  stripeResult,
  stripeRunning,
}: {
  close: () => void;
  execute: () => void;
  result: AgentResult | null;
  runError: string | null;
  running: boolean;
  scenario: number;
  setScenario: (value: number) => void;
  executeStripeSandbox: () => void;
  stripeError: string | null;
  stripeResult: StripeExecutionResult | null;
  stripeRunning: boolean;
}) {
  return (
    <div
      className={styles.workflowBackdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="workflow-title"
    >
      <section className={styles.workflow}>
        <button
          className={styles.close}
          onClick={close}
          type="button"
          aria-label="Close request composer"
        >
          ×
        </button>
        <p>Synthetic execution</p>
        <h2 id="workflow-title">New synthetic request</h2>
        <span>{requestComposerDescription}</span>
        <label className={styles.scenarioLabel} htmlFor="scenario">
          Scenario
        </label>
        <select
          id="scenario"
          value={scenario}
          onChange={(event) => setScenario(Number(event.target.value))}
        >
          {scenarios.map((item, index) => (
            <option key={item.requestId} value={index}>
              {item.title}
            </option>
          ))}
        </select>
        <div className={styles.taskBrief}>
          <b>
            {scenarios[scenario]?.vendor} · {money(scenarios[scenario]?.amountMinor ?? 0, "USD")}
          </b>
          <small>
            {scenarios[scenario]?.requestingAgent} · cost center {scenarios[scenario]?.costCenter}
          </small>
        </div>
        <button className={styles.runButton} disabled={running} onClick={execute} type="button">
          {running ? "Running advisory workflow…" : "Run advisory workflow"}
        </button>
        {running && (
          <small className={styles.note}>
            The configured advisory source is generating four short notes. A failure returns a clear
            message; it cannot approve this request.
          </small>
        )}
        {runError && (
          <div className={styles.unavailable} role="alert">
            <b>Workflow not started</b>
            <span>{runError}</span>
          </div>
        )}
        {result && (
          <div className={styles.workflowResult}>
            <header>
              <b>{result.decision}</b>
              <span>{result.reason}</span>
            </header>
            {result.traces.map((trace) => (
              <div key={trace.agent}>
                <strong>{trace.agent}</strong>
                <small>
                  {trace.durationMs} ms · {sourceLabel(trace.source)}
                </small>
                <p>{trace.summary}</p>
              </div>
            ))}
          </div>
        )}
        {stripeSandboxAvailability(result) && (
          <section className={styles.stripeSandbox} aria-live="polite">
            <strong>Stripe Sandbox evidence</strong>
            <p>
              This creates an unconfirmed test intent only. No card, confirmation, or money movement
              occurs.
            </p>
            <button
              className={styles.stripeButton}
              disabled={stripeRunning}
              onClick={executeStripeSandbox}
              type="button"
            >
              {stripeRunning
                ? "Creating unconfirmed test intent…"
                : "Create unconfirmed Stripe Sandbox intent"}
            </button>
            {stripeError && <span role="alert">{stripeError}</span>}
            {stripeResult && (
              <span>
                Evidence recorded · {stripeResult.providerStatus.replaceAll("_", " ")}
                {stripeResult.idempotent ? " · existing intent reused" : ""}
              </span>
            )}
          </section>
        )}
        <small className={styles.note}>
          Synthetic data only. No merchant, card, or payment credential is used.
        </small>
      </section>
    </div>
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
function State({ title, detail }: { title: string; detail: string }) {
  return (
    <section className={styles.pageView}>
      <p>Control Room status</p>
      <h1>{title}</h1>
      <span>{detail}</span>
    </section>
  );
}
