import { beforeEach, describe, expect, it, vi } from "vitest";

const findLatest = vi.fn();
const getInvestigation = vi.fn();
const limit = vi.fn();
const where = vi.fn(() => ({ limit }));
const from = vi.fn(() => ({ where }));
const select = vi.fn(() => ({ from }));

vi.mock("@reins/db", () => ({
  getDatabase: vi.fn(() => ({ select })),
  PostgresEvidenceStore: class {
    findLatest = findLatest;
    getInvestigation = getInvestigation;
  },
  schema: {
    budget: {
      availableMinor: "availableMinor",
      id: "id",
      limitMinor: "limitMinor",
      organizationId: "organizationId",
    },
  },
}));

describe("GET /api/control-room", () => {
  beforeEach(() => {
    findLatest.mockReset();
    getInvestigation.mockReset();
    limit.mockReset();
    limit.mockResolvedValue([{ limitMinor: 50_000_000, availableMinor: 49_916_000 }]);
  });

  it("returns the latest persisted synthetic investigation", async () => {
    findLatest.mockResolvedValue({ workflow: { id: "workflow-1" }, lifecycle: [], findings: [] });
    const { GET } = await import("./route");

    const response = await GET(
      new Request("http://localhost/api/control-room?organizationId=org-1"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      synthetic: true,
      investigation: { workflow: { id: "workflow-1" } },
      budget: { limitMinor: 50_000_000, availableMinor: 49_916_000 },
    });
  });

  it("fails closed when the stored investigation cannot be read", async () => {
    findLatest.mockRejectedValue(new Error("database unavailable"));
    const { GET } = await import("./route");

    const response = await GET(new Request("http://localhost/api/control-room"));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "CONTROL_ROOM_UNAVAILABLE" });
  });
});
