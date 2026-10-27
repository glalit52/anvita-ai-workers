"use client";
import { useState } from "react";
import { Plus, ShieldCheck } from "lucide-react";
import { policies as seed } from "@/lib/mock/workspace";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Segmented } from "@/components/ui/tabs";
import { SectionHeader } from "@/components/settings-section";

const cedar = `// External email needs owner approval
permit (principal, action == Action::"gmail.send", resource)
when { resource.recipients.all(r, r.domain == "kesarfoods.in") };

require_approval (principal, action == Action::"gmail.send", resource)
unless { resource.recipients.all(r, r.domain == "kesarfoods.in") }
with { approvers: [Role::"owner"], timeout: "24h" };

// Never delete records
forbid (principal, action like "*.delete", resource);`;

export default function PoliciesPage() {
  const [policies, setPolicies] = useState(seed);
  const [view, setView] = useState<"rules" | "code">("rules");
  return (
    <>
      <SectionHeader
        title="Policies & approvals"
        description="Checked before every action by Anvita or a Worker — independent of what the AI decides."
        actions={
          <>
            <Segmented value={view} onChange={setView} options={[{ value: "rules", label: "Rules" }, { value: "code", label: "Policy code" }]} />
            <Button><Plus /> New rule</Button>
          </>
        }
      />
      {view === "rules" ? (
        <Card className="divide-y divide-border">
          {policies.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
              <ShieldCheck className="size-4 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium">{p.name}</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  <span className="font-mono">{p.appliesTo}</span> · when {p.condition}
                  {p.approvers && ` · approvers: ${p.approvers}`}
                </p>
              </div>
              <Badge variant={p.effect === "deny" ? "danger" : p.effect === "approve" ? "warning" : "success"} className="uppercase">
                {p.effect}
              </Badge>
              <span className="w-24 text-right text-[12px] tabular-nums text-muted-foreground">{p.hits30d.toLocaleString("en-IN")} hits</span>
              <Switch checked={p.enabled} onCheckedChange={(v) => setPolicies((ps) => ps.map((x) => (x.id === p.id ? { ...x, enabled: v } : x)))} />
            </div>
          ))}
        </Card>
      ) : (
        <pre className="overflow-x-auto rounded-xl border border-border bg-[#0f1020] p-5 font-mono text-[12.5px] leading-relaxed text-[#d6d7f5]">{cedar}</pre>
      )}
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {[
          ["Default for new apps", "Reads allowed · writes need approval · deletes denied"],
          ["Approval channels", "Slack DM → WhatsApp → email (fallback after 15 min)"],
          ["Escalation", "Unanswered approvals go to backup approver after the timeout"],
        ].map(([t, d]) => (
          <div key={t} className="rounded-xl border border-border bg-card p-4">
            <p className="text-[13px] font-medium">{t}</p>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>
    </>
  );
}
