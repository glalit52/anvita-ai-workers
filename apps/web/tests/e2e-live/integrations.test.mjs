import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { API, apiCall, open, signup } from "./helpers.mjs";

/** Live-mode integrations: API-key connections, MCP servers, billing, SSO landing and analytics. */

test("integrations: connect with an API key (verified by the server) and with sample data", async (t) => {
  const s = await signup();
  const { page, go, errors } = await open(t, s);
  await go("/integrations");
  await page.getByRole("textbox", { name: /search/i }).first().fill("stripe").catch(() => {});
  await page.getByText("Stripe", { exact: true }).first().scrollIntoViewIfNeeded();
  // App directory card → Connect
  const card = page.locator("div", { has: page.getByText("Stripe", { exact: true }) }).filter({ has: page.getByRole("button", { name: "Connect" }) }).last();
  await card.getByRole("button", { name: "Connect" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: "API key" }).or(dialog.getByRole("button", { name: "API key" })).first().click();
  await dialog.getByLabel("Secret key").fill("rk_test_example");
  await dialog.getByRole("button", { name: /Verify & connect/ }).click();
  // The server tries Stripe for real: either it's unreachable from this sandbox (saved with an error) or the key is rejected.
  await page.waitForTimeout(1500);
  const conns = await apiCall(s, "GET", "/connections");
  const stripe = conns.data.find((c) => c.appId === "stripe");
  const alert = await dialog.getByRole("alert").textContent().catch(() => null);
  assert.ok((stripe && stripe.mode === "live" && stripe.hasCredentials) || /rejected|stripe/i.test(alert ?? ""), `stripe connected or rejected (${alert})`);
  if (await dialog.isVisible()) await dialog.getByRole("button", { name: "Cancel" }).click();

  // Sample data path for an app without a live connector.
  await apiCall(s, "POST", "/connections", { appId: "tally" });
  await go("/integrations");
  await page.getByText("Sample data").first().waitFor();
  assert.deepEqual(errors, []);
});

test("MCP: add a server, discover its tools and let the agent call one", async (t) => {
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const msg = JSON.parse(body);
      if (!("id" in msg)) return res.writeHead(202).end();
      const result =
        msg.method === "initialize"
          ? { protocolVersion: "2025-06-18", capabilities: {}, serverInfo: { name: "inventory" } }
          : msg.method === "tools/list"
            ? { tools: [{ name: "stock_level", description: "Stock for a SKU", inputSchema: { type: "object", properties: { query: { type: "string" } } }, annotations: { readOnlyHint: true } }] }
            : { content: [{ type: "text", text: "Kaju Katli: 412 boxes in Bhiwandi" }] };
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result }));
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  t.after(() => server.close());
  const url = `http://localhost:${server.address().port}/mcp`;

  const s = await signup();
  const { page, go } = await open(t, s);
  await go("/integrations");
  await page.getByRole("button", { name: /Add MCP server|MCP server/ }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill("Inventory");
  await dialog.getByLabel("Server URL").fill(url);
  await dialog.getByRole("radio", { name: "None" }).or(dialog.getByRole("button", { name: "None" })).first().click();
  await dialog.getByRole("button", { name: /Connect & add/ }).click();
  await page.getByText(/Inventory added — 1 tools/).waitFor({ timeout: 10000 });

  await go("/chat");
  await page.locator("textarea").first().fill("Use stock_level to check Kaju Katli");
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/chat\/t-/);
  await page.getByText("Kaju Katli: 412 boxes in Bhiwandi").first().waitFor({ timeout: 20000 });
});

test("billing: top-up without a payment provider records credits; history shows payments", async (t) => {
  const s = await signup();
  const before = (await apiCall(s, "GET", "/billing")).creditsTotal;
  const { page, go } = await open(t, s);
  await go("/settings/billing");
  await page.getByRole("button", { name: /top-up|Buy credits|Top up/i }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByText(/manual top-up/).waitFor();
  await dialog.getByRole("button", { name: /^Pay / }).click();
  await page.waitForTimeout(1500);
  const after = (await apiCall(s, "GET", "/billing")).creditsTotal;
  assert.equal(after, before + 100000);
});

test("SSO landing stores the session; analytics shows live data", async (t) => {
  const s = await signup("Sso Person");
  const { page, go, errors } = await open(t);
  await go(`/auth/callback#access_token=${s.accessToken}&refresh_token=${s.refreshToken}&workspace_id=${s.workspaceId}&redirect=%2Fanalytics`);
  await page.waitForURL(/\/analytics/);
  await page.getByText(/By person & Worker/).waitFor({ timeout: 10000 });
  await go("/login?sso_error=Your%20Google%20email%20address%20isn%27t%20verified");
  await page.getByRole("alert").getByText(/isn't verified/).waitFor();
  assert.deepEqual(errors, []);
  assert.ok(API);
});
