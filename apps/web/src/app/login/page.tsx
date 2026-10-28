"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Mail, Smartphone } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { API_URL, get, isLive, login, logout, signup } from "@/lib/api";
import { useApp } from "@/lib/store";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.1 14.7 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.7H12z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#F25022" d="M2 2h9.5v9.5H2z" />
      <path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z" />
      <path fill="#00A4EF" d="M2 12.5h9.5V22H2z" />
      <path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z" />
    </svg>
  );
}

function LoginInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">(params.get("mode") === "signup" ? "signup" : "signin");
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [loading, setLoading] = useState<string | null>(null);

  const live = isLive();
  const [form, setForm] = useState({ name: "", email: "", password: "", workspaceName: "" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (live && params.get("signout")) {
      void logout();
      useApp.setState({ liveReady: false });
    }
  }, [live, params]);

  const [sso, setSso] = useState<{ google: boolean; microsoft: boolean } | null>(null);
  useEffect(() => {
    if (!live) return;
    get<{ google: boolean; microsoft: boolean }>("/auth/sso/providers").then(setSso).catch(() => setSso({ google: false, microsoft: false }));
    const err = params.get("sso_error");
    if (err) setError(err);
  }, [live, params]);

  const go = (which: string) => {
    if (live && which !== "otp") {
      const provider = which === "ms" ? "microsoft" : "google";
      if (!sso?.[provider]) {
        toast.message(`${provider === "google" ? "Google" : "Microsoft"} sign-in isn't set up on this server — use your email and password.`);
        return;
      }
      setLoading(which);
      const next = params.get("next");
      window.location.assign(`${API_URL}/v1/auth/sso/${provider}/start?redirect=${encodeURIComponent(next && next.startsWith("/") && !next.startsWith("//") ? next : "/home")}`);
      return;
    }
    setLoading(which);
    setTimeout(() => router.push(mode === "signup" ? "/onboarding" : "/home"), 800);
  };

  /** Live mode: real email + password auth against the API. */
  const submitLive = async () => {
    setError(null);
    setLoading("otp");
    try {
      if (mode === "signup") await signup({ name: form.name.trim(), email: form.email.trim(), password: form.password, workspaceName: form.workspaceName.trim() || `${form.name.trim().split(" ")[0]}'s workspace` });
      else await login(form.email.trim(), form.password);
      useApp.setState({ liveReady: false });
      const next = params.get("next");
      router.push(mode === "signup" ? "/onboarding" : next && next.startsWith("/") && !next.startsWith("//") ? next : "/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(null);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 md:px-12">
        <Link href="/">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-[26px] font-semibold tracking-tight">{mode === "signup" ? "Hire your AI coworker" : "Welcome back"}</h1>
          <p className="mt-1.5 text-[14px] text-muted-foreground">{mode === "signup" ? "Free to start · 2,000 credits · no card needed" : "Sign in to your Anvita workspace"}</p>

          <div className="mt-8 grid gap-2.5">
            <Button variant="outline" size="lg" onClick={() => go("google")} disabled={!!loading}>
              {loading === "google" ? <Loader2 className="animate-spin" /> : <GoogleIcon />} Continue with Google
            </Button>
            <Button variant="outline" size="lg" onClick={() => go("ms")} disabled={!!loading}>
              {loading === "ms" ? <Loader2 className="animate-spin" /> : <MicrosoftIcon />} Continue with Microsoft
            </Button>
          </div>

          <div className="my-6 flex items-center gap-3 text-[12px] text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          {live ? (
            <form
              className="grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void submitLive();
              }}
            >
              {mode === "signup" && (
                <>
                  <div className="grid gap-1.5">
                    <Label htmlFor="name">Your name</Label>
                    <Input id="name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="workspace">Company / workspace name</Label>
                    <Input id="workspace" autoComplete="organization" value={form.workspaceName} onChange={(e) => setForm({ ...form, workspaceName: e.target.value })} placeholder="e.g. Kesar Foods" />
                  </div>
                </>
              )}
              <div className="grid gap-1.5">
                <Label htmlFor="email">Work email</Label>
                <Input id="email" type="email" autoComplete="email" placeholder="you@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={mode === "signup" ? 10 : 1} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                {mode === "signup" && <p className="text-[11.5px] text-muted-foreground">At least 10 characters.</p>}
              </div>
              {error && <p role="alert" className="text-[12.5px] text-danger">{error}</p>}
              <Button type="submit" size="lg" disabled={!!loading}>
                {loading === "otp" && <Loader2 className="animate-spin" />} {mode === "signup" ? "Create workspace" : "Sign in"}
              </Button>
            </form>
          ) : (
          <>
          <div className="mb-3 inline-flex rounded-lg bg-muted p-0.5 text-[12.5px]">
            {[
              { v: "email" as const, l: "Work email", i: Mail },
              { v: "phone" as const, l: "WhatsApp / phone", i: Smartphone },
            ].map((m) => (
              <button key={m.v} onClick={() => setMethod(m.v)} className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 cursor-pointer ${method === m.v ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}>
                <m.i className="size-3.5" /> {m.l}
              </button>
            ))}
          </div>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              go("otp");
            }}
          >
            {method === "email" ? (
              <div className="grid gap-1.5">
                <Label htmlFor="email">Work email</Label>
                <Input id="email" type="email" placeholder="you@company.com" required />
              </div>
            ) : (
              <div className="grid gap-1.5">
                <Label htmlFor="phone">Mobile number</Label>
                <div className="flex gap-2">
                  <Input value="+91" readOnly className="w-16" aria-label="Country code" />
                  <Input id="phone" inputMode="tel" placeholder="98200 11223" required />
                </div>
                <p className="text-[11.5px] text-muted-foreground">We’ll send a one-time code on WhatsApp.</p>
              </div>
            )}
            <Button type="submit" size="lg" disabled={!!loading}>
              {loading === "otp" && <Loader2 className="animate-spin" />} {method === "email" ? "Send magic link" : "Send code"}
            </Button>
          </form>
          </>
          )}

          <p className="mt-6 text-center text-[13px] text-muted-foreground">
            {mode === "signup" ? "Already have an account? " : "New to Anvita? "}
            <button onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="font-medium text-primary hover:underline cursor-pointer">
              {mode === "signup" ? "Sign in" : "Create a workspace"}
            </button>
          </p>
          <p className="mt-6 text-center text-[11.5px] text-muted-foreground">By continuing you agree to the Terms and Privacy Policy. SSO (SAML) is available on Business plans.</p>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-[#0f1020] lg:block">
        <div className="absolute -left-20 top-20 size-96 rounded-full bg-primary/40 blur-3xl" />
        <div className="absolute bottom-0 right-0 size-80 rounded-full bg-saffron/30 blur-3xl" />
        <div className="relative flex h-full flex-col justify-end p-14 text-white">
          <p className="text-[28px] font-semibold leading-snug tracking-tight">“Anvita closes our GST reconciliation in 20 minutes instead of two days — and it asks before it touches Tally.”</p>
          <p className="mt-4 text-white/60">Kabir Mehta · Finance Lead, Kesar Foods</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
