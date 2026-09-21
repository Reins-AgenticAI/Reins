import { errorStatus, getEvidence } from "@/lib/assurance-service";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    return Response.json(await getEvidence(request, (await context.params).id));
  } catch (error) {
    return Response.json({ error: "Evidence unavailable" }, { status: errorStatus(error) });
  }
}
