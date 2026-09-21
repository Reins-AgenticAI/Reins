import { closeDatabase, getDatabase, schema } from "@reins/db";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requireLocalTestDatabaseUrl } from "../../../../../../packages/db/test/database-target";

const fixture = vi.hoisted(() => ({
  organizationId: `org-scenario-test-${crypto.randomUUID()}`,
  budgetId: `budget-scenario-test-${crypto.randomUUID()}`,
}));

// Inject an isolated synthetic organization/budget and a simulation advisory client.
// The HTTP handler, workflow, decision stores and atomic PostgreSQL reservation remain real.
vi.mock("../agent-run/run-synthetic-task", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../agent-run/run-synthetic-task")>();
  const { createAdvisoryClient } = await import("@/lib/advisory-client");
  return {
    ...actual,
    syntheticOrganizationId: fixture.organizationId,
    syntheticBudgetId: fixture.budgetId,
    runSyntheticTask: (input: Parameters<typeof actual.runSyntheticTask>[0]) =>
      actual.runSyntheticTask(input, {
        ...fixture,
        advisoryClient: createAdvisoryClient({ LLM_PROVIDER: "simulation" }),
      }),
  };
});

import { POST } from "./route";

const databaseUrl = requireLocalTestDatabaseUrl(process.env.DATABASE_URL);
const request = (mode = "parallel", runId = "database-run") =>
  new Request("http://localhost/api/scenario-run", {
    method: "POST",
    body: JSON.stringify({ scenarioId: "quarter-close-spend-controls", mode, runId }),
  });

beforeEach(async () => {
  const database = getDatabase(databaseUrl);
  await database
    .insert(schema.organization)
    .values({ id: fixture.organizationId, name: "Synthetic scenario route test" });
  await database.insert(schema.budget).values({
    id: fixture.budgetId,
    organizationId: fixture.organizationId,
    name: "Synthetic isolated budget",
    currency: "USD",
    limitMinor: 50_000_000,
    availableMinor: 50_000_000,
  });
});
afterEach(async () => {
  await getDatabase(databaseUrl)
    .delete(schema.organization)
    .where(eq(schema.organization.id, fixture.organizationId));
});
afterAll(closeDatabase);

describe("PostgreSQL scenario route", () => {
  it.each(["parallel", "sequential"])(
    "persists the four %s outcomes and replays without reserving twice",
    async (mode) => {
      const response = await POST(request(mode));
      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.results.map((row: { decision: string }) => row.decision)).toEqual([
        "ALLOW",
        "ALLOW",
        "DENY",
        "ESCALATE",
      ]);
      expect(result.budget).toEqual({ limitMinor: 50_000_000, availableMinor: 48_716_000 });
      const replay = await POST(request(mode));
      expect(replay.status).toBe(200);
      const repeated = await replay.json();
      expect(repeated.results.map((row: { receiptId: string }) => row.receiptId)).toEqual(
        result.results.map((row: { receiptId: string }) => row.receiptId),
      );
      expect(repeated.budget).toEqual(result.budget);
      const receipts = await getDatabase()
        .select()
        .from(schema.decisionReceipt)
        .where(eq(schema.decisionReceipt.organizationId, fixture.organizationId));
      expect(receipts).toHaveLength(4);
    },
  );

  it("atomically lets only one parallel Datacore request hold the constrained budget and replays DENY", async () => {
    const database = getDatabase();
    await database
      .update(schema.budget)
      .set({ limitMinor: 500_000, availableMinor: 500_000 })
      .where(eq(schema.budget.id, fixture.budgetId));
    const response = await POST(request());
    expect(response.status).toBe(200);
    const result = await response.json();
    const outcomes = result.results.map((row: { decision: string }) => row.decision);
    expect(outcomes.filter((decision: string) => decision === "ALLOW")).toHaveLength(1);
    expect(outcomes.filter((decision: string) => decision === "DENY")).toHaveLength(3);
    const holds = await database
      .select()
      .from(schema.budgetReservation)
      .where(eq(schema.budgetReservation.organizationId, fixture.organizationId));
    expect(holds).toHaveLength(1);
    expect(holds[0]?.state).toBe("HELD");
    expect(result.budget.availableMinor).toBe(500_000 - (holds[0]?.amountMinor ?? 0));
    const replay = await POST(request());
    expect(replay.status).toBe(200);
    const repeated = await replay.json();
    expect(repeated.results.map((row: { decision: string }) => row.decision)).toEqual(outcomes);
    expect(repeated.budget).toEqual(result.budget);
  });
});
