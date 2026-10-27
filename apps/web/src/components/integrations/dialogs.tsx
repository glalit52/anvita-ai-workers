"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Check, FileUp, KeyRound, Link2, Loader2, RefreshCw, Server, Share2, ShieldCheck, Unplug, User, Users, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/input";
import { Segmented } from "@/components/ui/tabs";
import { confirm } from "@/components/ui/confirm";
import { AppLogo } from "@/components/brand/app-logo";
import { useApp } from "@/lib/store";
import { appById } from "@/lib/mock/apps";
import type { AppDef, Connection, McpServer } from "@/lib/types";
import { cn, sleep } from "@/lib/utils";

type Scope = Connection["scope"];
export const GROUPS = ["Marketing", "Finance", "Support", "Sales", "Operations", "Leadership"];

const scopeOptions: { v: Scope; icon: typeof Users; t: string; d: string }[] = [
  { v: "workspace", icon: Users, t: "Whole workspace", d: "Shared service account — best for Workers" },
  { v: "user", icon: User, t: "Just me", d: "Anvita acts as you, with your permissions" },
  { v: "shared", icon: Share2, t: "Me + selected people", d: "Share your account with a team or group" },
];

function ScopePicker({ scope, onChange }: { scope: Scope; onChange: (s: Scope) => void }) {
  return (
    <div className="grid gap-2">
      {scopeOptions.map((o) => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)} className={cn("flex items-center gap-3 rounded-xl border p-3 text-left cursor-pointer", scope === o.v ? "border-primary bg-primary-soft/40" : "border-border hover:bg-subtle")}>
          <o.icon className="size-4 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-[13.5px] font-medium">{o.t}</p>
            <p className="text-[12px] text-muted-foreground">{o.d}</p>
          </div>
          {scope === o.v && <Check className="size-4 text-primary" />}
        </button>
      ))}
    </div>
  );
}

function GroupPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {GROUPS.map((g) => {
        const on = value.includes(g);
        return (
          <button key={g} type="button" onClick={() => onChange(on ? value.filter((x) => x !== g) : [...value, g])} className={cn("rounded-full border px-2.5 py-1 text-[12px] cursor-pointer", on ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-border text-muted-foreground hover:text-foreground")}>
            {on && "✓ "}
            {g}
          </button>
        );
      })}
    </div>
  );
}

function Permissions() {
  return (
    <div className="rounded-xl bg-subtle p-3 text-[12.5px]">
      <p className="font-medium">Anvita will be able to</p>
      <ul className="mt-1.5 grid gap-1 text-muted-foreground">
        <li>• Read records and reports</li>
        <li>
          • Create and update records <span className="text-warning">(approval required by policy)</span>
        </li>
        <li className="text-danger">• Never delete records (blocked by policy)</li>
      </ul>
    </div>
  );
}

