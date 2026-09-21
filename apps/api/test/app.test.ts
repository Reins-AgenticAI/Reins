import { WorkflowConflictError } from "@reins/assurance";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApi } from "../src/app.js";

const openApps: Array<ReturnType<typeof buildApi>> = [];

afterEach(async () => {
  vi.useRealTimers();
  await Promise.all(openApps.splice(0).map((app) => app.close()));
});

describe("GET /health", () => {
  it("returns a deterministic liveness response", async () => {
    const now = new Date("2026-09-16T12:00:00.000Z");
    const app = buildApi({ now: () => now });
    openApps.push(app);

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
      service: "reins-api",
      time: "2026-09-16T12:00:00.000Z",
    });
  });

  it("uses the system clock when no clock is supplied", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-16T15:30:00.000Z"));
    const app = buildApi();
    openApps.push(app);

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.json()).toMatchObject({ time: "2026-09-16T15:30:00.000Z" });
  });
});

describe("POST /workflows", () => {
  const body = {
    organizationId: "org-finance",
    idempotencyKey: "request-SR-2048",
    request: {
      requestId: "SR-2048",
      title: "Renew market-data platform",
      requestingAgent: "Research Agent",
      vendor: "Datacore",
      category: "Data and research",
      amountMinor: 4_800_000,
      currency: "USD",
      costCenter: "482",
    },
  };

  it("returns the persisted workflow identity and advisory traces", async () => {
    const app = buildApi({
      runWorkflow: async (command) => ({
        workflowId: `workflow-${command.request.requestId}`,
        organizationId: command.organizationId,
        idempotencyKey: command.idempotencyKey,
        requestHash: "request-hash",
        request: command.request,
        status: "COMPLETED",
        startedAt: "2026-09-20T18:00:00.000Z",
        completedAt: "2026-09-20T18:00:01.000Z",
        traces: [
          {
            sequence: 1,
            agent: "INTAKE",
            status: "SUCCEEDED",
            durationMs: 12,
            output: { summary: "Request normalized", facts: {}, evidenceRefs: [] },
          },
        ],
      }),
    });
    openApps.push(app);

    const response = await app.inject({ method: "POST", url: "/workflows", payload: body });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      workflowId: "workflow-SR-2048",
      status: "COMPLETED",
      synthetic: true,
      startedAt: "2026-09-20T18:00:00.000Z",
      completedAt: "2026-09-20T18:00:01.000Z",
      traces: [
        {
          sequence: 1,
          agent: "INTAKE",
          status: "SUCCEEDED",
          durationMs: 12,
          output: { summary: "Request normalized", facts: {}, evidenceRefs: [] },
        },
      ],
    });
  });

  it("rejects invalid input, duplicate mutation, and unavailable orchestration", async () => {
    const invalid = buildApi({ runWorkflow: async () => Promise.reject(new Error("unused")) });
    const conflicting = buildApi({
      runWorkflow: async () => {
        throw new WorkflowConflictError("Idempotency key reused with different workflow request");
      },
    });
    const unavailable = buildApi();
    openApps.push(invalid, conflicting, unavailable);

    const invalidResponse = await invalid.inject({
      method: "POST",
      url: "/workflows",
      payload: { ...body, request: { ...body.request, amountMinor: 0 } },
    });
    const conflictResponse = await conflicting.inject({
      method: "POST",
      url: "/workflows",
      payload: body,
    });
    const unavailableResponse = await unavailable.inject({
      method: "POST",
      url: "/workflows",
      payload: body,
    });

    expect(invalidResponse.statusCode).toBe(400);
    expect(conflictResponse.statusCode).toBe(409);
    expect(conflictResponse.json()).toEqual({
      error: "IDEMPOTENCY_CONFLICT",
      message: "Idempotency key reused with different workflow request",
    });
    expect(unavailableResponse.statusCode).toBe(503);
  });

  it("fails closed when workflow orchestration raises an unexpected error", async () => {
    const app = buildApi({
      runWorkflow: async () => {
        throw new Error("synthetic provider failed");
      },
    });
    openApps.push(app);

    const response = await app.inject({ method: "POST", url: "/workflows", payload: body });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      error: "ORCHESTRATION_FAILED",
      message: "Synthetic workflow could not be completed",
    });
  });
});

