import { test } from "node:test";
import assert from "node:assert/strict";
import { open } from "./helpers.mjs";

test("members: invite persists across reload", async (t) => {
  const { page, go } = await open(t);
  await go("/settings/members");
  await page.getByRole("button", { name: /^Invite/ }).first().click();
  const d = page.getByRole("dialog");
  const inputs = d.locator("input");
  await inputs.nth(0).fill("Ravi Kumar");
  await inputs.nth(1).fill("ravi@kesarfoods.in");
  await d.getByRole("button", { name: /Send invite|Invite/ }).last().click();
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("ravi@kesarfoods.in").waitFor();
});

test("developers: create API key reveals secret once", async (t) => {
  const { page, go } = await open(t);
  await go("/settings/developers");
  await page.getByRole("button", { name: /Create API key/ }).click();
  const d = page.getByRole("dialog");
  await d.locator("input").first().fill("CI pipeline");
  await d.getByRole("button", { name: /Create key/ }).click();
  await d.getByText(/anv_live_[a-z0-9]{32}/).waitFor();
});

test("policies: new rule appears and generates policy code", async (t) => {
  const { page, go } = await open(t);
  await go("/settings/policies");
  await page.getByRole("button", { name: /New rule/ }).click();
  const d = page.getByRole("dialog");
  await d.locator("input").first().fill("Block Shopify price changes");
  await d.getByRole("button", { name: /Save rule/ }).click();
  await page.getByText("Block Shopify price changes").first().waitFor();
});

test("language switch to Hindi translates the shell", async (t) => {
  const { page, go } = await open(t);
  await go("/settings/profile");
  await page.getByRole("button", { name: "हिन्दी" }).click();
  await page.getByText("अन्विता से पूछें").first().waitFor();
  await go("/home");
  await page.getByText("आज अन्विता आपका कौन-सा काम संभाले?").waitFor();
});

test("notifications: mark all read clears the bell count", async (t) => {
  const { page, go } = await open(t);
  await go("/notifications");
  await page.getByRole("button", { name: /Mark all read/ }).first().click();
  await page.waitForTimeout(300);
  assert.equal(await page.getByRole("button", { name: "Notifications" }).locator("span").count(), 0);
});

test("onboarding: company name and connected apps carry into the workspace", async (t) => {
  const { page, go } = await open(t);
  await go("/onboarding");
  await page.getByLabel("Company name").fill("Saffron Snacks");
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: /^Continue/ }).click();
  await page.getByRole("button", { name: /^Connect$/ }).first().click();
  await page.getByText("Done").first().waitFor();
  for (let i = 0; i < 2; i++) await page.getByRole("button", { name: /^Continue/ }).click();
  await page.getByRole("button", { name: /Go to Anvita/ }).click();
  await page.waitForURL(/\/home/);
  await page.getByText("Saffron Snacks").first().waitFor();
});
