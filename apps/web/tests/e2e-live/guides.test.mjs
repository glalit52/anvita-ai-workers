import { test } from "node:test";
import assert from "node:assert/strict";
import { API, apiCall, open, signup } from "./helpers.mjs";

test("product tour: walks the main areas once and remembers it", async (t) => {
  const s = await signup();
  const { page, go, errors } = await open(t, s);
  await go("/home?tour=1");
  const tour = page.getByRole("dialog", { name: "Ask Anvita" });
  await tour.waitFor();
  await tour.getByText("1 of 5").waitFor();
  for (const next of ["AI Workers", "Approvals", "Integrations", "Settings"]) {
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("dialog", { name: next }).waitFor();
  }
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("dialog", { name: "Integrations" }).waitFor();
  await page.keyboard.press("ArrowRight");
  await page.getByRole("button", { name: "Start with Ask Anvita" }).click();
  await page.waitForURL(/\/chat/);
  assert.equal(await page.evaluate(() => localStorage.getItem("anvita-tour-done-v1")), "1");
  // From Help it can be taken again.
  await go("/help");
  await page.getByRole("link", { name: /Product tour/ }).click();
  await page.getByRole("dialog", { name: "Ask Anvita" }).waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog", { name: "Ask Anvita" }).count(), 0);
  assert.deepEqual(errors, []);
});

test("connect dialog shows a setup guide; developers page links the live API reference", async (t) => {
  const s = await signup();
  const { page, go } = await open(t, s);
  await go("/integrations");
  await page.getByRole("textbox", { name: /search/i }).first().fill("shopify").catch(() => {});
  const card = page.locator("div", { has: page.getByText("Shopify", { exact: true }) }).filter({ has: page.getByRole("button", { name: "Connect" }) }).last();
  await card.getByRole("button", { name: "Connect" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: "API key" }).or(dialog.getByRole("button", { name: "API key" })).first().click();
  await dialog.getByText("How to get your Shopify credentials").waitFor();
  await dialog.getByText(/Admin API access token \(shpat_…\)/).waitFor();
  assert.match(await dialog.getByRole("link", { name: /Shopify documentation/ }).getAttribute("href"), /^https:\/\/shopify\.dev\//);
  await dialog.getByRole("button", { name: "Cancel" }).click();

  await go("/settings/developers");
  const ref = page.getByTestId("api-reference");
  await ref.getByText(`${API}/v1`).waitFor();
  const [docs] = await Promise.all([page.context().waitForEvent("page"), ref.getByRole("button", { name: "Open API reference" }).click()]);
  await docs.waitForLoadState();
  assert.equal(new URL(docs.url()).pathname.replace(/\/$/, ""), "/docs");
  await docs.getByText("Anvita AI API").first().waitFor({ timeout: 15000 });
  assert.match(await page.locator("pre", { hasText: "mcpServers" }).textContent(), new RegExp(`${API}/v1/mcp`));

  // The MCP endpoint the snippet points at answers with a key.
  const key = await apiCall(s, "POST", "/api-keys", { name: "mcp", scope: "all" });
  const r = await fetch(`${API}/v1/mcp`, { method: "POST", headers: { authorization: `Bearer ${key.secret ?? key.key}`, "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) });
  assert.equal((await r.json()).result.tools.length, 5);
});
