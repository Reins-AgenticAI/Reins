import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ControlRoom,
  evidenceTimeline,
  RequestQueue,
  reconcileRunRows,
  runScenario,
  ScenarioControls,
  stripeSandboxAvailability,
} from "./control-room";

afterEach(() => vi.unstubAllGlobals());
describe("Control Room", () => {
  it("does not promote explicit partial-run failures after a matching ALLOW receipt refresh", async () => {
    vi.stubGlobal("fetch", async () =>
      Response.json(
        {
          runId: "run-1",
          results: [
            {
              requestId: "engineering:run-1",
              decision: "DENY",
              error: "TASK_UNAVAILABLE",
              traces: [],
            },
          ],
          budget: null,
        },
        { status: 503 },
      ),
    );
    const response = await runScenario("quarter-close-spend-controls", "parallel", "run-1");
    const request = {
      requestId: "engineering:run-1",
      title: "Developer-seat expansion",
      requestingAgent: "Engineering",
      vendor: "Datacore",
      amountMinor: 84000,
      currency: "USD",
      costCenter: "Engineering",
    };
    const saved = {
      workflow: { id: "persisted-allow", request, startedAt: "2026-09-21T10:00:00Z" },
      decision: {
        outcome: "ALLOW" as const,
        reasonCodes: [],
        policyVersionId: "policy",
        reservationId: "reservation",
        decidedAt: "2026-09-21T10:00:01Z",
      },
      traces: [],
      lifecycle: [],
      findings: [],
    };
    const rows = reconcileRunRows([{ ...request, error: response.results[0]?.error }], [saved]);
    expect(rows[0]?.error).toBe("TASK_UNAVAILABLE");
    expect(rows[0]?.decision).toBeUndefined();
    expect(
      renderToStaticMarkup(
        <RequestQueue
          rows={rows}
          selectedId={request.requestId}
          select={() => {}}
          running={false}
        />,
      ),
    ).toContain("UNAVAILABLE");
    expect(reconcileRunRows([{ ...request, error: "RESPONSE_UNKNOWN" }], [saved])[0]).toMatchObject(
      { decision: "ALLOW", workflowId: "persisted-allow", error: undefined },
    );
  });
  it("offers scenario modes and advisory-only registration without fault injection", () => {
    const html = renderToStaticMarkup(<ControlRoom />);
    for (const text of [
      "Quarter-close spend controls",
      "Parallel",
      "Sequential",
      "Add advisory agent",
    ])
      expect(html).toContain(text);
    expect(html).not.toMatch(/fault injection|Buy milk|Agent pool/i);
  });
  it("renders the four requesting agents as pending before any decision exists", () => {
    const html = renderToStaticMarkup(
      <RequestQueue rows={[]} selectedId="" select={() => {}} running={false} />,
    );
    for (const name of [
      "Engineering",
      "Research",
      "Platform",
      "Compliance",
      "AML data-provider exception",
      "Requesting agent",
      "NOT RUN",
    ])
      expect(html).toContain(name);
    expect(html).not.toContain(">ALLOW<");
  });
  it("disables scenario execution only while its run is active", () => {
    const props = {
      scenarioId: "quarter-close-spend-controls",
      mode: "parallel" as const,
      setScenarioId: () => {},
      setMode: () => {},
      execute: () => {},
    };
    expect(renderToStaticMarkup(<ScenarioControls {...props} running />)).toContain("disabled");
    expect(renderToStaticMarkup(<ScenarioControls {...props} running={false} />)).not.toContain(
      "disabled",
    );
  });
  it("preserves completed results from an HTTP 503 partial run", async () => {
    let command: unknown;
    vi.stubGlobal("fetch", async (_url: string, options: RequestInit) => {
      command = JSON.parse(options.body as string);
      return Response.json(
        {
          runId: "run-1",
          results: [
            {
              requestId: "engineering:run-1",
              decision: "ALLOW",
              workflowId: "wf-1",
              receiptId: "receipt-1",
              traces: [],
            },
            {
              requestId: "research:run-1",
              decision: "DENY",
              error: "TASK_UNAVAILABLE",
              traces: [],
            },
          ],
          budget: null,
        },
        { status: 503 },
      );
    });
    const result = await runScenario("quarter-close-spend-controls", "sequential", "run-1");
    expect(command).toEqual({
      scenarioId: "quarter-close-spend-controls",
      mode: "sequential",
      runId: "run-1",
    });
    expect(result.results[0]?.workflowId).toBe("wf-1");
    expect(result.results[1]?.error).toBe("TASK_UNAVAILABLE");
  });
  it("orders the run's persisted timestamped evidence across requests", () => {
    const investigation = (id: string, startedAt: string, decidedAt: string) => ({
      workflow: {
        id,
        startedAt,
        request: {
          requestId: id,
          title: id,
          requestingAgent: id,
          vendor: "Datacore",
          amountMinor: 100,
          currency: "USD",
          costCenter: "Ops",
        },
      },
      traces: [],
      lifecycle: [],
      findings: [],
      decision: {
        outcome: "ALLOW" as const,
        decidedAt,
        reasonCodes: [],
        policyVersionId: "p",
        reservationId: "r",
      },
    });
    expect(
      evidenceTimeline([
        investigation("a", "2026-09-21T10:00:00Z", "2026-09-21T10:00:03Z"),
        investigation("b", "2026-09-21T10:00:01Z", "2026-09-21T10:00:02Z"),
      ]).map((item) => item.workflowId),
    ).toEqual(["a", "b", "b", "a"]);
  });
  it("requires an ALLOW receipt for Stripe Sandbox", () => {
    expect(stripeSandboxAvailability({ decision: "ALLOW", workflowId: "wf", receiptId: "r" })).toBe(
      true,
    );
    expect(stripeSandboxAvailability({ decision: "DENY", workflowId: "wf", receiptId: "r" })).toBe(
      false,
    );
    expect(stripeSandboxAvailability({ decision: "ALLOW", workflowId: "wf" })).toBe(false);
  });
});
