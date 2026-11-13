"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { acceptInvite, get, isLive } from "@/lib/api";
import { useApp } from "@/lib/store";

interface Invite { email: string; name: string; role: string; workspace: string; hasAccount: boolean }

/** Accept a workspace invite: create an account (or confirm an existing one) and join. */
export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isLive()) return setError("Invites need the Anvita API (set NEXT_PUBLIC_API_URL).");
    get<Invite>(`/auth/invites/${token}`)
      .then((i) => {
        setInvite(i);
        setName(i.name);
      })
      .catch((e: Error) => setError(e.message));
  }, [token]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await acceptInvite(token, password, invite?.hasAccount ? undefined : name.trim());
      useApp.setState({ liveReady: false });
      router.push("/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't accept the invite");
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col px-6 py-8 md:px-12">
      <Link href="/">
        <Logo />
      </Link>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
        {!invite && !error && <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />}
        {invite && (
          <>
            <h1 className="text-[24px] font-semibold tracking-tight">Join {invite.workspace}</h1>
            <p className="mt-1.5 text-[14px] text-muted-foreground">
              You’ve been invited as <span className="font-medium text-foreground">{invite.role}</span> ({invite.email}).
            </p>
            <form
              className="mt-6 grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              {!invite.hasAccount && (
                <div className="grid gap-1.5">
                  <Label htmlFor="name">Your name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
              )}
              <div className="grid gap-1.5">
                <Label htmlFor="password">{invite.hasAccount ? "Your Anvita password" : "Choose a password"}</Label>
                <Input id="password" type="password" minLength={10} autoComplete={invite.hasAccount ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              {error && <p role="alert" className="text-[12.5px] text-danger">{error}</p>}
              <Button type="submit" size="lg" disabled={busy}>
                {busy && <Loader2 className="animate-spin" />} Join workspace
              </Button>
            </form>
          </>
        )}
        {!invite && error && (
          <div className="text-center">
            <p className="text-[15px] font-medium">This invite can’t be used</p>
            <p className="mt-1 text-[13px] text-muted-foreground">{error}</p>
            <Button asChild className="mt-5" variant="outline">
              <Link href="/login">Go to sign in</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
