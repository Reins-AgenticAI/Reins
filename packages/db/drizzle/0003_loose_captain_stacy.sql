ALTER TABLE "budget_reservation" DROP CONSTRAINT "budget_reservation_budget_id_budget_id_fk";
--> statement-breakpoint
CREATE UNIQUE INDEX "budget_organization_identity_unique" ON "budget" USING btree ("id","organization_id");--> statement-breakpoint
ALTER TABLE "budget_reservation" ADD CONSTRAINT "budget_reservation_budget_organization_fk" FOREIGN KEY ("budget_id","organization_id") REFERENCES "public"."budget"("id","organization_id") ON DELETE restrict ON UPDATE no action;
