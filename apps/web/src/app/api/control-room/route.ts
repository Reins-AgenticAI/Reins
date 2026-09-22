import { getDatabase, PostgresEvidenceStore, schema } from "@reins/db";
import { and, desc, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const organizationId = process.env.REINS_SYNTHETIC_ORGANIZATION_ID ?? "org-m2-demo";
  const workflowId = url.searchParams.get("workflowId");
  try {
    const database = getDatabase();
    const evidence = new PostgresEvidenceStore(database);
    const workflows = workflowId
      ? [{ id: workflowId }]
      : await database
          .select({ id: schema.workflowRun.id })
          .from(schema.workflowRun)
          .where(eq(schema.workflowRun.organizationId, organizationId))
          .orderBy(desc(schema.workflowRun.startedAt), desc(schema.workflowRun.id))
          .limit(24);
    const investigations = await Promise.all(
      workflows.map(({ id }) => evidence.getInvestigation({ organizationId, workflowId: id })),
    );
    const [budget] = await database
      .select({
        limitMinor: schema.budget.limitMinor,
        availableMinor: schema.budget.availableMinor,
      })
      .from(schema.budget)
      .where(
        and(
          eq(schema.budget.organizationId, organizationId),
          eq(schema.budget.id, "budget-synthetic-shared"),
        ),
      )
      .limit(1);
    const [reservations] = await database
      .select({
        heldMinor:
          sql<number>`coalesce(sum(case when ${schema.budgetReservation.state} = 'HELD' then ${schema.budgetReservation.amountMinor} else 0 end), 0)`.mapWith(
            Number,
          ),
        committedMinor:
          sql<number>`coalesce(sum(case when ${schema.budgetReservation.state} = 'COMMITTED' then ${schema.budgetReservation.amountMinor} else 0 end), 0)`.mapWith(
            Number,
          ),
      })
      .from(schema.budgetReservation)
      .where(
        and(
          eq(schema.budgetReservation.organizationId, organizationId),
          eq(schema.budgetReservation.budgetId, "budget-synthetic-shared"),
        ),
      );
    return Response.json({
      synthetic: true,
      investigations,
      investigation: investigations[0] ?? null,
      budget: budget ? { ...budget, ...reservations } : null,
      rejectedMinor: investigations.reduce(
        (sum, item) =>
          sum + (item.decision?.outcome === "DENY" ? item.workflow.request.amountMinor : 0),
        0,
      ),
    });
  } catch {
    return Response.json({ error: "CONTROL_ROOM_UNAVAILABLE" }, { status: 503 });
  }
}
