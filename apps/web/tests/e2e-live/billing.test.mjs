import { test } from "node:test";
import assert from "node:assert/strict";
import { apiCall, open, signup } from "./helpers.mjs";

test("billing: trial → choose a plan → GST invoice with PDF", async (t) => {
  const s = await signup();
  const { page, go } = await open(t, s);
  await go("/settings/billing");
  const sub = page.getByTestId("subscription");
  await sub.getByText("Trial", { exact: true }).waitFor();
  await sub.getByText(/Trial ends/).waitFor();

  // GST details: a bad GSTIN is refused, a valid one sets the place of supply.
  await page.getByLabel("Legal name").fill("Kesar Foods Pvt Ltd");
  await page.getByLabel("GSTIN").fill("27AAKCK4410C1Z");
  await page.getByRole("button", { name: "Save billing details" }).click();
  await page.getByText(/valid GSTIN/).waitFor();
  await page.getByLabel("GSTIN").fill("27AAKCK4410C1ZP");
  await page.getByRole("button", { name: "Save billing details" }).click();
  await page.getByText("Billing details saved").waitFor();

  // No payment provider on the test server: Growth activates now with a due invoice.
  await page.getByTestId("plan-growth").getByRole("button", { name: "Choose Growth" }).click();
  await page.getByRole("button", { name: "Switch to Growth" }).click();
  await page.getByText("You're on Growth").waitFor();
  await sub.getByText("Growth", { exact: true }).waitFor();
  await page.reload();
  const invoices = page.getByTestId("invoices");
  await invoices.getByText(/Growth plan/).waitFor();
  await invoices.getByText(/IGST/).waitFor();
  const download = page.waitForEvent("download");
  await invoices.getByRole("button", { name: /Download ANV/ }).first().click();
  assert.match((await download).suggestedFilename(), /^ANV-\d{4}-\d{2}-\d{6}\.pdf$/);

  const plans = await apiCall(s, "GET", "/billing/plans");
  assert.equal(plans.subscription.plan, "growth");
  assert.equal(plans.subscription.provider, "manual");
});
