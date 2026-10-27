"use client";
import { Check, CreditCard } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { SectionHeader, SettingRow } from "@/components/settings-section";
import { useApp } from "@/lib/store";
import { workspace } from "@/lib/mock/workspace";
import { formatCredits } from "@/lib/utils";
import { cn } from "@/lib/utils";

const plans = [
  { name: "Starter", price: "₹0", sub: "trial credits", features: ["2,000 trial credits", "Slack or WhatsApp", "Ask Anvita + 1 Worker"] },
  { name: "Team", price: "₹4,999", sub: "per workspace / month", features: ["50,000 credits", "All chat channels", "Unlimited Workers", "Approvals & audit log"] },
  { name: "Business", price: "₹19,999", sub: "per workspace / month", features: ["2,00,000 credits", "Studio + evals + versions", "Voice Workers", "SSO & SCIM"], current: true },
  { name: "Enterprise", price: "Custom", sub: "outcome-based pricing", features: ["Pay per resolved outcome", "VPC / on-prem", "Custom DPA & SLAs", "Dedicated success team"] },
];

export default function BillingPage() {
  const used = useApp((s) => s.creditsUsed);
  const pct = (used / workspace.creditsTotal) * 100;
  return (
    <>
      <SectionHeader title="Billing & usage" description="Credits are per workspace — not per seat. Invite your whole team." />
      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[12.5px] text-muted-foreground">Credits used this cycle · renews {workspace.renewsOn}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatCredits(used)} <span className="text-[14px] font-normal text-muted-foreground">/ {formatCredits(workspace.creditsTotal)}</span>
            </p>
          </div>
          <Button variant="outline">Buy top-up</Button>
        </div>
        <Progress value={pct} className="mt-4 h-2" tone={pct > 80 ? "warning" : "primary"} />
        <p className="mt-2 text-[12px] text-muted-foreground">At the current pace you'll use ~1,92,000 credits this cycle.</p>
      </Card>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((p) => (
          <div key={p.name} className={cn("flex flex-col rounded-2xl border bg-card p-5", p.current ? "border-primary shadow-[0_0_0_3px] shadow-primary/15" : "border-border")}>
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-semibold">{p.name}</p>
              {p.current && <Badge variant="primary">Current</Badge>}
            </div>
            <p className="mt-2 text-2xl font-semibold">{p.price}</p>
            <p className="text-[12px] text-muted-foreground">{p.sub}</p>
            <ul className="mt-4 flex flex-1 flex-col gap-1.5 text-[13px]">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-success" /> {f}
                </li>
              ))}
            </ul>
            <Button variant={p.current ? "secondary" : "outline"} className="mt-4" disabled={p.current}>
              {p.current ? "Current plan" : p.name === "Enterprise" ? "Talk to sales" : "Switch"}
            </Button>
          </div>
        ))}
      </div>

      <h3 className="mb-3 mt-8 text-[15px] font-semibold">Budgets & alerts</h3>
      <Card>
        <SettingRow title="Workspace monthly cap" description="Pause non-critical runs when reached; critical Workers can overdraft up to 10%">
          <Input defaultValue="2,20,000" className="w-36" />
        </SettingRow>
        <SettingRow title="Ask before expensive tasks" description="Anvita asks for confirmation when a single task is estimated above">
          <Input defaultValue="2,000 credits" className="w-36" />
        </SettingRow>
        <SettingRow title="Alerts" description="Notify owners at 50%, 80% and 100% of the monthly plan">
          <Badge variant="success"><Check /> On</Badge>
        </SettingRow>
        <SettingRow title="Payment method" description="UPI AutoPay · priya@okicici · GST invoice to Kesar Foods Pvt Ltd (27AAKCK4410C1ZP)">
          <Button variant="outline" size="sm"><CreditCard /> Update</Button>
        </SettingRow>
      </Card>
    </>
  );
}
