"use client";
import { AlertTriangle, CircleAlert, MousePointerClick, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import type { WorkerNode } from "@/lib/types";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppLogo } from "@/components/brand/app-logo";
import { apps } from "@/lib/mock/apps";
import { isLive } from "@/lib/api";
import { useApp } from "@/lib/store";
import type { CatalogAction, Issue, WorkflowCatalog } from "@/lib/workflow";
import { nodeMeta } from "./node-meta";

function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
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

const CODE_HINT = (
  <>
    Runs in an isolated sandbox with no internet. Use <code>steps["id"]</code> for earlier results, <code>tools.app.action(...)</code> for read actions, and <code>files.csv / excel / pdf / chart</code> for files. <code>return</code> the result.
  </>
);

const EXPR_HINT = (
  <>
    Use <code>{"{{ steps.<id>.field }}"}</code>, <code>{"{{ trigger.field }}"}</code> or <code>{"{{ item }}"}</code> in loops.
  </>
);

const LANGUAGES = ["English", "Hindi", "Tamil", "Telugu", "Kannada", "Marathi", "Bengali", "Gujarati"];
const DEFAULT_SCHEMA = `{\n  "intent": "order_status | return_refund | product_question | other",\n  "sentiment": "positive | neutral | negative",\n  "order_id": "string?"\n}`;
const TOOL_EXTRAS = [
  { id: "web", name: "Web research" },
  { id: "sandbox", name: "Run code" },
  { id: "kb", name: "Knowledge search" },
];
const CHANNELS: [string, string][] = [
  ["reply", "Reply in the same conversation"],
  ["slack", "Slack"],
  ["teams", "Microsoft Teams"],
  ["whatsapp", "WhatsApp"],
  ["gmail", "Gmail"],
  ["outlook", "Outlook"],
  ["webhook", "Webhook (POST JSON)"],
];

type Cfg = Record<string, unknown>;
const asStr = (v: unknown, fallback = "") => (v === undefined || v === null ? fallback : typeof v === "string" ? v : Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : String(v));

