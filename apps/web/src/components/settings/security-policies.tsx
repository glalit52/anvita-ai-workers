"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Globe2, Laptop, LogOut, Smartphone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { confirm } from "@/components/ui/confirm";
import { SettingRow } from "@/components/settings-section";
import { del, get, patch, post } from "@/lib/api";
import { useApp } from "@/lib/store";
import { EnterpriseSso } from "./enterprise-sso";

interface Session {
  id: string;
  userAgent: string | null;
  ip: string | null;
  method: string;
  signedInAt: string;
  lastActiveAt: string;
  current: boolean;
}

const device = (ua: string | null) => {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : /node|undici|curl/i.test(ua) ? "API client" : "Browser";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
};
const ago = (iso: string) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  return m < 2 ? "Active now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`;
};
const METHOD: Record<string, string> = { pwd: "password", "pwd+otp": "password + 2-step", sso: "single sign-on" };

/** Live mode: the workspace's security policies (enforced by the API) and your sessions. */
export function LiveSecurity() {
  const settings = useApp((s) => s.settings);
  const [ip, setIp] = useState("");
  const [ranges, setRanges] = useState(String(settings["security.ipRanges"] ?? ""));
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const reloadSessions = () => get<{ data: Session[] }>("/me/sessions").then((r) => setSessions(r.data), () => setSessions([]));
  useEffect(() => {
    get<{ security: { ip: string } }>("/me").then((m) => setIp(m.security.ip), () => {});
    void reloadSessions();
  }, []);

  /** Save straight to the server (it validates and enforces). */
  const save = async (patchBody: Record<string, string | number | boolean>, label: string) => {
    try {
      const next = await patch<Record<string, string | number | boolean>>("/workspace/settings", patchBody);
      useApp.setState({ settings: next });
      toast.success(`${label} updated`);
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    }
  };
  const flag = (k: string) => settings[k] === true;

  return (
    <>
      <EnterpriseSso />
      <Card className="mt-4">
        <SettingRow title="Domain capture" description="People who sign up with your company's email domains join this workspace as members">
          <Switch checked={flag("security.domainCapture")} onCheckedChange={(v) => void save({ "security.domainCapture": v }, "Domain capture")} aria-label="Domain capture" />
        </SettingRow>
        <SettingRow title="Require 2-step verification" description="Members who sign in with a password must also enter a code from an authenticator app (SSO sign-ins are covered by your IdP)">
          <Switch checked={flag("security.mfa")} onCheckedChange={(v) => void save({ "security.mfa": v }, "2-step verification")} aria-label="Require 2-step verification" />
        </SettingRow>
        <SettingRow title="IP allowlist" description={`Only allow access from these addresses. Your current IP: ${ip || "…"}`}>
          <Switch
            checked={flag("security.ipAllowlist")}
            onCheckedChange={(v) => void save(v ? { "security.ipAllowlist": true, "security.ipRanges": ranges } : { "security.ipAllowlist": false }, "IP allowlist")}
            aria-label="IP allowlist"
          />
        </SettingRow>
        <div className="grid gap-2 border-t border-border px-5 py-4">
          <Textarea rows={2} value={ranges} onChange={(e) => setRanges(e.target.value)} placeholder="203.0.113.0/24, 198.51.100.7" className="font-mono text-[12px]" aria-label="Allowed IP ranges" />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => void save({ "security.ipRanges": ranges }, "Allowed IP ranges")}>
              Save ranges
            </Button>
            {ip && !ranges.includes(ip) && (
              <Button size="sm" variant="ghost" onClick={() => setRanges((r) => (r.trim() ? `${r.trim()}, ${ip}` : ip))}>
                Add my IP
              </Button>
            )}
          </div>
        </div>
        <SettingRow title="Session length" description="People must sign in again after this long">
          <Select value={String(settings["security.sessionHours"] ?? "0")} onChange={(e) => void save({ "security.sessionHours": Number(e.target.value) }, "Session length")} className="w-36" aria-label="Session length">
            <option value="0">No limit</option>
            <option value="8">8 hours</option>
            <option value="12">12 hours</option>
            <option value="24">24 hours</option>
            <option value="168">7 days</option>
          </Select>
        </SettingRow>
      </Card>

      <div className="mb-3 mt-8 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold">Your sessions</h3>
        {(sessions?.length ?? 0) > 1 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              if (!(await confirm({ title: "Sign out of all other devices?", description: "Every other session ends immediately.", confirmLabel: "Sign out others", danger: true }))) return;
              const r = await post<{ revoked: number }>("/me/sessions/revoke-others");
              toast(`Signed out of ${r.revoked} other session${r.revoked === 1 ? "" : "s"}`);
              void reloadSessions();
            }}
          >
            <LogOut /> Sign out other devices
          </Button>
        )}
      </div>
      <Card className="divide-y divide-border">
        {sessions === null && <p className="px-5 py-4 text-[13px] text-muted-foreground">Loading…</p>}
        {sessions?.map((s) => {
          const Icon = /iPhone|Android|iPad/.test(s.userAgent ?? "") ? Smartphone : Laptop;
          return (
            <div key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
              <Icon className="size-5 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium">
                  {device(s.userAgent)} {s.current && <Badge variant="primary" className="ml-1">This device</Badge>}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {s.ip ?? "—"} · signed in with {METHOD[s.method] ?? s.method} · {ago(s.lastActiveAt)}
                </p>
              </div>
              {!s.current && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (!(await confirm({ title: `Sign out ${device(s.userAgent)}?`, description: "The session ends immediately and must sign in again.", confirmLabel: "Revoke session", danger: true }))) return;
                    await del(`/me/sessions/${s.id}`);
                    toast(`${device(s.userAgent)} signed out`);
                    void reloadSessions();
                  }}
                >
                  Revoke
                </Button>
              )}
            </div>
          );
        })}
      </Card>

      <h3 className="mb-3 mt-8 text-[15px] font-semibold">Data</h3>
      <Card>
        <SettingRow title="Data residency" description="Conversations, memory, knowledge and run logs are stored and processed in this region">
          <Badge variant="primary" className="px-2 py-1 text-[12px]">
            <Globe2 /> {useApp.getState().workspaceInfo?.region ?? "India (Mumbai)"}
          </Badge>
        </SettingRow>
        <SettingRow title="PII redaction in logs" description="Mask Aadhaar, PAN, phone numbers, card and bank details in run logs and the audit trail">
          <Switch checked={flag("security.piiRedaction")} onCheckedChange={(v) => void save({ "security.piiRedaction": v }, "PII redaction")} aria-label="PII redaction" />
        </SettingRow>
        <SettingRow title="Conversation retention" description="Delete chats, files and run logs after this period (audit events are kept). Runs nightly.">
          <Select value={String(settings["security.retentionDays"] ?? "0")} onChange={(e) => void save({ "security.retentionDays": Number(e.target.value) }, "Retention")} className="w-36" aria-label="Conversation retention">
            <option value="0">Keep forever</option>
            <option value="90">90 days</option>
            <option value="180">180 days</option>
            <option value="365">1 year</option>
          </Select>
        </SettingRow>
        <SettingRow title="Model training" description="Your data is never used to train models. This cannot be turned on.">
          <Badge variant="success">
            <Check /> Never
          </Badge>
        </SettingRow>
      </Card>
    </>
  );
}
