"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Download, KeyRound, ShieldAlert, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { SettingRow } from "@/components/settings-section";
import { get, post, replaceTokens } from "@/lib/api";
import { downloadFile } from "@/lib/download";

interface Me {
  security: { mfaEnabled: boolean; hasPassword: boolean; mfaRequired: boolean; sessionMethod: string | null; ip: string };
}

/** Two-step verification (TOTP authenticator app + recovery codes). */
export function TwoStepCard() {
  const params = useSearchParams();
  const [me, setMe] = useState<Me["security"] | null>(null);
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [disabling, setDisabling] = useState(false);
  const refresh = () => get<Me>("/me").then((m) => setMe(m.security), () => {});
  useEffect(() => {
    void refresh();
  }, []);
  if (!me) return null;

  const start = async () => {
    const r = await post<{ secret: string; otpauthUrl: string }>("/me/mfa/setup");
    setSetup({ secret: r.secret, qr: await QRCode.toDataURL(r.otpauthUrl, { margin: 1, width: 180 }) });
    setCode("");
  };

  return (
    <>
      <h3 className="mb-3 mt-8 text-[15px] font-semibold">Two-step verification</h3>
      {(me.mfaRequired || params.get("mfa") === "required") && !me.mfaEnabled && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-saffron/40 bg-saffron-soft p-3 text-[13px] text-saffron">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" /> Your workspace requires two-step verification. Set it up below to continue.
        </div>
      )}
      <Card>
        <SettingRow title="Authenticator app" description={me.mfaEnabled ? "On — you'll enter a code from your authenticator app when signing in with a password." : "Use Google Authenticator, Microsoft Authenticator, 1Password or any TOTP app."}>
          {me.mfaEnabled ? (
            <Badge variant="success">
              <ShieldCheck /> On
            </Badge>
          ) : !setup ? (
            <Button size="sm" onClick={() => void start()} disabled={!me.hasPassword} title={me.hasPassword ? undefined : "You sign in with SSO; your identity provider handles two-step verification"}>
              <KeyRound /> Set up
            </Button>
          ) : null}
        </SettingRow>
        {setup && !codes && (
          <div className="grid gap-4 border-t border-border p-5 sm:grid-cols-[180px_1fr]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={setup.qr} alt="Scan with your authenticator app" className="size-[180px] rounded-lg border border-border bg-white" />
            <div className="grid content-start gap-3">
              <p className="text-[13px]">Scan the code with your authenticator app, or enter this key:</p>
              <code className="break-all rounded-md bg-subtle px-2 py-1.5 font-mono text-[12px]">{setup.secret}</code>
              <div className="grid gap-1.5">
                <Label htmlFor="mfa-confirm">6-digit code from the app</Label>
                <div className="flex gap-2">
                  <Input id="mfa-confirm" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} className="w-36" />
                  <Button
                    onClick={async () => {
                      try {
                        const r = await post<{ recoveryCodes: string[]; accessToken?: string; refreshToken?: string }>("/me/mfa/enable", { code });
                        if (r.accessToken && r.refreshToken) replaceTokens(r.accessToken, r.refreshToken);
                        setCodes(r.recoveryCodes);
                        toast.success("Two-step verification is on");
                        void refresh();
                      } catch (e) {
                        toast.error((e as Error).message);
                      }
                    }}
                  >
                    Turn on
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        {codes && (
          <div className="grid gap-3 border-t border-border p-5">
            <p className="text-[13px] font-medium">Save your recovery codes — each works once if you lose your phone. They won't be shown again.</p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {codes.map((c) => (
                <code key={c} className="rounded-md bg-subtle px-2 py-1.5 text-center font-mono text-[12px]">
                  {c}
                </code>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => downloadFile("anvita-recovery-codes.txt", codes.join("\n"), "text/plain")}>
                <Download /> Download
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setCodes(null);
                  setSetup(null);
                  // Workspace data loads once the session satisfies the policy.
                  if (me.mfaRequired || params.get("mfa") === "required") window.location.href = "/home";
                }}
              >
                Done
              </Button>
            </div>
          </div>
        )}
        {me.mfaEnabled && (
          <div className="flex flex-wrap items-end gap-2 border-t border-border p-5">
            {disabling ? (
              <>
                <div className="grid gap-1.5">
                  <Label htmlFor="mfa-off">Code or recovery code</Label>
                  <Input id="mfa-off" value={code} onChange={(e) => setCode(e.target.value)} className="w-44" />
                </div>
                <Button
                  variant="danger"
                  onClick={async () => {
                    try {
                      await post("/me/mfa/disable", { code });
                      toast("Two-step verification is off");
                      setDisabling(false);
                      setCode("");
                      void refresh();
                    } catch (e) {
                      toast.error((e as Error).message);
                    }
                  }}
                >
                  Turn off
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setDisabling(true)}>
                Turn off two-step verification
              </Button>
            )}
          </div>
        )}
      </Card>
    </>
  );
}
