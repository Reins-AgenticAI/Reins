import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  append: vi.fn(),
  begin: vi.fn(),
  complete: vi.fn(),
  findReceipt: vi.fn(),
  insert: vi.fn(),
  release: vi.fn(),
  reserve: vi.fn(),
  saveReceipt: vi.fn(),
}));

vi.mock("@reins/db", () => ({
  getDatabase: vi.fn(() => ({
    insert: db.insert,
  })),
  PostgresDecisionStore: class {
    findReceiptByWorkflow = db.findReceipt;
    saveReceipt = db.saveReceipt;
  },
  PostgresEvidenceStore: class {
    append = db.append;
  },
  PostgresWorkflowStore: class {
    begin = db.begin;
    complete = db.complete;
  },
  releaseBudgetReservationInDatabase: db.release,
  reserveBudgetInDatabase: db.reserve,
  schema: { budget: {}, organization: {} },
}));

import { POST } from "./route";

const body = {
  requestId: "SR-2048",
  title: "Datacore data-platform renewal",
  agent: "Procurement Agent",
  vendor: "Datacore",
  category: "Data and research",
  amountMinor: 4_800_000,
  currency: "USD",
  costCenter: "482",
};

beforeEach(() => {
  vi.clearAllMocks();
  stubPersistence();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function stubPersistence() {
  db.insert.mockImplementation(() => ({
    values: () => ({ onConflictDoNothing: async () => undefined }),
  }));
  db.begin.mockImplementation(async (input) => ({
    created: true,
    workflow: { workflowId: input.workflowId, requestHash: input.requestHash },
  }));
  db.complete.mockImplementation(async (workflowId, _status, _traces, _completedAt) => ({
    workflowId,
    requestHash: "persisted-request-hash",
  }));
  db.reserve.mockResolvedValue({ outcome: "HELD", reservationId: "reservation-1" });
  db.saveReceipt.mockResolvedValue({ id: "receipt-1" });
  db.findReceipt.mockResolvedValue({
    id: "receipt-existing",
    decision: "DENY",
    reasonCodes: ["BUDGET_CONFLICT"],
  });
  db.append.mockResolvedValue(undefined);
  db.release.mockResolvedValue(undefined);
}

describe("POST /api/agent-run", () => {
  it("uses simulation by default and still persists the deterministic receipt", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/agent-run", { method: "POST", body: JSON.stringify(body) }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      decision: "ESCALATE",
      receiptId: "receipt-1",
      synthetic: true,
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(db.saveReceipt).toHaveBeenCalledOnce();
  });

  it("fails closed when Groq is selected without a server-only key", async () => {
    vi.stubEnv("LLM_PROVIDER", "groq");
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubGlobal("fetch", vi.fn());

    const response = await POST(
      new Request("http://localhost/api/agent-run", { method: "POST", body: JSON.stringify(body) }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "AI advisory unavailable" });
    expect(db.reserve).not.toHaveBeenCalled();
  });

  it("replays an existing workflow without a second reservation", async () => {
    db.begin.mockResolvedValue({
      created: false,
      workflow: { workflowId: "existing-workflow", requestHash: "persisted-request-hash" },
    });

    const response = await POST(
      new Request("http://localhost/api/agent-run", { method: "POST", body: JSON.stringify(body) }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      receiptId: "receipt-existing",
      workflowId: "existing-workflow",
      decision: "DENY",
    });
    expect(db.reserve).not.toHaveBeenCalled();
  });

  it("fails closed when an idempotent workflow has no persisted receipt", async () => {
    db.begin.mockResolvedValue({
      created: false,
      workflow: { workflowId: "existing-workflow", requestHash: "persisted-request-hash" },
    });
    db.findReceipt.mockResolvedValue(undefined);

    const response = await POST(
      new Request("http://localhost/api/agent-run", { method: "POST", body: JSON.stringify(body) }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "AI advisory unavailable" });
    expect(db.reserve).not.toHaveBeenCalled();
  });

  it("returns a deterministic escalation with model trace when the local model responds", async () => {
    vi.stubEnv("LLM_PROVIDER", "ollama");
    let payload: Record<string, unknown> | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_input: unknown, init?: RequestInit) => {
        payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return new Response(
          JSON.stringify({ response: "Synthetic context reviewed", model: "qwen3:4b" }),
          {
            status: 200,
          },
        );
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/agent-run", { method: "POST", body: JSON.stringify(body) }),
    );
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.decision).toBe("ESCALATE");
    expect(result.traces).toHaveLength(4);
    expect(result.synthetic).toBe(true);
    expect(db.reserve).toHaveBeenCalledOnce();
    expect(db.saveReceipt).toHaveBeenCalledOnce();
    expect(payload).toMatchObject({ think: false, options: { num_predict: 24, temperature: 0 } });
  });

  it("returns an unavailable result instead of a fabricated authorization when Ollama fails", async () => {
    vi.stubEnv("LLM_PROVIDER", "ollama");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED")));

    const response = await POST(
      new Request("http://localhost/api/agent-run", { method: "POST", body: JSON.stringify(body) }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "AI advisory unavailable" });
  });

  it("rejects malformed finance tasks before calling the model", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    for (const invalid of [null, {}, { ...body, title: "" }, { ...body, amountMinor: 1.5 }]) {
      const response = await POST(
        new Request("http://localhost/api/agent-run", {
          method: "POST",
          body: JSON.stringify(invalid),
        }),
      );
      expect(response.status).toBe(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails closed for non-success and malformed Ollama responses", async () => {
    vi.stubEnv("LLM_PROVIDER", "ollama");
    const responses = [
      new Response("model error", { status: 500 }),
      new Response(JSON.stringify({ response: 42 }), { status: 200 }),
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => responses.shift()),
    );

    for (const requestId of ["SR-error", "SR-malformed"]) {
      const response = await POST(
        new Request("http://localhost/api/agent-run", {
          method: "POST",
          body: JSON.stringify({ ...body, requestId }),
        }),
      );
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: "AI advisory unavailable" });
    }
  });

  it("releases a held reservation when deterministic policy denies the request", async () => {
    vi.stubEnv("LLM_PROVIDER", "ollama");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(
          () =>
            new Response(
              JSON.stringify({ response: "Synthetic context reviewed", model: "qwen3:4b" }),
            ),
        ),
    );

    const response = await POST(
      new Request("http://localhost/api/agent-run", {
        method: "POST",
        body: JSON.stringify({ ...body, requestId: "SR-deny", vendor: "BuildKit" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ decision: "DENY" });
    expect(db.release).toHaveBeenCalledOnce();
    expect(db.append).not.toHaveBeenCalled();
  });
});