export function ConnectDialog({ app, onClose }: { app: AppDef | null; onClose: () => void }) {
  const connect = useApp((s) => s.connectApp);
  const updateConnection = useApp((s) => s.updateConnection);
  const [scope, setScope] = useState<Scope>("workspace");
  const [groups, setGroups] = useState<string[]>([]);
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
          <ScopePicker scope={scope} onChange={setScope} />
          {scope === "shared" && (
            <div className="mt-1 grid gap-1.5">
              <Label>Share with</Label>
              <GroupPicker value={groups} onChange={setGroups} />
            </div>
          )}
        </div>
        <div className="mt-4">
          <Permissions />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={loading || (scope === "shared" && groups.length === 0)}
            onClick={async () => {
              setLoading(true);
              await sleep(1000);
              connect(app.id, scope);
              if (scope === "shared") updateConnection(app.id, { sharedWith: groups });
              toast.success(`${app.name} connected`);
              setLoading(false);
              setScope("workspace");
              setGroups([]);
              onClose();
            }}
          >
            {loading ? <Loader2 className="animate-spin" /> : <KeyRound />} Continue to {app.name}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ManageConnectionDrawer({ appId, onClose }: { appId: string | null; onClose: () => void }) {
  const conn = useApp((s) => s.connections.find((c) => c.appId === appId));
  const workers = useApp((s) => s.workers);
  const connect = useApp((s) => s.connectApp);
  const disconnect = useApp((s) => s.disconnectApp);
  const update = useApp((s) => s.updateConnection);
  const [reconnecting, setReconnecting] = useState(false);
  const app = appId ? appById[appId] : null;
  const usedBy = workers.filter((w) => appId && w.apps.includes(appId));

  return (
    <Dialog open={!!appId && !!conn} onOpenChange={(o) => !o && onClose()}>
      <DialogContent side="right">
        {conn && app && (
          <>
            <div className="flex items-center gap-3 border-b border-border px-6 py-5">
              <AppLogo appId={conn.appId} size={40} />
              <div className="min-w-0 flex-1">
                <DialogTitle>{app.name}</DialogTitle>
                <DialogDescription>{app.description}</DialogDescription>
              </div>
              <Badge variant={conn.status === "healthy" ? "success" : conn.status === "expired" ? "warning" : "danger"} className="mr-8 capitalize">
                {conn.status}
              </Badge>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-thin">
              {conn.status !== "healthy" && (
                <div className="mb-5 rounded-xl border border-danger/30 bg-danger-soft/60 p-3 text-[13px]">
                  <p className="font-medium">{conn.status === "expired" ? "The login has expired" : "Calls to this app are failing"}</p>
                  <p className="mt-0.5 text-muted-foreground">{conn.status === "expired" ? "Reconnect to refresh the token. Runs that need it are paused." : "The provider returned errors for the last 12 calls. Reconnecting usually fixes revoked permissions."}</p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  ["Actions · 30d", conn.actionsUsed30d.toLocaleString("en-IN")],
                  ["Connected", conn.connectedAt],
                  ["By", conn.connectedBy.split(" ")[0]],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-muted/60 py-2.5">
                    <p className="text-[14px] font-semibold">{v}</p>
                    <p className="text-[11px] text-muted-foreground">{k}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 grid gap-2">
                <Label>Who can use this connection</Label>
                <ScopePicker
                  scope={conn.scope}
                  onChange={(s) => {
                    update(conn.appId, { scope: s, sharedWith: s === "shared" ? conn.sharedWith ?? [] : undefined });
                    toast.success("Access updated");
                  }}
                />
                {conn.scope === "shared" && (
                  <div className="mt-1 grid gap-1.5">
                    <Label>Shared with</Label>
                    <GroupPicker value={conn.sharedWith ?? []} onChange={(v) => update(conn.appId, { sharedWith: v })} />
                  </div>
                )}
              </div>
              <div className="mt-6">
                <Permissions />
              </div>
              <div className="mt-6">
                <Label>Used by Workers</Label>
                <div className="mt-2 flex flex-col gap-1.5">
                  {usedBy.length === 0 && <p className="text-[12.5px] text-muted-foreground">Only used by Ask Anvita chats.</p>}
                  {usedBy.map((w) => (
                    <div key={w.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-[13px]">
                      <span>{w.emoji}</span>
                      <span className="flex-1">{w.name}</span>
                      <Badge variant="outline" className="capitalize">
                        {w.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap justify-between gap-2 border-t border-border px-6 py-4">
              <Button
                variant="ghost"
                className="text-danger hover:bg-danger-soft"
                onClick={async () => {
                  const ok = await confirm({
                    title: `Disconnect ${app.name}?`,
                    description: usedBy.length ? `${usedBy.length} Worker(s) use this app and will pause until it is reconnected.` : "Anvita will no longer be able to read or act in this app.",
                    confirmLabel: "Disconnect",
                    danger: true,
                  });
                  if (!ok) return;
                  disconnect(conn.appId);
                  toast(`${app.name} disconnected`);
                  onClose();
                }}
              >
                <Unplug /> Disconnect
              </Button>
              <Button
                variant={conn.status === "healthy" ? "outline" : "default"}
                disabled={reconnecting}
                onClick={async () => {
                  setReconnecting(true);
                  await sleep(1000);
                  connect(conn.appId, conn.scope);
                  setReconnecting(false);
                  toast.success(`${app.name} reconnected`);
                }}
              >
                {reconnecting ? <Loader2 className="animate-spin" /> : <RefreshCw />} Reconnect
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

const validUrl = (u: string) => /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(u.trim());

export function AddMcpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const add = useApp((s) => s.addMcpServer);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [auth, setAuth] = useState<McpServer["auth"]>("oauth");
  const [token, setToken] = useState("");
  const [test, setTest] = useState<"idle" | "running" | "ok" | "fail">("idle");
  const [tools, setTools] = useState(0);
  const urlError = url && !validUrl(url) ? "Enter a full URL starting with https://" : "";

  const reset = () => {
    setName("");
    setUrl("");
    setAuth("oauth");
    setToken("");
    setTest("idle");
  };

  const runTest = async () => {
    setTest("running");
    await sleep(1200);
    if (url.includes("localhost") || url.startsWith("http://")) {
      setTest("fail");
      return;
    }
    setTools(3 + (url.length % 9));
    setTest("ok");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogTitle className="flex items-center gap-2">
          <Server className="size-5 text-primary" /> Add MCP server
        </DialogTitle>
        <DialogDescription className="mt-1">Give Anvita and your Workers the tools exposed by any remote MCP server.</DialogDescription>
        <div className="mt-5 grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="mcp-name">Name</Label>
            <Input id="mcp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Warehouse inventory" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="mcp-url">Server URL</Label>
            <Input
              id="mcp-url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setTest("idle");
              }}
              placeholder="https://mcp.example.com/sse"
              className={cn(urlError && "border-danger")}
            />
            {urlError && <p className="text-[11.5px] text-danger">{urlError}</p>}
          </div>
          <div className="grid gap-1.5">
            <Label>Authentication</Label>
            <Segmented
              value={auth}
              onChange={setAuth}
              options={[
                { value: "oauth", label: "OAuth" },
                { value: "bearer", label: "Bearer token" },
                { value: "none", label: "None" },
              ]}
            />
            {auth === "bearer" && <Input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste token — stored encrypted" />}
          </div>
          {test === "ok" && (
            <div className="flex items-center gap-2 rounded-xl bg-success-soft px-3 py-2.5 text-[13px] text-success">
              <Check className="size-4" /> Connected · {tools} tools discovered
            </div>
          )}
          {test === "fail" && (
            <div className="flex items-center gap-2 rounded-xl bg-danger-soft px-3 py-2.5 text-[13px] text-danger">
              <X className="size-4" /> Couldn&apos;t reach the server. MCP servers must be public HTTPS endpoints.
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={runTest} disabled={!validUrl(url) || test === "running" || (auth === "bearer" && !token)}>
            {test === "running" ? <Loader2 className="animate-spin" /> : <Link2 />} Test connection
          </Button>
          <Button
            disabled={test !== "ok" || !name.trim()}
            onClick={() => {
              add({ name: name.trim(), url: url.trim(), auth, tools, status: "healthy" });
              toast.success(`${name} added — ${tools} tools available to Anvita`);
              reset();
              onOpenChange(false);
            }}
          >
            Add server
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface Operation {
  method: string;
  path: string;
}

const METHODS = ["get", "post", "put", "patch", "delete"];

function parseSpec(text: string): { title: string; ops: Operation[] } | null {
  try {
    const spec = JSON.parse(text) as { info?: { title?: string }; paths?: Record<string, Record<string, unknown>> };
    if (!spec.paths) return null;
    const ops = Object.entries(spec.paths).flatMap(([path, item]) => Object.keys(item ?? {}).filter((m) => METHODS.includes(m.toLowerCase())).map((m) => ({ method: m.toUpperCase(), path })));
    return { title: spec.info?.title ?? "Imported API", ops };
  } catch {
    // YAML: walk `paths:` block by indentation
    const lines = text.split(/\r?\n/);
    const title = lines.map((l) => l.match(/^\s*title:\s*["']?(.+?)["']?\s*$/)).find(Boolean)?.[1] ?? "Imported API";
    const ops: Operation[] = [];
    let inPaths = false;
    let current = "";
    for (const l of lines) {
      if (/^paths:\s*$/.test(l)) {
        inPaths = true;
        continue;
      }
      if (inPaths && /^\S/.test(l)) inPaths = false;
      if (!inPaths) continue;
      const p = l.match(/^ {2}(['"]?\/[^:]*['"]?):\s*$/);
      if (p) current = p[1].replace(/['"]/g, "");
      const m = l.match(/^ {4}(get|post|put|patch|delete):\s*$/i);
      if (m && current) ops.push({ method: m[1].toUpperCase(), path: current });
    }
    return ops.length ? { title, ops } : null;
  }
}

const sampleOps: Operation[] = [
  { method: "GET", path: "/orders" },
  { method: "GET", path: "/orders/{id}" },
  { method: "POST", path: "/orders/{id}/cancel" },
  { method: "GET", path: "/inventory/{sku}" },
  { method: "PATCH", path: "/inventory/{sku}" },
  { method: "GET", path: "/customers/{id}" },
];

export function ImportOpenApiDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const add = useApp((s) => s.addMcpServer);
  const [mode, setMode] = useState<"url" | "file">("url");
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "parsed" | "error">("idle");
  const [result, setResult] = useState<{ title: string; ops: Operation[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setUrl("");
    setFileName("");
    setState("idle");
    setResult(null);
  };

  const fetchUrl = async () => {
    setState("loading");
    await sleep(1100);
    const host = url.replace(/^https?:\/\//, "").split("/")[0];
    setResult({ title: `${host.split(".").slice(-2, -1)[0] ?? "Custom"} API`.replace(/^./, (c) => c.toUpperCase()), ops: sampleOps });
    setState("parsed");
  };

  const onFile = async (f: File) => {
    setFileName(f.name);
    setState("loading");
    const text = await f.text();
    const parsed = parseSpec(text);
    if (parsed && parsed.ops.length) {
      setResult(parsed);
      setState("parsed");
    } else {
      setResult(null);
      setState("error");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogTitle className="flex items-center gap-2">
          <FileUp className="size-5 text-primary" /> Import an OpenAPI spec
        </DialogTitle>
        <DialogDescription className="mt-1">Turn any internal REST API into tools Anvita can call. Each operation becomes one action.</DialogDescription>
        <div className="mt-5">
          <Segmented
            value={mode}
            onChange={(m) => {
              setMode(m);
              reset();
            }}
            options={[
              { value: "url", label: "From URL" },
              { value: "file", label: "Upload file" },
            ]}
          />
        </div>
        <div className="mt-4">
          {mode === "url" ? (
            <div className="flex gap-2">
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.example.com/openapi.json" />
              <Button variant="outline" onClick={fetchUrl} disabled={!validUrl(url) || state === "loading"}>
                {state === "loading" ? <Loader2 className="animate-spin" /> : "Fetch"}
              </Button>
            </div>
          ) : (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".json,.yaml,.yml,application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                  e.target.value = "";
                }}
              />
              <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border p-6 text-[13px] text-muted-foreground hover:border-primary/40 hover:text-foreground cursor-pointer">
                <FileUp className="size-5" />
                {fileName ? <span className="font-medium text-foreground">{fileName}</span> : "Choose an openapi.json or .yaml file"}
              </button>
            </>
          )}
        </div>
        {state === "error" && <p className="mt-3 rounded-xl bg-danger-soft px-3 py-2.5 text-[13px] text-danger">No operations found. Make sure the file is an OpenAPI 3 / Swagger 2 spec with a `paths` section.</p>}
        {state === "parsed" && result && (
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <div className="flex items-center justify-between border-b border-border bg-subtle px-3.5 py-2 text-[13px]">
              <span className="font-medium">{result.title}</span>
              <Badge variant="primary">{result.ops.length} operations</Badge>
            </div>
            <div className="max-h-52 overflow-y-auto scrollbar-thin">
              {result.ops.slice(0, 50).map((o, i) => (
                <div key={i} className="flex items-center gap-2 border-b border-border px-3.5 py-1.5 font-mono text-[12px] last:border-0">
                  <span className={cn("w-14 font-semibold", o.method === "GET" ? "text-info" : o.method === "DELETE" ? "text-danger" : "text-warning")}>{o.method}</span>
                  {o.path}
                </div>
              ))}
            </div>
            <p className="flex items-center gap-1.5 border-t border-border px-3.5 py-2 text-[12px] text-muted-foreground">
              <ShieldCheck className="size-3.5 text-primary" /> Write and delete operations follow your workspace policies (approval / deny).
            </p>
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={state !== "parsed" || !result}
            onClick={() => {
              if (!result) return;
              add({ name: `${result.title} (OpenAPI)`, url: mode === "url" ? url.trim() : `file://${fileName}`, auth: "bearer", tools: result.ops.length, status: "healthy" });
              toast.success(`${result.title} imported — ${result.ops.length} actions available`);
              reset();
              onOpenChange(false);
            }}
          >
            Import {result ? `${result.ops.length} actions` : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
