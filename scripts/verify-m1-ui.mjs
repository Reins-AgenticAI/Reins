import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
try {
  await page.goto(`${base}/assurance`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Agent operations" }).waitFor();
  await page.getByRole("button", { name: "Parallel" }).first().click();
  await page.getByRole("button", { name: "Launch task" }).first().click();
  await page.getByText("Task accepted").waitFor();
  await page.getByRole("button", { name: "Launch task" }).last().click();
  await page.getByRole("button", { name: "Pause task" }).waitFor();
  await page.getByRole("button", { name: "Pause task" }).click();
  await page.getByRole("button", { name: "Resume task" }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("heading", { name: "Agent operations" }).waitFor();
  await page.screenshot({ path: "docs/verification/m1-command-center-mobile.png", fullPage: true });
  console.log("M1 UI journey passed: command center, assignment, launch, pause, resume, mobile.");
} finally {
  await browser.close();
}
