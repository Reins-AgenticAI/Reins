import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { test } from "node:test";
import {
  clickAndWaitForResponse,
  getLoopback,
  installBrowserGuards,
  isLoopbackUrl,
} from "./control-room-browser-guards.mjs";

test("URL confinement rejects external, credentialed and non-network destinations", () => {
  for (const url of ["http://localhost:3000/path?q=1", "http://127.0.0.1/a", "https://[::1]/"])
    assert.equal(isLoopbackUrl(url), true);
  for (const url of [
    "https://example.com",
    "http://localhost.example.com",
    "http://user:secret@localhost",
    "file:///private",
    "data:text/html,test",
    "not a URL",
  ])
    assert.equal(isLoopbackUrl(url), false);
});

test("real browser guards count all console errors and block external/redirect traffic", async (t) => {
  const { chromium } = createRequire(import.meta.url)(
    process.env.PLAYWRIGHT_MODULE ?? "playwright",
  );
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL,
  });
  t.after(() => browser.close());
  let redirectedHits = 0;
  const server = createServer((request, response) => {
    if (request.url === "/redirect") {
      response.writeHead(302, { location: "/redirect-target" }).end();
    } else if (request.url === "/external-redirect") {
      response.writeHead(302, { location: "http://example.invalid/private-token" }).end();
    } else if (request.url === "/redirect-target") {
      redirectedHits++;
      response.end("should not follow");
    } else if (request.url === "/fixture.js") {
      response.setHeader("content-type", "application/javascript");
      response.end("window.fixtureLoaded = true;");
    } else {
      response.setHeader("content-type", "text/html");
      response.end('<script src="/fixture.js"></script><button disabled>Run scenario</button>');
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const context = await browser.newContext({ serviceWorkers: "block" });
  const errors = await installBrowserGuards(context);
  await context.grantPermissions(["local-network-access"], { origin: base });
  const page = await context.newPage();
  await page.goto(base);
  assert.equal(await page.evaluate(() => window.fixtureLoaded), true);
  const consoleEvent = page.waitForEvent("console", {
    predicate: (message) => message.type() === "error",
  });
  await page.evaluate(() => console.error("sensitive fixture that must never be retained"));
  await consoleEvent;
  assert.equal(errors.browserErrors, 1);
  assert.deepEqual(
    Object.values(errors).map((value) => typeof value),
    ["number", "number", "number"],
  );
  for (const path of ["/redirect", "/external-redirect"]) {
    await assert.rejects(
      getLoopback(context.request, `${base}${path}`),
      /LOOPBACK_RESPONSE_REQUIRED/,
    );
    const navigation = await context.newPage();
    await assert.rejects(navigation.goto(`${base}${path}`));
    await navigation.close();
  }
  assert.equal(redirectedHits, 0);
  await page.evaluate(async () => {
    await fetch("http://example.invalid/private-token").catch(() => undefined);
  });
  const externalPage = await context.newPage();
  await assert.rejects(externalPage.goto("http://example.invalid/private-token"));
  await externalPage.close();
  assert.ok(errors.blockedRequests >= 4);
  assert.equal(errors.guardErrors, 0);

  // A failed click is followed by page teardown rejecting the pending response wait.
  // Both rejections must remain handled, including the later cleanup rejection.
  await page.goto(base);
  page.setDefaultTimeout(25);
  const unhandled = [];
  const recordUnhandled = () => unhandled.push(true);
  process.on("unhandledRejection", recordUnhandled);
  try {
    await assert.rejects(clickAndWaitForResponse(page, () => false, page.getByRole("button")));
    await page.close();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(unhandled.length, 0);
  } finally {
    process.off("unhandledRejection", recordUnhandled);
    await context.close();
  }
});
