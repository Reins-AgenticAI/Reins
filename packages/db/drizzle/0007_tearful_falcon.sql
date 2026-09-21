CREATE TYPE "public"."lifecycle_event_kind" AS ENUM('AUTHORIZATION', 'CAPTURE', 'SETTLEMENT', 'REVERSAL', 'REFUND', 'ORDER');--> statement-breakpoint
CREATE TYPE "public"."lifecycle_event_source" AS ENUM('POLICY', 'PROVIDER', 'MERCHANT');--> statement-breakpoint
CREATE TABLE "lifecycle_event" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"workflow_id" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"kind" "lifecycle_event_kind" NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" text NOT NULL,
	"source" "lifecycle_event_source" NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"parent_event_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lifecycle_event_amount_positive" CHECK ("lifecycle_event"."amount_minor" > 0),
	CONSTRAINT "lifecycle_event_iso_currency" CHECK ("lifecycle_event"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
ALTER TABLE "lifecycle_event" ADD CONSTRAINT "lifecycle_event_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lifecycle_event" ADD CONSTRAINT "lifecycle_event_workflow_id_workflow_run_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflow_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lifecycle_event_workflow_provider_event_unique" ON "lifecycle_event" USING btree ("workflow_id","provider_event_id");