import { getScenario } from "@reins/assurance";
import { getDatabase, schema } from "@reins/db";
import { and, eq } from "drizzle-orm";
import {
  runSyntheticTask,
  syntheticBudgetId,
  syntheticOrganizationId,
} from "../agent-run/run-synthetic-task";

export async function POST(request: Request) {
  const command: unknown = await request.json().catch(() => null);
  if (!command || typeof command !== "object")
    return Response.json({ error: "Invalid scenario command" }, { status: 400 });
  const { scenarioId, mode, runId } = command as Record<string, unknown>;
  if (
    typeof scenarioId !== "string" ||
    (mode !== "parallel" && mode !== "sequential") ||
    typeof runId !== "string" ||
    !runId.trim() ||
    runId.length > 128
  )
    return Response.json({ error: "Invalid scenario command" }, { status: 400 });
  const scenario = getScenario(scenarioId, runId);
  if (!scenario) return Response.json({ error: "Unknown scenario" }, { status: 400 });

  const settled: PromiseSettledResult<Awaited<ReturnType<typeof runSyntheticTask>>>[] = [];
  if (mode === "parallel") {
    settled.push(
      ...(await Promise.allSettled(scenario.requests.map((task) => runSyntheticTask(task)))),
    );
  } else {
    for (const task of scenario.requests) {
      try {
        settled.push({ status: "fulfilled", value: await runSyntheticTask(task) });
      } catch (reason) {
        settled.push({ status: "rejected", reason });
      }
    }
  }
  const results = scenario.requests.map((task, index) => ({
    requestId: task.requestId,
    ...(settled[index]?.status === "fulfilled"
      ? settled[index].value
      : {
          decision: "DENY" as const,
          reason: "Synthetic task unavailable",
          traces: [],
          error: "TASK_UNAVAILABLE",
          synthetic: true as const,
        }),
  }));
  const response = { scenarioId, mode, runId, synthetic: true, results };
  try {
    const [budget] = await getDatabase()
      .select({
        limitMinor: schema.budget.limitMinor,
        availableMinor: schema.budget.availableMinor,
      })
      .from(schema.budget)
      .where(
        and(
          eq(schema.budget.organizationId, syntheticOrganizationId),
          eq(schema.budget.id, syntheticBudgetId),
        ),
      )
      .limit(1);
    if (!budget) throw new Error("Shared budget missing");
    return Response.json(
      { ...response, budget },
      { status: settled.some((result) => result.status === "rejected") ? 503 : 200 },
    );
  } catch {
    return Response.json(
      { ...response, budget: null, error: "BUDGET_UNAVAILABLE" },
      { status: 503 },
    );
  }
}
