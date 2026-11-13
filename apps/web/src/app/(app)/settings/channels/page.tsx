"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Globe, Loader2, Mail, MessagesSquare, Phone, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { confirm } from "@/components/ui/confirm";
import { SectionHeader } from "@/components/settings-section";
import { Field } from "@/components/settings/field";
import { del, get, isLive, patch, post } from "@/lib/api";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

type Kind = "widget" | "email" | "voice" | "teams";
interface Endpoint {
  id: string;
  kind: Kind;
  name: string;
  workerId: string | null;
  key: string;
  enabled: boolean;
  config: Record<string, unknown>;
  secrets: Record<string, boolean>;
  setup: { embed?: string; webhookUrl?: string; incomingUrl?: string; messagingEndpoint?: string; note?: string };
  createdAt: string;
}

const KINDS: { kind: Kind; label: string; icon: typeof Globe; blurb: string }[] = [
  { kind: "widget", label: "Website chat", icon: Globe, blurb: "A chat bubble on your website, answered by a Worker" },
  { kind: "email", label: "Support email", icon: Mail, blurb: "Answer mail sent to an address like support@yourcompany.in" },
  { kind: "voice", label: "Phone line", icon: Phone, blurb: "A Voice Worker on your phone number (Twilio or compatible)" },
  { kind: "teams", label: "Microsoft Teams", icon: MessagesSquare, blurb: "Chat with Anvita or a Worker inside Teams" },
];
const meta = (k: Kind) => KINDS.find((x) => x.kind === k)!;

function CopyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-[11.5px] font-medium text-muted-foreground">{label}</span>
      <div className="flex gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg bg-muted px-2.5 py-1.5 font-mono text-[11.5px]" title={value}>
          {value}
        </code>
        <Button
          size="icon-sm"
          variant="outline"
          aria-label={`Copy ${label}`}
          onClick={() => {
            void navigator.clipboard?.writeText(value);
            toast.success(`${label} copied`);
          }}
        >
          <Copy />
        </Button>
      </div>
    </div>
  );
}

