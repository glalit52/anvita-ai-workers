"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Bot, Check, Clock, Pencil, ShieldCheck, Workflow, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppLogo } from "@/components/brand/app-logo";
import { useApp, useSetting } from "@/lib/store";
import { appById } from "@/lib/mock/apps";
import { cn } from "@/lib/utils";
import { ApprovalPreview } from "./approval-preview";

export function ApprovalCard({ approvalId, compact, selected, onSelect }: { approvalId: string; compact?: boolean; selected?: boolean; onSelect?: (v: boolean) => void }) {
  const approval = useApp((s) => s.approvals.find((a) => a.id === approvalId));
  const decide = useApp((s) => s.decideApproval);
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState<string | null>(null);
  const [alwaysAllow, setAlwaysAllow] = useSetting<boolean>(`allow:${approval?.requestedBy.name}:${approval?.action}`, false);
  if (!approval) return null;

  const pending = approval.status === "pending";
  const act = (d: "approved" | "rejected") => {
    decide(approval.id, d);
    const edited = body !== null && approval.preview.kind === "email" && body !== approval.preview.body;
    toast[d === "approved" ? "success" : "message"](
      d === "approved" ? (edited ? `Approved with your edits — ${appById[approval.appId]?.name} will send the edited version` : `Approved — ${appById[approval.appId]?.name} action will run now`) : "Rejected — the requester has been notified",
    );
    if (d === "approved" && alwaysAllow) toast(`Future “${approval.action}” requests from ${approval.requestedBy.name} will run without asking`);
    setEditing(false);
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-card",
        pending ? "border-saffron/50 shadow-[0_0_0_4px] shadow-saffron/10" : "border-border",
        compact ? "" : "shadow-soft",
      )}
    >
      <div className={cn("flex items-start gap-3 px-4 py-3", pending ? "bg-saffron-soft/60" : "bg-subtle")}>
        {onSelect && pending && (
          <input type="checkbox" checked={!!selected} onChange={(e) => onSelect(e.target.checked)} aria-label={`Select ${approval.title}`} className="mt-2 size-4 accent-[var(--primary)]" />
        )}
        <AppLogo appId={approval.appId} size={32} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[14px] font-semibold">{approval.title}</p>
            <Badge variant={approval.risk === "high" ? "danger" : approval.risk === "medium" ? "warning" : "default"}>{approval.risk} risk</Badge>
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              {approval.requestedBy.type === "agent" ? <Bot className="size-3.5" /> : <Workflow className="size-3.5" />}
              {approval.requestedBy.name} for {approval.onBehalfOf}
            </span>
            <span className="font-mono text-[11px]">{approval.action}</span>
            {pending && (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" /> expires in {approval.expiresIn}
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3 px-4 py-3">
        <p className="flex items-start gap-1.5 text-[12.5px] text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />
          {approval.reason}
        </p>
        <ApprovalPreview approval={approval} editable={editing} onBodyChange={setBody} bodyOverride={body ?? undefined} />
        {pending ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="success" onClick={() => act("approved")}>
              <Check /> {editing ? "Save & approve" : "Approve"}
            </Button>
            {!editing && approval.preview.kind === "email" && (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Pencil /> Edit
              </Button>
            )}
            <Button size="sm" variant="ghost" className="text-danger hover:bg-danger-soft" onClick={() => act("rejected")}>
              <X /> Reject
            </Button>
            <label className="ml-auto flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <input type="checkbox" checked={alwaysAllow} onChange={(e) => setAlwaysAllow(e.target.checked)} className="accent-[var(--primary)]" /> Always allow {approval.requestedBy.type === "worker" ? "for this Worker" : "this action"}
            </label>
          </div>
        ) : (
          <div className={cn("flex items-center gap-2 text-[13px] font-medium", approval.status === "approved" ? "text-success" : "text-danger")}>
            {approval.status === "approved" ? <Check className="size-4" /> : <X className="size-4" />}
            {approval.status === "approved" ? "Approved" : "Rejected"} by {approval.decidedBy ?? "you"}
          </div>
        )}
      </div>
    </div>
  );
}
