"use client";
import { useState } from "react";
import { isLive, post } from "@/lib/api";
import { load } from "@/lib/backend";
import { toast } from "sonner";
import { Check, ChevronRight, Code2, Plug, Plus, RefreshCw, Search, Server, Trash2, TriangleAlert } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { confirm } from "@/components/ui/confirm";
import { AppLogo } from "@/components/brand/app-logo";
import { AddMcpDialog, ConnectDialog, ImportOpenApiDialog, ManageConnectionDrawer } from "@/components/integrations/dialogs";
import { apps, appById } from "@/lib/mock/apps";
import { useApp } from "@/lib/store";
import type { AppDef } from "@/lib/types";
import { cn } from "@/lib/utils";

const categories = ["All", "Communication", "Productivity", "CRM & Sales", "Support", "Commerce", "Finance", "Marketing", "Engineering", "HR", "Data"];

export default function IntegrationsPage() {
  const connections = useApp((s) => s.connections);
  const mcpServers = useApp((s) => s.mcpServers);
  const removeMcp = useApp((s) => s.removeMcpServer);
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [connecting, setConnecting] = useState<AppDef | null>(null);
  const [managing, setManaging] = useState<string | null>(null);
  const [mcpOpen, setMcpOpen] = useState(false);
  const [openApiOpen, setOpenApiOpen] = useState(false);
  const connectedIds = new Set(connections.map((c) => c.appId));
  const catalog = apps.filter((a) => (cat === "All" || a.category === cat) && (a.name.toLowerCase().includes(q.toLowerCase()) || a.description.toLowerCase().includes(q.toLowerCase())));
  const issues = connections.filter((c) => c.status !== "healthy").length;

  return (
    <PageContainer>
      <PageHeader
        title="Integrations"
        description="3,000+ apps via native connectors, aggregators and MCP. Credentials are encrypted and never shown to the model."
        actions={
          <>
            <Button variant="outline" onClick={() => setMcpOpen(true)}>
              <Server /> Add MCP server
            </Button>
            <Button variant="outline" onClick={() => setOpenApiOpen(true)}>
              <Code2 /> Import OpenAPI
            </Button>
          </>
        }
      />

      <div className="mt-8 flex items-center gap-2">
        <h2 className="text-[15px] font-semibold">Connected ({connections.length})</h2>
        {issues > 0 && (
          <Badge variant="danger">
            <TriangleAlert /> {issues} need attention
          </Badge>
        )}
      </div>
      {connections.length === 0 ? (
        <div className="mt-3">
          <EmptyState icon={<Plug />} title="No apps connected" description="Connect the tools your team uses so Anvita can read data and take action." />
        </div>
      ) : (
        <Card className="mt-3 overflow-hidden">
          <div className="grid md:grid-cols-2">
            {connections.map((c, i) => {
              const app = appById[c.appId];
              return (
                <div
                  key={c.appId}
                  role="button"
                  tabIndex={0}
                  onClick={() => setManaging(c.appId)}
                  onKeyDown={(e) => e.key === "Enter" && setManaging(c.appId)}
                  className={cn("flex cursor-pointer items-center gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-subtle", i % 2 === 0 && "md:border-r")}
                >
                  <AppLogo appId={c.appId} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[13.5px] font-medium">{app?.name ?? c.appId}</p>
                      <Badge variant="outline" className="capitalize">
                        {c.scope}
                      </Badge>
                      {c.mode === "demo" && !["web", "sandbox"].includes(c.appId) && <Badge variant="default">Sample data</Badge>}
                      {c.mode === "live" && c.account && <span className="truncate text-[11.5px] text-muted-foreground">{c.account}</span>}
                    </div>
                    <p className="truncate text-[12px] text-muted-foreground">
                      {c.connectedBy} · {c.actionsUsed30d.toLocaleString("en-IN")} actions / 30d
                      {c.sharedWith?.length ? ` · shared with ${c.sharedWith.join(", ")}` : ""}
                    </p>
                  </div>
                  {c.status === "healthy" ? (
                    <Badge variant="success">
                      <Check /> Healthy
                    </Badge>
                  ) : c.status === "expired" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setManaging(c.appId);
                      }}
                    >
                      <RefreshCw /> Reconnect
                    </Button>
                  ) : (
                    <Badge variant="danger">
                      <TriangleAlert /> Error
                    </Badge>
                  )}
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="mt-10 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold">MCP servers & custom APIs ({mcpServers.length})</h2>
        <Button size="sm" variant="ghost" onClick={() => setMcpOpen(true)}>
          <Plus /> Add
        </Button>
      </div>
      <Card className="mt-3 divide-y divide-border">
        {mcpServers.length === 0 && <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">No MCP servers or imported APIs yet.</p>}
        {mcpServers.map((m) => {
          const isApi = m.name.endsWith("(OpenAPI)");
          return (
            <div key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className={cn("flex size-8 items-center justify-center rounded-lg", isApi ? "bg-info-soft text-info" : "bg-primary-soft text-primary")}>{isApi ? <Code2 className="size-4" /> : <Server className="size-4" />}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[13.5px] font-medium">{m.name}</p>
                  <Badge variant="outline">{isApi ? "OpenAPI" : "MCP"}</Badge>
                </div>
                <p className="truncate font-mono text-[11.5px] text-muted-foreground">{m.url}</p>
                {m.status !== "healthy" && m.lastError && <p className="truncate text-[11.5px] text-danger">{m.lastError}</p>}
              </div>
              <span className="text-[12px] text-muted-foreground">
                {m.tools} tools · {m.auth === "none" ? "no auth" : m.auth}
              </span>
              <Badge variant={m.status === "healthy" ? "success" : "danger"}>{m.status === "healthy" ? "Healthy" : "Error"}</Badge>
              {isLive() && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Re-check ${m.name}`}
                  onClick={async () => {
                    try {
                      const r = await post<{ status: string; tools: number; lastError?: string }>(`/mcp-servers/${m.id}/check`);
                      await load.mcp();
                      if (r.status === "healthy") toast.success(`${m.name}: ${r.tools} tools`);
                      else toast.error(r.lastError ?? "Server unreachable");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Check failed");
                    }
                  }}
                >
                  <RefreshCw />
                </Button>
              )}
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Remove ${m.name}`}
                className="hover:text-danger"
                onClick={async () => {
                  if (await confirm({ title: `Remove ${m.name}?`, description: `Its ${m.tools} tools will no longer be available to Anvita or Workers.`, confirmLabel: "Remove", danger: true })) {
                    removeMcp(m.id);
                    toast(`${m.name} removed`);
                  }
                }}
              >
                <Trash2 />
              </Button>
            </div>
          );
        })}
      </Card>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold">App directory</h2>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search 3,000+ apps" className="pl-8" />
        </div>
      </div>
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {categories.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={cn("shrink-0 rounded-full border px-3 py-1 text-[12.5px] cursor-pointer", cat === c ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-border text-muted-foreground hover:text-foreground")}>
            {c}
          </button>
        ))}
      </div>
      {catalog.length === 0 && (
        <p className="mt-6 text-center text-[13px] text-muted-foreground">
          No apps match “{q}”. Missing something? <button className="font-medium text-primary hover:underline cursor-pointer" onClick={() => setOpenApiOpen(true)}>Import its OpenAPI spec</button> or <button className="font-medium text-primary hover:underline cursor-pointer" onClick={() => setMcpOpen(true)}>add an MCP server</button>.
        </p>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {catalog.map((a) => {
          const connected = connectedIds.has(a.id);
          return (
            <div key={a.id} className="flex flex-col rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-soft">
              <div className="flex items-start justify-between">
                <AppLogo appId={a.id} size={36} />
                <Badge variant={a.provider === "native" ? "primary" : a.provider === "mcp" ? "info" : "default"}>{a.provider === "native" ? "Native" : a.provider === "mcp" ? "MCP" : "Via Composio"}</Badge>
              </div>
              <p className="mt-3 text-[14px] font-medium">{a.name}</p>
              <p className="mt-0.5 flex-1 text-[12.5px] text-muted-foreground">{a.description}</p>
              {connected ? (
                <Button size="sm" variant="secondary" className="mt-3" onClick={() => setManaging(a.id)}>
                  <Check /> Connected · Manage
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setConnecting(a)}>
                  <Plus /> Connect
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <ConnectDialog app={connecting} onClose={() => setConnecting(null)} />
      <ManageConnectionDrawer appId={managing} onClose={() => setManaging(null)} />
      <AddMcpDialog open={mcpOpen} onOpenChange={setMcpOpen} />
      <ImportOpenApiDialog open={openApiOpen} onOpenChange={setOpenApiOpen} />
    </PageContainer>
  );
}
