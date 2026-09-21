import { createPolicyAgent, normalizePolicy } from "@reins/assurance";

export async function POST(request: Request) {
  try {
    const { instruction } = (await request.json()) as { instruction?: string };
    if (!instruction?.trim())
      return Response.json({ error: "Instruction is required" }, { status: 400 });
    const result = await createPolicyAgent().draft(instruction);
    return Response.json({ ...result, policy: normalizePolicy(result.draft) });
  } catch {
    return Response.json({ error: "Policy draft could not be validated" }, { status: 422 });
  }
}
