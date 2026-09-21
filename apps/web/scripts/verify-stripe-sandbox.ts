import Stripe from "stripe";

if (process.env.RUN_STRIPE_SANDBOX_TEST !== "1")
  throw new Error(
    "Set RUN_STRIPE_SANDBOX_TEST=1 to create a Stripe Sandbox-only verification intent",
  );
if (process.env.STRIPE_MODE !== "test") throw new Error("STRIPE_MODE must be test");
if (!process.env.STRIPE_SECRET_KEY?.startsWith("rk_test_"))
  throw new Error("STRIPE_SECRET_KEY must be a restricted Stripe test key");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const idempotencyKey = `reins-sandbox-verify-${Date.now()}`;
const intent = await stripe.paymentIntents.create(
  {
    amount: 100,
    currency: "usd",
    metadata: { reins_sandbox_verification: "true" },
  },
  { idempotencyKey },
);
const verified = await stripe.paymentIntents.retrieve(intent.id);
console.log(
  JSON.stringify({
    created: true,
    idSuffix: verified.id.slice(-6),
    status: verified.status,
    amountMinor: verified.amount,
    currency: verified.currency.toUpperCase(),
  }),
);
