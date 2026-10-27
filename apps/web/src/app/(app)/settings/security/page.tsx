"use client";
import { toast } from "sonner";
import { Check, Download, Globe2, Laptop, Smartphone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { confirm } from "@/components/ui/confirm";
import { SectionHeader, SettingRow } from "@/components/settings-section";
import { useApp, useSetting } from "@/lib/store";
import { downloadFile } from "@/lib/download";

const sessions = [
  { id: "s1", device: "Chrome on macOS", where: "Mumbai, IN · 49.36.••.12", when: "Active now", current: true, icon: Laptop },
  { id: "s2", device: "Anvita for iOS", where: "Mumbai, IN · 106.51.••.3", when: "2 hours ago", icon: Smartphone },
  { id: "s3", device: "Edge on Windows", where: "Pune, IN · 117.99.••.40", when: "3 days ago", icon: Laptop },
];

const docs: Record<string, { file: string; body: string }> = {
  "SOC 2 Type II": {
    file: "Anvita-SOC2-Type-II-summary.md",
    body: "# Anvita AI — SOC 2 Type II (summary)\n\nPeriod: 1 Apr 2026 – 30 Sep 2026\nAuditor: Independent CPA firm\nOpinion: Unqualified\n\nTrust services criteria: Security, Availability, Confidentiality.\n\nThe full report is available under NDA from security@anvita.ai.\n",
  },
  "ISO 27001": {
    file: "Anvita-ISO-27001-certificate.md",
    body: "# Anvita AI — ISO/IEC 27001:2022\n\nScope: Design, development and operation of the Anvita AI platform.\nCertificate valid until: 2029-06-30.\n",
  },
  "DPDP Act 2023": {
    file: "Anvita-Data-Processing-Agreement-IN.md",
    body: "# Data Processing Agreement — India (DPDP Act 2023)\n\nData fiduciary: Kesar Foods Pvt Ltd\nData processor: Anvita AI\n\n1. Processing only on documented instructions.\n2. Data stored and processed in India (Mumbai).\n3. Consent records retained for audit.\n4. Breach notification within 72 hours.\n5. Deletion on request within 30 days.\n",
  },
  GDPR: {
    file: "Anvita-GDPR-DPA.md",
    body: "# Data Processing Addendum — GDPR\n\nStandard Contractual Clauses (2021/914) incorporated.\nEU region (Frankfurt) available for EU personal data.\nSub-processor list: https://anvita.ai/subprocessors\n",
  },
};

export default function SecurityPage() {
  const [scim, setScim] = useSetting<boolean>("security.scim", true);
  const [domain, setDomain] = useSetting<boolean>("security.domainCapture", true);
  const [session, setSession] = useSetting<string>("security.sessionHours", "12");
  const [mfa, setMfa] = useSetting<boolean>("security.mfa", true);
  const [pii, setPii] = useSetting<boolean>("security.piiRedaction", true);
  const [retention, setRetention] = useSetting<string>("security.retentionDays", "180");
  const [ipAllow, setIpAllow] = useSetting<boolean>("security.ipAllowlist", false);
  const [revoked, setRevoked] = useSetting<string>("security.revokedSessions", "");
  const log = useApp((s) => s.log);
  const revokedIds = revoked.split(",").filter(Boolean);

  const saved = (label: string) => toast.success(`${label} updated`);

  return (
    <>
      <SectionHeader title="Security & SSO" description="Identity, data residency and compliance controls." />
      <Card>
        <SettingRow title="Single sign-on (SAML / OIDC)" description="Google Workspace · kesarfoods.in · enforced for all members">
          <Badge variant="success">
            <Check /> Enforced
          </Badge>
        </SettingRow>
        <SettingRow title="SCIM provisioning" description="Automatically add and remove members from your identity provider">
          <Switch checked={scim} onCheckedChange={(v) => { setScim(v); saved("SCIM provisioning"); log("security.scim", v ? "enabled" : "disabled"); }} aria-label="SCIM provisioning" />
        </SettingRow>
        <SettingRow title="Domain capture" description="New sign-ups from @kesarfoods.in join this workspace">
          <Switch checked={domain} onCheckedChange={(v) => { setDomain(v); saved("Domain capture"); }} aria-label="Domain capture" />
        </SettingRow>
        <SettingRow title="Require 2-step verification" description="For members who sign in without SSO (e.g. WhatsApp OTP)">
          <Switch checked={mfa} onCheckedChange={(v) => { setMfa(v); saved("2-step verification"); log("security.mfa", v ? "required" : "optional"); }} aria-label="Require 2-step verification" />
        </SettingRow>
        <SettingRow title="IP allowlist" description="Only allow sign-ins from office and VPN IP ranges">
          <Switch checked={ipAllow} onCheckedChange={(v) => { setIpAllow(v); saved("IP allowlist"); }} aria-label="IP allowlist" />
        </SettingRow>
        <SettingRow title="Session length" description="Require re-authentication after">
          <Select value={session} onChange={(e) => { setSession(e.target.value); saved("Session length"); }} className="w-32" aria-label="Session length">
            <option value="8">8 hours</option>
            <option value="12">12 hours</option>
            <option value="24">24 hours</option>
          </Select>
        </SettingRow>
      </Card>

      <h3 className="mb-3 mt-8 text-[15px] font-semibold">Active sessions</h3>
      <Card className="divide-y divide-border">
        {sessions.map((s) => {
          const isRevoked = revokedIds.includes(s.id);
          return (
            <div key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
              <s.icon className="size-5 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium">
                  {s.device} {s.current && <Badge variant="primary" className="ml-1">This device</Badge>}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {s.where} · {s.when}
                </p>
              </div>
              {s.current ? null : isRevoked ? (
                <Badge>Revoked</Badge>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (await confirm({ title: `Sign out ${s.device}?`, description: "The session ends immediately and must sign in again.", confirmLabel: "Revoke session", danger: true })) {
                      setRevoked([...revokedIds, s.id].join(","));
                      log("session.revoked", s.device);
                      toast(`${s.device} signed out`);
                    }
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
            <Globe2 /> India · Mumbai (ap-south-1)
          </Badge>
        </SettingRow>
        <SettingRow title="PII redaction in logs" description="Mask Aadhaar, PAN, phone numbers, card and bank details in traces and audit exports">
          <Switch checked={pii} onCheckedChange={(v) => { setPii(v); saved("PII redaction"); log("security.pii_redaction", v ? "on" : "off"); }} aria-label="PII redaction" />
        </SettingRow>
        <SettingRow title="Conversation retention" description="Delete conversation content after this period (audit events are kept)">
          <Select value={retention} onChange={(e) => { setRetention(e.target.value); saved("Retention"); }} className="w-32" aria-label="Conversation retention">
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

      <h3 className="mb-3 mt-8 text-[15px] font-semibold">Compliance</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["SOC 2 Type II", "Report available"],
          ["ISO 27001", "Certified"],
          ["DPDP Act 2023", "DPA + consent logs"],
          ["GDPR", "EU region available"],
        ].map(([t, d]) => (
          <div key={t} className="rounded-xl border border-border bg-card p-4">
            <p className="text-[13.5px] font-medium">{t}</p>
            <p className="text-[12px] text-muted-foreground">{d}</p>
            <Button
              variant="link"
              size="sm"
              className="mt-2 h-auto text-[12px]"
              onClick={() => {
                downloadFile(docs[t].file, docs[t].body, "text/markdown;charset=utf-8");
                log("compliance.document.downloaded", t);
              }}
            >
              <Download className="size-3.5" /> Download
            </Button>
          </div>
        ))}
      </div>
    </>
  );
}