function CreateDialog({ kind, onClose, onCreated, voiceProviders }: { kind: Kind | null; onClose: () => void; onCreated: (e: Endpoint) => void; voiceProviders: { id: string; label: string }[] }) {
  const workers = useApp((s) => s.workers);
  const [f, setF] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  if (!kind) return null;
  const m = meta(kind);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setBusy(true);
    const list = (v?: string) => (v ?? "").split(/[\s,]+/).filter(Boolean);
    const config: Record<string, unknown> =
      kind === "widget"
        ? { allowedOrigins: list(f.origins), greeting: f.greeting || undefined, color: f.color || undefined }
        : kind === "email"
          ? { address: f.address, fromName: f.fromName || undefined, allowedSenders: list(f.senders) }
          : kind === "voice"
            ? { provider: f.provider || "twilio", number: f.number, language: f.language || "en-IN", greeting: f.greeting || undefined }
            : { botAppId: f.botAppId, tenantId: f.tenantId || undefined };
    const secrets: Record<string, string> = kind === "voice" && f.authToken ? { authToken: f.authToken } : kind === "teams" && f.botPassword ? { botPassword: f.botPassword } : {};
    try {
      const e = await post<Endpoint>("/channel-endpoints", { kind, name: f.name || m.label, workerId: f.workerId || null, config, secrets });
      toast.success(`${m.label} added`);
      onCreated(e);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogTitle>Add {m.label.toLowerCase()}</DialogTitle>
        <DialogDescription className="mt-1">{m.blurb}.</DialogDescription>
        <form className="mt-4 grid gap-4" onSubmit={submit}>
          <Field label="Name">
            <Input value={f.name ?? ""} onChange={set("name")} placeholder={m.label} aria-label="Channel name" />
          </Field>
          <Field label="Answered by" hint="The Worker's instructions, knowledge and apps are used. Leave empty for Anvita.">
            <Select value={f.workerId ?? ""} onChange={set("workerId")} aria-label="Answered by">
              <option value="">Anvita (general assistant)</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
          </Field>
          {kind === "widget" && (
            <>
              <Field label="Allowed websites" hint="Domains that may show the widget (subdomains included). Empty = any site.">
                <Input value={f.origins ?? ""} onChange={set("origins")} placeholder="kesarfoods.in, shop.kesarfoods.in" aria-label="Allowed websites" />
              </Field>
              <Field label="Greeting">
                <Input value={f.greeting ?? ""} onChange={set("greeting")} placeholder="Hi! How can we help?" aria-label="Greeting" />
              </Field>
            </>
          )}
          {kind === "email" && (
            <>
              <Field label="Address customers write to">
                <Input type="email" value={f.address ?? ""} onChange={set("address")} placeholder="support@kesarfoods.in" aria-label="Support address" required />
              </Field>
              <Field label="Only accept mail from (optional)" hint="Addresses or domains; empty = anyone">
                <Input value={f.senders ?? ""} onChange={set("senders")} placeholder="partner.in" aria-label="Allowed senders" />
              </Field>
            </>
          )}
          {kind === "voice" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Provider">
                  <Select value={f.provider ?? "twilio"} onChange={set("provider")} aria-label="Voice provider">
                    {voiceProviders.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Phone number">
                  <Input value={f.number ?? ""} onChange={set("number")} placeholder="+91 80 4718 0000" aria-label="Phone number" />
                </Field>
              </div>
              <Field label="Auth token" hint="Used to verify that calls really come from your provider">
                <Input type="password" value={f.authToken ?? ""} onChange={set("authToken")} aria-label="Auth token" required />
              </Field>
              <Field label="Greeting">
                <Textarea rows={2} value={f.greeting ?? ""} onChange={set("greeting")} placeholder="Namaste, you've reached Kesar Foods. How can I help?" aria-label="Call greeting" />
              </Field>
            </>
          )}
          {kind === "teams" && (
            <>
              <Field label="Microsoft App ID" hint="From your Azure Bot resource → Configuration">
                <Input value={f.botAppId ?? ""} onChange={set("botAppId")} className="font-mono text-[12px]" aria-label="Microsoft App ID" required />
              </Field>
              <Field label="Client secret">
                <Input type="password" value={f.botPassword ?? ""} onChange={set("botPassword")} aria-label="Client secret" required />
              </Field>
              <Field label="Tenant ID (single-tenant bots)">
                <Input value={f.tenantId ?? ""} onChange={set("tenantId")} className="font-mono text-[12px]" aria-label="Tenant ID" />
              </Field>
            </>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} Add channel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ChannelsPage() {
  const workers = useApp((s) => s.workers);
  const [rows, setRows] = useState<Endpoint[] | null>(null);
  const [voiceProviders, setVoiceProviders] = useState<{ id: string; label: string }[]>([{ id: "twilio", label: "Twilio" }]);
  const [adding, setAdding] = useState<Kind | null>(null);
  const live = isLive();
  const reload = () => get<{ data: Endpoint[]; voiceProviders: { id: string; label: string }[] }>("/channel-endpoints").then((r) => (setRows(r.data), setVoiceProviders(r.voiceProviders)), () => setRows([]));
  useEffect(() => {
    if (live) void reload();
    else setRows([]);
  }, [live]);
  const workerName = (id: string | null) => (id ? workers.find((w) => w.id === id)?.name ?? "Worker" : "Anvita");

  return (
    <>
      <SectionHeader title="Channels" description="Where customers and teammates reach your Workers — besides Slack and WhatsApp, which you connect in Integrations." />
      <div className="grid gap-3 sm:grid-cols-2">
        {KINDS.map((k) => (
          <button
            key={k.kind}
            onClick={() => (live ? setAdding(k.kind) : toast("Channels are available when Anvita is connected to its API"))}
            className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-subtle cursor-pointer"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <k.icon className="size-4.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-[14px] font-medium">
                {k.label} <Plus className="size-3.5 text-muted-foreground" />
              </span>
              <span className="mt-0.5 block text-[12.5px] text-muted-foreground">{k.blurb}</span>
            </span>
          </button>
        ))}
      </div>

      <h3 className="mb-3 mt-8 text-[15px] font-semibold">Your channels</h3>
      {rows === null && <Card className="p-5 text-[13px] text-muted-foreground">Loading…</Card>}
      {rows?.length === 0 && <Card className="p-5 text-[13px] text-muted-foreground">No channels yet. Add one above.</Card>}
      <div className="grid gap-3">
        {rows?.map((e) => {
          const m = meta(e.kind);
          return (
            <Card key={e.id} className={cn("p-4", !e.enabled && "opacity-70")} data-testid={`channel-${e.kind}`}>
              <div className="flex flex-wrap items-center gap-3">
                <m.icon className="size-4.5 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium">
                    {e.name} <Badge className="ml-1">{m.label}</Badge>
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    Answered by {workerName(e.workerId)}
                    {e.kind === "email" && ` · ${String(e.config.address ?? "")}`}
                    {e.kind === "voice" && e.config.number ? ` · ${String(e.config.number)}` : ""}
                  </p>
                </div>
                <Switch
                  checked={e.enabled}
                  aria-label={`${e.name} enabled`}
                  onCheckedChange={async (v) => {
                    const u = await patch<Endpoint>(`/channel-endpoints/${e.id}`, { enabled: v });
                    setRows((r) => r?.map((x) => (x.id === e.id ? u : x)) ?? null);
                  }}
                />
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Delete ${e.name}`}
                  onClick={async () => {
                    if (!(await confirm({ title: `Delete ${e.name}?`, description: "The widget, address or number stops being answered. Past conversations stay in Chat.", confirmLabel: "Delete", danger: true }))) return;
                    await del(`/channel-endpoints/${e.id}`);
                    setRows((r) => r?.filter((x) => x.id !== e.id) ?? null);
                    toast("Channel deleted");
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
              <div className="mt-3 grid gap-2 border-t border-border pt-3">
                {e.setup.embed && <CopyField label="Embed code" value={e.setup.embed} />}
                {e.setup.webhookUrl && <CopyField label="Inbound webhook URL" value={e.setup.webhookUrl} />}
                {e.setup.incomingUrl && <CopyField label="Voice webhook URL" value={e.setup.incomingUrl} />}
                {e.setup.messagingEndpoint && <CopyField label="Messaging endpoint" value={e.setup.messagingEndpoint} />}
                {e.setup.note && <p className="text-[12px] text-muted-foreground">{e.setup.note}</p>}
                {e.kind === "widget" && <p className="text-[12px] text-muted-foreground">Paste before the closing &lt;/body&gt; tag. Conversations appear in Chat; hand-offs appear in Inbox.</p>}
              </div>
            </Card>
          );
        })}
      </div>
      <CreateDialog key={adding ?? "none"} kind={adding} voiceProviders={voiceProviders} onClose={() => setAdding(null)} onCreated={(e) => (setAdding(null), setRows((r) => [e, ...(r ?? [])]))} />
    </>
  );
}
