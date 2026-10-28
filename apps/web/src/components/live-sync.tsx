"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { getSession, isLive } from "@/lib/api";
import { connectEvents, disconnectEvents, flushBufferedEvents, hydrate, installLiveActions } from "@/lib/backend";
import { useApp } from "@/lib/store";
import { appById } from "@/lib/mock/apps";

const PUBLIC = [/^\/$/, /^\/login/, /^\/invite\//, /^\/auth\//];
let installed = false;

function userOf(jwt: string) {
  try {
    return (JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as { sub?: string }).sub ?? "";
  } catch {
    return "";
  }
}

/**
 * Live mode only: guards signed-in routes, loads the workspace from the API once per session and
 * keeps it current over SSE. Renders nothing.
 */
export function LiveSync() {
  const pathname = usePathname();
  const router = useRouter();
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!isLive()) return;
    if (!installed) {
      installLiveActions();
      installed = true;
    }
    const onSignedOut = () => {
      disconnectEvents();
      loadedFor.current = null;
      useApp.setState({ liveReady: false });
      router.replace(`/login?next=${encodeURIComponent(location.pathname)}`);
    };
    window.addEventListener("anvita:signed-out", onSignedOut);
    return () => window.removeEventListener("anvita:signed-out", onSignedOut);
  }, [router]);

  useEffect(() => {
    if (!isLive() || PUBLIC.some((re) => re.test(pathname))) return;
    const s = getSession();
    if (!s) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    // One load per user + workspace (token refreshes must not trigger a reload).
    const key = `${userOf(s.accessToken)}:${s.workspaceId ?? ""}`;
    if (loadedFor.current === key) return;
    loadedFor.current = key;
    // Subscribe first (events buffer until the snapshot lands) so nothing between the two is lost.
    connectEvents();
    hydrate()
      .then(flushBufferedEvents)
      .catch((e: Error) => {
        loadedFor.current = null;
        toast.error(`Couldn't load your workspace: ${e.message}`);
      });
  }, [pathname, router]);

  // Results of redirects back from OAuth providers.
  useEffect(() => {
    if (!isLive()) return;
    const q = new URLSearchParams(window.location.search);
    const connected = q.get("connected");
    const error = q.get("connect_error");
    if (!connected && !error) return;
    if (connected) toast.success(`${appById[connected]?.name ?? connected} connected — using your live account`);
    if (error) toast.error(`Couldn't connect ${appById[q.get("app") ?? ""]?.name ?? "the app"}: ${error}`);
    q.delete("connected");
    q.delete("connect_error");
    q.delete("app");
    window.history.replaceState(null, "", `${window.location.pathname}${q.size ? `?${q}` : ""}`);
  }, [pathname]);

  useEffect(() => () => disconnectEvents(), []);
  return null;
}
