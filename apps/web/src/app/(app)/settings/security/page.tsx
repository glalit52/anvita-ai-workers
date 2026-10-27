"use client";
import { Check, Download, Globe2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SectionHeader, SettingRow } from "@/components/settings-section";

export default function SecurityPage() {
  return (
    <>
      <SectionHeader title="Security & SSO" description="Identity, data residency and compliance controls." />
      <Card>
        <SettingRow title="Single sign-on (SAML / OIDC)" description="Google Workspace · kesarfoods.in · enforced for all members">
          <Badge variant="success"><Check /> Enforced</Badge>
        </SettingRow>
        <SettingRow title="SCIM provisioning" description="Automatically add and remove members from your identity provider">
          <Switch defaultChecked />
        </SettingRow>
        <SettingRow title="Domain capture" description="New sign-ups from @kesarfoods.in join this workspace">
          <Switch defaultChecked />
        </SettingRow>
        <SettingRow title="Session length" description="Require re-authentication after">
          <Select defaultValue="12" className="w-32">
            <option value="8">8 hours</option>
            <option value="12">12 hours</option>
            <option value="24">24 hours</option>
          </Select>
        </SettingRow>
      </Card>

      <h3 className="mb-3 mt-8 text-[15px] font-semibold">Data</h3>
      <Card>
        <SettingRow title="Data residency" description="Conversations, memory, knowledge and run logs are stored and processed in this region">
          <Badge variant="primary" className="px-2 py-1 text-[12px]"><Globe2 /> India · Mumbai (ap-south-1)</Badge>
        </SettingRow>
        <SettingRow title="PII redaction in logs" description="Mask Aadhaar, PAN, phone numbers, card and bank details in traces and audit exports">
          <Switch defaultChecked />
        </SettingRow>
        <SettingRow title="Conversation retention" description="Delete conversation content after this period (audit events are kept)">
          <Select defaultValue="180" className="w-32">
            <option value="90">90 days</option>
            <option value="180">180 days</option>
            <option value="365">1 year</option>
          </Select>
        </SettingRow>
        <SettingRow title="Model training" description="Your data is never used to train models. This cannot be turned on.">
          <Badge variant="success"><Check /> Never</Badge>
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
            <Button variant="link" size="sm" className="mt-2 h-auto text-[12px]"><Download className="size-3.5" /> Download</Button>
          </div>
        ))}
      </div>
    </>
  );
}
