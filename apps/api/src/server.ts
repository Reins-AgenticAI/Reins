import { createWorkflowOrchestrator } from "@reins/assurance";
import {
  closeDatabase,
  getDatabase,
  PostgresDecisionStore,
  PostgresWorkflowStore,
} from "@reins/db";
import { buildApi } from "./app.js";
import { readApiConfig } from "./config.js";
import { createDecisionService } from "./decision-service.js";
import { createOllamaAdvisoryAgents } from "./ollama-agents.js";

const config = readApiConfig();
const orchestrator = createWorkflowOrchestrator({
  agents: createOllamaAdvisoryAgents({
    endpoint: config.ollamaUrl,
    model: config.ollamaModel,
  }),
  store: new PostgresWorkflowStore(getDatabase()),
  timeoutMs: config.agentTimeoutMs,
});
const decisions = createDecisionService({ store: new PostgresDecisionStore(getDatabase()) });
const app = buildApi({
  logger: { level: config.logLevel },
  runWorkflow: orchestrator.run,
  runDecision: decisions.runDecision,
  createApproval: decisions.createApproval,
  resolveApproval: decisions.resolveApproval,
});

async function stop(signal: NodeJS.Signals) {
  app.log.info({ signal }, "shutting down");
  await app.close();
  await closeDatabase();
}

process.once("SIGINT", () => {
  void stop("SIGINT");
});
process.once("SIGTERM", () => {
  void stop("SIGTERM");
});

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