describe("deterministic decisions and approvals", () => {
  const decisionBody = {
    organizationId: "org-finance",
    workflowId: "workflow-SR-2048",
    input: {
      request: {
        requestHash: "request-hash",
        amountMinor: 4_800_000,
        currency: "USD",
        merchant: "datacore",
      },
      policy: {
        versionId: "policy-v3",
        digest: "policy-digest-v3",
        currency: "USD",
        perTransactionLimitMinor: 5_000_000,
        approvalThresholdMinor: 4_000_000,
        allowedMerchants: ["datacore"],
        validUntil: "2026-10-01T00:00:00.000Z",
      },
      reservation: { id: "reservation-v1", requestHash: "request-hash", state: "HELD" },
      contextComplete: true,
      evaluatedAt: "2026-09-20T18:00:00.000Z",
    },
  };

  it("exposes a synthetic decision receipt and durable human approval transitions", async () => {
    const app = buildApi({
      runDecision: async () => ({
        decision: "ESCALATE",
        reasonCodes: ["APPROVAL_REQUIRED"],
        requestHash: "request-hash",
        policyVersionId: "policy-v3",
        policyDigest: "policy-digest-v3",
        evaluatorVersion: "1",
        reservationId: "reservation-v1",
        evaluatedAt: "2026-09-20T18:00:00.000Z",
        digest: "receipt-digest",
      }),
      createApproval: async () => ({
        id: "approval-v1",
        requestHash: "request-hash",
        policyVersionId: "policy-v3",
        status: "PENDING",
        requestedAt: "2026-09-20T18:00:00.000Z",
        expiresAt: "2026-09-20T18:15:00.000Z",
      }),
      resolveApproval: async () => ({
        id: "approval-v1",
        requestHash: "request-hash",
        policyVersionId: "policy-v3",
        status: "APPROVED",
        requestedAt: "2026-09-20T18:00:00.000Z",
        expiresAt: "2026-09-20T18:15:00.000Z",
        approverId: "user-finance-1",
        decidedAt: "2026-09-20T18:05:00.000Z",
      }),
    });
    openApps.push(app);

    const decision = await app.inject({ method: "POST", url: "/decisions", payload: decisionBody });
    const approval = await app.inject({
      method: "POST",
      url: "/approvals",
      payload: {
        organizationId: "org-finance",
        workflowId: "workflow-SR-2048",
        requestHash: "request-hash",
        policyVersionId: "policy-v3",
        requestedAt: "2026-09-20T18:00:00.000Z",
        expiresAt: "2026-09-20T18:15:00.000Z",
      },
    });
    const resolution = await app.inject({
      method: "POST",
      url: "/approvals/approval-v1/resolve",
      payload: {
        outcome: "APPROVED",
        approverId: "user-finance-1",
        decidedAt: "2026-09-20T18:05:00.000Z",
      },
    });

    expect(decision.statusCode).toBe(200);
    expect(decision.json()).toMatchObject({ synthetic: true, receipt: { decision: "ESCALATE" } });
    expect(approval.statusCode).toBe(201);
    expect(approval.json()).toMatchObject({ approval: { status: "PENDING" } });
    expect(resolution.statusCode).toBe(200);
    expect(resolution.json()).toMatchObject({ approval: { status: "APPROVED" } });
  });

  it("fails closed when decision or approval services are unavailable or fail", async () => {
    const unavailable = buildApi();
    const failing = buildApi({
      runDecision: async () => Promise.reject(new Error("decision failure")),
      createApproval: async () => Promise.reject(new Error("approval failure")),
      resolveApproval: async () => Promise.reject(new Error("resolution failure")),
    });
    openApps.push(unavailable, failing);

    const unavailableDecision = await unavailable.inject({
      method: "POST",
      url: "/decisions",
      payload: decisionBody,
    });
    const unavailableApproval = await unavailable.inject({
      method: "POST",
      url: "/approvals",
      payload: {
        organizationId: "org-finance",
        workflowId: "workflow-SR-2048",
        requestHash: "request-hash",
        policyVersionId: "policy-v3",
        requestedAt: "2026-09-20T18:00:00.000Z",
        expiresAt: "2026-09-20T18:15:00.000Z",
      },
    });
    const unavailableResolution = await unavailable.inject({
      method: "POST",
      url: "/approvals/approval-v1/resolve",
      payload: {
        outcome: "APPROVED",
        approverId: "user-finance-1",
        decidedAt: "2026-09-20T18:05:00.000Z",
      },
    });
    const failedDecision = await failing.inject({
      method: "POST",
      url: "/decisions",
      payload: decisionBody,
    });
    const failedApproval = await failing.inject({
      method: "POST",
      url: "/approvals",
      payload: {
        organizationId: "org-finance",
        workflowId: "workflow-SR-2048",
        requestHash: "request-hash",
        policyVersionId: "policy-v3",
        requestedAt: "2026-09-20T18:00:00.000Z",
        expiresAt: "2026-09-20T18:15:00.000Z",
      },
    });
    const failedResolution = await failing.inject({
      method: "POST",
      url: "/approvals/approval-v1/resolve",
      payload: {
        outcome: "APPROVED",
        approverId: "user-finance-1",
        decidedAt: "2026-09-20T18:05:00.000Z",
      },
    });

    expect(unavailableDecision.json()).toEqual({ error: "DECISION_SERVICE_UNAVAILABLE" });
    expect(unavailableApproval.json()).toEqual({ error: "APPROVAL_SERVICE_UNAVAILABLE" });
    expect(unavailableResolution.json()).toEqual({ error: "APPROVAL_SERVICE_UNAVAILABLE" });
    expect(failedDecision.json()).toEqual({ error: "DECISION_EVALUATION_FAILED" });
    expect(failedApproval.json()).toEqual({ error: "APPROVAL_CREATION_FAILED" });
    expect(failedResolution.json()).toEqual({ error: "APPROVAL_RESOLUTION_FAILED" });
  });
});
