"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Eye, EyeOff, KeyRound, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { confirm } from "@/components/ui/confirm";
import { SectionHeader, SettingRow } from "@/components/settings-section";
import { Field } from "@/components/settings/field";
import { useApp, useSetting } from "@/lib/store";
import { del, get, isLive, put } from "@/lib/api";

const tiers = [
  { id: "fast", name: "Fast", model: "Claude Haiku", use: "Classification, routing, extraction", share: "41%" },
  { id: "balanced", name: "Balanced", model: "Claude Sonnet", use: "Default for agents and chat", share: "52%" },
  { id: "precise", name: "Precise", model: "Claude Opus", use: "Planning, hard reasoning, code", share: "7%" },
];

const providers = ["Anthropic (direct)", "AWS Bedrock", "Google Vertex AI", "Azure OpenAI", "Self-hosted (vLLM)"];

interface ByoKey {
  provider: string;
  region: string;
  last4: string;
  addedAt: string;
}

function AddKeyDialog({ open, onOpenChange, onAdd }: { open: boolean; onOpenChange: (o: boolean) => void; onAdd: (k: ByoKey) => void }) {
  const [provider, setProvider] = useState(providers[1]);
  const [key, setKey] = useState("");
  const [region, setRegion] = useState("ap-south-1");
  const [show, setShow] = useState(false);
  const [touched, setTouched] = useState(false);
  const error = touched && key.trim().length < 16 ? "Paste the full key (at least 16 characters)" : undefined;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Bring your own model key</DialogTitle>
        <DialogDescription className="mt-1">Keys are encrypted with your workspace key (KMS) and never shown again.</DialogDescription>
        <form
          className="mt-5 grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (key.trim().length < 16) return;
            onAdd({ provider, region, last4: key.trim().slice(-4), addedAt: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) });
          }}
        >
          <Field label="Provider">
            <Select value={provider} onChange={(e) => setProvider(e.target.value)}>
              {providers.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          </Field>
          <Field label="API key / credentials" error={error}>
            <div className="relative">
              <Input type={show ? "text" : "password"} value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-…" className="pr-9 font-mono" autoComplete="off" autoFocus />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground cursor-pointer" aria-label={show ? "Hide key" : "Show key"}>
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </Field>
          <Field label="Region" hint="Must match the workspace data region when region pinning is on.">
            <Select value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="ap-south-1">ap-south-1 (Mumbai)</option>
              <option value="eu-central-1">eu-central-1 (Frankfurt)</option>
              <option value="us-east-1">us-east-1 (Virginia)</option>
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              <KeyRound /> Save key
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TierCard({ t, live }: { t: (typeof tiers)[number]; live?: { model: string; share: number; calls: number } }) {
  const [on, setOn] = useSetting<boolean>(`models.tier.${t.id}`, true);
  const locked = t.id === "balanced";
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[14px] font-semibold">{t.name}</p>
          <p className="text-[12.5px] text-muted-foreground">{live ? <span className="font-mono">{live.model}</span> : t.model}</p>
        </div>
        <Switch
          checked={locked ? true : on}
          disabled={locked && !!live}
          aria-label={`Allow ${t.name} tier`}
          onCheckedChange={(v) => {
            setOn(v);
            toast.success(`${t.name} tier ${v ? "allowed" : "disabled"}${v ? "" : " — steps fall back to the next allowed tier"}`);
          }}
        />
      </div>
      <p className="mt-3 text-[12.5px] text-muted-foreground">{t.use}</p>
      <div className="mt-3 flex items-center justify-between text-[12px]">
        <Badge variant="outline">{live ? `${Math.round(live.share * 100)}% of calls · 30 days` : `${t.share} of tokens`}</Badge>
        {locked || on ? (
          <span className="flex items-center gap-1 text-success">
            <Check className="size-3.5" /> Allowed
          </span>
        ) : (
          <span className="text-muted-foreground">Disabled</span>
        )}
      </div>
    </Card>
  );
}

interface LiveModels {
  provider: "anthropic" | "scripted" | "byo";
  tiers: { id: "fast" | "balanced" | "precise"; model: string; enabled: boolean; calls: number; share: number }[];
  apiKey: { last4: string; addedAt: string | null } | null;
  totalCalls30d: number;
}

function AnthropicKeyDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Use your own Anthropic API key</DialogTitle>
        <DialogDescription className="mt-1">All of this workspace's model calls go to your Anthropic account, and model tokens stop using Anvita credits. The key is verified, encrypted, and never shown again.</DialogDescription>
        <form
          className="mt-5 grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await put("/models/key", { apiKey: key.trim() });
              toast.success("Anthropic key verified and saved");
              onSaved();
            } catch (err) {
              toast.error((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="API key" hint="Create one at console.anthropic.com → API keys">
            <Input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-ant-api03-…" className="font-mono text-[12px]" aria-label="Anthropic API key" autoFocus />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || key.trim().length < 20}>
              {busy ? "Verifying…" : "Verify & save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ModelsPage() {
  const live = isLive();
  const [info, setInfo] = useState<LiveModels | null>(null);
  const [keyOpen, setKeyOpen] = useState(false);
  const reload = () => get<LiveModels>("/models").then(setInfo, () => {});
  useEffect(() => {
    if (live) void reload();
  }, [live]);
  const [keysJson, setKeysJson] = useSetting<string>("models.byoKeys", "[]");
  const [routing, setRouting] = useSetting<string>("models.routing", "balanced");
  const [fallback, setFallback] = useSetting<boolean>("models.fallback", true);
  const [pin, setPin] = useSetting<boolean>("models.regionPinning", true);
  const [web, setWeb] = useSetting<boolean>("models.webBrowsing", true);
  const [open, setOpen] = useState(false);
  const log = useApp((s) => s.log);
  const keys = JSON.parse(keysJson) as ByoKey[];

  return (
    <>
      <SectionHeader title="Models & data" description="AnvitaFusion routes each step to the cheapest model that passes your tests." />
      <div className="grid gap-3 md:grid-cols-2">
        {tiers.map((t) => (
          <TierCard key={t.id} t={t} live={info?.tiers.find((x) => x.id === t.id)} />
        ))}
        {live ? (
          <Card className="p-4" data-testid="byo-key">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-semibold">Your Anthropic key</p>
                <p className="text-[12.5px] text-muted-foreground">Bill model usage to your own Anthropic account</p>
              </div>
              {!info?.apiKey && (
                <Button size="sm" variant="outline" onClick={() => setKeyOpen(true)}>
                  <KeyRound /> Add key
                </Button>
              )}
            </div>
            {info?.apiKey ? (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-[12.5px]">
                <Badge variant="success">
                  <Check /> Verified
                </Badge>
                <span className="flex-1 truncate">
                  Anthropic · <span className="font-mono">••••{info.apiKey.last4}</span>
                </span>
                <button
                  aria-label="Remove Anthropic key"
                  className="rounded p-1 text-muted-foreground hover:text-danger cursor-pointer"
                  onClick={async () => {
                    if (!(await confirm({ title: "Remove your Anthropic key?", description: "Model calls go back to Anvita-managed models and use credits again.", confirmLabel: "Remove", danger: true }))) return;
                    await del("/models/key");
                    toast("Key removed");
                    void reload();
                  }}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ) : (
              <p className="mt-3 text-[12.5px] text-muted-foreground">{info?.provider === "scripted" ? "This server runs the offline demo model — add a key to use Claude." : "Using Anvita-managed Claude models."} Other providers (Bedrock, Vertex) can be added by your developers in the model router.</p>
            )}
          </Card>
        ) : (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-semibold">Bring your own</p>
              <p className="text-[12.5px] text-muted-foreground">Bedrock, Vertex, Azure OpenAI or vLLM</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              <KeyRound /> Add key
            </Button>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {keys.length === 0 && <p className="text-[12.5px] text-muted-foreground">For residency or air-gapped needs. No keys added.</p>}
            {keys.map((k, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-[12.5px]">
                <Badge variant="success">
                  <Check /> Connected
                </Badge>
                <span className="flex-1 truncate">
                  {k.provider} · <span className="font-mono">••••{k.last4}</span> · {k.region}
                </span>
                <button
                  aria-label={`Remove ${k.provider} key`}
                  className="rounded p-1 text-muted-foreground hover:text-danger cursor-pointer"
                  onClick={async () => {
                    if (await confirm({ title: `Remove ${k.provider} key?`, description: "Steps that use it fall back to Anvita-managed models.", confirmLabel: "Remove", danger: true })) {
                      setKeysJson(JSON.stringify(keys.filter((_, j) => j !== i)));
                      log("model.key.removed", k.provider);
                    }
                  }}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </Card>
        )}
      </div>
      <Card className="mt-6">
        <SettingRow title="Routing strategy" description="How AnvitaFusion picks a model when a step is set to Auto">
          <Select value={routing} onChange={(e) => { setRouting(e.target.value); toast.success("Routing strategy updated"); }} className="w-56" aria-label="Routing strategy">
            <option value="economy">Lower cost (Balanced model for planning)</option>
            <option value="balanced">Balanced cost & quality</option>
            <option value="quality">Highest quality (Precise model for chat & Workers)</option>
          </Select>
        </SettingRow>
        <SettingRow title="Fallback model" description={live ? "If Claude declines a request, retry it on another model in the same call" : "Retry on another allowed model in the same region if the primary is unavailable"}>
          <Switch checked={fallback} onCheckedChange={(v) => { setFallback(v); toast.success("Saved"); }} aria-label="Fallback on outage" />
        </SettingRow>
        {!live && (
          <SettingRow title="Region pinning" description="Only call model endpoints hosted in the workspace's region">
            <Switch checked={pin} onCheckedChange={(v) => { setPin(v); toast.success("Saved"); log("models.region_pinning", v ? "on" : "off"); }} aria-label="Region pinning" />
          </SettingRow>
        )}
        <SettingRow title="Web browsing" description="Allow Anvita to search and read public websites">
          <Switch checked={web} onCheckedChange={(v) => { setWeb(v); toast.success("Saved"); }} aria-label="Web browsing" />
        </SettingRow>
      </Card>
      <AnthropicKeyDialog key={keyOpen ? "k-open" : "k-closed"} open={keyOpen} onOpenChange={setKeyOpen} onSaved={() => (setKeyOpen(false), void reload())} />
      <AddKeyDialog
        key={open ? "open" : "closed"}
        open={open}
        onOpenChange={setOpen}
        onAdd={(k) => {
          setKeysJson(JSON.stringify([...keys, k]));
          log("model.key.added", `${k.provider} (${k.region})`);
          toast.success(`${k.provider} key connected`);
          setOpen(false);
        }}
      />
    </>
  );
}
