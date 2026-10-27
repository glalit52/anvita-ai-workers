"use client";
import { MousePointerClick, ShieldCheck, Trash2 } from "lucide-react";
import type { WorkerNode } from "@/lib/types";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppLogo } from "@/components/brand/app-logo";
import { apps } from "@/lib/mock/apps";
import { knowledgeBases } from "@/lib/mock/workspace";
import { nodeMeta } from "./node-meta";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-[11.5px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

const sampleCode = `import pandas as pd
from anvita import inputs, tools, files

meta = pd.DataFrame(tools.metaads.insights(range=inputs.range))
gads = pd.DataFrame(tools.googleads.report(range=inputs.range))
deals = pd.DataFrame(tools.hubspot.deals.search(created=inputs.range))

spend = pd.concat([meta, gads]).groupby("utm_campaign").spend.sum()
rev = deals.groupby("utm_campaign").amount.sum()
report = (rev / spend).rename("roas").to_frame()

files.pdf("Weekly Growth Report.pdf", template="growth", data=report)
return {"roas": float(rev.sum() / spend.sum()), "cac": ...}`;

export function Inspector({ node, onChange, onDelete }: { node: WorkerNode | null; onChange: (id: string, p: Partial<WorkerNode>) => void; onDelete: (id: string) => void }) {
  if (!node)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
        <MousePointerClick className="size-6" />
        <p className="text-[13px]">Select a step on the canvas to configure it.</p>
      </div>
    );
  const meta = nodeMeta[node.kind];
  const cfg = node.config ?? {};
  const set = (k: string, v: string | number | boolean) => onChange(node.id, { config: { ...cfg, [k]: v } });

  return (
    <div className="flex h-full max-h-[calc(100dvh-180px)] flex-col overflow-y-auto scrollbar-thin">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <span className="flex size-8 items-center justify-center rounded-lg text-white" style={{ background: meta.color }}>
          <meta.icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: meta.color }}>
            {meta.label}
          </p>
          <p className="truncate font-mono text-[11px] text-muted-foreground">id: {node.id}</p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => onDelete(node.id)} aria-label="Delete step" className="text-muted-foreground hover:text-danger">
          <Trash2 />
        </Button>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <Field label="Name">
          <Input value={node.title} onChange={(e) => onChange(node.id, { title: e.target.value })} />
        </Field>

        {node.kind === "trigger" && (
          <>
            <Field label="Trigger type">
              <Select defaultValue={String(cfg.cron ? "schedule" : "channel")}>
                <option value="schedule">Schedule (cron)</option>
                <option value="channel">Channel message</option>
                <option value="app_event">App event (webhook)</option>
                <option value="queue">New queue item</option>
                <option value="api">API call</option>
              </Select>
            </Field>
            {cfg.cron ? (
              <Field label="Schedule" hint="Runs Mondays at 09:00 Asia/Kolkata">
                <Input defaultValue={String(cfg.cron)} className="font-mono" />
              </Field>
            ) : (
              <Field label="Languages" hint="Auto-detects and replies in the customer's language">
                <div className="flex flex-wrap gap-1.5">
                  {["English", "हिन्दी", "தமிழ்", "తెలుగు", "ಕನ್ನಡ", "मराठी"].map((l, i) => (
                    <Badge key={l} variant={i < 3 ? "primary" : "outline"}>
                      {l}
                    </Badge>
                  ))}
                </div>
              </Field>
            )}
          </>
        )}

        {node.kind === "agent" && (
          <>
            <Field label="Instructions">
              <Textarea rows={6} value={String(cfg.instructions ?? "Describe what this step should do, the tone, and what to output.")} onChange={(e) => set("instructions", e.target.value)} />
            </Field>
            <Field label="Model" hint="AnvitaFusion picks the cheapest model that passes your tests.">
              <Select value={String(cfg.model ?? "Balanced (Sonnet)")} onChange={(e) => set("model", e.target.value)}>
                <option>Auto (AnvitaFusion)</option>
                <option>Fast (Haiku)</option>
                <option>Balanced (Sonnet)</option>
                <option>Precise (Opus)</option>
              </Select>
            </Field>
            <Field label="Tools this step may use">
              <div className="flex flex-wrap gap-1.5">
                {["shopify", "zendesk", "razorpay", "web"].map((a) => (
                  <span key={a} className="inline-flex items-center gap-1.5 rounded-md border border-border px-1.5 py-1 text-[12px]">
                    <AppLogo appId={a} size={14} /> {apps.find((x) => x.id === a)?.name}
                  </span>
                ))}
                <button className="rounded-md border border-dashed border-border px-2 py-1 text-[12px] text-muted-foreground hover:text-foreground cursor-pointer">+ Add</button>
              </div>
            </Field>
            <Field label="Knowledge">
              <Select defaultValue={knowledgeBases[0].id}>
                {knowledgeBases.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Output schema" hint="Validated on every run; retries on mismatch.">
              <Textarea rows={4} className="font-mono text-[12px]" defaultValue={`{\n  "intent": "order_status | return_refund | product_question | other",\n  "sentiment": "positive | neutral | negative",\n  "order_id": "string?"\n}`} />
            </Field>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-[13px] font-medium">Human in the loop</p>
                <p className="text-[11.5px] text-muted-foreground">Pause for review before continuing</p>
              </div>
              <Switch checked={cfg.hitl === true} onCheckedChange={(v) => set("hitl", v)} />
            </div>
          </>
        )}

        {node.kind === "tool" && (
          <>
            <Field label="App">
              <Select defaultValue={node.appId}>
                {apps.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Action">
              <Input defaultValue={String(cfg.action ?? node.subtitle ?? "")} className="font-mono text-[12.5px]" />
            </Field>
            <div className="flex items-start gap-2 rounded-lg bg-primary-soft/50 p-3 text-[12px]">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                Side effect: <b>{String(cfg.sideEffect ?? "none")}</b>. {cfg.sideEffect === "write" ? "Workspace policy may require approval." : "Read-only — allowed by policy “Read-only analytics”."}
              </span>
            </div>
            <Field label="Retries">
              <Select defaultValue="3">
                <option>0</option>
                <option>1</option>
                <option>3</option>
                <option>5</option>
              </Select>
            </Field>
          </>
        )}

        {node.kind === "code" && (
          <Field label="build_report.py" hint="Frozen from the original run. Runs in your workspace sandbox.">
            <Textarea rows={14} className="bg-[#0f1020] font-mono text-[11.5px] leading-relaxed text-[#d6d7f5]" defaultValue={sampleCode} />
          </Field>
        )}

        {(node.kind === "approval" || node.kind === "handoff") && (
          <>
            <Field label={node.kind === "approval" ? "Approvers" : "Hand off to"}>
              <Select defaultValue="lead">
                <option value="lead">Role: Support lead</option>
                <option value="owner">Role: Owner</option>
                <option value="finance">Group: Finance</option>
                <option value="priya">Priya Sharma</option>
              </Select>
            </Field>
            {node.kind === "approval" && (
              <Field label="Condition">
                <Input defaultValue={String(cfg.condition ?? "always")} className="font-mono text-[12.5px]" />
              </Field>
            )}
            <Field label="Timeout">
              <Select defaultValue="4h">
                <option>30m</option>
                <option>4h</option>
                <option>24h</option>
                <option>7d</option>
              </Select>
            </Field>
            <Field label="On timeout">
              <Select defaultValue="escalate">
                <option value="escalate">Escalate to backup approver</option>
                <option value="reject">Auto-reject</option>
              </Select>
            </Field>
          </>
        )}

        {node.kind === "branch" && (
          <Field label="Routes">
            <div className="flex flex-col gap-1.5">
              {((cfg.rules as string[]) ?? ["confidence ≥ 0.95", "else"]).map((r) => (
                <Input key={r} defaultValue={r} className="font-mono text-[12.5px]" />
              ))}
            </div>
          </Field>
        )}

        {(node.kind === "send" || node.kind === "kb" || node.kind === "map" || node.kind === "call_worker" || node.kind === "end") && (
          <Field label="Description">
            <Textarea rows={3} value={node.subtitle ?? ""} onChange={(e) => onChange(node.id, { subtitle: e.target.value })} />
          </Field>
        )}
      </div>
    </div>
  );
}
