"use client";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SectionHeader, SettingRow } from "@/components/settings-section";

const tiers = [
  { name: "Fast", model: "Claude Haiku", use: "Classification, routing, extraction", share: "41%", on: true },
  { name: "Balanced", model: "Claude Sonnet", use: "Default for agents and chat", share: "52%", on: true },
  { name: "Precise", model: "Claude Opus", use: "Planning, hard reasoning, code", share: "7%", on: true },
  { name: "Bring your own", model: "Azure OpenAI / Bedrock / vLLM", use: "Residency or air-gapped needs", share: "—", on: false },
];

export default function ModelsPage() {
  return (
    <>
      <SectionHeader title="Models & data" description="AnvitaFusion routes each step to the cheapest model that passes your tests." />
      <div className="grid gap-3 md:grid-cols-2">
        {tiers.map((t) => (
          <Card key={t.name} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-semibold">{t.name}</p>
                <p className="text-[12.5px] text-muted-foreground">{t.model}</p>
              </div>
              <Switch defaultChecked={t.on} />
            </div>
            <p className="mt-3 text-[12.5px] text-muted-foreground">{t.use}</p>
            <div className="mt-3 flex items-center justify-between text-[12px]">
              <Badge variant="outline">{t.share} of tokens</Badge>
              {t.on ? <span className="flex items-center gap-1 text-success"><Check className="size-3.5" /> Allowed</span> : <Button size="sm" variant="outline">Add key</Button>}
            </div>
          </Card>
        ))}
      </div>
      <Card className="mt-6">
        <SettingRow title="Routing strategy" description="How AnvitaFusion picks a model when a step is set to Auto">
          <Select defaultValue="balanced" className="w-48">
            <option value="cost">Lowest cost that passes evals</option>
            <option value="balanced">Balanced cost & quality</option>
            <option value="quality">Highest quality</option>
          </Select>
        </SettingRow>
        <SettingRow title="Fallback on outage" description="Retry on another allowed model in the same region if the primary is unavailable">
          <Switch defaultChecked />
        </SettingRow>
        <SettingRow title="Region pinning" description="Only call model endpoints hosted in the workspace's region">
          <Switch defaultChecked />
        </SettingRow>
        <SettingRow title="Web browsing" description="Allow Anvita to search and read public websites">
          <Switch defaultChecked />
        </SettingRow>
      </Card>
    </>
  );
}
