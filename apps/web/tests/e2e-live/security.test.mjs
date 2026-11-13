import { test } from "node:test";
import assert from "node:assert/strict";
import { apiCall, open, signup, totp } from "./helpers.mjs";

test("security: set up two-step verification, require it, and sign in with a code", async (t) => {
  const s = await signup();
  const { page, go } = await open(t);
  await go("/login");
  await page.getByLabel("Work email").fill(s.email);
  await page.getByLabel("Password").fill("live-test-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/home/, { timeout: 15000 });
  await go("/settings/profile");
  await page.getByRole("button", { name: "Set up" }).click();
  const secret = (await page.locator("code").first().textContent()).trim();
  await page.getByLabel("6-digit code from the app").fill(await totp(secret));
  await page.getByRole("button", { name: "Turn on" }).click();
  await page.getByText(/Save your recovery codes/).waitFor();
  await page.getByRole("button", { name: "Done" }).click();

  await go("/settings/security");
  await page.getByLabel("Require 2-step verification").click();
  await page.getByText("2-step verification updated").waitFor();

  // A new password sign-in now asks for the code.
  const anon = await open(t);
  await anon.go("/login");
  await anon.page.getByLabel("Work email").fill(s.email);
  await anon.page.getByLabel("Password").fill("live-test-password");
  await anon.page.getByRole("button", { name: "Sign in" }).click();
  await anon.page.getByLabel("Verification code").fill(await totp(secret));
  await anon.page.getByRole("button", { name: "Verify" }).click();
  await anon.page.waitForURL(/\/home/, { timeout: 15000 });

  // The first browser lists both sessions and can sign the other one out.
  await go("/settings/security");
  await page.getByText("This device").waitFor();
  assert.ok((await page.getByRole("button", { name: "Revoke" }).count()) >= 1);
  const me = await apiCall(s, "GET", "/me/sessions");
  assert.ok(me.data.length >= 2);
});
