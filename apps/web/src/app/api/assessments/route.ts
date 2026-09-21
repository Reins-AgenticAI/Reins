import { createAssessment, errorStatus, listAssessments } from "@/lib/assurance-service";

export async function GET(request: Request) {
  try {
    return Response.json(await listAssessments(request));
  } catch (error) {
    return Response.json({ error: "Authentication required" }, { status: errorStatus(error) });
  }
}

export async function POST(request: Request) {
  try {
    return Response.json(await createAssessment(request, await request.json()), { status: 201 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error && error.message === "AUTH_REQUIRED"
            ? "Authentication required"
            : "Invalid policy",
      },
      { status: errorStatus(error) },
    );
  }
}
