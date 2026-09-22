const baseUrl = process.env.REINS_EVAL_URL ?? "http://127.0.0.1:3000";
const tasks = [
  ["EV-101", "Market data renewal", "Datacore", 4800000],
  ["EV-102", "Cloud capacity commitment", "BuildKit", 3600000],
  ["EV-103", "Security log retention", "Logline", 1200000],
].map(([requestId, title, vendor, amountMinor]) => ({
  requestId,
  title,
  agent: "Research Agent",
  vendor,
  category: "Technology",
  amountMinor,
  currency: "USD",
  costCenter: "482",
}));
const percentile = (values, p) =>
  values[Math.min(values.length - 1, Math.ceil(values.length * p) - 1)];
const startedAt = performance.now();
const results = await Promise.all(
  tasks.map(async (task) => {
    const started = performance.now();
    const response = await fetch(`${baseUrl}/api/agent-run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(task),
      signal: AbortSignal.timeout(120_000),
    }).catch(() => undefined);
    const durationMs = Math.round(performance.now() - started);
    const body = response ? await response.json().catch(() => null) : null;
    let traces = [];
    let error;
    if (!response?.ok || !body?.workflowId) {
      error = "WORKFLOW_UNAVAILABLE";
    } else {
      // Advisory summaries returned by agent-run do not carry execution status.
      // Read the durable investigation instead of inferring success from HTTP 200.
      const evidence = await fetch(
        `${baseUrl}/api/control-room?workflowId=${encodeURIComponent(body.workflowId)}`,
        { signal: AbortSignal.timeout(30_000) },
      ).catch(() => null);
      const persisted = evidence?.ok ? await evidence.json().catch(() => null) : null;
      const recorded = persisted?.investigation?.traces;
      if (!Array.isArray(recorded) || recorded.length === 0) {
        error = "PERSISTED_TRACES_MISSING";
      } else if (
        recorded.some((trace) => typeof trace?.status !== "string" || !trace.status.trim())
      ) {
        error = "PERSISTED_TRACE_STATUS_MISSING";
      } else {
        traces = recorded;
      }
    }
    return { requestId: task.requestId, status: response?.status ?? 0, durationMs, traces, error };
  }),
);
const successful = results.filter((result) => result.status === 200 && !result.error);
const durations = successful.map((result) => result.durationMs).sort((a, b) => a - b);
const agentTraces = successful.flatMap((result) => result.traces);
const report = {
  synthetic: true,
  totalDurationMs: Math.round(performance.now() - startedAt),
  attemptedWorkflows: results.length,
  completedWorkflows: successful.length,
  unavailableWorkflows: results.length - successful.length,
  workflowLatencyMs: durations.length
    ? {
        p50: percentile(durations, 0.5),
        p95: percentile(durations, 0.95),
        p99: percentile(durations, 0.99),
      }
    : null,
  agentTraceCount: agentTraces.length,
  timeoutRate: agentTraces.length
    ? agentTraces.filter((trace) => trace.status === "TIMED_OUT").length / agentTraces.length
    : null,
  outcomes: results.map(({ requestId, status, durationMs, traces, error }) => ({
    requestId,
    status,
    durationMs,
    traceStatuses: traces.map((trace) => trace.status),
    error,
  })),
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = successful.length === results.length ? 0 : 1;
