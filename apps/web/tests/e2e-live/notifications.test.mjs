import { test } from "node:test";
import assert from "node:assert/strict";
import { apiCall, open, signup } from "./helpers.mjs";

test("notifications: WhatsApp number and Slack approvals channel", async (t) => {
  const s = await signup();
  const { page, go } = await open(t, s);
  await go("/settings/profile");
  await page.getByLabel("WhatsApp number").fill("12");
  await page.getByLabel("WhatsApp number").press("Enter");
  await page.getByText(/country code/).waitFor();
  await page.getByLabel("WhatsApp number").fill("+91 98200 11223");
  await page.getByLabel("WhatsApp number").press("Enter");
  await page.getByText("WhatsApp number saved").waitFor();
  await page.getByLabel("Approval channel").selectOption("whatsapp");
  await page.getByLabel("Slack approvals channel").fill("C0APPROVALS");
  await page.getByLabel("Slack approvals channel").press("Enter");
  await page.getByText("Approvals channel saved").waitFor();
  // Push is off without VAPID keys on the test server.
  assert.equal(await page.getByLabel("Browser notifications").isDisabled(), true);

  const me = await apiCall(s, "GET", "/me");
  assert.equal(me.user.phone, "919820011223");
  await page.waitForTimeout(300);
  assert.equal((await apiCall(s, "GET", "/me")).user.approvalChannel, "whatsapp");
  assert.equal((await apiCall(s, "GET", "/workspace/settings"))["notify.approvalsSlackChannel"], "C0APPROVALS");
});
