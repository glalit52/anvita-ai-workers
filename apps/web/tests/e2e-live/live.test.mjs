import { test } from "node:test";
import assert from "node:assert/strict";
import { apiCall, open, signup } from "./helpers.mjs";

/**
 * Live-mode journeys: the web app built with NEXT_PUBLIC_API_URL against a running backend.
 * Run: see README → "Running against the backend".
 */

test("auth: guarded routes redirect, sign in loads the workspace, sign out ends the session", async (t) => {
  const s = await signup("Asha Rao");
  const { page, go, errors } = await open(t);
  await go("/home");
  await page.waitForURL(/\/login\?next=%2Fhome/);
  await page.fill("#email", s.email);
  await page.fill("#password", "wrong-password-123");
  await page.click("button[type=submit]");
  await page.getByRole("alert").getByText(/incorrect/).waitFor();
  await page.fill("#password", "live-test-password");
  await page.click("button[type=submit]");
  await page.waitForURL(/\/home/);
  await page.getByText("Live Co").first().waitFor();

  await go("/login?signout=1");
  await go("/workers");
  await page.waitForURL(/\/login/);
  assert.deepEqual(errors, []);
});

test("signup in the UI creates a workspace", async (t) => {
  const { page, go } = await open(t);
  await go("/login?mode=signup");
  await page.fill("#name", "Ravi Kumar");
  await page.fill("#workspace", "Ravi Traders");
  await page.fill("#email", `ravi${Date.now()}@ravitraders.in`);
  await page.fill("#password", "ravi-password-123");
  await page.click("button[type=submit]");
  await page.waitForURL(/\/onboarding/);
  await go("/home");
  await page.getByText("Ravi Traders").first().waitFor();
});

test("chat: connect card pauses the run, connecting resumes it, history persists", async (t) => {
  const s = await signup();
  const { page, go, errors } = await open(t, s);
  await go("/chat");
  await page.locator("textarea").first().fill("How did our Google Analytics traffic and sessions do this week?");
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/chat\/t-/);
  await page.getByText("Connect Google Analytics to continue").waitFor({ timeout: 15000 });
  await page.getByRole("button", { name: /Connect with OAuth/ }).click();
  await page.getByText("Google Analytics connected").first().waitFor({ timeout: 15000 });
  await page.getByText(/Done\. Here's what I found/).waitFor({ timeout: 20000 });

  await page.reload({ waitUntil: "networkidle" });
  await page.getByText(/Done\. Here's what I found/).waitFor({ timeout: 10000 });
  const runs = await apiCall(s, "GET", "/runs");
  assert.equal(runs.data[0].status, "succeeded");
  assert.deepEqual(errors, []);
});

test("chat: approving in the thread sends the email and finishes the run", async (t) => {
  const s = await signup();
  await apiCall(s, "POST", "/connections", { appId: "gmail" });
  const { page, go } = await open(t, s);
  await go("/chat");
  await page.locator("textarea").first().fill("Draft a short update and email it to partner@othercompany.com");
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/chat\/t-/);
  await page.getByRole("button", { name: /^Approve$/ }).first().click({ timeout: 20000 });
  await page.getByText(/Sent, and logged in the audit trail/).waitFor({ timeout: 20000 });
  const approvals = await apiCall(s, "GET", "/approvals");
  assert.equal(approvals.data[0].status, "approved");
  const audit = await apiCall(s, "GET", "/audit");
  assert.ok(audit.data.some((a) => a.action === "gmail.send"));
});

test("workers: Autopilot draft is saved and Studio edits persist on the server", async (t) => {
  const s = await signup();
  const { page, go } = await open(t, s);
  await go("/workers/new?mode=describe");
  await page.locator("textarea").first().fill("Every Monday pull Shopify orders and email a summary to the ops team for approval");
  await page.getByRole("button", { name: /Generate Worker/ }).click();
  await page.getByRole("button", { name: /Open draft/ }).click({ timeout: 15000 });
  await page.waitForURL(/\/workers\/(?!new)/);
  const id = page.url().split("/workers/")[1];
  await page.locator(".react-flow__node").first().waitFor({ timeout: 10000 });
  const before = await page.locator(".react-flow__node").count();
  await page.getByRole("button", { name: /^Code/ }).first().click();
  // Debounced save: poll the API until the new node lands.
  let saved = 0;
  for (let i = 0; i < 20 && saved !== before + 1; i++) {
    await page.waitForTimeout(250);
    saved = (await apiCall(s, "GET", `/workers/${id}`)).nodes.length;
  }
  assert.equal(saved, before + 1);
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".react-flow__node").first().waitFor({ timeout: 10000 });
  assert.equal(await page.locator(".react-flow__node").count(), before + 1);
});

test("settings: memory, members and API keys are written to the server", async (t) => {
  const s = await signup();
  const { page, go } = await open(t, s);
  await go("/memory");
  await page.getByRole("button", { name: /Add memory/ }).first().click();
  let d = page.getByRole("dialog");
  await d.locator("textarea").first().fill("Diwali dispatch cut-off is 25 October.");
  await d.getByRole("button", { name: /Save|Add/ }).last().click();
  await page.waitForTimeout(800);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Diwali dispatch cut-off is 25 October.").waitFor();

  await go("/settings/members");
  await page.getByRole("button", { name: /^Invite/ }).first().click();
  d = page.getByRole("dialog");
  await d.locator("input").nth(0).fill("Neha Iyer");
  await d.locator("input").nth(1).fill("neha@livetest.in");
  await d.getByRole("button", { name: /Send invite|Invite/ }).last().click();
  await page.waitForTimeout(800);
  const members = await apiCall(s, "GET", "/members");
  assert.ok(members.data.some((m) => m.email === "neha@livetest.in" && m.status === "invited"));

  await go("/settings/developers");
  await page.getByRole("button", { name: /Create API key/ }).click();
  d = page.getByRole("dialog");
  await d.locator("input").first().fill("CI pipeline");
  await d.getByRole("button", { name: /Create key/ }).click();
  const secret = await d.getByText(/anv_live_[a-z0-9]{40}/).innerText();
  const viaKey = await fetch(`${process.env.API_URL ?? "http://localhost:4000"}/v1/workers`, { headers: { authorization: `Bearer ${secret.match(/anv_live_[a-z0-9]{40}/)[0]}` } });
  assert.equal(viaKey.status, 200);
});
