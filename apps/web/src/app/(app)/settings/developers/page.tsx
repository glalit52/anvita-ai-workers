"use client";
import { useState } from "react";
import { toast } from "sonner";
import { BookOpen, Copy, FileJson, Plus, Trash2, TriangleAlert } from "lucide-react";
import { API_URL } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { confirm } from "@/components/ui/confirm";
import { SectionHeader } from "@/components/settings-section";
import { Field } from "@/components/settings/field";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

/** The API this app talks to (live mode), or the hosted default shown in the demo. */
const apiBase = () => (API_URL || "https://api.anvita.ai").replace(/\/$/, "");

const curl = (base: string) => `curl ${base}/v1/workers/<worker id>/runs \\
  -H "Authorization: Bearer $ANVITA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"inputs": {"file_url": "https://…/invoice.pdf"}}'

# Poll the run (or subscribe to the run.completed webhook)
curl ${base}/v1/runs/<run id> -H "Authorization: Bearer $ANVITA_API_KEY"`;

const openai = (base: string) => `import os
from openai import OpenAI

client = OpenAI(base_url="${base}/v1", api_key=os.environ["ANVITA_API_KEY"])
reply = client.chat.completions.create(
    model="anvita",  # or "worker:<Worker id or name>"
    messages=[{"role": "user", "content": "Which orders are stuck in RTO this week?"}],
)
print(reply.choices[0].message.content)`;

const mcp = (base: string) => `{
  "mcpServers": {
    "anvita": {
      "type": "http",
      "url": "${base}/v1/mcp",
      "headers": { "Authorization": "Bearer \${ANVITA_API_KEY}" }
    }
  }
}`;

const scopes = ["chat", "workers:run", "workers:read", "kb:read", "approvals:write", "all"];
const events = ["run.completed", "run.failed", "approval.requested", "approval.decided", "worker.published", "usage.threshold"];

function copy(text: string, what = "Copied") {
  navigator.clipboard?.writeText(text);
  toast(what);
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-xl bg-[#0f1020] p-4 font-mono text-[12px] leading-relaxed text-[#d6d7f5]">{code}</pre>
      <button onClick={() => copy(code)} className="absolute right-2 top-2 rounded-md p-1.5 text-[#9a9bd0] hover:bg-white/10 cursor-pointer" aria-label="Copy code">
        <Copy className="size-3.5" />
      </button>
    </div>
  );
}

function CreateKeyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const createKey = useApp((s) => s.createApiKey);
  const [name, setName] = useState("");
  const [scope, setScope] = useState("workers:run");
  const [secret, setSecret] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {secret ? (
          <>
            <DialogTitle>Your new API key</DialogTitle>
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-warning-soft p-3 text-[12.5px] text-warning">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" /> Copy it now — for your security it will never be shown again.
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-subtle p-2 pl-3">
              <code className="flex-1 break-all font-mono text-[12.5px]">{secret}</code>
              <Button size="sm" variant="outline" onClick={() => copy(secret, "API key copied")}>
                <Copy /> Copy
              </Button>
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={() => onOpenChange(false)}>I’ve saved it</Button>
            </div>
          </>
        ) : (
          <>
            <DialogTitle>Create API key</DialogTitle>
            <DialogDescription className="mt-1">Keys are scoped to this workspace. Give it the narrowest scope that works.</DialogDescription>
            <form
              className="mt-5 grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                setTouched(true);
                if (!name.trim()) return;
                Promise.resolve(createKey(name.trim(), scope)).then(
                  (secret) => {
                    setSecret(secret);
                    toast.success("API key created");
                  },
                  () => {}, // the store already reported the error
                );
              }}
            >
              <Field label="Name" error={touched && !name.trim() ? "Name the key so you can recognise it later" : undefined}>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Zoho ERP sync" autoFocus />
              </Field>
              <Field label="Scope">
                <Select value={scope} onChange={(e) => setScope(e.target.value)}>
                  {scopes.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
              </Field>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create key</Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function WebhookDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const addWebhook = useApp((s) => s.addWebhook);
  const [url, setUrl] = useState("");
  const [picked, setPicked] = useState<string[]>(["run.completed"]);
  const [touched, setTouched] = useState(false);
  const urlOk = /^https:\/\/[^\s]+\.[^\s]+/.test(url.trim());
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Add webhook endpoint</DialogTitle>
        <DialogDescription className="mt-1">Anvita POSTs signed JSON (HMAC-SHA256 in the X-Anvita-Signature header).</DialogDescription>
        <form
          className="mt-5 grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (!urlOk || picked.length === 0) return;
            addWebhook({ url: url.trim(), events: picked, active: true });
            toast.success("Webhook added — a test event was sent");
            onOpenChange(false);
          }}
        >
          <Field label="Endpoint URL" error={touched && !urlOk ? "Must be an https:// URL" : undefined}>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/hooks/anvita" autoFocus />
          </Field>
          <div>
            <p className="mb-2 text-[13px] font-medium">Events</p>
            <div className="grid grid-cols-2 gap-2">
              {events.map((ev) => (
                <label key={ev} className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-2 font-mono text-[12px]">
                  <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={picked.includes(ev)} onChange={(e) => setPicked(e.target.checked ? [...picked, ev] : picked.filter((x) => x !== ev))} />
                  {ev}
                </label>
              ))}
            </div>
            {touched && picked.length === 0 && <p className="mt-1 text-[12px] text-danger">Pick at least one event</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add endpoint</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function DevelopersPage() {
  const keys = useApp((s) => s.apiKeys);
  const revoke = useApp((s) => s.revokeApiKey);
  const webhooks = useApp((s) => s.webhooks);
  const removeWebhook = useApp((s) => s.removeWebhook);
  const [keyOpen, setKeyOpen] = useState(false);
  const [hookOpen, setHookOpen] = useState(false);

  return (
    <>
      <SectionHeader
        title="API & MCP"
        description="Call Anvita and your Workers from code, Claude Code, Cursor or any MCP client."
        actions={
          <Button onClick={() => setKeyOpen(true)}>
            <Plus /> Create API key
          </Button>
        }
      />
      <Card>
        <Table>
          <THead>
            <tr>
              <TH>Name</TH>
              <TH>Key</TH>
              <TH>Scope</TH>
              <TH>Created</TH>
              <TH>Last used</TH>
              <TH />
            </tr>
          </THead>
          <tbody>
            {keys.map((k) => (
              <TR key={k.id} className={cn(k.revoked && "opacity-55")}>
                <TD className="font-medium">{k.name}</TD>
                <TD className="font-mono text-[12px]">{k.prefix}</TD>
                <TD>
                  <Badge variant="outline" className="font-mono">
                    {k.scope}
                  </Badge>
                </TD>
                <TD className="text-muted-foreground">{k.createdAt}</TD>
                <TD className="text-muted-foreground">{k.lastUsed}</TD>
                <TD className="text-right">
                  {k.revoked ? (
                    <Badge variant="danger">Revoked</Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger hover:bg-danger-soft"
                      onClick={async () => {
                        if (await confirm({ title: `Revoke “${k.name}”?`, description: "Requests using this key will fail immediately. This can't be undone.", confirmLabel: "Revoke key", danger: true })) {
                          revoke(k.id);
                          toast("API key revoked");
                        }
                      }}
                    >
                      Revoke
                    </Button>
                  )}
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>
      <Card className="mt-6" data-testid="api-reference">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>API reference</CardTitle>
            <p className="text-[12.5px] text-muted-foreground">
              Every endpoint with request and response schemas. Authenticate with an API key as a Bearer token. Base URL <code className="font-mono">{apiBase()}/v1</code>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => window.open(`${apiBase()}/docs`, "_blank", "noopener")}>
              <BookOpen /> Open API reference
            </Button>
            <Button size="sm" variant="ghost" onClick={() => window.open(`${apiBase()}/docs/json`, "_blank", "noopener")}>
              <FileJson /> OpenAPI JSON
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2 text-[12.5px] text-muted-foreground sm:grid-cols-3">
          <p><span className="font-medium text-foreground">Scopes</span> — <code className="font-mono">all</code>, <code className="font-mono">chat</code>, <code className="font-mono">workers:run</code>, <code className="font-mono">workers:&lt;id&gt;:run</code>, <code className="font-mono">kb:read</code>, <code className="font-mono">approvals</code>.</p>
          <p><span className="font-medium text-foreground">Errors</span> — JSON <code className="font-mono">{"{ error: { code, message } }"}</code>; <code className="font-mono">402 plan_limit</code> / <code className="font-mono">insufficient_credits</code>, <code className="font-mono">429</code> when rate limited.</p>
          <p><span className="font-medium text-foreground">Webhooks</span> — signed with your endpoint secret; retried with backoff. Events below.</p>
        </CardContent>
      </Card>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Run a Worker via REST</CardTitle>
            <p className="text-[12.5px] text-muted-foreground">Runs are asynchronous: you get a run id back immediately.</p>
          </CardHeader>
          <CardContent>
            <CodeBlock code={curl(apiBase())} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>OpenAI-compatible</CardTitle>
            <p className="text-[12.5px] text-muted-foreground">
              <code className="font-mono">POST /v1/chat/completions</code> — use any OpenAI SDK; waits for the answer (streaming supported).
            </p>
          </CardHeader>
          <CardContent>
            <CodeBlock code={openai(apiBase())} />
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Connect via MCP</CardTitle>
            <p className="text-[12.5px] text-muted-foreground">For Claude Code, Claude Desktop, Cursor and other MCP clients. Tools: ask_anvita, list_workers, run_worker, get_run, search_knowledge — limited by the key's scope.</p>
          </CardHeader>
          <CardContent>
            <CodeBlock code={mcp(apiBase())} />
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Webhooks</CardTitle>
            <p className="text-[12.5px] text-muted-foreground">Get notified when runs finish or approvals are needed.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setHookOpen(true)}>
            <Plus /> Add endpoint
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {webhooks.length === 0 && <p className="text-[13px] text-muted-foreground">No endpoints yet.</p>}
          {webhooks.map((w) => (
            <div key={w.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[12.5px]">{w.url}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {w.events.map((e) => (
                    <Badge key={e} variant="outline" className="font-mono">
                      {e}
                    </Badge>
                  ))}
                </div>
              </div>
              <Badge variant="success">Active</Badge>
              <Button variant="ghost" size="icon-sm" aria-label="Copy URL" onClick={() => copy(w.url, "URL copied")}>
                <Copy />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Remove endpoint"
                className="hover:text-danger"
                onClick={async () => {
                  if (await confirm({ title: "Remove this endpoint?", description: w.url, confirmLabel: "Remove", danger: true })) {
                    removeWebhook(w.id);
                    toast("Webhook removed");
                  }
                }}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
      <CreateKeyDialog key={keyOpen ? "k-open" : "k-closed"} open={keyOpen} onOpenChange={setKeyOpen} />
      <WebhookDialog key={hookOpen ? "h-open" : "h-closed"} open={hookOpen} onOpenChange={setHookOpen} />
    </>
  );
}
