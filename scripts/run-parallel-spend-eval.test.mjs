import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execute = promisify(execFile);
const script = fileURLToPath(new URL("./run-parallel-spend-eval.mjs", import.meta.url));

async function evaluate(t, evidence) {
  const server = createServer(async (request, response) => {
    response.setHeader("content-type", "application/json");
    if (request.method === "POST") {
      let raw = "";
      for await (const chunk of request) raw += chunk;
      const task = JSON.parse(raw);
      response.end(
        JSON.stringify({
          workflowId: task.requestId,
          traces: [{ agent: "Intake Agent", summary: "Synthetic advisory", durationMs: 1 }],
        }),
      );
    } else {
      response.end(JSON.stringify({ investigation: { traces: evidence } }));
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  try {
    const result = await execute(process.execPath, [script], {
      env: { ...process.env, REINS_EVAL_URL: `http://127.0.0.1:${server.address().port}` },
    });
    return { code: 0, report: JSON.parse(result.stdout) };
  } catch (error) {
    return { code: error.code, report: JSON.parse(error.stdout) };
  }
}

test("reports real persisted trace statuses instead of status-free advisory summaries", async (t) => {
  const result = await evaluate(t, [{ status: "SUCCEEDED" }, { status: "TIMED_OUT" }]);
  assert.equal(result.code, 0);
  assert.equal(result.report.agentTraceCount, 6);
  assert.equal(result.report.timeoutRate, 0.5);
  for (const outcome of result.report.outcomes) {
    assert.deepEqual(outcome.traceStatuses, ["SUCCEEDED", "TIMED_OUT"]);
  }
});

test("fails rather than emitting a null persisted trace status", async (t) => {
  const result = await evaluate(t, [{ status: null }]);
  assert.equal(result.code, 1);
  for (const outcome of result.report.outcomes) {
    assert.equal(outcome.error, "PERSISTED_TRACE_STATUS_MISSING");
    assert.deepEqual(outcome.traceStatuses, []);
  }
});

test("fails when persisted trace evidence is absent", async (t) => {
  const result = await evaluate(t, []);
  assert.equal(result.code, 1);
  for (const outcome of result.report.outcomes)
    assert.equal(outcome.error, "PERSISTED_TRACES_MISSING");
});
