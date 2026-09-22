import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";

if (process.argv.includes("--help")) {
  console.log(`Usage: node scripts/verify-control-room.mjs [http://127.0.0.1:3000]
Environment: TEST_BASE_URL, PLAYWRIGHT_MODULE, PLAYWRIGHT_CHANNEL, REINS_VERIFY_OUTPUT_DIR
Requires a running local Next app, synthetic PostgreSQL data, simulation advisory mode,
and Playwright with an installed browser. Creates four persisted synthetic requests and
holds $12,840 of budget. No database reset or external Stripe operation is performed.`);
  process.exit(0);
}

let stage = "validate the local base URL";
let browser;
try {
  const base = new URL(process.argv[2] ?? process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000");
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(base.hostname));
  assert.ok(["http:", "https:"].includes(base.protocol));
  assert.ok(!base.username && !base.password && !base.search && !base.hash);
  stage = "load Playwright (set PLAYWRIGHT_MODULE to an installed package if needed)";
  const require = createRequire(import.meta.url);
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? "playwright");
  stage = "launch Chromium (set PLAYWRIGHT_CHANNEL=msedge for installed Edge)";
  browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(30_000);
  const pageErrors = [];
  page.on("pageerror", () => pageErrors.push(true));
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("same key")) pageErrors.push(true);
  });
  const money = (minor) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(minor / 100);
  const readEvidence = async () => {
    const response = await page.request.get(new URL("/api/control-room", base).href);
    assert.equal(response.status(), 200);
    const payload = await response.json();
    assert.equal(payload.synthetic, true);
    return payload;
  };

  stage = "open /assurance and load persisted synthetic evidence";
  const initialResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/control-room" &&
      response.request().method() === "GET",
  );
  const [, loaded] = await Promise.all([
    page.goto(new URL("/assurance", base).href, { waitUntil: "domcontentloaded" }),
    initialResponse,
  ]);
  assert.equal(loaded.status(), 200);
  const before = await readEvidence();
  const availableBefore = before.budget?.availableMinor ?? 50_000_000;
  stage = "require at least $31,340 available for all concurrent reservation attempts";
  assert.ok(availableBefore >= 3_134_000);
  stage = "select Parallel and run Quarter-close spend controls";
  await page.getByLabel("Scenario", { exact: true }).selectOption("quarter-close-spend-controls");
  await page.getByRole("radio", { name: "Parallel", exact: true }).check();
  const completed = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/scenario-run" &&
      response.request().method() === "POST",
    { timeout: 120_000 },
  );
  await page.getByRole("button", { name: "Run scenario", exact: true }).click();
  const response = await completed;
  stage = "require scenario HTTP 200 and ALLOW / ALLOW / DENY / ESCALATE";
  assert.equal(response.status(), 200);
  const run = await response.json();
  assert.equal(run.mode, "parallel");
  assert.equal(run.synthetic, true);
  assert.equal(run.results.length, 4);
  const outcomes = ["ALLOW", "ALLOW", "DENY", "ESCALATE"];
  assert.deepEqual(
    run.results.map((result) => result.decision),
    outcomes,
  );
  assert.ok(run.results.every((result) => !result.error && result.workflowId && result.receiptId));
  await page
    .getByRole("button", { name: "Run scenario", exact: true })
    .and(page.locator(":enabled"))
    .waitFor();
  stage = "verify four finished request rows with the expected decisions";
  const queue = page.getByRole("region", { name: "Request queue", exact: true });
  const purposes = [
    "Developer-seat expansion",
    "Market-data renewal",
    "Cloud-capacity commitment",
    "AML data-provider exception",
  ];
  for (const [index, result] of run.results.entries()) {
    const row = queue
      .getByRole("row")
      .filter({ has: page.getByRole("button", { name: result.requestId, exact: true }) });
    assert.equal(await row.count(), 1);
    await row.getByRole("cell", { name: purposes[index], exact: true }).waitFor();
    assert.equal((await row.getByRole("cell").last().textContent()).trim(), outcomes[index]);
  }
  stage = "verify persisted receipts, non-null trace statuses, and the $12,840 budget decrease";
  const after = await readEvidence();
  assert.equal(after.budget.availableMinor, availableBefore - 1_284_000);
  assert.equal(run.budget.availableMinor, after.budget.availableMinor);
  for (const [index, result] of run.results.entries()) {
    const record = after.investigations.find((item) => item.workflow.id === result.workflowId);
    assert.ok(record);
    assert.equal(record.decision.outcome, outcomes[index]);
    assert.equal(record.traces.length, 4);
    assert.ok(record.traces.every((trace) => trace.status === "SUCCEEDED"));
  }
  const budgetCard = page
    .getByRole("heading", { name: "Shared budget", exact: true })
    .locator("..")
    .locator("..");
  await budgetCard.getByText(money(after.budget.availableMinor), { exact: true }).first().waitFor();

  stage = "open Reports and change Reporting month";
  await page.getByRole("button", { name: "Reports", exact: true }).click();
  const month = page.getByLabel("Reporting month", { exact: true });
  const initialMonth = await month.inputValue();
  const currentRecord = after.investigations.find(
    (item) => item.workflow.id === run.results[0].workflowId,
  );
  const runMonth = currentRecord.decision.decidedAt.slice(0, 7);
  const changedMonth = initialMonth === "2026-09" ? "2026-10" : "2026-09";
  const verifyMonth = async (selected) => {
    await month.selectOption(selected);
    assert.equal(await month.inputValue(), selected);
    const records = after.investigations.filter(
      (item) =>
        item.workflow.request.currency === "USD" &&
        (item.decision?.decidedAt ?? item.workflow.startedAt).slice(0, 7) === selected,
    );
    const total = records.reduce(
      (sum, item) =>
        sum + (item.decision?.outcome === "ALLOW" ? item.workflow.request.amountMinor : 0),
      0,
    );
    const label = new Intl.DateTimeFormat("en-US", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${selected}-01T00:00:00Z`));
    await page
      .getByRole("status")
      .filter({
        hasText: `${label} · ${records.length} records · ${money(total)} approved controlled spend`,
      })
      .waitFor();
    const evidence = page.getByRole("region", { name: "Report evidence table", exact: true });
    assert.equal(await evidence.locator("tbody tr").count(), records.length);
    for (const record of records) {
      const receiptPath = `/api/control-room?workflowId=${encodeURIComponent(record.workflow.id)}`;
      const row = evidence.getByRole("row").filter({
        has: page.locator(`a[href="${receiptPath}"]`),
      });
      assert.equal(await row.count(), 1);
      assert.ok((await row.textContent()).includes(record.workflow.request.requestId));
      assert.ok((await row.textContent()).includes(record.decision?.outcome ?? "PENDING"));
      assert.equal(await row.getByRole("link").getAttribute("href"), receiptPath);
    }
    assert.equal(await page.getByRole("figure").count(), 3);
    const monthly = page.getByRole("figure", {
      name: "Monthly approved controlled spend",
      exact: true,
    });
    assert.ok(
      (await monthly.locator("figcaption").textContent()).includes(`${label}: ${money(total)}`),
    );
    await page
      .getByRole("figure", { name: "Weekly approved controlled spend", exact: true })
      .waitFor();
    await page
      .getByRole("figure", { name: "Mean approved request amount by week", exact: true })
      .waitFor();
  };
  stage = "verify initial-month chart totals, evidence rows, and receipt links";
  await verifyMonth(initialMonth);
  stage = "verify changed-month chart totals, evidence rows, and receipt links";
  await verifyMonth(changedMonth);
  stage = "verify the run month contains the new persisted requests in Reports";
  await verifyMonth(runMonth);
  stage = "check desktop and mobile layout and browser errors";
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 1000 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
    );
    if (process.env.REINS_VERIFY_OUTPUT_DIR) {
      await mkdir(process.env.REINS_VERIFY_OUTPUT_DIR, { recursive: true });
      await page.screenshot({
        path: resolve(process.env.REINS_VERIFY_OUTPUT_DIR, `control-room-${width}.png`),
        fullPage: true,
      });
    }
  }
  assert.equal(pageErrors.length, 0);
  console.log(
    "PASS: local Next/PostgreSQL journey; four parallel decisions; persisted traces and receipts; $12,840 budget decrease; month-dependent report totals, charts and evidence; desktop/mobile overflow; no browser errors.",
  );
} catch (error) {
  const comparison =
    error?.code === "ERR_ASSERTION" &&
    ["number", "boolean"].includes(typeof error.actual) &&
    ["number", "boolean"].includes(typeof error.expected)
      ? ` Expected ${error.expected}; observed ${error.actual}.`
      : "";
  console.error(
    `FAIL: ${stage}.${comparison} Check the local server, synthetic database and simulation configuration. No server payload or credentials were logged.`,
  );
  process.exitCode = 1;
} finally {
  await browser?.close();
}
