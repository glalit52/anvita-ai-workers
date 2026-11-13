"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { confirm } from "@/components/ui/confirm";
import { SettingRow } from "@/components/settings-section";
import { del, get, post, put } from "@/lib/api";

interface SsoSettings {
  enabled: boolean;
  entryPoint: string | null;
  idpIssuer: string | null;
  hasCertificate: boolean;
  domains: string[];
  enforced: boolean;
  allowJit: boolean;
  defaultRole: "admin" | "builder" | "member" | "viewer";
  sp: { entityId: string; acsUrl: string; metadataUrl: string; loginUrl: string };
  scim: { baseUrl: string; tokenHint: string | null };
}

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-[11.5px] font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md bg-subtle px-2 py-1.5 font-mono text-[11.5px]">{value}</code>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={`Copy ${label}`}
          onClick={() => {
            void navigator.clipboard?.writeText(value);
            toast.success(`${label} copied`);
          }}
        >
          <Copy />
        </Button>
      </div>
    </div>
  );
}

/** SAML single sign-on and SCIM provisioning for a live workspace (admins). */
export function EnterpriseSso() {
  const [s, setS] = useState<SsoSettings | null>(null);
  const [form, setForm] = useState({ entryPoint: "", idpIssuer: "", idpCert: "", domains: "", defaultRole: "member" as SsoSettings["defaultRole"], allowJit: true });
  const [metadata, setMetadata] = useState("");
  const [busy, setBusy] = useState(false);
  const [scimToken, setScimToken] = useState<string | null>(null);

  const apply = (x: SsoSettings) => {
    setS(x);
    setForm((f) => ({ ...f, entryPoint: x.entryPoint ?? "", idpIssuer: x.idpIssuer ?? "", domains: x.domains.join(", "), defaultRole: x.defaultRole, allowJit: x.allowJit, idpCert: "" }));
  };
  useEffect(() => {
    get<SsoSettings>("/workspace/sso").then(apply, (e) => toast.error((e as Error).message));
  }, []);

  const save = async (patch: Record<string, unknown>, ok: string) => {
    setBusy(true);
    try {
      apply(await put<SsoSettings>("/workspace/sso", patch));
      toast.success(ok);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!s)
    return (
      <Card className="flex items-center gap-2 p-5 text-[13px] text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading single sign-on settings…
      </Card>
    );

  const domains = form.domains.split(/[,\s]+/).map((d) => d.trim().toLowerCase()).filter(Boolean);
  const settingsPatch = { entryPoint: form.entryPoint.trim() || null, idpIssuer: form.idpIssuer.trim() || null, ...(form.idpCert.trim() ? { idpCert: form.idpCert.trim() } : {}), domains, defaultRole: form.defaultRole, allowJit: form.allowJit };

  return (
    <div className="grid gap-4">
      <Card>
        <SettingRow title="SAML single sign-on" description={s.enabled ? `On for ${s.domains.join(", ") || "this workspace"}${s.enforced ? " · enforced" : ""}` : "Let people sign in with Okta, Entra ID, Google Workspace, OneLogin or any SAML 2.0 identity provider"}>
          {s.enabled ? (
            <Badge variant="success">
              <ShieldCheck /> {s.enforced ? "Enforced" : "On"}
            </Badge>
          ) : (
            <Badge>Off</Badge>
          )}
        </SettingRow>
        <div className="grid gap-4 border-t border-border p-5">
          <p className="text-[12.5px] font-medium">1. In your identity provider, create a SAML app with these values</p>
          <CopyRow label="ACS (reply) URL" value={s.sp.acsUrl} />
          <CopyRow label="Entity ID (audience)" value={s.sp.entityId} />
          <p className="text-[11.5px] text-muted-foreground">Name ID: email address. Send attributes <code>email</code> and <code>displayName</code> (or first/last name).</p>

          <p className="mt-2 text-[12.5px] font-medium">2. Paste the IdP's metadata, or fill the fields</p>
          <div className="flex gap-2">
            <Textarea rows={2} value={metadata} onChange={(e) => setMetadata(e.target.value)} placeholder="Metadata URL or XML" className="font-mono text-[11.5px]" aria-label="IdP metadata" />
            <Button
              type="button"
              variant="outline"
              disabled={!metadata.trim()}
              onClick={async () => {
                try {
                  const m = metadata.trim();
                  const r = await post<{ entryPoint: string | null; idpIssuer: string | null; idpCert: string | null }>("/workspace/sso/parse-metadata", m.startsWith("http") ? { url: m } : { xml: m });
                  setForm((f) => ({ ...f, entryPoint: r.entryPoint ?? f.entryPoint, idpIssuer: r.idpIssuer ?? f.idpIssuer, idpCert: r.idpCert ?? f.idpCert }));
                  toast.success("Read the IdP settings from the metadata");
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              Read
            </Button>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sso-entry">IdP sign-on URL</Label>
            <Input id="sso-entry" value={form.entryPoint} onChange={(e) => setForm({ ...form, entryPoint: e.target.value })} placeholder="https://kesar.okta.com/app/…/sso/saml" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sso-issuer">IdP entity ID (issuer)</Label>
            <Input id="sso-issuer" value={form.idpIssuer} onChange={(e) => setForm({ ...form, idpIssuer: e.target.value })} placeholder="http://www.okta.com/exk…" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sso-cert">IdP signing certificate {s.hasCertificate && <span className="font-normal text-muted-foreground">(saved — paste to replace)</span>}</Label>
            <Textarea id="sso-cert" rows={3} value={form.idpCert} onChange={(e) => setForm({ ...form, idpCert: e.target.value })} placeholder="-----BEGIN CERTIFICATE-----" className="font-mono text-[11px]" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="sso-domains">Email domains</Label>
              <Input id="sso-domains" value={form.domains} onChange={(e) => setForm({ ...form, domains: e.target.value })} placeholder="kesarfoods.in" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sso-role">Role for new people</Label>
              <Select id="sso-role" value={form.defaultRole} onChange={(e) => setForm({ ...form, defaultRole: e.target.value as SsoSettings["defaultRole"] })}>
                <option value="viewer">Viewer</option>
                <option value="member">Member</option>
                <option value="builder">Builder</option>
                <option value="admin">Admin</option>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium">Create accounts on first sign-in</p>
              <p className="text-[11.5px] text-muted-foreground">Off: only invited or SCIM-provisioned people can sign in</p>
            </div>
            <Switch checked={form.allowJit} onCheckedChange={(v) => setForm({ ...form, allowJit: v })} aria-label="Create accounts on first sign-in" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={() => save({ ...settingsPatch, enabled: true }, "SAML single sign-on is on")}>
              {busy && <Loader2 className="animate-spin" />} {s.enabled ? "Save" : "Save & turn on"}
            </Button>
            <Button type="button" variant="outline" onClick={() => window.open(s.sp.loginUrl, "_blank")} disabled={!s.enabled}>
              Test sign-in
            </Button>
            {s.enabled && (
              <Button type="button" variant="ghost" onClick={() => save({ enabled: false, enforced: false }, "SAML single sign-on is off")}>
                Turn off
              </Button>
            )}
          </div>
        </div>
        <SettingRow title="Require SSO" description="Members with these email domains can't sign in with a password">
          <Switch
            checked={s.enforced}
            disabled={!s.enabled}
            onCheckedChange={async (v) => {
              if (v && !(await confirm({ title: "Require single sign-on?", description: `People with ${s.domains.join(", ")} emails will only be able to sign in through your identity provider. Make sure a test sign-in works first.`, confirmLabel: "Require SSO" }))) return;
              await save({ enforced: v }, v ? "SSO is now required" : "Password sign-in allowed again");
            }}
            aria-label="Require SSO"
          />
        </SettingRow>
      </Card>

      <Card>
        <SettingRow title="SCIM provisioning" description="Your IdP adds, updates and removes members, and sets their role through groups (Admins, Builders, Members, Viewers)">
          {s.scim.tokenHint ? <Badge variant="success">Token …{s.scim.tokenHint}</Badge> : <Badge>Not set up</Badge>}
        </SettingRow>
        <div className="grid gap-3 border-t border-border p-5">
          <CopyRow label="SCIM base URL" value={s.scim.baseUrl} />
          {scimToken && (
            <div className="rounded-lg border border-saffron/40 bg-saffron-soft p-3">
              <p className="mb-1 text-[12px] font-medium text-saffron">Copy this token now — it won't be shown again.</p>
              <CopyRow label="SCIM token" value={scimToken} />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                if (s.scim.tokenHint && !(await confirm({ title: "Generate a new SCIM token?", description: "The current token stops working immediately; update it in your identity provider.", confirmLabel: "Generate" }))) return;
                try {
                  const r = await post<{ token: string; hint: string }>("/workspace/scim-token");
                  setScimToken(r.token);
                  setS({ ...s, scim: { ...s.scim, tokenHint: r.hint } });
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              <KeyRound /> {s.scim.tokenHint ? "Rotate token" : "Generate token"}
            </Button>
            {s.scim.tokenHint && (
              <Button
                type="button"
                variant="ghost"
                onClick={async () => {
                  if (!(await confirm({ title: "Turn off SCIM?", description: "Your identity provider will no longer be able to provision members.", confirmLabel: "Revoke token", danger: true }))) return;
                  await del("/workspace/scim-token");
                  setScimToken(null);
                  setS({ ...s, scim: { ...s.scim, tokenHint: null } });
                  toast("SCIM token revoked");
                }}
              >
                Revoke
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
