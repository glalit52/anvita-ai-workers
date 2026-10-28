"use client";
import { post } from "./api";
import { load } from "./backend";
import type { Connection } from "./types";

/** Live-mode connection flows against the API. */

/** OAuth: send the browser to the provider; the API redirects back to `returnTo?connected=<app>`. */
export async function startOAuth(appId: string, opts: { scope: Connection["scope"]; returnTo: string; extra?: Record<string, string> }) {
  const r = await post<{ url: string }>(`/connections/${appId}/authorize`, { scope: opts.scope, returnTo: opts.returnTo, extra: opts.extra ?? {} });
  window.location.assign(r.url);
}

/** API key / token: verified live by the server before it's saved. */
export async function connectWithCredentials(appId: string, scope: Connection["scope"], credentials: Record<string, string>, sharedWith?: string[]) {
  await post("/connections", { appId, scope, credentials, sharedWith });
  await load.connections();
}

export async function testConnection(appId: string) {
  const r = await post<{ ok: boolean; mode: "live" | "demo"; detail: string }>(`/connections/${appId}/test`);
  await load.connections();
  return r;
}
