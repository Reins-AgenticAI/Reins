import { beforeEach, describe, expect, it, vi } from "vitest";

const { select, getInvestigation, queries } = vi.hoisted(() => ({
  select: vi.fn(),
  getInvestigation: vi.fn(),
  queries: [] as unknown[],
}));
vi.mock("@reins/db", async (original) => ({
  ...(await original<typeof import("@reins/db")>()),
  getDatabase: () => ({ select }),
  PostgresEvidenceStore: class {
    getInvestigation = getInvestigation;
  },
}));
describe("GET /api/control-room", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queries.length = 0;
    const responses = [
      [{ id: "new" }, { id: "old" }],
      [{ limitMinor: 10000, availableMinor: 6000 }],
      [{ committedMinor: 1000, heldMinor: 3000 }],
    ];
    select.mockImplementation(() => {
      const rows = responses.shift();
      const builder = {
        from: () => builder,
        where: () => builder,
        orderBy: () => builder,
        limit: (n: number) => {
          queries.push(n);
          return Promise.resolve(rows);
        },
        // biome-ignore lint/suspicious/noThenProperty: Drizzle query builders intentionally implement PromiseLike.
        then: (resolve: (value: unknown) => void) => Promise.resolve(rows).then(resolve),
      };
      return builder;
    });
    getInvestigation.mockImplementation(async ({ workflowId }) => ({
      workflow: { id: workflowId, request: { amountMinor: 500 } },
      decision: { outcome: workflowId === "old" ? "DENY" : "ALLOW" },
      lifecycle: [],
      findings: [],
    }));
  });
  it("returns a bounded ordered queue with current held and committed budget", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/control-room?organizationId=other-org"),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      investigations: [{ workflow: { id: "new" } }, { workflow: { id: "old" } }],
      budget: { availableMinor: 6000, committedMinor: 1000, heldMinor: 3000 },
      rejectedMinor: 500,
    });
    expect(queries).toContain(24);
    expect(getInvestigation).toHaveBeenCalledWith({
      organizationId: "org-m2-demo",
      workflowId: "new",
    });
  });
  it("fails closed when evidence cannot be read", async () => {
    getInvestigation.mockRejectedValue(new Error("unavailable"));
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/control-room"));
    expect(response.status).toBe(503);
  });
});
