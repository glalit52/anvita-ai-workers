"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { setSession } from "@/lib/api";
import { useApp } from "@/lib/store";

/** Landing page after Google/Microsoft sign-in: the API passes tokens in the URL fragment (never sent to servers). */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const p = new URLSearchParams(window.location.hash.slice(1));
    const access = p.get("access_token");
    const refresh = p.get("refresh_token");
    if (!access || !refresh) return setError("Sign-in didn't complete. Please try again.");
    setSession({ accessToken: access, refreshToken: refresh, workspaceId: p.get("workspace_id") || null });
    useApp.setState({ liveReady: false });
    window.history.replaceState(null, "", "/auth/callback");
    const redirect = p.get("redirect") ?? "/home";
    router.replace(redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/home");
  }, [router]);
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 text-[14px] text-muted-foreground">
      {error ? (
        <>
          <p>{error}</p>
          <Link href="/login" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </>
      ) : (
        <>
          <Loader2 className="size-5 animate-spin" /> Signing you in…
        </>
      )}
    </div>
  );
}
