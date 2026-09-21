import { getDatabase, PostgresEvidenceStore, schema } from "@reins/db";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const organizationId =
    url.searchParams.get("organizationId") ??
    process.env.REINS_SYNTHETIC_ORGANIZATION_ID ??
    "org-m2-demo";
  const workflowId = url.searchParams.get("workflowId");
  try {
    const database = getDatabase();
    const evidence = new PostgresEvidenceStore(database);
    const investigation = workflowId
      ? await evidence.getInvestigation({ organizationId, workflowId })
      : await evidence.findLatest({ organizationId });
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
    return Response.json({
      synthetic: true,
      investigation: investigation ?? null,
      budget: budget ?? null,
    });
  } catch {
    return Response.json({ error: "CONTROL_ROOM_UNAVAILABLE" }, { status: 503 });
  }
}
