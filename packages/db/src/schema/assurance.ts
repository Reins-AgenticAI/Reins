import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const organizationMember = pgTable(
  "organization_member",
  {
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("owner"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({ pk: primaryKey({ columns: [table.organizationId, table.userId] }) }),
);
export const assurancePolicy = pgTable("assurance_policy", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const assurancePolicyVersion = pgTable(
  "assurance_policy_version",
  {
    id: text("id").primaryKey(),
    policyId: text("policy_id")
      .notNull()
      .references(() => assurancePolicy.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    canonical: jsonb("canonical").notNull(),
    digest: text("digest").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    versionUnique: uniqueIndex("assurance_policy_version_unique").on(table.policyId, table.version),
  }),
);
export const coverageAssessment = pgTable("coverage_assessment", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  policyVersionId: text("policy_version_id")
    .notNull()
    .references(() => assurancePolicyVersion.id, { onDelete: "cascade" }),
  providerKey: text("provider_key").notNull(),
  providerDigest: text("provider_digest").notNull(),
  result: jsonb("result").notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const scenarioRun = pgTable("scenario_run", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  policyVersionId: text("policy_version_id")
    .notNull()
    .references(() => assurancePolicyVersion.id, { onDelete: "cascade" }),
  result: jsonb("result").notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const evidenceManifest = pgTable("evidence_manifest", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  policyVersionId: text("policy_version_id")
    .notNull()
    .references(() => assurancePolicyVersion.id, { onDelete: "cascade" }),
  manifest: jsonb("manifest").notNull(),
  digest: text("digest").notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const budgetReservationState = pgEnum("budget_reservation_state", [
  "HELD",
  "COMMITTED",
  "RELEASED",
  "EXPIRED",
]);

export const budget = pgTable(
  "budget",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    currency: text("currency").notNull(),
    limitMinor: bigint("limit_minor", { mode: "number" }).notNull(),
    availableMinor: bigint("available_minor", { mode: "number" }).notNull(),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    organizationNameUnique: uniqueIndex("budget_organization_name_unique").on(
      table.organizationId,
      table.name,
    ),
    organizationIdentityUnique: uniqueIndex("budget_organization_identity_unique").on(
      table.id,
      table.organizationId,
    ),
    nonNegativeLimit: check("budget_limit_non_negative", sql`${table.limitMinor} >= 0`),
    availableWithinLimit: check(
      "budget_available_within_limit",
      sql`${table.availableMinor} >= 0 AND ${table.availableMinor} <= ${table.limitMinor}`,
    ),
  }),
);

export const budgetReservation = pgTable(
  "budget_reservation",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    budgetId: text("budget_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    state: budgetReservationState("state").notNull().default("HELD"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    idempotencyUnique: uniqueIndex("budget_reservation_idempotency_unique").on(
      table.organizationId,
      table.idempotencyKey,
    ),
    budgetOrganizationReference: foreignKey({
      columns: [table.budgetId, table.organizationId],
      foreignColumns: [budget.id, budget.organizationId],
      name: "budget_reservation_budget_organization_fk",
    }).onDelete("restrict"),
    positiveAmount: check("budget_reservation_amount_positive", sql`${table.amountMinor} > 0`),
  }),
);

export const workflowRunStatus = pgEnum("workflow_run_status", [
  "RUNNING",
  "COMPLETED",
  "CANCELLED",
]);

export const workflowTraceStatus = pgEnum("workflow_trace_status", [
  "SUCCEEDED",
  "MALFORMED",
  "FAILED",
  "TIMED_OUT",
  "CANCELLED",
]);

export const workflowAgentName = pgEnum("workflow_agent_name", [
  "INTAKE",
  "VENDOR_CONTEXT",
  "BUDGET_ANALYSIS",
  "EVIDENCE",
]);

export const workflowErrorCode = pgEnum("workflow_error_code", [
  "MALFORMED_OUTPUT",
  "AGENT_FAILURE",
  "AGENT_TIMEOUT",
  "WORKFLOW_CANCELLED",
]);

export const decisionOutcome = pgEnum("decision_outcome", ["ALLOW", "ESCALATE", "DENY"]);
export const approvalRecordStatus = pgEnum("approval_record_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
]);
export const lifecycleEventKind = pgEnum("lifecycle_event_kind", [
  "AUTHORIZATION",
  "CAPTURE",
  "SETTLEMENT",
  "REVERSAL",
  "REFUND",
  "ORDER",
]);
export const lifecycleEventSource = pgEnum("lifecycle_event_source", [
  "POLICY",
  "PROVIDER",
  "MERCHANT",
]);
export const stripeExecutionStatus = pgEnum("stripe_execution_status", [
  "PENDING",
  "CREATED",
  "FAILED",
]);
export const stripeWebhookDisposition = pgEnum("stripe_webhook_disposition", [
  "APPLIED",
  "IGNORED",
  "UNVERIFIED",
]);

export const workflowRun = pgTable(
  "workflow_run",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    idempotencyKey: text("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    request: jsonb("request").notNull(),
    status: workflowRunStatus("status").notNull().default("RUNNING"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    idempotencyUnique: uniqueIndex("workflow_run_idempotency_unique").on(
      table.organizationId,
      table.idempotencyKey,
    ),
    completionConsistent: check(
      "workflow_run_completion_consistent",
      sql`(${table.status} = 'RUNNING' AND ${table.completedAt} IS NULL) OR (${table.status} <> 'RUNNING' AND ${table.completedAt} IS NOT NULL)`,
    ),
  }),
);

export const workflowEvent = pgTable(
  "workflow_event",
  {
    id: text("id").primaryKey(),
    workflowId: text("workflow_id")
      .notNull()
      .references(() => workflowRun.id, { onDelete: "cascade" }),
    sequence: integer("sequence").notNull(),
    agent: workflowAgentName("agent").notNull(),
    status: workflowTraceStatus("status").notNull(),
    durationMs: integer("duration_ms").notNull(),
    output: jsonb("output"),
    errorCode: workflowErrorCode("error_code"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    workflowSequenceUnique: uniqueIndex("workflow_event_workflow_sequence_unique").on(
      table.workflowId,
      table.sequence,
    ),
    positiveSequence: check("workflow_event_sequence_positive", sql`${table.sequence} > 0`),
    nonNegativeDuration: check(
      "workflow_event_duration_non_negative",
      sql`${table.durationMs} >= 0`,
    ),
  }),
);

export const humanApproval = pgTable(
  "human_approval",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    workflowId: text("workflow_id")
      .notNull()
      .references(() => workflowRun.id, { onDelete: "cascade" }),
    requestHash: text("request_hash").notNull(),
    policyVersionId: text("policy_version_id").notNull(),
    status: approvalRecordStatus("status").notNull(),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    approverId: text("approver_id"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  (table) => ({
    expiryAfterRequest: check(
      "human_approval_expiry_after_request",
      sql`${table.expiresAt} > ${table.requestedAt}`,
    ),
    stateConsistent: check(
      "human_approval_state_consistent",
      sql`(${table.status} = 'PENDING' AND ${table.approverId} IS NULL AND ${table.decidedAt} IS NULL) OR (${table.status} IN ('APPROVED', 'REJECTED') AND ${table.approverId} IS NOT NULL AND ${table.decidedAt} IS NOT NULL) OR (${table.status} = 'EXPIRED')`,
    ),
  }),
);

export const decisionReceipt = pgTable(
  "decision_receipt",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    workflowId: text("workflow_id")
      .notNull()
      .references(() => workflowRun.id, { onDelete: "cascade" }),
    requestHash: text("request_hash").notNull(),
    policyVersionId: text("policy_version_id").notNull(),
    policyDigest: text("policy_digest").notNull(),
    evaluatorVersion: text("evaluator_version").notNull(),
    reservationId: text("reservation_id").notNull(),
    approvalId: text("approval_id").references(() => humanApproval.id, { onDelete: "restrict" }),
    decision: decisionOutcome("decision").notNull(),
    reasonCodes: jsonb("reason_codes").notNull(),
    digest: text("digest").notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    workflowDigestUnique: uniqueIndex("decision_receipt_workflow_digest_unique").on(
      table.workflowId,
      table.digest,
    ),
  }),
);

