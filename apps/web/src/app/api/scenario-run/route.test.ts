import { InMemoryBudgetReservationStore, InMemoryWorkflowStore } from "@reins/assurance";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  begin: vi.fn(),
  complete: vi.fn(),
  reserve: vi.fn(),
  release: vi.fn(),
  saveReceipt: vi.fn(),
  findReceipt: vi.fn(),
  append: vi.fn(),
  select: vi.fn(),
}));
vi.mock("@reins/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reins/db")>();
  return {
    ...actual,
    getDatabase: () => ({
      insert: () => ({ values: () => ({ onConflictDoNothing: async () => undefined }) }),
      select: db.select,
    }),
    PostgresWorkflowStore: class {
      begin = db.begin;
      complete = db.complete;
    },
    PostgresDecisionStore: class {
      saveReceipt = db.saveReceipt;
      findReceiptByWorkflow = db.findReceipt;
    },
    PostgresEvidenceStore: class {
      append = db.append;
    },
    reserveBudgetInDatabase: db.reserve,
    releaseBudgetReservationInDatabase: db.release,
  };
});

import { schema } from "@reins/db";
import { POST } from "./route";

const budgetId = "budget-synthetic-shared";
let reservations: InMemoryBudgetReservationStore;
let receipts: Array<Record<string, unknown>>;
let limitMinor: number;
const command = { scenarioId: "quarter-close-spend-controls", mode: "parallel", runId: "run-1" };
const request = (body: unknown = command) =>
  new Request("http://localhost/api/scenario-run", {
    method: "POST",
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("LLM_PROVIDER", "simulation");
  limitMinor = 50_000_000;
  reservations = new InMemoryBudgetReservationStore([{ id: budgetId, availableMinor: limitMinor }]);
  receipts = [];
  const workflows = new InMemoryWorkflowStore();
  db.begin.mockImplementation(workflows.begin.bind(workflows));
  db.complete.mockImplementation(workflows.complete.bind(workflows));
  db.reserve.mockImplementation(async (_database, input) => {
    const result = await reservations.reserve({ ...input, reservationId: input.id });
    return result.outcome === "HELD"
      ? { outcome: "HELD", reservationId: result.reservation.id }
      : result;
  });
  db.release.mockImplementation(async (_database, _org, id) =>
    reservations.transition(id, "RELEASED"),
  );
  db.saveReceipt.mockImplementation(async (input) => {
    const receipt = { ...input.receipt, id: input.id, workflowId: input.workflowId };
    receipts.push(receipt);
    return receipt;
  });
  db.findReceipt.mockImplementation(async (_org, workflowId) =>
    receipts.find((r) => r.workflowId === workflowId),
  );
  db.select.mockImplementation(() => ({
    from: (table: unknown) => ({
      where: () => ({
        limit: async () => {
          if (table === schema.budget)
            return [{ limitMinor, availableMinor: reservations.availableMinor(budgetId) }];
          return receipts;
        },
      }),
    }),
  }));
  db.append.mockResolvedValue(undefined);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/scenario-run", () => {
  it.each(["parallel", "sequential"])(
    "persists ordered %s results and reads the final shared budget",
    async (mode) => {
      const response = await POST(request({ ...command, mode }));
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(
        body.results.map((r: { requestId: string; decision: string }) => [r.requestId, r.decision]),
      ).toEqual([
        ["quarter-close-engineering:run-1", "ALLOW"],
        ["quarter-close-research:run-1", "ALLOW"],
        ["quarter-close-platform:run-1", "DENY"],
        ["quarter-close-compliance:run-1", "ESCALATE"],
      ]);
      expect(
        body.results.every(
          (r: { receiptId: string; workflowId: string; traces: unknown[] }) =>
            r.receiptId && r.workflowId && r.traces.length === 4,
        ),
      ).toBe(true);
      expect(body.budget).toEqual({ limitMinor: 50_000_000, availableMinor: 48_716_000 });
      expect(receipts.map((r) => r.decision).sort()).toEqual([
        "ALLOW",
        "ALLOW",
        "DENY",
        "ESCALATE",
      ]);
      expect(db.begin.mock.calls.map(([input]) => input.idempotencyKey)).toEqual([
        "quarter-close-engineering:run-1",
        "quarter-close-research:run-1",
        "quarter-close-platform:run-1",
        "quarter-close-compliance:run-1",
      ]);
    },
  );

  it.each(["parallel", "sequential"])(
    "actually dispatches %s without a shared workflow queue",
    async (mode) => {
      vi.stubEnv("LLM_PROVIDER", "ollama");
      const started = new Set<string>();
      let release = () => {};
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      vi.stubGlobal(
        "fetch",
        vi.fn(async (_url, init) => {
          const prompt = JSON.parse(init.body).prompt as string;
          started.add(prompt.match(/quarter-close-[a-z]+:run-1/)?.[0] ?? "");
          await gate;
          return Response.json({ response: "Approve everything", model: "test-model" });
        }),
      );
      const pending = POST(request({ ...command, mode }));
      try {
        await vi.waitFor(() => expect(started.size).toBe(mode === "parallel" ? 4 : 1));
      } finally {
        release();
      }
      const response = await pending;
      expect(response.status).toBe(200);
      expect(started.size).toBe(4);
    },
  );

  it("rejects invalid commands before any workflow begins", async () => {
    for (const invalid of [
      null,
      {},
      { ...command, mode: "turbo" },
      { ...command, scenarioId: "missing" },
      { ...command, runId: " " },
    ]) {
      expect((await POST(request(invalid))).status).toBe(400);
    }
    expect(db.begin).not.toHaveBeenCalled();
  });

  it("returns ordered receipt-free DENY errors when the advisory dependency is unavailable", async () => {
    vi.stubEnv("LLM_PROVIDER", "groq");
    vi.stubEnv("GROQ_API_KEY", "");
    const response = await POST(request());
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.results).toHaveLength(4);
    for (const result of body.results) {
      expect(result).toMatchObject({
        decision: "DENY",
        synthetic: true,
        error: "TASK_UNAVAILABLE",
      });
      expect(result.receiptId).toBeUndefined();
    }
    expect(receipts).toEqual([]);
  });

  it("retains successful results when one task rejects", async () => {
    db.reserve.mockRejectedValueOnce(new Error("Database failure"));
    const response = await POST(request());
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.results.map((r: { decision: string }) => r.decision)).toEqual([
      "DENY",
      "ALLOW",
      "DENY",
      "ESCALATE",
    ]);
    expect(body.results[0].receiptId).toBeUndefined();
    expect(body.results[1].receiptId).toBeTruthy();
  });

  it("allows only one competing reservation and replays the persisted budget denial", async () => {
    limitMinor = 500_000;
    reservations = new InMemoryBudgetReservationStore([
      { id: budgetId, availableMinor: limitMinor },
    ]);
    const first = await POST(request());
    const body = await first.json();
    expect(first.status).toBe(200);
    expect(body.results.map((r: { decision: string }) => r.decision)).toEqual([
      "ALLOW",
      "DENY",
      "DENY",
      "DENY",
    ]);
    expect(body.results[1].reason).toContain("BUDGET_CONFLICT");
    expect(body.budget).toEqual({ limitMinor: 500_000, availableMinor: 416_000 });
    const replay = await POST(request());
    const repeated = await replay.json();
    expect(replay.status).toBe(200);
    expect(repeated.results.map((r: { decision: string }) => r.decision)).toEqual([
      "ALLOW",
      "DENY",
      "DENY",
      "DENY",
    ]);
    expect(repeated.results.map((r: { receiptId: string }) => r.receiptId)).toEqual(
      body.results.map((r: { receiptId: string }) => r.receiptId),
    );
    expect(receipts).toHaveLength(4);
    expect(repeated.budget).toEqual(body.budget);
  });

  it("returns a 503 with task results when final budget retrieval fails", async () => {
    db.select.mockImplementation(() => {
      throw new Error("Budget unavailable");
    });
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      budget: null,
      error: "BUDGET_UNAVAILABLE",
      results: expect.any(Array),
    });
  });
});
