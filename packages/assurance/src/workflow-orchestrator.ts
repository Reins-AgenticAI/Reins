import { createHash, randomUUID } from "node:crypto";

export const advisoryAgentNames = [
  "INTAKE",
  "VENDOR_CONTEXT",
  "BUDGET_ANALYSIS",
  "EVIDENCE",
] as const;

export type AdvisoryAgentName = (typeof advisoryAgentNames)[number];
export type AgentTraceStatus = "SUCCEEDED" | "MALFORMED" | "FAILED" | "TIMED_OUT" | "CANCELLED";
export type WorkflowStatus = "RUNNING" | "COMPLETED" | "CANCELLED";
type FactValue = string | number | boolean | null;

export type SpendWorkflowRequest = Readonly<{
  requestId: string;
  title: string;
  requestingAgent: string;
  vendor: string;
  category: string;
  amountMinor: number;
  currency: string;
  costCenter: string;
}>;

export type SpendWorkflowCommand = Readonly<{
  organizationId: string;
  idempotencyKey: string;
  request: SpendWorkflowRequest;
}>;

export type AdvisoryAgentOutput = Readonly<{
  summary: string;
  facts: Readonly<Record<string, FactValue>>;
  evidenceRefs: readonly string[];
}>;

export type AdvisoryAgent = Readonly<{
  name: AdvisoryAgentName;
  run(input: Readonly<{ request: SpendWorkflowRequest; signal: AbortSignal }>): Promise<unknown>;
}>;

export type AgentTrace = Readonly<{
  sequence: number;
  agent: AdvisoryAgentName;
  status: AgentTraceStatus;
  durationMs: number;
  output?: AdvisoryAgentOutput;
  errorCode?: "MALFORMED_OUTPUT" | "AGENT_FAILURE" | "AGENT_TIMEOUT" | "WORKFLOW_CANCELLED";
}>;

export type AdvisoryWorkflow = Readonly<{
  workflowId: string;
  organizationId: string;
  idempotencyKey: string;
  requestHash: string;
  request: SpendWorkflowRequest;
  status: WorkflowStatus;
  startedAt: string;
  completedAt?: string;
  traces: readonly AgentTrace[];
}>;

type BeginWorkflow = Readonly<{
  workflowId: string;
  organizationId: string;
  idempotencyKey: string;
  requestHash: string;
  request: SpendWorkflowRequest;
  startedAt: string;
}>;

export interface WorkflowStore {
  begin(input: BeginWorkflow): Promise<{ created: boolean; workflow: AdvisoryWorkflow }>;
  complete(
    workflowId: string,
    status: "COMPLETED" | "CANCELLED",
    traces: readonly AgentTrace[],
    completedAt: string,
  ): Promise<AdvisoryWorkflow>;
}

export class WorkflowConflictError extends Error {}

export class InMemoryWorkflowStore implements WorkflowStore {
  readonly #byId = new Map<string, AdvisoryWorkflow>();
  readonly #byIdempotency = new Map<string, AdvisoryWorkflow>();

  async begin(input: BeginWorkflow) {
    const key = `${input.organizationId}:${input.idempotencyKey}`;
    const existing = this.#byIdempotency.get(key);
    if (existing) {
      if (existing.requestHash !== input.requestHash) {
        throw new WorkflowConflictError("Idempotency key reused with different workflow request");
      }
      return { created: false, workflow: existing };
    }
    const workflow = freezeWorkflow({ ...input, status: "RUNNING", traces: [] });
    this.#byId.set(workflow.workflowId, workflow);
    this.#byIdempotency.set(key, workflow);
    return { created: true, workflow };
  }

  async complete(
    workflowId: string,
    status: "COMPLETED" | "CANCELLED",
    traces: readonly AgentTrace[],
    completedAt: string,
  ) {
    const current = this.#byId.get(workflowId);
    if (!current) throw new Error("Workflow not found");
    if (current.status !== "RUNNING") return current;
    const workflow = freezeWorkflow({ ...current, status, completedAt, traces });
    this.#byId.set(workflowId, workflow);
    this.#byIdempotency.set(`${workflow.organizationId}:${workflow.idempotencyKey}`, workflow);
    return workflow;
  }
}

type OrchestratorOptions = Readonly<{
  agents: readonly AdvisoryAgent[];
  store: WorkflowStore;
  timeoutMs?: number;
  createId?: () => string;
  now?: () => Date;
}>;

class TimeoutReason extends Error {}
class MalformedOutputError extends Error {}

function validateCommand(command: SpendWorkflowCommand) {
  const strings = [
    command.organizationId,
    command.idempotencyKey,
    command.request.requestId,
    command.request.title,
    command.request.requestingAgent,
    command.request.vendor,
    command.request.category,
    command.request.currency,
    command.request.costCenter,
  ];
  if (strings.some((value) => !value.trim())) throw new Error("Workflow fields are required");
  if (!Number.isSafeInteger(command.request.amountMinor) || command.request.amountMinor <= 0) {
    throw new Error("Workflow amount must use positive integer minor units");
  }
}

