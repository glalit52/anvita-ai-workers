import { chromium } from "playwright";

export const BASE = process.env.BASE_URL ?? "http://localhost:3100";
export const API = process.env.API_URL ?? "http://localhost:4000";

/** Create a fresh workspace through the API (isolates each test). */
export async function signup(name = "Live Tester") {
  const email = `live${Math.random().toString(36).slice(2, 10)}@livetest.in`;
  const res = await fetch(`${API}/v1/auth/signup`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, email, password: "live-test-password", workspaceName: "Live Co" }) });
  if (!res.ok) throw new Error(`signup failed: ${await res.text()}`);
  const b = await res.json();
  return { email, accessToken: b.accessToken, refreshToken: b.refreshToken, workspaceId: b.workspaceId };
}

export async function apiCall(session, method, path, body) {
  const res = await fetch(`${API}/v1${path}`, { method, headers: { authorization: `Bearer ${session.accessToken}`, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return res.status === 204 ? null : res.json();
}

/** Browser page; with `session` the app starts signed in. */
export async function open(t, session) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (session) {
    const value = JSON.stringify({ accessToken: session.accessToken, refreshToken: session.refreshToken, workspaceId: session.workspaceId });
    await context.addInitScript((v) => localStorage.setItem("anvita-session-v1", v), value);
  }
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  t.after(async () => browser.close());
  const go = async (path) => {
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
  };
  return { page, go, errors };
}

/** RFC 6238 TOTP for tests (SHA-1, 6 digits, 30 s). */
export async function totp(secret) {
  const { createHmac } = await import("node:crypto");
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, value = 0;
  const bytes = [];
  for (const c of secret.replace(/=+$/, "")) {
    value = (value << 5) | A.indexOf(c);
    bits += 5;
    if (bits >= 8) bytes.push((value >>> (bits -= 8)) & 255);
  }
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const h = createHmac("sha1", Buffer.from(bytes)).update(counter).digest();
  const o = h[h.length - 1] & 15;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1000000).padStart(6, "0");
}
