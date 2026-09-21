export type FinanceTask = {
  requestId: string;
  title: string;
  agent: string;
  vendor: string;
  category: string;
  amountMinor: number;
  currency: string;
  costCenter: string;
};

export type AdvisorySource = "simulation" | "live_local_model" | "hosted_model";

export type LocalModelClient = {
  complete(input: { role: string; task: FinanceTask }): Promise<{
    content: string;
    model: string;
    durationMs: number;
    source: AdvisorySource;
  }>;
};

export type AgentTrace = {
  agent: "Intake Agent" | "Vendor Context Agent" | "Budget Analyst Agent" | "Evidence Agent";
  summary: string;
  model: string;
  durationMs: number;
  source: AdvisorySource;
};

export type WorkflowResult = {
  decision: "ALLOW" | "ESCALATE" | "DENY";
  reason: string;
  traces: AgentTrace[];
};

const roles: AgentTrace["agent"][] = [
  "Intake Agent",
  "Vendor Context Agent",
  "Budget Analyst Agent",
  "Evidence Agent",
];

function decisionFor(task: FinanceTask): Pick<WorkflowResult, "decision" | "reason"> {
  if (!Number.isSafeInteger(task.amountMinor) || task.amountMinor <= 0 || task.currency !== "USD")
    return { decision: "DENY", reason: "Request is invalid for the active policy" };
  if (task.vendor !== "Datacore") return { decision: "DENY", reason: "Vendor is not approved" };
  if (task.amountMinor >= 1_000_000)
    return { decision: "ESCALATE", reason: "Amount meets the Finance approval threshold" };
  return { decision: "ALLOW", reason: "Approved vendor and amount are within automatic limits" };
}

function summary(content: string) {
  return content.replace(/\s+/g, " ").trim().slice(0, 280) || "No model summary returned.";
}

export async function runLocalAgentWorkflow(
  task: FinanceTask,
  client: LocalModelClient,
): Promise<WorkflowResult> {
  const traces: AgentTrace[] = [];
  try {
    for (const agent of roles) {
      const output = await client.complete({ role: agent, task });
      traces.push({
        agent,
        summary: summary(output.content),
        model: output.model,
        durationMs: output.durationMs,
        source: output.source,
      });
    }
  } catch {
    throw new Error("Local model unavailable");
  }
  return { ...decisionFor(task), traces };
}
