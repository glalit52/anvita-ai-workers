"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Code2, KeyRound, Loader2, Plus, RefreshCw, Search, Server, Share2, TriangleAlert, User, Users } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { AppLogo } from "@/components/brand/app-logo";
import { apps, appById } from "@/lib/mock/apps";
import { useApp } from "@/lib/store";
import type { AppDef } from "@/lib/types";
import { cn } from "@/lib/utils";

const categories = ["All", "Communication", "Productivity", "CRM & Sales", "Support", "Commerce", "Finance", "Marketing", "Engineering", "HR", "Data"];

function ConnectDialog({ app, onClose }: { app: AppDef | null; onClose: () => void }) {
  const connect = useApp((s) => s.connectApp);
  const [scope, setScope] = useState<"workspace" | "user" | "shared">("workspace");
  const [loading, setLoading] = useState(false);
  if (!app) return null;
  return (
    <Dialog open={!!app} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <div className="flex items-center gap-3">
          <AppLogo appId={app.id} size={44} />
          <div>
            <DialogTitle>Connect {app.name}</DialogTitle>
            <DialogDescription>{app.description}</DialogDescription>
          </div>
        </div>
        <div className="mt-5 grid gap-2">
          <Label>Who is this connection for?</Label>
          {[
            { v: "workspace" as const, icon: Users, t: "Whole workspace", d: "Shared service account — best for Workers" },
            { v: "user" as const, icon: User, t: "Just me", d: "Anvita acts as you, with your permissions" },
            { v: "shared" as const, icon: Share2, t: "Me + selected people", d: "Share your account with a team or group" },
          ].map((o) => (
            <button key={o.v} onClick={() => setScope(o.v)} className={cn("flex items-center gap-3 rounded-xl border p-3 text-left cursor-pointer", scope === o.v ? "border-primary bg-primary-soft/40" : "border-border hover:bg-subtle")}>
              <o.icon className="size-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-[13.5px] font-medium">{o.t}</p>
                <p className="text-[12px] text-muted-foreground">{o.d}</p>
              </div>
              {scope === o.v && <Check className="size-4 text-primary" />}
            </button>
          ))}
        </div>
        <div className="mt-4 rounded-xl bg-subtle p-3 text-[12.5px]">
          <p className="font-medium">Anvita will be able to</p>
          <ul className="mt-1.5 grid gap-1 text-muted-foreground">
            <li>• Read records and reports</li>
            <li>• Create and update records <span className="text-warning">(approval required by policy)</span></li>
            <li className="text-danger">• Never delete records (blocked by policy)</li>
          </ul>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={loading}
            onClick={() => {
              setLoading(true);
              setTimeout(() => {
                connect(app.id);
                toast.success(`${app.name} connected`);
                setLoading(false);
                onClose();
              }, 1000);
            }}
          >
            {loading ? <Loader2 className="animate-spin" /> : <KeyRound />} Continue to {app.name}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function IntegrationsPage() {
  const connections = useApp((s) => s.connections);
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [connecting, setConnecting] = useState<AppDef | null>(null);
  const connectedIds = new Set(connections.map((c) => c.appId));
  const catalog = apps.filter((a) => (cat === "All" || a.category === cat) && a.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <PageContainer>
      <PageHeader
        title="Integrations"
        description="3,000+ apps via native connectors, aggregators and MCP. Credentials are encrypted and never shown to the model."
        actions={
          <>
            <Button variant="outline">
              <Server /> Add MCP server
            </Button>
            <Button variant="outline">
              <Code2 /> Import OpenAPI
            </Button>
          </>
        }
      />

      <h2 className="mt-8 text-[15px] font-semibold">Connected ({connections.length})</h2>
      <Card className="mt-3 overflow-hidden">
        <div className="grid divide-y divide-border md:grid-cols-2 md:divide-y-0">
          {connections.map((c, i) => {
            const app = appById[c.appId];
            return (
              <div key={c.appId} className={cn("flex items-center gap-3 px-4 py-3", "md:border-b md:border-border", i % 2 === 0 && "md:border-r")}>
                <AppLogo appId={c.appId} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13.5px] font-medium">{app?.name}</p>
                    <Badge variant="outline" className="capitalize">
                      {c.scope}
                    </Badge>
                  </div>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {c.connectedBy} · {c.actionsUsed30d.toLocaleString("en-IN")} actions / 30d
                    {c.sharedWith && ` · shared with ${c.sharedWith.join(", ")}`}
                  </p>
                </div>
                {c.status === "healthy" ? (
                  <Badge variant="success">
                    <Check /> Healthy
                  </Badge>
                ) : c.status === "expired" ? (
                  <Button size="sm" variant="outline" onClick={() => setConnecting(app)}>
                    <RefreshCw /> Reconnect
                  </Button>
                ) : (
                  <Badge variant="danger">
                    <TriangleAlert /> Error
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
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
                <Button size="sm" variant="secondary" className="mt-3" disabled>
                  <Check /> Connected
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
    </PageContainer>
  );
}