function hashRequest(request: SpendWorkflowRequest): string {
  const canonical = {
    requestId: request.requestId,
    title: request.title,
    requestingAgent: request.requestingAgent,
    vendor: request.vendor,
    category: request.category,
    amountMinor: request.amountMinor,
    currency: request.currency,
    costCenter: request.costCenter,
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

function normalizeOutput(value: unknown): AdvisoryAgentOutput {
  if (!value || typeof value !== "object") throw new MalformedOutputError();
  const record = value as Record<string, unknown>;
  const summary = typeof record.summary === "string" ? record.summary.trim() : "";
  const facts = record.facts;
  const evidenceRefs = record.evidenceRefs;
  if (
    !summary ||
    !facts ||
    typeof facts !== "object" ||
    Array.isArray(facts) ||
    !Object.values(facts).every((fact) =>
      typeof fact === "number"
        ? Number.isFinite(fact)
        : fact === null || ["string", "boolean"].includes(typeof fact),
    ) ||
    !Array.isArray(evidenceRefs) ||
    !evidenceRefs.every((reference) => typeof reference === "string" && reference.trim())
  ) {
    throw new MalformedOutputError();
  }
  const frozenFacts = Object.freeze({ ...(facts as Record<string, FactValue>) });
  const frozenEvidenceRefs = Object.freeze([...evidenceRefs]);
  return Object.freeze({
    summary: summary.slice(0, 500),
    facts: frozenFacts,
    evidenceRefs: frozenEvidenceRefs,
  });
}

function freezeTrace(trace: AgentTrace): AgentTrace {
  return Object.freeze(trace);
}

function freezeWorkflow(workflow: AdvisoryWorkflow): AdvisoryWorkflow {
  const request = Object.freeze({ ...workflow.request });
  const traces = Object.freeze(workflow.traces.map(freezeTrace));
  return Object.freeze({ ...workflow, request, traces });
}

async function runAgent(
  agent: AdvisoryAgent,
  request: SpendWorkflowRequest,
  signal: AbortSignal | undefined,
  timeoutMs: number,
  sequence: number,
): Promise<AgentTrace> {
  const startedAt = performance.now();
  const controller = new AbortController();
  const cancel = () => controller.abort(signal?.reason ?? new Error("Workflow cancelled"));
  if (signal?.aborted) cancel();
  else signal?.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(() => controller.abort(new TimeoutReason()), timeoutMs);
  let onAbort = () => {};
  const aborted = new Promise<never>((_, reject) => {
    if (controller.signal.aborted) reject(controller.signal.reason);
    else {
      onAbort = () => reject(controller.signal.reason);
      controller.signal.addEventListener("abort", onAbort, { once: true });
    }
  });

  try {
    const rawOutput = await Promise.race([
      agent.run({ request, signal: controller.signal }),
      aborted,
    ]);
    return freezeTrace({
      sequence,
      agent: agent.name,
      status: "SUCCEEDED",
      durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
      output: normalizeOutput(rawOutput),
    });
  } catch (error) {
    const durationMs = Math.max(0, Math.round(performance.now() - startedAt));
    if (signal?.aborted) {
      return freezeTrace({
        sequence,
        agent: agent.name,
        status: "CANCELLED",
        durationMs,
        errorCode: "WORKFLOW_CANCELLED",
      });
    }
    if (controller.signal.reason instanceof TimeoutReason) {
      return freezeTrace({
        sequence,
        agent: agent.name,
        status: "TIMED_OUT",
        durationMs,
        errorCode: "AGENT_TIMEOUT",
      });
    }
    if (error instanceof MalformedOutputError) {
      return freezeTrace({
        sequence,
        agent: agent.name,
        status: "MALFORMED",
        durationMs,
        errorCode: "MALFORMED_OUTPUT",
      });
    }
    return freezeTrace({
      sequence,
      agent: agent.name,
      status: "FAILED",
      durationMs,
      errorCode: "AGENT_FAILURE",
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
    controller.signal.removeEventListener("abort", onAbort);
  }
}

export function createWorkflowOrchestrator(options: OrchestratorOptions) {
  const timeoutMs = options.timeoutMs ?? 30_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error("Agent timeout must be a positive integer");
  }
  const agents = new Map(options.agents.map((agent) => [agent.name, agent]));
  if (
    agents.size !== advisoryAgentNames.length ||
    advisoryAgentNames.some((name) => !agents.has(name))
  ) {
    throw new Error("Exactly one advisory agent is required for each supported role");
  }
  const orderedAgents = advisoryAgentNames.map((name) => {
    const agent = agents.get(name);
    if (!agent) throw new Error("Advisory agent configuration changed during initialization");
    return agent;
  });
  const createId = options.createId ?? randomUUID;
  const now = options.now ?? (() => new Date());

  return Object.freeze({
    async run(
      command: SpendWorkflowCommand,
      runOptions: Readonly<{ signal?: AbortSignal }> = {},
    ): Promise<AdvisoryWorkflow> {
      validateCommand(command);
      const request = Object.freeze({ ...command.request });
      const requestHash = hashRequest(request);
      const begun = await options.store.begin({
        workflowId: createId(),
        organizationId: command.organizationId,
        idempotencyKey: command.idempotencyKey,
        requestHash,
        request,
        startedAt: now().toISOString(),
      });
      if (!begun.created) return begun.workflow;

      const settled = await Promise.allSettled(
        orderedAgents.map((agent, index) =>
          runAgent(agent, request, runOptions.signal, timeoutMs, index + 1),
        ),
      );
      const traces = settled.map((result, index) => {
        if (result.status === "fulfilled") return result.value;
        const agent = orderedAgents[index];
        if (!agent) throw new Error("Agent result index is out of range");
        return freezeTrace({
          sequence: index + 1,
          agent: agent.name,
          status: "FAILED",
          durationMs: 0,
          errorCode: "AGENT_FAILURE",
        });
      });
      return await options.store.complete(
        begun.workflow.workflowId,
        runOptions.signal?.aborted ? "CANCELLED" : "COMPLETED",
        traces,
        now().toISOString(),
      );
    },
  });
}
