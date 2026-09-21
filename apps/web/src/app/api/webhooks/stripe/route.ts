import { getDatabase, PostgresEvidenceStore, PostgresStripeExecutionStore } from "@reins/db";
import Stripe from "stripe";
import { processStripeWebhook } from "@/lib/stripe-webhook";

const organizationId = "org-m2-demo";

function webhookEnvironment(environment = process.env) {
  if (environment.STRIPE_MODE !== "test") throw new Error("STRIPE_MODE must be test");
  if (!environment.STRIPE_SECRET_KEY?.startsWith("rk_test_"))
    throw new Error("STRIPE_SECRET_KEY must be a restricted test key");
  if (!environment.STRIPE_WEBHOOK_SECRET) throw new Error("STRIPE_WEBHOOK_SECRET is required");
  return Object.freeze({
    key: environment.STRIPE_SECRET_KEY,
    secret: environment.STRIPE_WEBHOOK_SECRET,
  });
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature)
    return Response.json({ error: "Missing Stripe webhook signature" }, { status: 400 });
  try {
    const environment = webhookEnvironment();
    const stripe = new Stripe(environment.key);
    const database = getDatabase();
    const executions = new PostgresStripeExecutionStore(database);
    const evidence = new PostgresEvidenceStore(database);
    const result = await processStripeWebhook(await request.text(), signature, {
      organizationId,
      webhookSecret: environment.secret,
      constructEvent: (payload, eventSignature, secret) =>
        stripe.webhooks.constructEvent(payload, eventSignature, secret),
      findExecutionByIntent: (paymentIntentId) => executions.findExecutionByIntent(paymentIntentId),
      recordWebhookReceipt: (input) => executions.recordWebhookReceipt(input),
      appendEvidence: (input) => evidence.append(input),
    });
    return Response.json({ received: true, disposition: result.disposition });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe webhook processing failed";
    if (message.includes("signature verification failed"))
      return Response.json({ error: "Invalid Stripe webhook signature" }, { status: 400 });
    if (message.includes("STRIPE_"))
      return Response.json({ error: "Stripe webhook configuration unavailable" }, { status: 503 });
    return Response.json({ error: "Stripe webhook processing failed" }, { status: 500 });
  }
}
