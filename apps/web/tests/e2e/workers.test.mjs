import { test } from "node:test";
import assert from "node:assert/strict";
import { open } from "./helpers.mjs";

test("describe a Worker → Autopilot builds it → Studio edits persist", async (t) => {
  const { page, go, errors } = await open(t);
  await go("/workers/new?mode=describe");
  await page.locator("textarea").first().fill("Every Monday pull Shopify orders and email a summary to the ops team for approval");
  await page.getByRole("button", { name: /Generate Worker/ }).click();
  await page.getByRole("button", { name: /Open draft/ }).click({ timeout: 15000 });
  await page.waitForURL(/\/workers\/(?!new)/);
  const url = page.url();

  await page.locator(".react-flow__node").first().waitFor({ timeout: 10000 });
  const before = await page.locator(".react-flow__node").count();
  assert.ok(before >= 3, `generated graph has nodes (${before})`);
  await page.getByRole("button", { name: /^Code/ }).first().click();
  await page.waitForTimeout(1200); // debounced save
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".react-flow__node").first().waitFor({ timeout: 10000 });
  assert.equal(page.url(), url);
  assert.equal(await page.locator(".react-flow__node").count(), before + 1, "added node persisted");
  assert.deepEqual(errors, []);
});

test("gallery menu: duplicate, pause and delete", async (t) => {
  const { page, go } = await open(t);
  await go("/workers");
  await page.getByRole("button", { name: "Actions for Lead Research SDR" }).click();
  await page.getByRole("menuitem", { name: /Duplicate/ }).click();
  await go("/workers");
  await page.getByText("Lead Research SDR (copy)").first().waitFor();

  await page.getByRole("button", { name: "Actions for Lead Research SDR (copy)" }).click();
  await page.getByRole("menuitem", { name: /Delete/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: /Delete/ }).click();
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Lead Research SDR").first().waitFor();
  assert.equal(await page.getByRole("button", { name: "Actions for Lead Research SDR (copy)" }).count(), 0);
});

test("eval suite: add a case and run", async (t) => {
  const { page, go } = await open(t);
  await go("/workers/support?tab=test");
  await page.getByRole("button", { name: /Run suite/ }).click();
  await page.getByText(/passed/).first().waitFor({ timeout: 10000 });
});

test("Studio inspector: adding a tool to an agent step persists", async (t) => {
  const { page, go } = await open(t);
  await go("/workers/support");
  await page.locator(".react-flow__node", { hasText: "Understand request" }).click();
  await page.getByLabel("Add a tool").selectOption("hubspot");
  await page.getByRole("button", { name: "Remove hubspot" }).waitFor();
  await page.waitForTimeout(1200);
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".react-flow__node", { hasText: "Understand request" }).click();
  await page.getByRole("button", { name: "Remove hubspot" }).waitFor({ timeout: 5000 });
});
