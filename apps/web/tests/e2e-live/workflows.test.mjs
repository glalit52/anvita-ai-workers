import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { apiCall, open, signup } from "./helpers.mjs";

test("workflows: create from a template, check it, test-run it and see each step's result", async (t) => {
  const s = await signup();
  for (const appId of ["shopify", "slack"]) await apiCall(s, "POST", "/connections", { appId });
  const { page, go, errors } = await open(t, s);
  await go("/workers/new?mode=template");
  await page.getByRole("button", { name: /Low-Stock Alert/ }).click();
  await page.waitForURL(/\/workers\/(?!new)/, { timeout: 15000 });
  await page.locator(".react-flow__node", { hasText: "Reorder sheet" }).waitFor({ timeout: 10000 });

  // The code step is real Python, shown in the inspector.
  await page.locator(".react-flow__node", { hasText: "Reorder sheet" }).click();
  assert.match(await page.getByLabel("Code").inputValue(), /files\.csv\("Reorder sheet\.csv"/);

  // Server-side checks run as the graph changes.
  await page.getByText(/ready|to check/).first().waitFor({ timeout: 10000 });

  await page.getByRole("button", { name: /Test run/ }).click();
  await page.getByLabel("Trigger input (JSON)").fill('{ "threshold": 100 }');
  await page.getByRole("button", { name: /Run test/ }).click();
  await page.locator(".react-flow__node[data-id='s1'] [data-status='done'], .react-flow__node:has-text('Alert #ops') [data-status='done']").first().waitFor({ timeout: 30000 });
  await page.getByText("succeeded").first().waitFor({ timeout: 10000 });
  // Expand the code step's output in the run panel.
  await page.getByRole("button", { name: /Reorder sheet/ }).click();
  await page.getByText(/"units_to_order"/).waitFor();
  assert.deepEqual(errors, []);
});

test("workflows: broken rules are flagged before publishing", async (t) => {
  const s = await signup();
  const w = await apiCall(s, "POST", "/workers", {
    from: "blank",
    name: "Router",
    interaction: "api",
    nodes: [
      { id: "t1", kind: "trigger", title: "API call", x: 0, y: 0 },
      { id: "b1", kind: "branch", title: "Route", x: 0, y: 130, config: { rules: ["big: amount >> 5", "else"] } },
      { id: "e1", kind: "end", title: "Big", x: -120, y: 260 },
      { id: "e2", kind: "end", title: "Small", x: 120, y: 260 },
    ],
    edges: [
      { id: "t1-b1", source: "t1", target: "b1" },
      { id: "b1-e1", source: "b1", target: "e1", label: "big" },
      { id: "b1-e2", source: "b1", target: "e2", label: "else" },
    ],
  });
  const { page, go } = await open(t, s);
  await go(`/workers/${w.id}`);
  await page.getByText("1 to fix").click({ timeout: 10000 });
  await page.getByText(/Rule “big: amount >> 5”/).waitFor();
  // Fix the rule in the inspector; the problem clears.
  await page.locator(".react-flow__node", { hasText: "Route" }).click();
  await page.getByLabel("Route 1").fill("big: amount > 5");
  await page.getByText(/ready|to check/).first().waitFor({ timeout: 10000 });
});

test("custom APIs: import an OpenAPI file with its key; its operations become actions", async (t) => {
  const s = await signup();
  const dir = mkdtempSync(join(tmpdir(), "spec-"));
  const file = join(dir, "erp.yaml");
  writeFileSync(
    file,
    `openapi: 3.0.0
info: { title: Kesar ERP }
servers: [{ url: "https://erp.kesar.example/api" }]
components: { securitySchemes: { key: { type: apiKey, in: header, name: X-ERP-Key } } }
paths:
  /stock/{sku}:
    get: { operationId: getStock, summary: Stock for one SKU, parameters: [{ name: sku, in: path, required: true, schema: { type: string } }] }
  /orders:
    post: { operationId: createOrder, summary: Create a purchase order }
`,
  );
  const { page, go } = await open(t, s);
  await go("/integrations");
  await page.getByRole("button", { name: /Import OpenAPI/ }).click();
  await page.getByRole("dialog").getByText("Upload file").click();
  await page.locator("input[type=file]").setInputFiles(file);
  await page.getByText("2 operations").waitFor({ timeout: 10000 });
  assert.equal(await page.getByLabel("Header name").inputValue(), "X-ERP-Key");
  await page.getByLabel("Token / key").fill("erp-secret");
  await page.getByRole("button", { name: /Import 2 actions/ }).click();
  await page.getByText(/erp\.kesar\.example\/api · api\.kesar_erp\.\*/).waitFor({ timeout: 10000 });
  const cat = await apiCall(s, "GET", "/workflow/catalog");
  assert.ok(cat.actions.some((a) => a.action === "api.kesar_erp.getstock"));
});

test("security: configure SAML and SCIM; the login page routes the domain to SSO", async (t) => {
  const s = await signup();
  const dir = mkdtempSync(join(tmpdir(), "idp-"));
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", join(dir, "k.pem"), "-out", join(dir, "c.pem"), "-days", "2", "-subj", "/CN=Test IdP"], { stdio: "ignore" });
  const cert = readFileSync(join(dir, "c.pem"), "utf8");
  const domain = `sso${Math.random().toString(36).slice(2, 8)}.example`;
  const { page, go } = await open(t, s);
  await go("/settings/security");
  await page.getByLabel("IdP sign-on URL").fill("https://idp.example.com/sso/saml");
  await page.getByLabel("IdP entity ID (issuer)").fill("https://idp.example.com");
  await page.getByLabel(/IdP signing certificate/).fill(cert);
  await page.getByLabel("Email domains").fill(domain);
  await page.getByRole("button", { name: /Save & turn on/ }).click();
  await page.getByText("SAML single sign-on is on").waitFor({ timeout: 10000 });

  await page.getByRole("button", { name: /Generate token/ }).click();
  await page.getByText(/Copy this token now/).waitFor();
  const token = (await page.locator("code", { hasText: "scim_" }).textContent())?.trim();
  assert.match(token ?? "", /^scim_/);
  const users = await fetch(`http://localhost:4000/v1/scim/v2/Users`, { headers: { authorization: `Bearer ${token}` } }).then((x) => x.json());
  assert.equal(users.totalResults, 1);

  // Signed out, an email in that domain is offered single sign-on.
  const anon = await open(t);
  await anon.go("/login");
  await anon.page.getByLabel("Work email").fill(`ana@${domain}`);
  await anon.page.getByLabel("Password").click();
  await anon.page.getByRole("button", { name: /Continue with single sign-on/ }).waitFor({ timeout: 10000 });
});

test("chat: the agent runs Python in the sandbox and the file opens as a real preview", async (t) => {
  const s = await signup();
  const { page, go } = await open(t, s);
  await go("/home");
  const box = page.getByPlaceholder(/Ask Anvita/).first();
  await box.fill("Please calculate the totals for me");
  await box.press("Enter");
  await page.waitForURL(/\/chat\//);
  await page.getByText("calculation.csv").first().click({ timeout: 30000 });
  const preview = page.getByTestId("artifact-preview");
  await preview.locator("table").waitFor({ timeout: 15000 });
  assert.match(await preview.textContent(), /120/);
});

test("knowledge: the page shows hybrid search status", async (t) => {
  const s = await signup();
  const { page, go } = await open(t, s);
  await go("/knowledge");
  await page.getByText(/Hybrid search|Keyword search/).first().waitFor({ timeout: 10000 });
});

test("workflows: a Wait step is configured in the Studio and parks the run", async (t) => {
  const s = await signup();
  const w = await apiCall(s, "POST", "/workers", {
    from: "blank",
    name: "Follow-up",
    interaction: "api",
    nodes: [
      { id: "t1", kind: "trigger", title: "API call", x: 0, y: 0 },
      { id: "w1", kind: "wait", title: "Wait a day", x: 0, y: 130, config: { duration: "soon" } },
      { id: "e1", kind: "end", title: "Done", x: 0, y: 260 },
    ],
    edges: [
      { id: "t1-w1", source: "t1", target: "w1" },
      { id: "w1-e1", source: "w1", target: "e1" },
    ],
  });
  const { page, go, errors } = await open(t, s);
  await go(`/workers/${w.id}`);
  await page.getByText("1 to fix").click({ timeout: 10000 });
  await page.getByText(/isn't a duration/).waitFor();
  await page.locator(".react-flow__node", { hasText: "Wait a day" }).click();
  await page.getByLabel("Wait duration").fill("1 day");
  await page.getByText(/ready|to check/).first().waitFor({ timeout: 10000 });
  await page.getByLabel("Wait mode").selectOption("at");
  assert.equal(await page.getByLabel("Wait until time").inputValue(), "09:30");
  assert.equal(await page.getByLabel("Wait duration").count(), 0);
  await page.getByLabel("Wait mode").selectOption("duration");
  await page.getByLabel("Wait duration").fill("2h");
  await page.waitForTimeout(1500); // autosave

  const saved = await apiCall(s, "GET", `/workers/${w.id}`);
  const node = saved.nodes.find((n) => n.id === "w1");
  assert.deepEqual({ duration: node.config.duration, at: node.config.at }, { duration: "2h", at: undefined });
  const pub = await apiCall(s, "POST", `/workers/${w.id}/publish`, {});
  assert.ok(pub.version >= 1, JSON.stringify(pub));
  const run = await apiCall(s, "POST", `/workers/${w.id}/runs`, { inputs: {} });
  let r;
  for (let i = 0; i < 40; i++) {
    r = await apiCall(s, "GET", `/runs/${run.id}`);
    if (r.status === "waiting") break;
    await page.waitForTimeout(250);
  }
  assert.equal(r.status, "waiting");
  assert.match(r.trace.nodes.find((n) => n.id === "w1").detail, /Waiting until/);
  assert.deepEqual(errors, []);
});
