CREATE TYPE "public"."approval_record_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."decision_outcome" AS ENUM('ALLOW', 'ESCALATE', 'DENY');--> statement-breakpoint
CREATE TABLE "decision_receipt" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"workflow_id" text NOT NULL,
	"request_hash" text NOT NULL,
	"policy_version_id" text NOT NULL,
	"policy_digest" text NOT NULL,
	"evaluator_version" text NOT NULL,
	"reservation_id" text NOT NULL,
	"approval_id" text,
	"decision" "decision_outcome" NOT NULL,
	"reason_codes" jsonb NOT NULL,
	"digest" text NOT NULL,
	"decided_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "human_approval" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"workflow_id" text NOT NULL,
	"request_hash" text NOT NULL,
	"policy_version_id" text NOT NULL,
	"status" "approval_record_status" NOT NULL,
	"requested_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"approver_id" text,
	"decided_at" timestamp with time zone,
	CONSTRAINT "human_approval_expiry_after_request" CHECK ("human_approval"."expires_at" > "human_approval"."requested_at"),
	CONSTRAINT "human_approval_state_consistent" CHECK (("human_approval"."status" = 'PENDING' AND "human_approval"."approver_id" IS NULL AND "human_approval"."decided_at" IS NULL) OR ("human_approval"."status" IN ('APPROVED', 'REJECTED') AND "human_approval"."approver_id" IS NOT NULL AND "human_approval"."decided_at" IS NOT NULL) OR ("human_approval"."status" = 'EXPIRED'))
);
--> statement-breakpoint
ALTER TABLE "decision_receipt" ADD CONSTRAINT "decision_receipt_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_receipt" ADD CONSTRAINT "decision_receipt_workflow_id_workflow_run_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflow_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_receipt" ADD CONSTRAINT "decision_receipt_approval_id_human_approval_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."human_approval"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "human_approval" ADD CONSTRAINT "human_approval_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "human_approval" ADD CONSTRAINT "human_approval_workflow_id_workflow_run_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflow_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "decision_receipt_workflow_digest_unique" ON "decision_receipt" USING btree ("workflow_id","digest");