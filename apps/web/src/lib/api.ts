"use client";

/**
 * Thin client for the Anvita backend (anvita-ai-worker-backend). Live mode is on when
 * NEXT_PUBLIC_API_URL is set; otherwise the app runs on its local demo store.
 */

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export function isLive() {
  return API_URL !== "";
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

interface Session {
  accessToken: string;
  refreshToken: string;
  workspaceId?: string | null;
}

const KEY = "anvita-session-v1";

function read(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

let session: Session | null = read();

export function getSession() {
  return session;
}

export function setSession(s: Session | null) {
  session = s;
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    // storage unavailable (private mode) — keep the in-memory session
  }
}

let refreshing: Promise<boolean> | null = null;

/** Exchange the refresh token for a new pair; concurrent callers share one request. */
export function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    const s = session;
    if (!s?.refreshToken) return false;
    try {
      const res = await fetch(`${API_URL}/v1/auth/refresh`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ refreshToken: s.refreshToken }) });
      if (!res.ok) {
        setSession(null);
        return false;
      }
      const b = (await res.json()) as { accessToken: string; refreshToken: string };
      setSession({ ...s, accessToken: b.accessToken, refreshToken: b.refreshToken });
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export type Body = Record<string, unknown> | unknown[] | FormData | undefined;

export async function api<T = any>(method: string, path: string, body?: Body, retry = true): Promise<T> {
  const headers: Record<string, string> = {};
  if (session?.accessToken) headers.authorization = `Bearer ${session.accessToken}`;
  if (session?.workspaceId) headers["x-workspace-id"] = session.workspaceId;
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isForm) headers["content-type"] = "application/json";
  const res = await fetch(`${API_URL}/v1${path}`, { method, headers, body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body) });
  if (res.status === 401 && retry && session?.refreshToken && !path.startsWith("/auth/")) {
    if (await refreshSession()) return api<T>(method, path, body, false);
    if (typeof window !== "undefined") window.dispatchEvent(new Event("anvita:signed-out"));
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : undefined;
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string; details?: { path: string; message: string }[] } } | undefined)?.error;
    const detail = err?.details?.[0]?.message;
    throw new ApiError(res.status, err?.code ?? "error", detail ? `${err?.message}: ${detail}` : (err?.message ?? `Request failed (${res.status})`));
  }
  return data as T;
}

export const get = <T = any>(path: string) => api<T>("GET", path);
export const post = <T = any>(path: string, body: Body = {}) => api<T>("POST", path, body);
export const patch = <T = any>(path: string, body: Body) => api<T>("PATCH", path, body);
export const put = <T = any>(path: string, body: Body) => api<T>("PUT", path, body);
export const del = <T = any>(path: string) => api<T>("DELETE", path);

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; email: string };
  workspaces: { id: string; name: string; role: string }[];
  workspaceId?: string;
}

export async function login(email: string, password: string) {
  const r = await api<AuthResponse>("POST", "/auth/login", { email, password });
  setSession({ accessToken: r.accessToken, refreshToken: r.refreshToken, workspaceId: r.workspaces[0]?.id ?? null });
  return r;
}

export async function signup(input: { name: string; email: string; password: string; workspaceName: string }) {
  const r = await api<AuthResponse>("POST", "/auth/signup", input);
  setSession({ accessToken: r.accessToken, refreshToken: r.refreshToken, workspaceId: r.workspaceId ?? r.workspaces[0]?.id ?? null });
  return r;
}

export async function acceptInvite(token: string, password: string, name?: string) {
  const r = await api<AuthResponse>("POST", "/auth/accept-invite", { token, password, name });
  setSession({ accessToken: r.accessToken, refreshToken: r.refreshToken, workspaceId: r.workspaceId ?? null });
  return r;
}

export async function logout() {
  const s = session;
  setSession(null);
  if (s?.refreshToken) await api("POST", "/auth/logout", { refreshToken: s.refreshToken }).catch(() => {});
}

/** Server ids are global, so client-generated ids must be unguessable enough not to collide. */
export function clientId(prefix: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return `${prefix}-${Array.from(bytes, (b) => "0123456789abcdefghjkmnpqrstvwxyz"[b & 31]).join("")}`;
}