export const lifecycleEvent = pgTable(
  "lifecycle_event",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    workflowId: text("workflow_id")
      .notNull()
      .references(() => workflowRun.id, { onDelete: "cascade" }),
    providerEventId: text("provider_event_id").notNull(),
    kind: lifecycleEventKind("kind").notNull(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    currency: text("currency").notNull(),
    source: lifecycleEventSource("source").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    parentEventId: text("parent_event_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    workflowProviderEventUnique: uniqueIndex("lifecycle_event_workflow_provider_event_unique").on(
      table.workflowId,
      table.providerEventId,
    ),
    positiveAmount: check("lifecycle_event_amount_positive", sql`${table.amountMinor} > 0`),
    isoCurrency: check("lifecycle_event_iso_currency", sql`${table.currency} ~ '^[A-Z]{3}$'`),
  }),
);

export const stripeProviderExecution = pgTable(
  "stripe_provider_execution",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    workflowId: text("workflow_id")
      .notNull()
      .references(() => workflowRun.id, { onDelete: "cascade" }),
    receiptId: text("receipt_id")
      .notNull()
      .references(() => decisionReceipt.id, { onDelete: "restrict" }),
    requestHash: text("request_hash").notNull(),
    executionIdempotencyKey: text("execution_idempotency_key").notNull(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    currency: text("currency").notNull(),
    status: stripeExecutionStatus("status").notNull().default("PENDING"),
    providerStatus: text("provider_status"),
    errorCode: text("error_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    executionIdempotencyUnique: uniqueIndex("stripe_execution_idempotency_unique").on(
      table.organizationId,
      table.executionIdempotencyKey,
    ),
    paymentIntentUnique: uniqueIndex("stripe_execution_payment_intent_unique")
      .on(table.stripePaymentIntentId)
      .where(sql`${table.stripePaymentIntentId} IS NOT NULL`),
    positiveAmount: check("stripe_execution_amount_positive", sql`${table.amountMinor} > 0`),
    isoCurrency: check("stripe_execution_iso_currency", sql`${table.currency} ~ '^[A-Z]{3}$'`),
  }),
);

export const stripeWebhookReceipt = pgTable(
  "stripe_webhook_receipt",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    stripeEventId: text("stripe_event_id").notNull(),
    eventType: text("event_type").notNull(),
    executionId: text("execution_id").references(() => stripeProviderExecution.id, {
      onDelete: "restrict",
    }),
    disposition: stripeWebhookDisposition("disposition").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    eventUnique: uniqueIndex("stripe_webhook_event_unique").on(
      table.organizationId,
      table.stripeEventId,
    ),
  }),
);
