import {
  type AdvisoryWorkflow,
  type ApprovalRecord,
  type DecisionInput,
  type DecisionReceipt,
  type SpendWorkflowCommand,
  WorkflowConflictError,
} from "@reins/assurance";
import Fastify, { type FastifyServerOptions } from "fastify";

const healthResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["status", "service", "time"],
  properties: {
    status: { type: "string", const: "ok" },
    service: { type: "string", const: "reins-api" },
    time: { type: "string", format: "date-time" },
  },
} as const;

export type BuildApiOptions = Readonly<{
  logger?: FastifyServerOptions["logger"];
  now?: () => Date;
  runWorkflow?: (
    command: SpendWorkflowCommand,
    options?: Readonly<{ signal?: AbortSignal }>,
  ) => Promise<AdvisoryWorkflow>;
  runDecision?: (command: DecisionCommand) => Promise<DecisionReceipt>;
  createApproval?: (command: CreateApprovalCommand) => Promise<ApprovalRecord>;
  resolveApproval?: (
    approvalId: string,
    input: Readonly<{ outcome: "APPROVED" | "REJECTED"; approverId: string; decidedAt: string }>,
  ) => Promise<ApprovalRecord>;
}>;

export type DecisionCommand = Readonly<{
  organizationId: string;
  workflowId: string;
  input: Omit<DecisionInput, "approval"> & Readonly<{ approvalId?: string }>;
}>;

export type CreateApprovalCommand = Readonly<{
  organizationId: string;
  workflowId: string;
  requestHash: string;
  policyVersionId: string;
  requestedAt: string;
  expiresAt: string;
}>;

const workflowBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["organizationId", "idempotencyKey", "request"],
  properties: {
    organizationId: { type: "string", minLength: 1, maxLength: 128 },
    idempotencyKey: { type: "string", minLength: 1, maxLength: 256 },
    request: {
      type: "object",
      additionalProperties: false,
      required: [
        "requestId",
        "title",
        "requestingAgent",
        "vendor",
        "category",
        "amountMinor",
        "currency",
        "costCenter",
      ],
      properties: {
        requestId: { type: "string", minLength: 1, maxLength: 128 },
        title: { type: "string", minLength: 1, maxLength: 240 },
        requestingAgent: { type: "string", minLength: 1, maxLength: 128 },
        vendor: { type: "string", minLength: 1, maxLength: 160 },
        category: { type: "string", minLength: 1, maxLength: 128 },
        amountMinor: { type: "integer", minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
        currency: { type: "string", pattern: "^[A-Z]{3}$" },
        costCenter: { type: "string", minLength: 1, maxLength: 128 },
      },
    },
  },
} as const;

const decisionBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["organizationId", "workflowId", "input"],
  properties: {
    organizationId: { type: "string", minLength: 1, maxLength: 128 },
    workflowId: { type: "string", minLength: 1, maxLength: 128 },
    input: {
      type: "object",
      additionalProperties: false,
      required: ["request", "policy", "reservation", "contextComplete", "evaluatedAt"],
      properties: {
        request: {
          type: "object",
          additionalProperties: false,
          required: ["requestHash", "amountMinor", "currency", "merchant"],
          properties: {
            requestHash: { type: "string", minLength: 1, maxLength: 128 },
            amountMinor: { type: "integer", minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
            currency: { type: "string", pattern: "^[A-Z]{3}$" },
            merchant: { type: "string", minLength: 1, maxLength: 160 },
          },
        },
        policy: {
          type: "object",
          additionalProperties: false,
          required: [
            "versionId",
            "digest",
            "currency",
            "perTransactionLimitMinor",
            "approvalThresholdMinor",
            "allowedMerchants",
            "validUntil",
          ],
          properties: {
            versionId: { type: "string", minLength: 1, maxLength: 128 },
            digest: { type: "string", minLength: 1, maxLength: 128 },
            currency: { type: "string", pattern: "^[A-Z]{3}$" },
            perTransactionLimitMinor: {
              type: "integer",
              minimum: 1,
              maximum: Number.MAX_SAFE_INTEGER,
            },
            approvalThresholdMinor: {
              type: "integer",
              minimum: 1,
              maximum: Number.MAX_SAFE_INTEGER,
            },
            allowedMerchants: {
              type: "array",
              minItems: 1,
              items: { type: "string", minLength: 1, maxLength: 160 },
            },
            validUntil: { type: "string", format: "date-time" },
          },
        },
        reservation: {
          type: "object",
          additionalProperties: false,
          required: ["id", "requestHash", "state"],
          properties: {
            id: { type: "string", minLength: 1, maxLength: 128 },
            requestHash: { type: "string", minLength: 1, maxLength: 128 },
            state: { type: "string", enum: ["HELD", "CONFLICT", "MISSING"] },
          },
        },
        contextComplete: { type: "boolean" },
        approvalId: { type: "string", minLength: 1, maxLength: 128 },
        evaluatedAt: { type: "string", format: "date-time" },
      },
    },
  },
} as const;

const approvalBodySchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "organizationId",
    "workflowId",
    "requestHash",
    "policyVersionId",
    "requestedAt",
    "expiresAt",
  ],
  properties: {
    organizationId: { type: "string", minLength: 1, maxLength: 128 },
    workflowId: { type: "string", minLength: 1, maxLength: 128 },
    requestHash: { type: "string", minLength: 1, maxLength: 128 },
    policyVersionId: { type: "string", minLength: 1, maxLength: 128 },
    requestedAt: { type: "string", format: "date-time" },
    expiresAt: { type: "string", format: "date-time" },
  },
} as const;

const approvalResolutionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["outcome", "approverId", "decidedAt"],
  properties: {
    outcome: { type: "string", enum: ["APPROVED", "REJECTED"] },
    approverId: { type: "string", minLength: 1, maxLength: 128 },
    decidedAt: { type: "string", format: "date-time" },
  },
} as const;

export function buildApi(options: BuildApiOptions = {}) {
  const app = Fastify({ logger: options.logger ?? false });
  const now = options.now ?? (() => new Date());

  app.get(
    "/health",
    {
      schema: {
        response: {
          200: healthResponseSchema,
        },
      },
    },
    async () => ({
      status: "ok" as const,
      service: "reins-api" as const,
      time: now().toISOString(),
    }),
  );

  app.post<{ Body: SpendWorkflowCommand }>(
    "/workflows",
    { schema: { body: workflowBodySchema } },
    async (request, reply) => {
      if (!options.runWorkflow) {
        return reply.code(503).send({
          error: "ORCHESTRATOR_UNAVAILABLE",
          message: "Workflow orchestration is not configured",
        });
      }
      const controller = new AbortController();
      const abort = controller.abort.bind(controller, new Error("Request aborted"));
      request.raw.once("aborted", abort);
      try {
        const workflow = await options.runWorkflow(request.body, { signal: controller.signal });
        return {
          workflowId: workflow.workflowId,
          status: workflow.status,
          synthetic: true,
          startedAt: workflow.startedAt,
          ...(workflow.completedAt ? { completedAt: workflow.completedAt } : {}),
          traces: workflow.traces,
        };
      } catch (error) {
        if (error instanceof WorkflowConflictError) {
          return reply.code(409).send({
            error: "IDEMPOTENCY_CONFLICT",
            message: error.message,
          });
        }
        request.log.error({ error }, "workflow orchestration failed");
        return reply.code(503).send({
          error: "ORCHESTRATION_FAILED",
          message: "Synthetic workflow could not be completed",
        });
      } finally {
        request.raw.removeListener("aborted", abort);
      }
    },
  );

  app.post<{ Body: DecisionCommand }>(
    "/decisions",
    { schema: { body: decisionBodySchema } },
    async (request, reply) => {
      if (!options.runDecision) {
        return reply.code(503).send({ error: "DECISION_SERVICE_UNAVAILABLE" });
      }
      try {
        return { synthetic: true, receipt: await options.runDecision(request.body) };
      } catch (error) {
        request.log.error({ error }, "decision evaluation failed");
        return reply.code(503).send({ error: "DECISION_EVALUATION_FAILED" });
      }
    },
  );

  app.post<{ Body: CreateApprovalCommand }>(
    "/approvals",
    { schema: { body: approvalBodySchema } },
    async (request, reply) => {
      if (!options.createApproval)
        return reply.code(503).send({ error: "APPROVAL_SERVICE_UNAVAILABLE" });
      try {
        return reply
          .code(201)
          .send({ synthetic: true, approval: await options.createApproval(request.body) });
      } catch (error) {
        request.log.error({ error }, "approval creation failed");
        return reply.code(503).send({ error: "APPROVAL_CREATION_FAILED" });
      }
    },
  );

  app.post<{
    Params: Readonly<{ approvalId: string }>;
    Body: Readonly<{ outcome: "APPROVED" | "REJECTED"; approverId: string; decidedAt: string }>;
  }>(
    "/approvals/:approvalId/resolve",
    { schema: { body: approvalResolutionSchema } },
    async (request, reply) => {
      if (!options.resolveApproval)
        return reply.code(503).send({ error: "APPROVAL_SERVICE_UNAVAILABLE" });
      try {
        return {
          synthetic: true,
          approval: await options.resolveApproval(request.params.approvalId, request.body),
        };
      } catch (error) {
        request.log.error({ error }, "approval resolution failed");
        return reply.code(503).send({ error: "APPROVAL_RESOLUTION_FAILED" });
      }
    },
  );

  return app;
}
