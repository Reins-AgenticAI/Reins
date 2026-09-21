CREATE TYPE "public"."workflow_run_status" AS ENUM('RUNNING', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."workflow_trace_status" AS ENUM('SUCCEEDED', 'MALFORMED', 'FAILED', 'TIMED_OUT', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "workflow_event" (
	"id" text PRIMARY KEY NOT NULL,
	"workflow_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"agent" text NOT NULL,
	"status" "workflow_trace_status" NOT NULL,
	"duration_ms" integer NOT NULL,
	"output" jsonb,
	"error_code" text,
	"occurred_at" timestamp with time zone NOT NULL,
	CONSTRAINT "workflow_event_sequence_positive" CHECK ("workflow_event"."sequence" > 0),
	CONSTRAINT "workflow_event_duration_non_negative" CHECK ("workflow_event"."duration_ms" >= 0)
);
--> statement-breakpoint
CREATE TABLE "workflow_run" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"request" jsonb NOT NULL,
	"status" "workflow_run_status" DEFAULT 'RUNNING' NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "workflow_event" ADD CONSTRAINT "workflow_event_workflow_id_workflow_run_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflow_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_run" ADD CONSTRAINT "workflow_run_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_event_workflow_sequence_unique" ON "workflow_event" USING btree ("workflow_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_run_idempotency_unique" ON "workflow_run" USING btree ("organization_id","idempotency_key");