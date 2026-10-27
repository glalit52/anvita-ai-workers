"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Bot, Check, Clock, Pencil, ShieldCheck, Workflow, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppLogo } from "@/components/brand/app-logo";
import { useApp } from "@/lib/store";
import { appById } from "@/lib/mock/apps";
import { cn } from "@/lib/utils";
import { ApprovalPreview } from "./approval-preview";

export function ApprovalCard({ approvalId, compact }: { approvalId: string; compact?: boolean }) {
  const approval = useApp((s) => s.approvals.find((a) => a.id === approvalId));
  const decide = useApp((s) => s.decideApproval);
  const [editing, setEditing] = useState(false);
  if (!approval) return null;

  const pending = approval.status === "pending";
  const act = (d: "approved" | "rejected") => {
    decide(approval.id, d);
    toast[d === "approved" ? "success" : "message"](d === "approved" ? `Approved — ${appById[approval.appId]?.name} action will run now` : "Rejected — the requester has been notified");
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
        <ApprovalPreview approval={approval} editable={editing} />
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
              <input type="checkbox" className="accent-[var(--primary)]" /> Always allow for this Worker
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
