"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useApp, useSetting } from "@/lib/store";
import type { Policy } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Segmented } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { confirm } from "@/components/ui/confirm";
import { SectionHeader } from "@/components/settings-section";
import { Field } from "@/components/settings/field";
import { cn } from "@/lib/utils";

type Draft = Pick<Policy, "name" | "appliesTo" | "condition" | "effect" | "approvers" | "enabled">;
const empty: Draft = { name: "", appliesTo: "", condition: "always", effect: "approve", approvers: "Owner", enabled: true };

const actionPresets = ["email.send · gmail, outlook", "razorpay.refunds.create", "razorpay.payouts.create", "hubspot.*.update", "whatsapp.templates.send_bulk", "tally.vouchers.create", "*.delete", "*.read · *.search · *.list"];
const approverOptions = ["Owner", "Admin", "Support lead", "Finance", "Record owner", "Finance + Owner (2 of 2)"];

function toCedar(p: Policy) {
  const actions = p.appliesTo
    .split(/[·,]/)
    .map((a) => a.trim())
    .filter(Boolean);
  const actionExpr = actions.length === 1 ? `action like "${actions[0]}"` : `[${actions.map((a) => `"${a}"`).join(", ")}].any(a, action like a)`;
  const when = p.condition && p.condition !== "always" ? `\nwhen { ${p.condition} }` : "";
  const header = `// ${p.name}${p.enabled ? "" : "  (disabled)"}`;
  if (p.effect === "allow") return `${header}\npermit (principal, ${actionExpr}, resource)${when};`;
  if (p.effect === "deny") return `${header}\nforbid (principal, ${actionExpr}, resource)${when};`;
  return `${header}\nrequire_approval (principal, ${actionExpr}, resource)${when}\nwith { approvers: ["${p.approvers ?? "Owner"}"], timeout: "24h" };`;
}

