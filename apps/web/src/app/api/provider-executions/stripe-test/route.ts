import { getDatabase, PostgresEvidenceStore, PostgresStripeExecutionStore } from "@reins/db";
import { createStripePaymentProvider } from "@/lib/stripe-payment-provider";
import { executeStripeTestRequest } from "@/lib/stripe-test-execution";

const organizationId = "org-m2-demo";

function validBody(value: unknown): value is Readonly<{ workflowId: string; receiptId: string }> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).workflowId === "string" &&
    typeof (value as Record<string, unknown>).receiptId === "string"
  );
}

export async function POST(request: Request) {
  if (process.env.STRIPE_TEST_EXECUTION_ENABLED !== "true")
    return Response.json(
      { error: "Stripe Sandbox execution is disabled for this deployment" },
      { status: 503 },
    );
  const body = await request.json().catch(() => null);
  if (!validBody(body))
    return Response.json({ error: "Invalid provider execution request" }, { status: 400 });
  const database = getDatabase();
  const executions = new PostgresStripeExecutionStore(database);
  const evidence = new PostgresEvidenceStore(database);
  try {
    const result = await executeStripeTestRequest(body, {
      loadBinding: (input) =>
        executions.loadAllowedBinding(organizationId, input.workflowId, input.receiptId),
      beginExecution: (input) => executions.beginExecution(input),
      completeExecution: (id, paymentIntentId, status) =>
        executions.completeExecution(id, paymentIntentId, status),
      failExecution: (id, errorCode) => executions.failExecution(id, errorCode),
      appendEvidence: (input) => evidence.append(input),
      provider: createStripePaymentProvider(),
      now: () => new Date().toISOString(),
    });
    return Response.json(result, { status: result.idempotent ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe provider unavailable";
    if (message.includes("bound ALLOW") || message.includes("pending or failed"))
      return Response.json({ error: "Execution requires a bound ALLOW receipt" }, { status: 409 });
    if (message.includes("STRIPE_"))
      return Response.json({ error: "Stripe test provider unavailable" }, { status: 503 });
    if (message.includes("provider unavailable"))
      return Response.json({ error: "Stripe test execution failed" }, { status: 502 });
    return Response.json({ error: "Stripe test execution failed" }, { status: 502 });
  }
}
