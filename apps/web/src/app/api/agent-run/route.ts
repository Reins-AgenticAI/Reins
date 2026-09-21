import { runSyntheticTask, validTask } from "./run-synthetic-task";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!validTask(body))
    return Response.json({ error: "Invalid synthetic finance task" }, { status: 400 });
  try {
    return Response.json(await runSyntheticTask(body));
  } catch {
    return Response.json({ error: "AI advisory unavailable" }, { status: 503 });
  }
}
