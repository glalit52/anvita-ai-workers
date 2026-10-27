"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Globe, Loader2, Lock, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { AppLogo } from "@/components/brand/app-logo";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { appById } from "@/lib/mock/apps";
import { cn, sleep } from "@/lib/utils";
import { useApp, useSetting } from "@/lib/store";

const roles = ["Founder / CEO", "Operations", "Finance & accounts", "Sales", "Marketing", "Customer support", "HR", "IT"];
const goals = ["Weekly business reports", "Customer support on WhatsApp", "GST & accounting work", "Sales follow-ups", "Marketing analytics", "Hiring & onboarding", "IT helpdesk", "Research"];
const homeChannels = [
  { id: "slack", label: "Slack", desc: "Add Anvita to your Slack workspace" },
  { id: "whatsapp", label: "WhatsApp", desc: "Message Anvita like a teammate" },
  { id: "teams", label: "Microsoft Teams", desc: "Chat and channels in Teams" },
  { id: "web", label: "Web only", desc: "Use the Anvita app for now" },
];
const suggestedApps = ["gmail", "gdrive", "hubspot", "shopify", "tally", "metaads", "zendesk", "razorpay"];

const LEARN_SOURCES = ["#general, #finance, #support (last 90 days)", "Google Drive › Policies & SOPs", "HubSpot pipeline stages and owners"];

