import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const vitePath = require.resolve("vite", { paths: [require.resolve("vitest")] });
const { build } = require(require.resolve("esbuild", { paths: [vitePath] }));
const webRoot = fileURLToPath(new URL("../apps/web/", import.meta.url));
const assuranceRequire = createRequire(
  new URL("../packages/assurance/package.json", import.meta.url),
);

test("duplicate request IDs select only their own workflow, policy, receipt and timeline", async (t) => {
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? "playwright");
  const bundle = await build({
    stdin: {
      contents:
        'import {createRoot} from "react-dom/client"; import {ControlRoom} from "./src/app/assurance/control-room"; createRoot(document.getElementById("root")).render(<ControlRoom />);',
      resolveDir: webRoot,
      loader: "tsx",
    },
    bundle: true,
    platform: "browser",
    jsx: "automatic",
    write: false,
    outdir: "selection-probe",
    logLevel: "silent",
    plugins: [
      {
        name: "worktree-package-exports",
        setup(plugin) {
          plugin.onResolve({ filter: /^@reins\/assurance(?:\/|$)/ }, (args) => ({
            path: assuranceRequire.resolve(args.path),
          }));
        },
      },
    ],
  });
  let investigations = ["ALLOW", "DENY"].map((outcome, index) => ({
    workflow: {
      id: `workflow-${index}`,
      startedAt: `2026-09-21T10:00:0${index}Z`,
      request: {
        requestId: "legacy:shared-run",
        title: `Synthetic request ${index}`,
        requestingAgent: "Engineering",
        vendor: "Datacore",
        amountMinor: 100,
        currency: "USD",
        costCenter: "Engineering",
      },
    },
    decision: {
      outcome,
      policyVersionId: `policy-${index}`,
      reservationId: `reservation-${index}`,
      reasonCodes: [],
      decidedAt: `2026-09-21T10:00:0${index + 2}Z`,
    },
    traces: [],
    lifecycle: [],
    findings: [],
  }));
  let scenarioReceived;
  const pendingScenario = new Promise((resolve) => {
    scenarioReceived = resolve;
  });
  const server = createServer((request, response) => {
    if (request.url === "/api/control-room") {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ investigations, budget: null }));
    } else if (request.url === "/api/scenario-run") {
      scenarioReceived(response);
    } else if (request.url === "/app.js" || request.url === "/app.css") {
      const extension = request.url.endsWith(".js") ? ".js" : ".css";
      response.setHeader("content-type", extension === ".js" ? "text/javascript" : "text/css");
      response.end(bundle.outputFiles.find((file) => file.path.endsWith(extension)).contents);
    } else {
      response.setHeader("content-type", "text/html");
      response.end(
        '<!doctype html><html><head><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>',
      );
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => {
    server.closeAllConnections();
    return new Promise((resolve) => server.close(resolve));
  });
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL,
  });
  t.after(() => browser.close());
  const page = await browser.newPage();
  page.setDefaultTimeout(3000);
  let browserErrors = 0;
  page.on("pageerror", () => browserErrors++);
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors++;
  });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const queue = page.getByRole("region", { name: "Request queue", exact: true });
  await queue.getByText("Synthetic request 1", { exact: true }).waitFor();
  const rows = queue.locator("tbody tr");
  const receipt = page.locator("#policy-receipt");
  const timeline = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "Evidence timeline" }) });
  async function assertSelected(index) {
    assert.equal(await receipt.locator("dd").nth(1).textContent(), `policy-${index}`);
    assert.equal(
      await receipt.getByText(index === 0 ? "ALLOW" : "DENY", { exact: true }).count(),
      1,
    );
    assert.equal(
      await receipt.getByRole("link").getAttribute("href"),
      `/api/control-room?workflowId=workflow-${index}`,
    );
    assert.equal(await queue.locator('[aria-pressed="true"]').count(), 1);
    assert.equal(await rows.nth(index).getByRole("button").getAttribute("aria-pressed"), "true");
    assert.equal(await queue.locator('tr[class*="selectedRow"]').count(), 1);
  }
  // Start with the second workflow: a request-ID lookup incorrectly resolves the first.
  await rows.nth(1).getByRole("button").click();
  await assertSelected(1);
  await rows.nth(0).getByRole("button").click();
  await assertSelected(0);
  await timeline.locator("li").filter({ hasText: "Policy DENY" }).getByRole("button").click();
  await assertSelected(1);
  await timeline.locator("li").filter({ hasText: "Policy ALLOW" }).getByRole("button").click();
  await assertSelected(0);

  // Keep a selection made while request IDs are the only available identities.
  await page.getByRole("button", { name: "Run scenario", exact: true }).click();
  const response = await pendingScenario;
  await rows.nth(1).getByRole("button").click();
  const requestIds = await rows.getByRole("button").allTextContents();
  investigations = requestIds.map((requestId, index) => ({
    ...investigations[index % 2],
    workflow: {
      ...investigations[index % 2].workflow,
      id: `workflow-${index}`,
      request: { ...investigations[index % 2].workflow.request, requestId },
    },
  }));
  response.setHeader("content-type", "application/json");
  response.end(
    JSON.stringify({
      runId: "synthetic-run",
      results: investigations.map((item) => ({
        requestId: item.workflow.request.requestId,
        workflowId: item.workflow.id,
        receiptId: `receipt-${item.workflow.id}`,
        decision: item.decision.outcome,
        traces: [],
      })),
      budget: null,
    }),
  );
  await page.getByText("4 requests completed.", { exact: true }).waitFor();
  await assertSelected(1);
  assert.equal(browserErrors, 0);
});
