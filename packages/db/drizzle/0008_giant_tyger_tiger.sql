CREATE TYPE "public"."stripe_execution_status" AS ENUM('PENDING', 'CREATED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."stripe_webhook_disposition" AS ENUM('APPLIED', 'IGNORED', 'UNVERIFIED');--> statement-breakpoint
CREATE TABLE "stripe_provider_execution" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"workflow_id" text NOT NULL,
	"receipt_id" text NOT NULL,
	"request_hash" text NOT NULL,
	"execution_idempotency_key" text NOT NULL,
	"stripe_payment_intent_id" text,
	"amount_minor" bigint NOT NULL,
	"currency" text NOT NULL,
	"status" "stripe_execution_status" DEFAULT 'PENDING' NOT NULL,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stripe_execution_amount_positive" CHECK ("stripe_provider_execution"."amount_minor" > 0),
	CONSTRAINT "stripe_execution_iso_currency" CHECK ("stripe_provider_execution"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "stripe_webhook_receipt" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"stripe_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"execution_id" text,
	"disposition" "stripe_webhook_disposition" NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stripe_provider_execution" ADD CONSTRAINT "stripe_provider_execution_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_provider_execution" ADD CONSTRAINT "stripe_provider_execution_workflow_id_workflow_run_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflow_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_provider_execution" ADD CONSTRAINT "stripe_provider_execution_receipt_id_decision_receipt_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."decision_receipt"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_webhook_receipt" ADD CONSTRAINT "stripe_webhook_receipt_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_webhook_receipt" ADD CONSTRAINT "stripe_webhook_receipt_execution_id_stripe_provider_execution_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."stripe_provider_execution"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stripe_execution_idempotency_unique" ON "stripe_provider_execution" USING btree ("organization_id","execution_idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "stripe_execution_payment_intent_unique" ON "stripe_provider_execution" USING btree ("stripe_payment_intent_id") WHERE "stripe_provider_execution"."stripe_payment_intent_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "stripe_webhook_event_unique" ON "stripe_webhook_receipt" USING btree ("organization_id","stripe_event_id");