function RuleDialog({ open, onOpenChange, initial, onSave }: { open: boolean; onOpenChange: (o: boolean) => void; initial: Draft; onSave: (d: Draft) => void }) {
  const [d, setD] = useState<Draft>(initial);
  const [touched, setTouched] = useState(false);
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));
  const valid = d.name.trim() && d.appliesTo.trim();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogTitle>{initial.name ? "Edit rule" : "New policy rule"}</DialogTitle>
        <DialogDescription className="mt-1">Rules are evaluated before every action by Anvita or a Worker, in priority order. Deny wins over approve, approve wins over allow.</DialogDescription>
        <form
          className="mt-5 grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (!valid) return;
            onSave({ ...d, name: d.name.trim(), appliesTo: d.appliesTo.trim(), condition: d.condition.trim() || "always" });
          }}
        >
          <Field label="Rule name" error={touched && !d.name.trim() ? "Give the rule a name" : undefined}>
            <Input value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="Refunds above ₹5,000" autoFocus />
          </Field>
          <Field label="Applies to actions" hint="Use * as a wildcard. Separate multiple patterns with “·”." error={touched && !d.appliesTo.trim() ? "Choose at least one action" : undefined}>
            <Input value={d.appliesTo} onChange={(e) => set({ appliesTo: e.target.value })} placeholder="razorpay.refunds.create" className="font-mono text-[13px]" list="action-presets" />
            <datalist id="action-presets">
              {actionPresets.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </Field>
          <Field label="Condition" hint="e.g. amount > 5000 · recipients > 500 · actor is a Worker · always">
            <Input value={d.condition} onChange={(e) => set({ condition: e.target.value })} className="font-mono text-[13px]" />
          </Field>
          <div>
            <p className="mb-1.5 text-[13px] font-medium">Effect</p>
            <div className="grid grid-cols-3 gap-2">
              {(["allow", "approve", "deny"] as const).map((eff) => (
                <button
                  type="button"
                  key={eff}
                  onClick={() => set({ effect: eff })}
                  className={cn(
                    "rounded-xl border p-3 text-left text-[13px] cursor-pointer",
                    d.effect === eff ? "border-primary bg-primary-soft/40" : "border-border hover:bg-subtle",
                  )}
                >
                  <p className="font-medium capitalize">{eff === "approve" ? "Require approval" : eff}</p>
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground">{eff === "allow" ? "Runs without asking" : eff === "approve" ? "Pauses for a person" : "Always blocked"}</p>
                </button>
              ))}
            </div>
          </div>
          {d.effect === "approve" && (
            <Field label="Approvers">
              <Select value={d.approvers} onChange={(e) => set({ approvers: e.target.value })}>
                {approverOptions.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </Select>
            </Field>
          )}
          <div className="rounded-xl bg-[#0f1020] p-3 font-mono text-[11.5px] leading-relaxed text-[#d6d7f5]">
            <pre className="whitespace-pre-wrap">{toCedar({ ...d, name: d.name || "Untitled rule", appliesTo: d.appliesTo || "*", id: "preview", hits30d: 0 })}</pre>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save rule</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PoliciesPage() {
  const policies = useApp((s) => s.policies);
  const addPolicy = useApp((s) => s.addPolicy);
  const updatePolicy = useApp((s) => s.updatePolicy);
  const removePolicy = useApp((s) => s.removePolicy);
  const [view, setView] = useState<"rules" | "code">("rules");
  const [editing, setEditing] = useState<Policy | null>(null);
  const [open, setOpen] = useState(false);
  const [fallback, setFallback] = useSetting<string>("policies.fallbackMinutes", "15");
  const [defaultMode, setDefaultMode] = useSetting<string>("policies.defaultNewApps", "approve-writes");
  const [escalate, setEscalate] = useSetting<string>("policies.escalation", "backup");

  const code = useMemo(() => policies.map(toCedar).join("\n\n"), [policies]);

  return (
    <>
      <SectionHeader
        title="Policies & approvals"
        description="Checked before every action by Anvita or a Worker — independent of what the AI decides."
        actions={
          <>
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: "rules", label: "Rules" },
                { value: "code", label: "Policy code" },
              ]}
            />
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus /> New rule
            </Button>
          </>
        }
      />
      {view === "rules" ? (
        <Card className="divide-y divide-border">
          {policies.length === 0 && <p className="px-5 py-8 text-center text-[13px] text-muted-foreground">No rules yet. Anvita will ask before every write.</p>}
          {policies.map((p) => (
            <div key={p.id} className={cn("flex flex-wrap items-center gap-3 px-5 py-4", !p.enabled && "opacity-60")}>
              <ShieldCheck className="size-4 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium">{p.name}</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  <span className="font-mono">{p.appliesTo}</span> · when {p.condition}
                  {p.effect === "approve" && p.approvers && ` · approvers: ${p.approvers}`}
                </p>
              </div>
              <Badge variant={p.effect === "deny" ? "danger" : p.effect === "approve" ? "warning" : "success"} className="uppercase">
                {p.effect}
              </Badge>
              <span className="w-20 text-right text-[12px] tabular-nums text-muted-foreground">{p.hits30d.toLocaleString("en-IN")} hits</span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit ${p.name}`}
                onClick={() => {
                  setEditing(p);
                  setOpen(true);
                }}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete ${p.name}`}
                className="hover:text-danger"
                onClick={async () => {
                  if (await confirm({ title: `Delete “${p.name}”?`, description: "Actions it covered fall back to the default for new apps.", confirmLabel: "Delete rule", danger: true })) {
                    removePolicy(p.id);
                    toast("Rule deleted");
                  }
                }}
              >
                <Trash2 />
              </Button>
              <Switch
                checked={p.enabled}
                aria-label={`Enable ${p.name}`}
                onCheckedChange={(v) => {
                  updatePolicy(p.id, { enabled: v });
                  toast.success(`${p.name} ${v ? "enabled" : "disabled"}`);
                }}
              />
            </div>
          ))}
        </Card>
      ) : (
        <div className="relative">
          <pre className="overflow-x-auto rounded-xl border border-border bg-[#0f1020] p-5 font-mono text-[12.5px] leading-relaxed text-[#d6d7f5]">{code || "// no rules"}</pre>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(code);
              toast("Policy code copied");
            }}
            className="absolute right-3 top-3 rounded-md p-1.5 text-[#9a9bd0] hover:bg-white/10 cursor-pointer"
            aria-label="Copy policy code"
          >
            <Copy className="size-4" />
          </button>
        </div>
      )}
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[13px] font-medium">Default for new apps</p>
          <Select value={defaultMode} onChange={(e) => { setDefaultMode(e.target.value); toast.success("Default updated"); }} className="mt-2" aria-label="Default for new apps">
            <option value="approve-writes">Reads allowed · writes need approval · deletes denied</option>
            <option value="read-only">Read-only until a rule allows writes</option>
            <option value="allow-all">Allow all except deletes</option>
          </Select>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[13px] font-medium">Approval channel fallback</p>
          <Select value={fallback} onChange={(e) => { setFallback(e.target.value); toast.success("Fallback updated"); }} className="mt-2" aria-label="Approval fallback">
            <option value="5">Slack → WhatsApp → email after 5 min</option>
            <option value="15">Slack → WhatsApp → email after 15 min</option>
            <option value="60">Slack → WhatsApp → email after 1 h</option>
          </Select>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[13px] font-medium">On timeout</p>
          <Select value={escalate} onChange={(e) => { setEscalate(e.target.value); toast.success("Escalation updated"); }} className="mt-2" aria-label="On approval timeout">
            <option value="backup">Escalate to backup approver</option>
            <option value="reject">Auto-reject and notify requester</option>
          </Select>
        </div>
      </div>
      <RuleDialog
        key={open ? (editing?.id ?? "new") : "closed"}
        open={open}
        onOpenChange={setOpen}
        initial={editing ? { name: editing.name, appliesTo: editing.appliesTo, condition: editing.condition, effect: editing.effect, approvers: editing.approvers ?? "Owner", enabled: editing.enabled } : empty}
        onSave={(d) => {
          if (editing) {
            updatePolicy(editing.id, { ...d, approvers: d.effect === "approve" ? d.approvers : undefined });
            toast.success("Rule updated");
          } else {
            addPolicy({ ...d, approvers: d.effect === "approve" ? d.approvers : undefined });
            toast.success("Rule created");
          }
          setOpen(false);
        }}
      />
    </>
  );
}
