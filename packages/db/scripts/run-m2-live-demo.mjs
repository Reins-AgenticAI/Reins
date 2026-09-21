import { Client } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const organizationId = "org-m2-demo";
const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query(
    "insert into organization (id, name) values ($1, $2) on conflict (id) do nothing",
    [organizationId, "Milestone 2 Demo"],
  );
} finally {
  await client.end();
}

const response = await fetch("http://127.0.0.1:4000/workflows", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    organizationId,
    idempotencyKey: `m2-live-${Date.now()}`,
    request: {
      requestId: "SR-M2-LIVE",
      title: "Renew institutional market-data platform",
      requestingAgent: "Research Agent",
      vendor: "Datacore",
      category: "Market data",
      amountMinor: 4_800_000,
      currency: "USD",
      costCenter: "482",
    },
  }),
});
const payload = await response.json();
if (!response.ok) throw new Error(`Workflow request failed: ${JSON.stringify(payload)}`);
console.log(
  JSON.stringify(
    {
      workflowId: payload.workflowId,
      status: payload.status,
      agents: payload.traces.map((trace) => ({
        agent: trace.agent,
        status: trace.status,
        durationMs: trace.durationMs,
      })),
    },
    null,
    2,
  ),
);
