"use client";
import { useCallback, useMemo, useState } from "react";
import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
} from "@xyflow/react";
import { toast } from "sonner";
import { PanelLeftClose, PanelLeftOpen, Play, Sparkles } from "lucide-react";
import type { NodeKind, Worker, WorkerNode } from "@/lib/types";
import { cn, sleep } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { WorkerFlowNode, type FlowNode } from "./flow-node";
import { nodeMeta, paletteKinds } from "./node-meta";
import { Inspector } from "./inspector";
import { Autopilot } from "./autopilot";

const nodeTypes = { worker: WorkerFlowNode };

function toFlow(w: Worker): { nodes: FlowNode[]; edges: Edge[] } {
  return {
    nodes: w.nodes.map((n) => ({ id: n.id, type: "worker", position: { x: n.x, y: n.y }, data: { node: n } })),
    edges: w.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
      labelBgPadding: [6, 3] as [number, number],
      labelBgBorderRadius: 6,
      labelStyle: { fontSize: 11, fill: "var(--foreground)", fontWeight: 500 },
      labelBgStyle: { fill: "var(--card)", stroke: "var(--border)" },
      style: { strokeWidth: 1.6 },
    })),
  };
}

export function Builder({ worker }: { worker: Worker }) {
  const initial = useMemo(() => toFlow(worker), [worker]);
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [panel, setPanel] = useState<"autopilot" | "inspector">("autopilot");
  const [simulating, setSimulating] = useState(false);

  const selected = nodes.find((n) => n.id === selectedId)?.data.node ?? null;

  const onConnect = useCallback(
    (c: Connection) => setEdges((eds) => addEdge({ ...c, type: "smoothstep", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 1.6 } }, eds)),
    [setEdges],
  );

  const addNode = (kind: NodeKind, title?: string, subtitle?: string) => {
    const anchor = nodes.find((n) => n.id === selectedId) ?? nodes[nodes.length - 1];
    const id = `${kind}-${Math.random().toString(36).slice(2, 6)}`;
    const node: WorkerNode = { id, kind, title: title ?? `New ${nodeMeta[kind].label.toLowerCase()}`, subtitle: subtitle ?? nodeMeta[kind].description, x: (anchor?.position.x ?? 0) + 280, y: (anchor?.position.y ?? 0) + 40 };
    setNodes((ns) => [...ns, { id, type: "worker", position: { x: node.x, y: node.y }, data: { node }, selected: true }]);
    if (anchor) setEdges((es) => [...es, { id: `${anchor.id}-${id}`, source: anchor.id, target: id, type: "smoothstep", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 1.6 } }]);
    setSelectedId(id);
    setPanel("inspector");
    return id;
  };

  const updateNode = (id: string, patch: Partial<WorkerNode>) => setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, node: { ...n.data.node, ...patch } } } : n)));

  const deleteNode = (id: string) => {
    setNodes((ns) => ns.filter((n) => n.id !== id));
    setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
    setSelectedId(null);
    setPanel("autopilot");
  };

  const simulate = async () => {
    setSimulating(true);
    const order = [...nodes].sort((a, b) => a.position.y - b.position.y);
    for (const n of order) {
      setNodes((ns) => ns.map((x) => (x.id === n.id ? { ...x, data: { ...x.data, status: "running" } } : x)));
      await sleep(380);
      setNodes((ns) => ns.map((x) => (x.id === n.id ? { ...x, data: { ...x.data, status: "done" } } : x)));
    }
    toast.success("Dry run passed — all steps executed with side effects stubbed");
    await sleep(1600);
    setNodes((ns) => ns.map((x) => ({ ...x, data: { ...x.data, status: undefined } })));
    setSimulating(false);
  };

  return (
    <div className="flex h-full min-h-[640px] flex-col lg:flex-row">
      {/* Palette */}
      <div className={cn("hidden shrink-0 border-r border-border bg-sidebar transition-all lg:block", paletteOpen ? "w-56" : "w-11")}>
        <div className="flex items-center justify-between px-3 py-2.5">
          {paletteOpen && <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Add step</p>}
          <button onClick={() => setPaletteOpen(!paletteOpen)} className="rounded p-1 text-muted-foreground hover:bg-card cursor-pointer" aria-label="Toggle palette">
            {paletteOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
          </button>
        </div>
        <div className="flex flex-col gap-1 px-2 pb-3">
          {paletteKinds.map((k) => {
            const m = nodeMeta[k];
            return (
              <button key={k} onClick={() => addNode(k)} title={m.description} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left text-[12.5px] hover:bg-card cursor-pointer">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md text-white" style={{ background: m.color }}>
                  <m.icon className="size-3.5" />
                </span>
                {paletteOpen && (
                  <span className="min-w-0">
                    <span className="block font-medium">{m.label}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{m.description}</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Canvas */}
      <div className="relative min-h-[520px] flex-1 bg-subtle">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, n) => {
            setSelectedId(n.id);
            setPanel("inspector");
          }}
          onPaneClick={() => setSelectedId(null)}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          proOptions={{ hideAttribution: true }}
          minZoom={0.3}
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} color="var(--canvas-dot)" />
          <Controls showInteractive={false} className="!rounded-lg !border !border-border !shadow-soft" />
          <MiniMap pannable zoomable className="!hidden !rounded-lg !border !border-border md:!block" nodeColor={(n) => nodeMeta[(n as FlowNode).data.node.kind].color} maskColor="color-mix(in srgb, var(--background) 70%, transparent)" />
        </ReactFlow>
        <div className="absolute left-3 top-3 flex gap-2">
          <Button size="sm" variant="outline" className="shadow-soft" onClick={simulate} disabled={simulating}>
            <Play /> {simulating ? "Running…" : "Dry run"}
          </Button>
          <Button size="sm" variant="outline" className="shadow-soft lg:hidden" onClick={() => addNode("agent")}>
            + Step
          </Button>
        </div>
        <div className="absolute right-3 top-3 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11.5px] text-muted-foreground shadow-soft">
          {nodes.length} steps · {edges.length} connections · autosaved
        </div>
      </div>

      {/* Right panel */}
      <div className="flex w-full shrink-0 flex-col border-t border-border bg-card lg:w-[360px] lg:border-l lg:border-t-0">
        <div className="flex border-b border-border">
          {(["autopilot", "inspector"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPanel(p)}
              className={cn("flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-[13px] font-medium capitalize cursor-pointer", panel === p ? "border-primary text-foreground" : "border-transparent text-muted-foreground")}
            >
              {p === "autopilot" && <Sparkles className="size-3.5 text-primary" />}
              {p === "inspector" ? (selected ? "Step settings" : "Inspector") : "Autopilot"}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1">
          {panel === "inspector" ? (
            <Inspector node={selected} onChange={updateNode} onDelete={deleteNode} />
          ) : (
            <Autopilot
              worker={worker}
              onAddNode={(kind, title, subtitle) => {
                addNode(kind, title, subtitle);
                setPanel("autopilot");
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
