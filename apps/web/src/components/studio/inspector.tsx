"use client";
import { MousePointerClick, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import type { WorkerNode } from "@/lib/types";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppLogo } from "@/components/brand/app-logo";
import { apps } from "@/lib/mock/apps";
import { useApp } from "@/lib/store";
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

const LANGUAGES = ["English", "Hindi", "Tamil", "Telugu", "Kannada", "Marathi", "Bengali", "Gujarati"];
const DEFAULT_SCHEMA = `{\n  "intent": "order_status | return_refund | product_question | other",\n  "sentiment": "positive | neutral | negative",\n  "order_id": "string?"\n}`;

export function Inspector({ node, onChange, onDelete }: { node: WorkerNode | null; onChange: (id: string, p: Partial<WorkerNode>) => void; onDelete: (id: string) => void }) {
  const knowledgeBases = useApp((s) => s.knowledgeBases);
  const members = useApp((s) => s.members);
  if (!node)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
        <MousePointerClick className="size-6" />
        <p className="text-[13px]">Select a step on the canvas to configure it.</p>
      </div>
    );
  const meta = nodeMeta[node.kind];
  const cfg = node.config ?? {};
  const set = (k: string, v: string | number | boolean | string[]) => onChange(node.id, { config: { ...cfg, [k]: v } });
  const str = (k: string, fallback: string) => (cfg[k] === undefined ? fallback : String(cfg[k]));
  const list = (k: string, fallback: string[]) => (Array.isArray(cfg[k]) ? (cfg[k] as string[]) : fallback);
  const toggleIn = (k: string, fallback: string[], v: string) => {
    const cur = list(k, fallback);
    set(k, cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]);
  };
  const tools = list("tools", node.appId ? [node.appId] : []);
  const rules = list("rules", ["confidence ≥ 0.95", "else"]);

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
              <Select value={str("triggerType", cfg.cron ? "schedule" : "channel")} onChange={(e) => set("triggerType", e.target.value)}>
                <option value="schedule">Schedule (cron)</option>
                <option value="channel">Channel message</option>
                <option value="app_event">App event (webhook)</option>
                <option value="queue">New queue item</option>
                <option value="api">API call</option>
              </Select>
            </Field>
            {str("triggerType", cfg.cron ? "schedule" : "channel") === "schedule" ? (
              <Field label="Schedule (cron)" hint="Timezone: Asia/Kolkata">
                <Input value={str("cron", "0 9 * * MON")} onChange={(e) => set("cron", e.target.value)} className="font-mono" />
              </Field>
            ) : (
              <Field label="Languages" hint="Auto-detects and replies in the customer's language">
                <div className="flex flex-wrap gap-1.5">
                  {LANGUAGES.map((l) => {
                    const on = list("languages", ["English", "Hindi", "Tamil"]).includes(l);
                    return (
                      <button key={l} type="button" onClick={() => toggleIn("languages", ["English", "Hindi", "Tamil"], l)} aria-pressed={on} className="cursor-pointer">
                        <Badge variant={on ? "primary" : "outline"}>{l}</Badge>
                      </button>
                    );
                  })}
                </div>
              </Field>
            )}
          </>
        )}

        {node.kind === "agent" && (
          <>
            <Field label="Instructions">
              <Textarea rows={6} value={str("instructions", "Describe what this step should do, the tone, and what to output.")} onChange={(e) => set("instructions", e.target.value)} />
            </Field>
            <Field label="Model" hint="AnvitaFusion picks the cheapest model that passes your tests.">
              <Select value={str("model", "Balanced (Sonnet)")} onChange={(e) => set("model", e.target.value)}>
                <option>Auto (AnvitaFusion)</option>
                <option>Fast (Haiku)</option>
                <option>Balanced (Sonnet)</option>
                <option>Precise (Opus)</option>
              </Select>
            </Field>
            <Field label="Tools this step may use">
              <div className="flex flex-wrap gap-1.5">
                {tools.map((a) => (
                  <span key={a} className="inline-flex items-center gap-1.5 rounded-md border border-border py-1 pl-1.5 pr-1 text-[12px]">
                    <AppLogo appId={a} size={14} /> {apps.find((x) => x.id === a)?.name ?? a}
                    <button type="button" onClick={() => set("tools", tools.filter((t) => t !== a))} aria-label={`Remove ${a}`} className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer">
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                {tools.length === 0 && <span className="text-[12px] text-muted-foreground">No tools — this step can only reason over its inputs.</span>}
              </div>
              <Select
                value=""
                aria-label="Add a tool"
                onChange={(e) => {
                  if (e.target.value) set("tools", [...tools, e.target.value]);
                }}
              >
                <option value="">+ Add a tool…</option>
                {apps
                  .filter((a) => !tools.includes(a.id))
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Knowledge">
              <Select value={str("kb", "")} onChange={(e) => set("kb", e.target.value)}>
                <option value="">None</option>
                {knowledgeBases.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Output schema" hint="Validated on every run; retries on mismatch.">
              <Textarea rows={4} className="font-mono text-[12px]" value={str("output", DEFAULT_SCHEMA)} onChange={(e) => set("output", e.target.value)} />
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
              <Select value={node.appId ?? ""} onChange={(e) => onChange(node.id, { appId: e.target.value })}>
                {apps.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Action">
              <Input value={str("action", node.subtitle ?? "")} onChange={(e) => set("action", e.target.value)} className="font-mono text-[12.5px]" />
            </Field>
            <Field label="Side effect">
              <Select value={str("sideEffect", "none")} onChange={(e) => set("sideEffect", e.target.value)}>
                <option value="none">None (read-only)</option>
                <option value="write">Write</option>
                <option value="external">External (sends/pays)</option>
              </Select>
            </Field>
            <div className="flex items-start gap-2 rounded-lg bg-primary-soft/50 p-3 text-[12px]">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{str("sideEffect", "none") === "none" ? "Read-only — allowed by policy “Read-only analytics”." : "Workspace policy may require approval before this runs."}</span>
            </div>
            <Field label="Retries">
              <Select value={str("retries", "3")} onChange={(e) => set("retries", e.target.value)}>
                <option>0</option>
                <option>1</option>
                <option>3</option>
                <option>5</option>
              </Select>
            </Field>
          </>
        )}

        {node.kind === "code" && (
          <Field label={str("file", "step.py")} hint="Runs in your workspace sandbox. No AI cost.">
            <Textarea rows={14} spellCheck={false} className="bg-[#0f1020] font-mono text-[11.5px] leading-relaxed text-[#d6d7f5]" value={str("code", sampleCode)} onChange={(e) => set("code", e.target.value)} />
          </Field>
        )}

        {(node.kind === "approval" || node.kind === "handoff") && (
          <>
            <Field label={node.kind === "approval" ? "Approvers" : "Hand off to"}>
              <Select value={str("approvers", "Role: Support lead")} onChange={(e) => set("approvers", e.target.value)}>
                <option>Role: Support lead</option>
                <option>Role: Owner</option>
                <option>Group: Finance</option>
                {members.map((m) => (
                  <option key={m.id}>{m.name}</option>
                ))}
              </Select>
            </Field>
            {node.kind === "approval" && (
              <Field label="Condition">
                <Input value={str("condition", "always")} onChange={(e) => set("condition", e.target.value)} className="font-mono text-[12.5px]" />
              </Field>
            )}
            <Field label="Timeout">
              <Select value={str("timeout", "4h")} onChange={(e) => set("timeout", e.target.value)}>
                <option>30m</option>
                <option>4h</option>
                <option>24h</option>
                <option>7d</option>
              </Select>
            </Field>
            <Field label="On timeout">
              <Select value={str("onTimeout", "escalate")} onChange={(e) => set("onTimeout", e.target.value)}>
                <option value="escalate">Escalate to backup approver</option>
                <option value="reject">Auto-reject</option>
              </Select>
            </Field>
          </>
        )}

        {node.kind === "branch" && (
          <Field label="Routes" hint="Evaluated top to bottom; the first match wins.">
            <div className="flex flex-col gap-1.5">
              {rules.map((r, i) => (
                <div key={i} className="flex gap-1.5">
                  <Input value={r} onChange={(e) => set("rules", rules.map((x, j) => (j === i ? e.target.value : x)))} className="font-mono text-[12.5px]" />
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove route" onClick={() => set("rules", rules.filter((_, j) => j !== i))}>
                    <X />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => set("rules", [...rules, "new_condition"])}>
                <Plus /> Add route
              </Button>
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
