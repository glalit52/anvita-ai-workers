"use client";
import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, ChevronRight, CircleAlert, CircleDashed, Clock, Loader2, SkipForward } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Issue, Trace, TraceNode } from "@/lib/workflow";
import { nodeMeta } from "./node-meta";
import type { NodeKind } from "@/lib/types";

const ICON: Record<TraceNode["status"], React.ReactNode> = {
  pending: <CircleDashed className="size-3.5 text-muted-foreground" />,
  running: <Loader2 className="size-3.5 animate-spin text-primary" />,
  waiting: <Clock className="size-3.5 text-saffron" />,
  done: <Check className="size-3.5 text-success" />,
  skipped: <SkipForward className="size-3.5 text-muted-foreground" />,
  failed: <CircleAlert className="size-3.5 text-danger" />,
};

function Json({ value }: { value: unknown }) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return <pre className="mt-1.5 max-h-56 overflow-auto rounded-lg bg-subtle p-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground scrollbar-thin">{text}</pre>;
}

/** Step-by-step result of a workflow run (Studio test runs and the Runs tab). */
export function TraceView({ trace, onSelectNode }: { trace: Trace; onSelectNode?: (id: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const order = [...trace.nodes].sort((a, b) => (a.startedAt ?? "9").localeCompare(b.startedAt ?? "9"));
  return (
    <div className="flex flex-col gap-1">
      <div className="mb-2 flex items-center gap-2">
        <Badge variant={trace.status === "succeeded" ? "success" : trace.status === "failed" ? "danger" : trace.status.startsWith("waiting") ? "warning" : "info"}>{trace.status.replace("_", " ")}</Badge>
        {trace.status === "waiting_approval" && (
          <Link href="/approvals" className="text-[12px] font-medium text-primary hover:underline">
            Review in Approvals →
          </Link>
        )}
        {trace.status === "waiting_auth" && (
          <Link href="/integrations" className="text-[12px] font-medium text-primary hover:underline">
            Connect the app →
          </Link>
        )}
      </div>
      {trace.error && (
        <div className="mb-2 flex items-start gap-2 rounded-lg bg-danger-soft p-2.5 text-[12px] text-danger">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span className="whitespace-pre-wrap">{trace.error}</span>
        </div>
      )}
      {order.map((n) => {
        const meta = nodeMeta[n.kind as NodeKind];
        const expanded = open === n.id;
        return (
          <div key={n.id} className="rounded-lg border border-border">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-2.5 py-2 text-left cursor-pointer"
              onClick={() => {
                setOpen(expanded ? null : n.id);
                onSelectNode?.(n.id);
              }}
              aria-expanded={expanded}
            >
              {ICON[n.status]}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-medium">{n.title}</span>
                <span className={cn("block truncate text-[11px]", n.status === "failed" ? "text-danger" : "text-muted-foreground")}>
                  {meta?.label ?? n.kind}
                  {n.items ? ` · ${n.items.done}/${n.items.total} items` : ""}
                  {n.detail ? ` · ${n.detail}` : ""}
                </span>
              </span>
              {(n.output !== null || n.error) && <ChevronRight className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-90")} />}
            </button>
            {expanded && (n.output !== null || n.error) && <div className="border-t border-border px-2.5 pb-2.5">{n.error ? <Json value={n.error} /> : <Json value={n.output} />}</div>}
          </div>
        );
      })}
      {trace.output !== null && trace.status === "succeeded" && (
        <div className="mt-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Result</p>
          <Json value={trace.output} />
        </div>
      )}
    </div>
  );
}

export function IssuesList({ issues, titleOf, onSelectNode }: { issues: Issue[]; titleOf: (id: string) => string; onSelectNode?: (id: string) => void }) {
  if (!issues.length)
    return (
      <p className="flex items-center gap-1.5 text-[12.5px] text-success">
        <Check className="size-3.5" /> No problems found
      </p>
    );
  return (
    <div className="flex flex-col gap-1.5">
      {issues.map((i, k) => (
        <button key={k} type="button" disabled={!i.nodeId} onClick={() => i.nodeId && onSelectNode?.(i.nodeId)} className={cn("flex items-start gap-2 rounded-lg p-2.5 text-left text-[12px]", i.level === "error" ? "bg-danger-soft text-danger" : "bg-saffron-soft text-saffron", i.nodeId && "cursor-pointer")}>
          {i.level === "error" ? <CircleAlert className="mt-0.5 size-3.5 shrink-0" /> : <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />}
          <span>
            {i.nodeId && <span className="font-semibold">{titleOf(i.nodeId)}: </span>}
            {i.message}
          </span>
        </button>
      ))}
    </div>
  );
}
