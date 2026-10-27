"use client";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { AppLogo } from "@/components/brand/app-logo";
import type { WorkerNode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { nodeMeta } from "./node-meta";

export type FlowNodeData = { node: WorkerNode; status?: "running" | "done" | "error" };
export type FlowNode = Node<FlowNodeData, "worker">;

export function WorkerFlowNode({ data, selected }: NodeProps<FlowNode>) {
  const { node, status } = data;
  const meta = nodeMeta[node.kind];
  const Icon = meta.icon;
  return (
    <div
      className={cn(
        "w-[230px] rounded-xl border bg-card shadow-soft transition-shadow",
        selected ? "border-primary shadow-[0_0_0_3px] shadow-primary/20" : "border-border hover:border-primary/40",
        status === "running" && "border-primary animate-pulse",
        status === "done" && "border-success",
      )}
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
      </div>
      <div className="flex items-start gap-2 px-3 py-2.5">
        {node.appId && <AppLogo appId={node.appId} size={22} className="mt-0.5" />}
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium leading-snug">{node.title}</p>
          {node.subtitle && <p className="truncate text-[11.5px] text-muted-foreground">{node.subtitle}</p>}
        </div>
      </div>
      {node.kind !== "end" && <Handle type="source" position={Position.Bottom} className="!size-2.5 !border-2" />}
    </div>
  );
}
