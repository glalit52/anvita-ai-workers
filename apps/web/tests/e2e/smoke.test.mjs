import { test } from "node:test";
import assert from "node:assert/strict";
import { open } from "./helpers.mjs";

const pages = ["/", "/login", "/onboarding", "/home", "/chat", "/chat/t-growth", "/workers", "/workers/new", "/workers/support", "/workers/invoices/queue", "/approvals", "/inbox", "/integrations", "/knowledge", "/memory", "/analytics", "/notifications", "/help", "/settings/profile", "/settings/members", "/settings/security", "/settings/policies", "/settings/models", "/settings/audit", "/settings/billing", "/settings/developers"];

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`every page renders without errors or overflow at ${viewport.width}px`, async (t) => {
    const { page, go, errors } = await open(t, { viewport });
    for (const p of pages) {
      await go(p);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 2, `${p} overflows by ${overflow}px`);
    }
    assert.deepEqual(errors, []);
  });
}
