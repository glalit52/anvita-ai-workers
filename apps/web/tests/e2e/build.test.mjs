import { test } from "node:test";
import assert from "node:assert/strict";
import { open } from "./helpers.mjs";

test("knowledge: create a knowledge base", async (t) => {
  const { page, go } = await open(t);
  await go("/knowledge");
  await page.getByRole("button", { name: /New knowledge base/ }).first().click();
  const d = page.getByRole("dialog");
  await d.locator("input").first().fill("Vendor contracts");
  await d.getByRole("button", { name: /Create/ }).click();
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Vendor contracts").first().waitFor();
});

test("memory: add a memory", async (t) => {
  const { page, go } = await open(t);
  await go("/memory");
  await page.getByRole("button", { name: /Add memory/ }).first().click();
  const d = page.getByRole("dialog");
  await d.locator("textarea").first().fill("Diwali dispatch cut-off is 25 October.");
  await d.getByRole("button", { name: /Save|Add/ }).last().click();
  await page.getByText("Diwali dispatch cut-off is 25 October.").waitFor();
});

test("analytics: export CSV downloads a file", async (t) => {
  const { page, go } = await open(t);
  await go("/analytics");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Export CSV/ }).click()]);
  assert.match(download.suggestedFilename(), /\.csv$/);
});

test("integrations: connect an app from the directory", async (t) => {
  const { page, go } = await open(t);
  await go("/integrations");
  await page.getByPlaceholder(/Search/).last().fill("Jira");
  await page.getByRole("button", { name: /^Connect$/ }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: /Continue to Jira/ }).click();
  await page.getByText(/Jira connected/).waitFor({ timeout: 5000 });
});
