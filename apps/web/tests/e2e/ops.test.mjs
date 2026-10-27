import { test } from "node:test";
import assert from "node:assert/strict";
import { open } from "./helpers.mjs";

test("approvals: approve one, counts update, persisted", async (t) => {
  const { page, go } = await open(t);
  await go("/approvals");
  const badge = () => page.locator("nav a[href='/approvals'] span.rounded-full").textContent();
  assert.equal((await badge()).trim(), "4");
  await page.getByRole("button", { name: "Approve", exact: true }).first().click();
  await page.waitForTimeout(300);
  assert.equal((await badge()).trim(), "3");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  assert.equal((await badge()).trim(), "3");
});

test("work queue keyboard shortcut A approves and posts", async (t) => {
  const { page, go } = await open(t);
  await go("/workers/invoices/queue");
  await page.locator("body").click({ position: { x: 5, y: 300 } });
  await page.keyboard.press("a");
  await page.getByText(/posted to Tally/).first().waitFor({ timeout: 5000 });
});

test("handoff inbox: resolve moves conversation to Resolved", async (t) => {
  const { page, go } = await open(t);
  await go("/inbox");
  await page.getByRole("button", { name: /^Resolve$/ }).first().click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /Resolved\s*1/ }).waitFor();
  const badge = await page.locator("nav a[href='/inbox'] span.rounded-full").textContent();
  assert.equal(badge.trim(), "2");
});
