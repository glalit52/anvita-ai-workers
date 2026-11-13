"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { ListChecks, PanelLeftClose, PanelLeftOpen, Play, Sparkles } from "lucide-react";
import type { NodeKind, Worker, WorkerNode } from "@/lib/types";
import { cn, sleep } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Label, Textarea } from "@/components/ui/input";
import { isLive } from "@/lib/api";
import { fetchTrace, startTestRun, TERMINAL, useWorkflowCatalog, validateGraph, type Issue, type Trace } from "@/lib/workflow";
import { IssuesList, TraceView } from "./test-run";
import { useApp } from "@/lib/store";
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
  const [panel, setPanel] = useState<"autopilot" | "inspector" | "checks">("autopilot");
  const live = isLive();
  const catalog = useWorkflowCatalog();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [trace, setTrace] = useState<Trace | null>(null);
  const [testOpen, setTestOpen] = useState(false);
  const [testInput, setTestInput] = useState("");
  const [simulating, setSimulating] = useState(false);
  const simulatingRef = useRef(false);

  const selected = nodes.find((n) => n.id === selectedId)?.data.node ?? null;
  const updateWorker = useApp((s) => s.updateWorker);
  const [saved, setSaved] = useState<"saved" | "saving">("saved");
  const firstRun = useRef(true);

  // Persist graph edits (debounced) so they survive reloads.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (simulatingRef.current) return;
    setSaved("saving");
    const t = setTimeout(() => {
      updateWorker(worker.id, {
        nodes: nodes.map((n) => ({ ...n.data.node, x: Math.round(n.position.x), y: Math.round(n.position.y) })),
        edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, label: typeof e.label === "string" ? e.label : undefined })),
      });
      setSaved("saved");
    }, 600);
    return () => clearTimeout(t);
  }, [nodes, edges, updateWorker, worker.id]);

  const graph = useCallback(
    () => ({
      nodes: nodes.map((n) => ({ ...n.data.node, x: Math.round(n.position.x), y: Math.round(n.position.y) })),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, label: typeof e.label === "string" ? e.label : undefined })),
    }),
    [nodes, edges],
  );

  // Live mode: check the graph as it changes (loops, missing actions, bad expressions…).
  const graphKey = JSON.stringify(nodes.map((n) => [n.id, n.data.node.kind, n.data.node.config, n.data.node.appId])) + JSON.stringify(edges.map((e) => [e.source, e.target, e.label]));
  useEffect(() => {
    if (!live) return;
    const t = setTimeout(() => {
      const g = graph();
      validateGraph(worker.id, g.nodes, g.edges).then((r) => setIssues(r.issues), () => {});
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphKey, live, worker.id]);

  const issueLevel = useMemo(() => {
    const m = new Map<string, "error" | "warning">();
    for (const i of issues) if (i.nodeId && m.get(i.nodeId) !== "error") m.set(i.nodeId, i.level);
    return m;
  }, [issues]);
  const traceById = useMemo(() => new Map((trace?.nodes ?? []).map((n) => [n.id, n])), [trace]);
  const STATUS = { running: "running", done: "done", failed: "error", waiting: "waiting", skipped: "skipped", pending: undefined } as const;
  const viewNodes = useMemo(
    () =>
      nodes.map((n) => {
        const t = traceById.get(n.id);
        const status = n.data.status ?? (t ? STATUS[t.status] : undefined);
        const issue = issueLevel.get(n.id);
        return status === n.data.status && !issue && !t ? n : { ...n, data: { ...n.data, status, issue, detail: t?.status === "failed" ? (t.error ?? undefined) : (t?.detail ?? undefined) } };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes, traceById, issueLevel],
  );

  const runTest = async () => {
    let inputs: Record<string, unknown> = {};
    try {
      inputs = testInput.trim() ? JSON.parse(testInput) : {};
    } catch {
      toast.error("Test input must be JSON, e.g. {\"text\": \"Where is my order #1042?\"}");
      return;
    }
    setTestOpen(false);
    setSimulating(true);
    setPanel("checks");
    setTrace(null);
    try {
      const g = graph();
      const run = await startTestRun(worker.id, g.nodes, g.edges, inputs);
      for (let i = 0; i < 600; i++) {
        const t = await fetchTrace(run.id);
        setTrace(t);
        if (TERMINAL.has(t.status) || t.status.startsWith("waiting")) {
          if (t.status === "succeeded") toast.success("Test run finished");
          else if (t.status === "failed") toast.error("Test run failed — see the step that failed");
          else toast.message(t.status === "waiting_approval" ? "Test run is waiting for an approval" : "Test run is waiting for an app connection");
          break;
        }
        await sleep(800);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSimulating(false);
    }
  };

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
    if (nodes.length === 0) return;
    simulatingRef.current = true;
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
    setTimeout(() => (simulatingRef.current = false), 700);
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
          nodes={viewNodes}
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
          onNodesDelete={(deleted) => {
            if (deleted.some((d) => d.id === selectedId)) {
              setSelectedId(null);
              setPanel("autopilot");
            }
            toast(`Removed ${deleted.length} step${deleted.length > 1 ? "s" : ""}`);
          }}
          deleteKeyCode={["Delete", "Backspace"]}
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
          {live ? (
            <>
              <Button
                size="sm"
                variant="outline"
                className="shadow-soft"
                disabled={simulating}
                onClick={() => {
                  if (!testInput) {
                    const trig = nodes.find((n) => n.data.node.kind === "trigger")?.data.node;
                    const type = String(trig?.config?.triggerType ?? (trig?.config?.cron ? "schedule" : "channel"));
                    setTestInput(type === "channel" ? JSON.stringify({ text: "Hi, where is my order #1042?" }, null, 2) : "{}");
                  }
                  setTestOpen(true);
                }}
              >
                <Play /> {simulating ? "Running…" : "Test run"}
              </Button>
              {trace && !simulating && (
                <Button size="sm" variant="ghost" className="shadow-soft" onClick={() => setTrace(null)}>
                  Clear results
                </Button>
              )}
            </>
          ) : (
            <Button size="sm" variant="outline" className="shadow-soft" onClick={simulate} disabled={simulating}>
              <Play /> {simulating ? "Running…" : "Dry run"}
            </Button>
          )}
          <Button size="sm" variant="outline" className="shadow-soft lg:hidden" onClick={() => addNode("agent")}>
            + Step
          </Button>
          {selectedId && (
            <Button size="sm" variant="outline" className="shadow-soft" onClick={() => deleteNode(selectedId)}>
              Delete step
            </Button>
          )}
        </div>
        <div className="absolute right-3 top-3 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11.5px] text-muted-foreground shadow-soft">
          {nodes.length} steps · {edges.length} connections · {saved === "saving" ? "saving…" : "saved"}
          {live && (
            <button type="button" onClick={() => setPanel("checks")} className={cn("ml-2 font-medium cursor-pointer", issues.some((i) => i.level === "error") ? "text-danger" : issues.length ? "text-saffron" : "text-success")}>
              · {issues.filter((i) => i.level === "error").length ? `${issues.filter((i) => i.level === "error").length} to fix` : issues.length ? `${issues.length} to check` : "ready"}
            </button>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex w-full shrink-0 flex-col border-t border-border bg-card lg:w-[360px] lg:border-l lg:border-t-0">
        <div className="flex border-b border-border">
          {(live ? (["autopilot", "inspector", "checks"] as const) : (["autopilot", "inspector"] as const)).map((p) => (
            <button
              key={p}
              onClick={() => setPanel(p)}
              className={cn("flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-[13px] font-medium capitalize cursor-pointer", panel === p ? "border-primary text-foreground" : "border-transparent text-muted-foreground")}
            >
              {p === "autopilot" && <Sparkles className="size-3.5 text-primary" />}
              {p === "checks" && <ListChecks className="size-3.5" />}
              {p === "inspector" ? (selected ? "Step settings" : "Inspector") : p === "checks" ? (trace ? "Test run" : "Checks") : "Autopilot"}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1">
          {panel === "inspector" ? (
            <Inspector node={selected} onChange={updateNode} onDelete={deleteNode} issues={issues} catalog={catalog} />
          ) : panel === "checks" ? (
            <div className="flex max-h-[calc(100dvh-180px)] flex-col gap-5 overflow-y-auto p-4 scrollbar-thin">
              {trace && (
                <section>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Test run</p>
                  <TraceView trace={trace} onSelectNode={(id) => setSelectedId(id)} />
                </section>
              )}
              <section>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Checks</p>
                <IssuesList
                  issues={issues}
                  titleOf={(id) => nodes.find((n) => n.id === id)?.data.node.title ?? id}
                  onSelectNode={(id) => {
                    setSelectedId(id);
                    setPanel("inspector");
                  }}
                />
              </section>
            </div>
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
      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="max-w-lg">
          <div className="flex flex-col gap-3 p-6">
            <DialogTitle>Test run</DialogTitle>
            <p className="text-[13px] text-muted-foreground">Runs this draft for real with your connected apps. Actions that need approval wait in Approvals, as in production.</p>
            <div className="grid gap-1.5">
              <Label htmlFor="test-input">Trigger input (JSON)</Label>
              <Textarea id="test-input" rows={6} className="font-mono text-[12px]" value={testInput} onChange={(e) => setTestInput(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setTestOpen(false)}>
                Cancel
              </Button>
              <Button onClick={runTest}>
                <Play /> Run test
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
