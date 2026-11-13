import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { API, apiCall, open, signup } from "./helpers.mjs";

test("channels: add a website widget and chat through it from a customer site", async (t) => {
  const s = await signup();
  const { page, go } = await open(t, s);
  await go("/settings/channels");
  await page.getByRole("button", { name: /Website chat/ }).click();
  await page.getByLabel("Channel name").fill("Shop chat");
  await page.getByLabel("Allowed websites").fill("localhost");
  await page.getByLabel("Greeting").fill("Hi from Kesar Foods!");
  await page.getByRole("button", { name: "Add channel" }).click();
  await page.getByText("Website chat added").waitFor();
  const embed = await page.getByTestId("channel-widget").locator("code").first().textContent();
  assert.match(embed, /data-anvita-widget="wgt_/);

  // A customer's website with the embed code. (Chrome treats intercepted pages as public and
  // would block them from calling the API on localhost, so local-network checks are off here.)
  const other = await chromium.launch({ args: ["--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessSendPreflights"] });
  t.after(() => other.close());
  const site = await other.newPage();
  await site.route("http://localhost:3999/", (r) => r.fulfill({ contentType: "text/html", body: `<!doctype html><html><body><h1>Kesar Foods</h1>${embed}</body></html>` }));
  await site.goto("http://localhost:3999/");
  await site.getByRole("button", { name: "Open chat" }).click();
  await site.getByText("Hi from Kesar Foods!").waitFor();
  await site.getByLabel("Message").fill("Do you deliver to Pune?");
  await site.getByLabel("Message").press("Enter");
  await site.locator(".m.agent").nth(1).waitFor({ timeout: 30000 });

  // The conversation shows up for the team as a website thread.
  const threads = await apiCall(s, "GET", "/threads");
  assert.ok(threads.data.some((x) => x.channel === "widget"));
  // Sites outside the allowed list don't get the widget.
  const r = await fetch(`${API}/v1/public/widget/${/wgt_\w+/.exec(embed)[0]}`, { headers: { origin: "https://evil.test" } });
  assert.equal(r.status, 401);
});