/** Inputs for one action: each schema property becomes a field stored as `input.<name>`. */
function ActionInputs({ action, cfg, set, itemHint }: { action: CatalogAction; cfg: Cfg; set: (k: string, v: unknown) => void; itemHint?: boolean }) {
  const props = Object.entries(action.inputSchema.properties ?? {});
  const required = new Set(action.inputSchema.required ?? []);
  if (!props.length) return <p className="text-[12px] text-muted-foreground">This action takes no inputs.</p>;
  const valueOf = (k: string) => cfg[`input.${k}`] ?? (cfg.input && typeof cfg.input === "object" ? (cfg.input as Cfg)[k] : undefined) ?? cfg[k];
  return (
    <div className="grid gap-3">
      {props.map(([k, p]) => {
        const v = valueOf(k);
        const label = `${k}${required.has(k) ? " *" : ""}`;
        if (p.type === "boolean")
          return (
            <Field key={k} label={label} hint={p.description}>
              <Select value={v === undefined ? "" : String(v)} onChange={(e) => set(`input.${k}`, e.target.value === "" ? undefined : e.target.value === "true")} aria-label={k}>
                <option value="">Not set</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </Select>
            </Field>
          );
        if (p.enum)
          return (
            <Field key={k} label={label} hint={p.description}>
              <Select value={asStr(v)} onChange={(e) => set(`input.${k}`, e.target.value || undefined)} aria-label={k}>
                <option value="">Not set</option>
                {p.enum.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
            </Field>
          );
        return (
          <Field key={k} label={label} hint={p.description ?? (p.type === "array" ? "Comma-separated, or an expression" : undefined)}>
            <Input
              value={asStr(v)}
              placeholder={itemHint ? `{{ item.${k} }}` : `{{ steps.… }} or a value`}
              onChange={(e) => {
                const raw = e.target.value;
                const isExpr = raw.includes("{{");
                set(`input.${k}`, raw === "" ? undefined : !isExpr && p.type === "number" && !Number.isNaN(Number(raw)) ? Number(raw) : !isExpr && p.type === "array" ? raw.split(",").map((s) => s.trim()).filter(Boolean) : raw);
              }}
              className="font-mono text-[12.5px]"
              aria-label={k}
            />
          </Field>
        );
      })}
    </div>
  );
}

function ActionPicker({ appId, cfg, set, catalog, label = "Action" }: { appId?: string; cfg: Cfg; set: (k: string, v: unknown) => void; catalog: WorkflowCatalog | null; label?: string }) {
  const value = asStr(cfg.action);
  if (!catalog)
    return (
      <Field label={label}>
        <Input value={value} onChange={(e) => set("action", e.target.value)} className="font-mono text-[12.5px]" placeholder="app.resource.action" aria-label="Action" />
      </Field>
    );
  const options = catalog.actions.filter((a) => a.kind === "tool" && (!appId || a.appId === appId));
  const current = catalog.actions.find((a) => a.action === value);
  return (
    <>
      <Field label={label} hint={current ? current.description : undefined}>
        <Select value={value} onChange={(e) => set("action", e.target.value)} aria-label="Action">
          <option value="">Choose an action…</option>
          {(options.length ? options : catalog.actions.filter((a) => a.kind === "tool")).map((a) => (
            <option key={a.action} value={a.action}>
              {a.action}
              {a.sideEffect !== "none" ? ` · ${a.sideEffect}` : ""}
            </option>
          ))}
        </Select>
      </Field>
      {current && current.sideEffect !== "none" && (
        <div className="flex items-start gap-2 rounded-lg bg-primary-soft/50 p-3 text-[12px]">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>{current.sideEffect === "write" ? "Writes data — allowed unless a workspace policy says otherwise." : "Acts outside your company — workspace policy may require approval before it runs."}</span>
        </div>
      )}
    </>
  );
}

export function Inspector({ node, onChange, onDelete, issues = [], catalog = null }: { node: WorkerNode | null; onChange: (id: string, p: Partial<WorkerNode>) => void; onDelete: (id: string) => void; issues?: Issue[]; catalog?: WorkflowCatalog | null }) {
  const knowledgeBases = useApp((s) => s.knowledgeBases);
  const members = useApp((s) => s.members);
  const workers = useApp((s) => s.workers);
  if (!node)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
        <MousePointerClick className="size-6" />
        <p className="text-[13px]">Select a step on the canvas to configure it.</p>
      </div>
    );
  const meta = nodeMeta[node.kind];
  const cfg = (node.config ?? {}) as Cfg;
  const set = (k: string, v: unknown) => {
    const next = { ...cfg };
    if (v === undefined) delete next[k];
    else next[k] = v;
    onChange(node.id, { config: next });
  };
  const str = (k: string, fallback: string) => asStr(cfg[k], fallback);
  const list = (k: string, fallback: string[]) => (Array.isArray(cfg[k]) ? (cfg[k] as string[]) : fallback);
  const toggleIn = (k: string, fallback: string[], v: string) => {
    const cur = list(k, fallback);
    set(k, cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]);
  };
  const tools = list("tools", node.appId ? [node.appId] : []);
  const rules = list("rules", ["confidence ≥ 0.95", "else"]);
  const live = isLive();
  const own = issues.filter((i) => i.nodeId === node.id);
  const action = catalog?.actions.find((a) => a.action === str("action", ""));
  const mapMode = str("mode", cfg.workerId ? "worker" : cfg.action ? "tool" : cfg.code ? "code" : "agent");
  const channel = str("channel", node.appId && ["slack", "teams", "whatsapp", "gmail", "outlook"].includes(node.appId) ? node.appId : "reply");
  const toolName = (id: string) => TOOL_EXTRAS.find((t) => t.id === id)?.name ?? apps.find((x) => x.id === id)?.name ?? id;

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
        {own.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {own.map((i, k) => (
              <div key={k} className={`flex items-start gap-2 rounded-lg p-2.5 text-[12px] ${i.level === "error" ? "bg-danger-soft text-danger" : "bg-saffron-soft text-saffron"}`}>
                {i.level === "error" ? <CircleAlert className="mt-0.5 size-3.5 shrink-0" /> : <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />}
                <span>{i.message}</span>
              </div>
            ))}
          </div>
        )}

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
            ) : str("triggerType", "channel") === "channel" ? (
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
            ) : (
              <p className="text-[12px] text-muted-foreground">The trigger's payload is available to later steps as <code>{"{{ trigger.<field> }}"}</code>.</p>
            )}
          </>
        )}

        {node.kind === "map" && (
          <>
            <MapItems cfg={cfg} set={set} mode={mapMode} />
            <Field label="For each item, run">
              <Select value={mapMode} onChange={(e) => set("mode", e.target.value)} aria-label="For each item, run">
                <option value="agent">An AI step</option>
                <option value="tool">An app action</option>
                <option value="code">Code</option>
                <option value="worker">Another Worker</option>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="In parallel">
                <Select value={str("concurrency", "4")} onChange={(e) => set("concurrency", Number(e.target.value))}>
                  {[1, 2, 4, 8, 10].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </Select>
              </Field>
              <Field label="At most">
                <Input type="number" min={1} max={500} value={str("max", "100")} onChange={(e) => set("max", Number(e.target.value) || 100)} />
              </Field>
            </div>
          </>
        )}

        {(node.kind === "agent" || (node.kind === "map" && mapMode === "agent")) && (
          <>
            <Field label="Instructions" hint={EXPR_HINT}>
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
                    <AppLogo appId={a === "kb" ? "anvita" : a} size={14} /> {toolName(a)}
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
                {[...TOOL_EXTRAS, ...apps.filter((a) => !["web", "sandbox"].includes(a.id))]
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
            <Field label="Output schema" hint="JSON template or field names. Validated on every run; retries on mismatch. Leave empty for a text answer.">
              <Textarea rows={4} className="font-mono text-[12px]" value={str("output", live ? "" : DEFAULT_SCHEMA)} onChange={(e) => set("output", e.target.value || undefined)} placeholder='{"field": "a | b", "optional": "string?"}' />
            </Field>
            {node.kind === "agent" && (
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-[13px] font-medium">Human in the loop</p>
                  <p className="text-[11.5px] text-muted-foreground">Pause for review before continuing</p>
                </div>
                <Switch checked={cfg.hitl === true} onCheckedChange={(v) => set("hitl", v)} />
              </div>
            )}
          </>
        )}

        {node.kind === "tool" && (
          <>
            <Field label="App">
              <Select value={node.appId ?? ""} onChange={(e) => onChange(node.id, { appId: e.target.value, config: { ...cfg, action: "" } })}>
                {apps.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <ActionPicker appId={node.appId} cfg={cfg} set={set} catalog={catalog} />
            {action && <ActionInputs action={action} cfg={cfg} set={set} />}
            {!catalog && (
              <Field label="Side effect">
                <Select value={str("sideEffect", "none")} onChange={(e) => set("sideEffect", e.target.value)}>
                  <option value="none">None (read-only)</option>
                  <option value="write">Write</option>
                  <option value="external">External (sends/pays)</option>
                </Select>
              </Field>
            )}
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-[13px] font-medium">Fill missing inputs with AI</p>
                <p className="text-[11.5px] text-muted-foreground">Uses earlier steps' results for any input you leave empty</p>
              </div>
              <Switch checked={cfg.autoInput !== false} onCheckedChange={(v) => set("autoInput", v ? undefined : false)} aria-label="Fill missing inputs with AI" />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-[13px] font-medium">Always ask for approval</p>
                <p className="text-[11.5px] text-muted-foreground">In addition to workspace policies</p>
              </div>
              <Switch checked={cfg.requireApproval === true} onCheckedChange={(v) => set("requireApproval", v || undefined)} aria-label="Always ask for approval" />
            </div>
            <Field label="Retries">
              <Select value={str("retries", "3")} onChange={(e) => set("retries", Number(e.target.value))}>
                <option>0</option>
                <option>1</option>
                <option>3</option>
                <option>5</option>
              </Select>
            </Field>
          </>
        )}

        {(node.kind === "code" || (node.kind === "map" && mapMode === "code")) && (
          <>
            <Field label="Language">
              <Select value={str("language", "python")} onChange={(e) => set("language", e.target.value)} aria-label="Language">
                <option value="python">Python 3.12</option>
                <option value="javascript">JavaScript (Node 22)</option>
              </Select>
            </Field>
            <Field label={str("file", str("language", "python") === "javascript" ? "step.js" : "step.py")} hint={live ? <>{CODE_HINT} Leave empty and AI writes the code at run time.</> : "Runs in your workspace sandbox. No AI cost."}>
              <Textarea rows={14} spellCheck={false} className="bg-[#0f1020] font-mono text-[11.5px] leading-relaxed text-[#d6d7f5]" value={str("code", live ? "" : sampleCode)} onChange={(e) => set("code", e.target.value)} aria-label="Code" />
            </Field>
          </>
        )}

        {(node.kind === "approval" || node.kind === "handoff") && (
          <>
            <Field label={node.kind === "approval" ? "Approvers" : "Hand off to"}>
              <Select value={str("approvers", "Role: Support lead")} onChange={(e) => set("approvers", e.target.value)}>
                <option>Role: Support lead</option>
                <option>Role: Owner</option>
                <option>Role: Admin</option>
                <option>Group: Finance</option>
                {members.map((m) => (
                  <option key={m.id}>{m.name}</option>
                ))}
              </Select>
            </Field>
            {node.kind === "approval" ? (
              <>
                <Field label="Condition" hint="Only ask when this is true, e.g. amount > 5000. “always” asks every time.">
                  <Input value={str("condition", "always")} onChange={(e) => set("condition", e.target.value)} className="font-mono text-[12.5px]" />
                </Field>
                <Field label="What the approver sees" hint={EXPR_HINT}>
                  <Textarea rows={3} value={str("message", "")} onChange={(e) => set("message", e.target.value || undefined)} placeholder="Refund {{ inr(steps.a3.amount) }} to {{ trigger.author }}?" />
                </Field>
              </>
            ) : (
              <>
                <Field label="Reason" hint="Shown in the Inbox">
                  <Input value={str("reason", "")} onChange={(e) => set("reason", e.target.value || undefined)} placeholder="Customer asked for a person" />
                </Field>
                <Field label="Message to the customer">
                  <Textarea rows={2} value={str("ackMessage", "")} onChange={(e) => set("ackMessage", e.target.value || undefined)} placeholder="Thanks — a teammate will reply here shortly." />
                </Field>
              </>
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
                <option value="escalate">Escalate to the owner</option>
                <option value="reject">Auto-reject</option>
              </Select>
            </Field>
          </>
        )}

        {node.kind === "branch" && (
          <>
            <Field label="Decide by">
              <Select value={str("mode", "rules")} onChange={(e) => set("mode", e.target.value === "rules" ? undefined : e.target.value)} aria-label="Decide by">
                <option value="rules">Rules</option>
                <option value="ai">AI classification</option>
              </Select>
            </Field>
            <Field label="Routes" hint={str("mode", "rules") === "ai" ? "Describe each route as “label: when to take it”. Label the connections the same way." : "Evaluated top to bottom; the first match wins. Write “label: condition” and label the connection with the same name."}>
              <div className="flex flex-col gap-1.5">
                {rules.map((r, i) => (
                  <div key={i} className="flex gap-1.5">
                    <Input value={r} onChange={(e) => set("rules", rules.map((x, j) => (j === i ? e.target.value : x)))} className="font-mono text-[12.5px]" aria-label={`Route ${i + 1}`} />
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove route" onClick={() => set("rules", rules.filter((_, j) => j !== i))}>
                      <X />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => set("rules", [...rules, "label: field = value"])}>
                  <Plus /> Add route
                </Button>
              </div>
            </Field>
          </>
        )}

        {node.kind === "map" && mapMode === "tool" && (
          <>
            <ActionPicker cfg={cfg} set={set} catalog={catalog} label="Action for each item" />
            {action && <ActionInputs action={action} cfg={cfg} set={set} itemHint />}
          </>
        )}

        {(node.kind === "call_worker" || (node.kind === "map" && mapMode === "worker")) && (
          <>
            <Field label="Worker to run">
              <Select value={str("workerId", "")} onChange={(e) => set("workerId", e.target.value || undefined)} aria-label="Worker to run">
                <option value="">Choose a Worker…</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.emoji} {w.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Inputs (JSON)" hint={EXPR_HINT}>
              <Textarea
                rows={4}
                className="font-mono text-[12px]"
                defaultValue={cfg.inputs ? JSON.stringify(cfg.inputs, null, 2) : ""}
                placeholder={node.kind === "map" ? '{ "row": "{{ item }}" }' : '{ "customer": "{{ trigger.from }}" }'}
                onBlur={(e) => {
                  try {
                    set("inputs", e.target.value.trim() ? JSON.parse(e.target.value) : undefined);
                  } catch {
                    /* keep the last valid value */
                  }
                }}
              />
            </Field>
          </>
        )}

        {node.kind === "send" && (
          <>
            <Field label="Send via">
              <Select value={channel} onChange={(e) => set("channel", e.target.value)} aria-label="Send via">
                {CHANNELS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            {channel === "webhook" ? (
              <Field label="URL">
                <Input value={str("url", "")} onChange={(e) => set("url", e.target.value)} placeholder="https://…" className="font-mono text-[12.5px]" />
              </Field>
            ) : channel !== "reply" ? (
              <Field label="To" hint={channel === "slack" || channel === "teams" ? "#channel (Teams: Team / Channel)" : channel === "whatsapp" ? "Phone numbers, comma-separated" : "Email addresses, comma-separated"}>
                <Input value={str("to", "")} onChange={(e) => set("to", e.target.value)} placeholder={channel === "slack" ? "#growth" : channel === "whatsapp" ? "+91…" : "team@company.com"} />
              </Field>
            ) : null}
            {(channel === "gmail" || channel === "outlook") && (
              <Field label="Subject">
                <Input value={str("subject", "")} onChange={(e) => set("subject", e.target.value)} />
              </Field>
            )}
            <Field label="Message" hint={<>Leave empty to send the last AI step's answer. {EXPR_HINT}</>}>
              <Textarea rows={4} value={str("message", "")} onChange={(e) => set("message", e.target.value || undefined)} placeholder="{{ steps.a1.text }}" />
            </Field>
          </>
        )}

        {node.kind === "kb" && (
          <>
            <Field label="Knowledge base">
              <Select value={str("kb", "")} onChange={(e) => set("kb", e.target.value || undefined)}>
                <option value="">All knowledge</option>
                {knowledgeBases.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Search for" hint={EXPR_HINT}>
              <Input value={str("query", "")} onChange={(e) => set("query", e.target.value || undefined)} placeholder="{{ trigger.text }}" />
            </Field>
          </>
        )}

        {node.kind === "end" && (
          <Field label="Outcome" hint="Recorded as the run's result. Can be an expression.">
            <Input value={str("outcome", "")} onChange={(e) => set("outcome", e.target.value || undefined)} placeholder="{{ steps.a1.intent }}" />
          </Field>
        )}

        {node.kind !== "trigger" && node.kind !== "end" && node.kind !== "branch" && (
          <Field label="If this step fails">
            <Select value={str("onError", "fail")} onChange={(e) => set("onError", e.target.value === "fail" ? undefined : e.target.value)} aria-label="If this step fails">
              <option value="fail">Stop the run</option>
              <option value="continue">Continue (or follow an “error” connection)</option>
            </Select>
          </Field>
        )}

        <Field label="Description">
          <Textarea rows={2} value={node.subtitle ?? ""} onChange={(e) => onChange(node.id, { subtitle: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}

function MapItems({ cfg, set, mode }: { cfg: Cfg; set: (k: string, v: unknown) => void; mode: string }) {
  return (
    <Field label="Loop over" hint={<>A list from an earlier step, e.g. <code>{"{{ steps.h1.contacts }}"}</code>. Each run sees <code>{"{{ item }}"}</code> and <code>{"{{ index }}"}</code>.</>}>
      <Input value={asStr(cfg.items)} onChange={(e) => set("items", e.target.value)} className="font-mono text-[12.5px]" placeholder="{{ steps.… }}" aria-label={`Loop over (${mode})`} />
    </Field>
  );
}
