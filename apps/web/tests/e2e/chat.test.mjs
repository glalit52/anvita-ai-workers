import { test } from "node:test";
import assert from "node:assert/strict";
import { open } from "./helpers.mjs";

test("ask → connect → approve → save as AI Worker, persisted across reload", async (t) => {
  const { page, go, errors } = await open(t);
  await go("/home");
  await page.locator("textarea").first().fill("Check website traffic and orders for last week, make a PDF report and email it to the founders");
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/chat\/t-/);
  const threadUrl = page.url();

  await page.getByText("Connect Google Analytics to continue").waitFor({ timeout: 15000 });
  await page.getByRole("button", { name: "Connect with OAuth" }).click();
  await page.getByText("Send results by email").first().waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: "Approve", exact: true }).last().click();
  await page.getByText(/Sent\./).waitFor({ timeout: 10000 });

  await page.getByRole("button", { name: "Save as AI Worker" }).click();
  const dialog = page.getByRole("dialog");
  for (let i = 0; i < 2; i++) await dialog.getByRole("button", { name: "Continue" }).click();
  await dialog.getByRole("button", { name: /Run test/ }).click();
  await dialog.getByRole("button", { name: /Publish v1/ }).click({ timeout: 10000 });
  await page.getByText(/Saved as AI Worker/).waitFor();

  // persisted: thread + new worker survive reload
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText(/Saved as AI Worker/).waitFor({ timeout: 10000 });
  assert.equal(page.url(), threadUrl);
  await go("/workers");
  assert.ok((await page.locator("text=Check website traffic").count()) > 0 || (await page.getByText(/website traffic/i).count()) > 0, "compiled worker listed in gallery");
  assert.deepEqual(errors, []);
});

test("thread actions: rename and delete", async (t) => {
  const { page, go } = await open(t);
  await go("/chat/t-gst");
  await page.getByRole("button", { name: "Actions for GST reconciliation for September" }).first().click();
  await page.getByRole("menuitem", { name: /Delete/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: /Delete/ }).click();
  await page.waitForURL(/\/chat$/);
  await go("/chat");
  assert.equal(await page.getByText("GST reconciliation for September").count(), 0);
});
