import { chromium } from "playwright";

export const BASE = process.env.BASE_URL ?? "http://localhost:3100";

/** Fresh browser context per test file; localStorage starts empty so seed data is used. */
export async function open(t, { viewport = { width: 1440, height: 900 }, colorScheme = "light" } = {}) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport, colorScheme });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  t.after(async () => browser.close());
  const go = async (path) => {
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    await page.waitForTimeout(150);
  };
  return { page, go, errors, context };
}
