CREATE TYPE "public"."budget_reservation_state" AS ENUM('HELD', 'COMMITTED', 'RELEASED', 'EXPIRED');--> statement-breakpoint
CREATE TABLE "budget" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"currency" text NOT NULL,
	"limit_minor" bigint NOT NULL,
	"available_minor" bigint NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_limit_non_negative" CHECK ("budget"."limit_minor" >= 0),
	CONSTRAINT "budget_available_within_limit" CHECK ("budget"."available_minor" >= 0 AND "budget"."available_minor" <= "budget"."limit_minor")
);
--> statement-breakpoint
CREATE TABLE "budget_reservation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"budget_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"state" "budget_reservation_state" DEFAULT 'HELD' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_reservation_amount_positive" CHECK ("budget_reservation"."amount_minor" > 0)
);
--> statement-breakpoint
ALTER TABLE "budget" ADD CONSTRAINT "budget_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_reservation" ADD CONSTRAINT "budget_reservation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_reservation" ADD CONSTRAINT "budget_reservation_budget_id_budget_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budget"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "budget_organization_name_unique" ON "budget" USING btree ("organization_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "budget_reservation_idempotency_unique" ON "budget_reservation" USING btree ("organization_id","idempotency_key");