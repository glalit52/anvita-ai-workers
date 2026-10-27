"use client";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, LayoutTemplate, Loader2, MessageSquare, PenTool, Sparkles, Wand2 } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TemplatesGrid } from "@/components/workers/templates-grid";
import { AppLogo } from "@/components/brand/app-logo";
import { useApp } from "@/lib/store";
import { toast } from "sonner";
import { blankWorker, guessApps, workerFromDescription, workerFromThread } from "@/components/workers/factory";
import type { Worker } from "@/lib/types";
import { cn, sleep } from "@/lib/utils";

type Mode = "describe" | "template" | "chat" | "blank";

const modes: { id: Mode; title: string; desc: string; icon: typeof Sparkles }[] = [
  { id: "describe", title: "Describe it", desc: "Tell Autopilot what the Worker should do in plain language.", icon: Wand2 },
  { id: "template", title: "Start from a template", desc: "Proven Workers for support, finance, sales, HR and IT.", icon: LayoutTemplate },
  { id: "chat", title: "From a past chat", desc: "Turn something Anvita already did well into a Worker.", icon: MessageSquare },
  { id: "blank", title: "Blank canvas", desc: "Design the workflow yourself in Studio.", icon: PenTool },
];

const examples = [
  "Answer order-status and return questions on WhatsApp in Hindi and English; create a Zendesk ticket and ask for approval for refunds above ₹5,000.",
  "Every month on the 14th, reconcile Tally purchases with GSTR-2B, email vendors with missing invoices and post a summary to #finance.",
  "When a new lead arrives in HubSpot, research the company, score ICP fit and draft a first email for the owner to approve.",
];

const suggestionText: Record<string, string> = {
  "1": "Auto-reply to “where is my order” questions in #support using Shopify order status and Delhivery tracking. Hand off to a human if the customer is upset.",
  "2": "Every month on the 14th, reconcile Tally purchases with GSTR-2B, email vendors with missing invoices and post a summary to #finance.",
  "3": "Every Monday, chase overdue B2B invoices on WhatsApp with a Razorpay UPI pay link; ask for approval before sending to invoices above ₹1 lakh.",
};

function buildStepsFor(w: Worker | null) {
  const apps = w?.apps.length ? w.apps.join(", ") : "your apps";
  const approvals = w?.nodes.filter((n) => n.kind === "approval").length ?? 0;
  return [
    "Understanding the process",
    `Choosing apps: ${apps}`,
    `Designing ${w?.nodes.length ?? 0}-step workflow with ${approvals} approval${approvals === 1 ? "" : "s"}`,
    "Creating knowledge base slots",
    "Writing test cases from your description",
    "Applying workspace policies & budgets",
  ];
}

function NewWorkerInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>((params.get("mode") as Mode) || "describe");
  const [text, setText] = useState(params.get("from") === "suggestion" ? (suggestionText[params.get("s") ?? "1"] ?? suggestionText["1"]) : "");
  const [building, setBuilding] = useState(-1);
  const [draft, setDraft] = useState<Worker | null>(null);
  const threads = useApp((s) => s.threads);
  const addWorker = useApp((s) => s.addWorker);
  const owner = useApp((s) => s.profile.name);
  const buildSteps = buildStepsFor(draft);
  const liveApps = guessApps(text);

  const generate = async () => {
    const w = workerFromDescription(text, owner);
    setDraft(w);
    for (let i = 0; i <= 6; i++) {
      setBuilding(i);
      await sleep(550);
    }
  };

  const openDraft = () => {
    if (!draft) return;
    addWorker(draft);
    toast.success(`Draft “${draft.name}” saved`);
    router.push(`/workers/${draft.id}?autopilot=1`);
  };

  const fromThread = (id: string) => {
    const t = threads.find((x) => x.id === id);
    if (!t) return;
    const w = workerFromThread(t, owner);
    addWorker(w);
    toast.success(`Compiled “${t.title}” into a Worker`);
    router.push(`/workers/${w.id}?autopilot=1`);
  };

  const fromBlank = () => {
    const w = blankWorker(owner);
    addWorker(w);
    router.push(`/workers/${w.id}`);
  };

  return (
    <PageContainer className="max-w-5xl">
      <Link href="/workers" className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> AI Workers
      </Link>
      <h1 className="mt-3 text-[22px] font-semibold tracking-tight">Create an AI Worker</h1>
      <p className="mt-1 text-sm text-muted-foreground">Workers run on triggers, schedules, channels or queues — with approvals, tests and versioning built in.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              "flex flex-col items-start gap-2 rounded-2xl border bg-card p-4 text-left transition-all cursor-pointer",
              mode === m.id ? "border-primary shadow-[0_0_0_3px] shadow-primary/15" : "border-border hover:border-primary/30",
            )}
          >
            <span className={cn("flex size-9 items-center justify-center rounded-xl", mode === m.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
              <m.icon className="size-4" />
            </span>
            <span className="text-[14px] font-medium">{m.title}</span>
            <span className="text-[12.5px] text-muted-foreground">{m.desc}</span>
          </button>
        ))}
      </div>

      {mode === "describe" && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <p className="text-[14px] font-medium">Describe the job</p>
            <Badge variant="primary" className="ml-auto">
              Autopilot
            </Badge>
          </div>
          <Textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (building >= 0) {
                setBuilding(-1);
                setDraft(null);
              }
            }}
            rows={5} className="mt-3 text-[14px]" placeholder="What should this Worker do? When should it run? What needs human approval?" />
          {liveApps.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
              Detected apps:
              {liveApps.map((a) => (
                <AppLogo key={a} appId={a} size={18} />
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-[12px] text-muted-foreground">Examples</p>
            {examples.map((ex) => (
              <button key={ex} onClick={() => setText(ex)} className="rounded-lg border border-border bg-subtle px-3 py-2 text-left text-[12.5px] text-muted-foreground transition-colors hover:text-foreground cursor-pointer">
                {ex}
              </button>
            ))}
          </div>

          {building >= 0 && (
            <div className="mt-5 rounded-xl border border-border bg-subtle p-4">
              <p className="mb-2 text-[13px] font-medium">Autopilot is building your Worker…</p>
              <ol className="flex flex-col gap-1.5">
                {buildSteps.map((s, i) => (
                  <li key={s} className={cn("flex items-center gap-2 text-[13px]", i > building && "text-muted-foreground/60")}>
                    {i < building ? <Check className="size-4 text-success" /> : i === building ? <Loader2 className="size-4 animate-spin text-primary" /> : <span className="size-4 rounded-full border border-border" />}
                    {s}
                  </li>
                ))}
              </ol>
              {building >= buildSteps.length && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    {draft?.apps.map((a) => (
                      <AppLogo key={a} appId={a} size={22} />
                    ))}
                  </div>
                  <span className="text-[13px] text-muted-foreground">
                    “{draft?.name}” · {draft?.nodes.length} steps
                  </span>
                  <Button className="ml-auto" onClick={openDraft}>
                    Open draft in Studio
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="mt-5 flex justify-end">
            <Button onClick={generate} disabled={!text.trim() || (building >= 0 && building < buildSteps.length)}>
              <Wand2 /> Generate Worker
            </Button>
          </div>
        </div>
      )}

      {mode === "template" && <TemplatesGrid />}

      {mode === "chat" && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
          {threads.length === 0 && <p className="p-6 text-center text-[13px] text-muted-foreground">No chats yet — ask Anvita something first.</p>}
          {threads.slice(0, 10).map((t) => (
            <div key={t.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
              <MessageSquare className="size-4 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium">{t.title}</p>
                <p className="text-[12px] text-muted-foreground">
                  {t.channelLabel ?? "Web"} · {t.updatedAt}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => fromThread(t.id)}>
                Compile to Worker
              </Button>
            </div>
          ))}
        </div>
      )}

      {mode === "blank" && (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-10 text-center">
          <PenTool className="size-6 text-primary" />
          <p className="text-[14px] font-medium">Start with an empty canvas</p>
          <p className="max-w-md text-[13px] text-muted-foreground">Drag triggers, agents, tools, code, approvals and sends onto the canvas. Autopilot is always one click away.</p>
          <Button onClick={fromBlank}>Open Studio</Button>
        </div>
      )}
    </PageContainer>
  );
}

export default function NewWorkerPage() {
  return (
    <Suspense>
      <NewWorkerInner />
    </Suspense>
  );
}