const steps = ["Workspace", "About you", "Home channel", "Connect apps", "Learn", "Ready"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState(roles[0]);
  const [picked, setPicked] = useState<string[]>(["Weekly business reports", "GST & accounting work"]);
  const [channel, setChannel] = useState("slack");
  const [connected, setConnected] = useState<string[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [learn, setLearn] = useState<"idle" | "running" | "done">("idle");
  const [company, setCompany] = useSetting("workspace.name", "Kesar Foods");
  const [region, setRegion] = useSetting("workspace.region", "India (Mumbai)");
  const [, setHomeChannel] = useSetting("workspace.homeChannel", "slack");
  const [, setGoals] = useSetting("onboarding.goals", "");
  const connectApp = useApp((s) => s.connectApp);
  const storeConnections = useApp((s) => s.connections);
  const updateProfile = useApp((s) => s.updateProfile);
  const [sources, setSources] = useState<string[]>(LEARN_SOURCES);

  const next = () => {
    if (step === 1) {
      setGoals(picked.join("|"));
      updateProfile({ title: role });
    }
    if (step === 2) setHomeChannel(channel);
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const runLearn = async () => {
    setLearn("running");
    await sleep(2600);
    setLearn("done");
  };

  return (
    <div className="min-h-dvh bg-subtle">
      <header className="flex items-center justify-between px-6 py-5">
        <Logo />
        <span className="text-[12.5px] text-muted-foreground">
          Step {step + 1} of {steps.length}
        </span>
      </header>
      <div className="mx-auto max-w-2xl px-4 pb-16">
        <Progress value={((step + 1) / steps.length) * 100} className="mb-8" />
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft md:p-10">
          {step === 0 && (
            <div className="grid gap-5">
              <div>
                <h1 className="text-[24px] font-semibold tracking-tight">Create your workspace</h1>
                <p className="mt-1 text-muted-foreground">Everyone in your company shares one Anvita — one memory, one set of Workers.</p>
              </div>
              <div className="grid gap-1.5">
                <Label>Company name</Label>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} aria-label="Company name" />
              </div>
              <div className="grid gap-1.5">
                <Label>Data region</Label>
                <Select value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Data region">
                  <option value="India (Mumbai)">🇮🇳 India (Mumbai) — recommended</option>
                  <option value="Europe (Frankfurt)">🇪🇺 Europe (Frankfurt)</option>
                  <option value="United States (Virginia)">🇺🇸 United States (Virginia)</option>
                </Select>
                <p className="flex items-center gap-1 text-[12px] text-muted-foreground">
                  <Lock className="size-3" /> All data is stored and processed in this region. Can’t be changed later.
                </p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-6">
              <div>
                <h1 className="text-[24px] font-semibold tracking-tight">What do you do?</h1>
                <p className="mt-1 text-muted-foreground">So Anvita can suggest the right first tasks.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {roles.map((r) => (
                  <button key={r} onClick={() => setRole(r)} className={cn("rounded-full border px-3.5 py-1.5 text-[13px] cursor-pointer", role === r ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-border hover:bg-subtle")}>
                    {r}
                  </button>
                ))}
              </div>
              <div>
                <p className="text-[14px] font-medium">What would you like to take off your plate?</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {goals.map((g) => {
                    const on = picked.includes(g);
                    return (
                      <button key={g} onClick={() => setPicked(on ? picked.filter((x) => x !== g) : [...picked, g])} className={cn("flex items-center gap-2.5 rounded-xl border p-3 text-left text-[13.5px] cursor-pointer", on ? "border-primary bg-primary-soft/40" : "border-border hover:bg-subtle")}>
                        <span className={cn("flex size-4 items-center justify-center rounded border", on ? "border-primary bg-primary text-white" : "border-input")}>{on && <Check className="size-3" />}</span>
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-5">
              <div>
                <h1 className="text-[24px] font-semibold tracking-tight">Where should Anvita live?</h1>
                <p className="mt-1 text-muted-foreground">You can add more channels any time. The web app always works.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {homeChannels.map((c) => (
                  <button key={c.id} onClick={() => setChannel(c.id)} className={cn("flex items-center gap-3 rounded-2xl border p-4 text-left cursor-pointer", channel === c.id ? "border-primary shadow-[0_0_0_3px] shadow-primary/15" : "border-border hover:bg-subtle")}>
                    {c.id === "web" ? (
                      <span className="flex size-10 items-center justify-center rounded-[28%] bg-muted">
                        <Globe className="size-5" />
                      </span>
                    ) : (
                      <AppLogo appId={c.id} size={40} />
                    )}
                    <div>
                      <p className="text-[14px] font-medium">{c.label}</p>
                      <p className="text-[12.5px] text-muted-foreground">{c.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              {channel === "whatsapp" && (
                <div className="flex items-center gap-4 rounded-2xl border border-border bg-subtle p-4">
                  <div className="grid size-24 shrink-0 grid-cols-6 gap-0.5 rounded-lg bg-white p-2">
                    {Array.from({ length: 36 }).map((_, i) => (
                      <span key={i} className={cn("rounded-[1px]", (i * 7 + (i % 5)) % 3 === 0 ? "bg-black" : "bg-transparent")} />
                    ))}
                  </div>
                  <p className="text-[13px] text-muted-foreground">
                    Scan to message <b className="text-foreground">Anvita · +91 80 4718 0000</b> on WhatsApp. Your number is linked to this workspace after a one-time code.
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-5">
              <div>
                <h1 className="text-[24px] font-semibold tracking-tight">Connect your apps</h1>
                <p className="mt-1 text-muted-foreground">Recommended for your goals. Anvita starts with read-only access and asks before any write.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {suggestedApps.map((a) => {
                  const done = connected.includes(a) || storeConnections.some((c) => c.appId === a && c.status === "healthy");
                  return (
                    <div key={a} className="flex items-center gap-3 rounded-xl border border-border p-3">
                      <AppLogo appId={a} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-medium">{appById[a]?.name}</p>
                        <p className="truncate text-[12px] text-muted-foreground">{appById[a]?.description}</p>
                      </div>
                      {done ? (
                        <span className="flex items-center gap-1 text-[12.5px] font-medium text-success">
                          <Check className="size-4" /> Done
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={connecting === a}
                          onClick={async () => {
                            setConnecting(a);
                            await sleep(800);
                            setConnected((c) => [...c, a]);
                            connectApp(a, "workspace");
                            setConnecting(null);
                          }}
                        >
                          {connecting === a ? <Loader2 className="animate-spin" /> : "Connect"}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-[12.5px] text-muted-foreground">{connected.length} connected · 3,000+ more in Integrations</p>
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-5">
              <div>
                <h1 className="text-[24px] font-semibold tracking-tight">Let Anvita learn how you work</h1>
                <p className="mt-1 text-muted-foreground">Optional. Anvita reads the sources you pick and builds workspace memory — glossary, people, processes. You can view or delete anything it learns.</p>
              </div>
              <div className="grid gap-2">
                {["#general, #finance, #support (last 90 days)", "Google Drive › Policies & SOPs", "HubSpot pipeline stages and owners"].map((s) => (
                  <label key={s} className="flex items-center gap-3 rounded-xl border border-border p-3 text-[13.5px]">
                    <input type="checkbox" checked={sources.includes(s)} onChange={() => setSources(sources.includes(s) ? sources.filter((x) => x !== s) : [...sources, s])} className="size-4 accent-[var(--primary)]" /> {s}
                  </label>
                ))}
              </div>
              {learn === "idle" && (
                <Button onClick={runLearn}>
                  <Sparkles /> Start learning
                </Button>
              )}
              {learn === "running" && (
                <div className="flex items-center gap-2 rounded-xl bg-primary-soft p-4 text-[13.5px] text-primary-soft-foreground">
                  <Loader2 className="size-4 animate-spin" /> Reading 2,140 messages and 18 documents…
                </div>
              )}
              {learn === "done" && (
                <div className="rounded-xl border border-success/30 bg-success-soft/50 p-4 text-[13.5px]">
                  <p className="flex items-center gap-2 font-medium text-success">
                    <Check className="size-4" /> Learned 46 facts, 12 people and 7 processes
                  </p>
                  <p className="mt-1 text-muted-foreground">e.g. “Refunds above ₹5,000 need Rahul’s approval” · “Fiscal year is April–March”</p>
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="grid gap-5">
              <div>
                <h1 className="text-[24px] font-semibold tracking-tight">Here are 5 things I can take off your plate 🎉</h1>
                <p className="mt-1 text-muted-foreground">Based on what I learned. Pick one to try now — it usually takes under a minute.</p>
              </div>
              <div className="grid gap-2">
                {[
                  ["Weekly growth report from Meta, Google Ads and HubSpot", "~3 h/week"],
                  ["Monthly GST reconciliation (Tally ↔ GSTR-2B)", "~4 h/month"],
                  ["Answer “where is my order” in #support", "~6 h/week"],
                  ["Chase overdue B2B invoices on WhatsApp", "₹18.4L overdue"],
                  ["Daily RTO & delivery exceptions digest", "~2 h/week"],
                ].map(([t, s], i) => (
                  <button key={t} onClick={() => router.push("/home")} className="flex items-center gap-3 rounded-xl border border-border p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-primary-soft/30 cursor-pointer">
                    <span className="flex size-7 items-center justify-center rounded-full bg-primary-soft text-[12px] font-semibold text-primary-soft-foreground">{i + 1}</span>
                    <span className="flex-1 text-[13.5px] font-medium">{t}</span>
                    <span className="text-[12px] text-success">{s}</span>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              <ArrowLeft /> Back
            </Button>
            {step < steps.length - 1 ? (
              <div className="flex gap-2">
                {(step === 3 || step === 4) && (
                  <Button variant="ghost" onClick={next}>
                    Skip
                  </Button>
                )}
                <Button onClick={next}>
                  Continue <ArrowRight />
                </Button>
              </div>
            ) : (
              <Button onClick={() => router.push("/home")}>
                Go to Anvita <ArrowRight />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
