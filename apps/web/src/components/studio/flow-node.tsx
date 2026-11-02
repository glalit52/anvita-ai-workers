"use client";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { AppLogo } from "@/components/brand/app-logo";
import type { WorkerNode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { nodeMeta } from "./node-meta";

export type FlowNodeData = { node: WorkerNode; status?: "running" | "done" | "error" | "waiting" | "skipped"; issue?: "error" | "warning"; detail?: string };
export type FlowNode = Node<FlowNodeData, "worker">;

export function WorkerFlowNode({ data, selected }: NodeProps<FlowNode>) {
  const { node, status, issue, detail } = data;
  const meta = nodeMeta[node.kind];
  const Icon = meta.icon;
  return (
    <div
      className={cn(
        "w-[230px] rounded-xl border bg-card shadow-soft transition-shadow",
        selected ? "border-primary shadow-[0_0_0_3px] shadow-primary/20" : "border-border hover:border-primary/40",
        status === "running" && "border-primary animate-pulse",
        status === "done" && "border-success",
        status === "error" && "border-danger",
        status === "waiting" && "border-saffron",
        status === "skipped" && "opacity-50",
        !status && issue === "error" && "border-danger/60",
      )}
      data-status={status}
    >
      {node.kind !== "trigger" && <Handle type="target" position={Position.Top} className="!size-2.5 !border-2" />}
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5" style={{ background: meta.color + "12" }}>
        <span className="flex size-5 items-center justify-center rounded-md text-white" style={{ background: meta.color }}>
          <Icon className="size-3" />
        </span>
        <span className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: meta.color }}>
          {meta.label}
        </span>
        {node.config?.hitl === true && <span className="ml-auto rounded bg-saffron-soft px-1 text-[9.5px] font-semibold text-saffron">HITL</span>}
        {issue && !status && (
          <span title={issue === "error" ? "Needs attention" : "Check this step"} className={cn("ml-auto rounded px-1 text-[9.5px] font-semibold", issue === "error" ? "bg-danger-soft text-danger" : "bg-saffron-soft text-saffron")}>
            {issue === "error" ? "Fix" : "Check"}
          </span>
        )}
        {status && status !== "running" && (
          <span className={cn("ml-auto rounded px-1 text-[9.5px] font-semibold capitalize", status === "done" ? "bg-success-soft text-success" : status === "error" ? "bg-danger-soft text-danger" : status === "waiting" ? "bg-saffron-soft text-saffron" : "bg-muted text-muted-foreground")}>
            {status === "error" ? "failed" : status}
          </span>
        )}
      </div>
      <div className="flex items-start gap-2 px-3 py-2.5">
        {node.appId && <AppLogo appId={node.appId} size={22} className="mt-0.5" />}
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium leading-snug">{node.title}</p>
          {detail ? <p className={cn("truncate text-[11.5px]", status === "error" ? "text-danger" : "text-muted-foreground")}>{detail}</p> : node.subtitle && <p className="truncate text-[11.5px] text-muted-foreground">{node.subtitle}</p>}
        </div>
      </div>
      {node.kind !== "end" && <Handle type="source" position={Position.Bottom} className="!size-2.5 !border-2" />}
    </div>
  );
}
