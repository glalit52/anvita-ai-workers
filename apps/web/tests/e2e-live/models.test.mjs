import { test } from "node:test";
import assert from "node:assert/strict";
import { apiCall, open, signup } from "./helpers.mjs";

test("models: live tiers, routing the runtime honours, key validation", async (t) => {
  const s = await signup();
  const { page, go } = await open(t, s);
  await go("/settings/models");
  await page.getByText("claude-sonnet-5-5").waitFor();
  await page.getByText(/% of calls · 30 days/).first().waitFor();
  await page.getByLabel("Routing strategy").selectOption("quality");
  await page.getByLabel("Allow Precise tier").click();
  let settings = {};
  for (let i = 0; i < 40 && !(settings["models.routing"] === "quality" && settings["models.tier.precise"] === false); i++) {
    await page.waitForTimeout(250);
    settings = await apiCall(s, "GET", "/workspace/settings");
  }
  assert.equal(settings["models.routing"], "quality");
  assert.equal(settings["models.tier.precise"], false);
  // Region pinning isn't enforced by the API, so it isn't offered in live mode.
  assert.equal(await page.getByLabel("Region pinning").count(), 0);

  // A key Anthropic rejects (or that can't be checked from this sandbox) is never saved.
  await page.getByTestId("byo-key").getByRole("button", { name: "Add key" }).click();
  await page.getByRole("textbox", { name: "Anthropic API key" }).fill("sk-ant-api03-not-a-real-key-0000000000");
  await page.getByRole("button", { name: "Verify & save" }).click();
  await page.getByText(/rejected this key|Couldn't (verify|reach)/).waitFor({ timeout: 30000 });
  assert.equal((await apiCall(s, "GET", "/models")).apiKey, null);
});
