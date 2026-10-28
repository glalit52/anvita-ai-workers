"use client";
import { useState } from "react";
import Link from "next/link";
import { create } from "zustand";
import {
  BarChart3,
  Bot,
  Brain,
  Check,
  ChevronDown,
  CircleDashed,
  Code2,
  Coins,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  Loader2,
  PauseCircle,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Copy,
  Workflow,
  AppWindow,
  X,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import { Markdown } from "@/components/ui/markdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { LogoMark } from "@/components/brand/logo";
import { AppLogo } from "@/components/brand/app-logo";
import { ApprovalCard } from "@/components/approvals/approval-card";
import { isLive } from "@/lib/api";
import { ConnectDialog } from "@/components/integrations/dialogs";
import { appById } from "@/lib/mock/apps";
import { patchBlock, useApp } from "@/lib/store";
import type { Artifact, ChatBlock, ChatMessage, RunStep } from "@/lib/types";
import { cn, formatCredits } from "@/lib/utils";
import { SaveWorkerDialog } from "./save-worker-dialog";

export const useChatUI = create<{ artifact: Artifact | null; open: (a: Artifact | null) => void }>((set) => ({
  artifact: null,
  open: (a) => set({ artifact: a }),
}));

const artifactIcon = { pdf: FileText, sheet: FileSpreadsheet, chart: BarChart3, dashboard: LayoutDashboard, doc: FileText, app: AppWindow };
const artifactTone = {
  pdf: "bg-danger-soft text-danger",
  sheet: "bg-success-soft text-success",
  chart: "bg-info-soft text-info",
  dashboard: "bg-primary-soft text-primary",
  doc: "bg-info-soft text-info",
  app: "bg-saffron-soft text-saffron",
};

function StepIcon({ step }: { step: RunStep }) {
  if (step.status === "running") return <Loader2 className="size-3.5 animate-spin text-primary" />;
  if (step.status === "waiting") return <PauseCircle className="size-3.5 text-saffron" />;
  if (step.status === "pending") return <CircleDashed className="size-3.5 text-muted-foreground/60" />;
  if (step.status === "error") return <X className="size-3.5 text-danger" />;
  return <Check className="size-3.5 text-success" />;
}

function StepKindIcon({ step }: { step: RunStep }) {
  if (step.appId && step.kind === "tool") return <AppLogo appId={step.appId} size={18} />;
  const map = { code: Code2, llm: Brain, approval: PauseCircle, auth: KeyRound, plan: ListChecks, kb: FileText, tool: Workflow };
  const Icon = map[step.kind];
  return (
    <span className="flex size-[18px] items-center justify-center rounded-md bg-muted text-muted-foreground">
      <Icon className="size-3" />
    </span>
  );
}

function StepsBlock({ steps }: { steps: RunStep[] }) {
  const done = steps.filter((s) => s.status === "done").length;
  const active = steps.some((s) => s.status === "running" || s.status === "waiting");
  const [open, setOpen] = useState(true);
  const credits = steps.reduce((a, s) => a + (s.credits ?? 0), 0);
  return (
    <div className="rounded-xl border border-border bg-subtle">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-3.5 py-2.5 text-[13px] cursor-pointer">
        {active ? <Loader2 className="size-4 animate-spin text-primary" /> : <Check className="size-4 text-success" />}
        <span className="font-medium">{active ? "Working…" : "Completed"}</span>
        <span className="text-muted-foreground">
          {done}/{steps.length} steps
        </span>
        <span className="ml-auto flex items-center gap-1 text-[12px] text-muted-foreground tabular-nums">
          <Coins className="size-3.5" /> {formatCredits(credits)}
        </span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", !open && "-rotate-90")} />
      </button>
      {open && (
        <ol className="relative flex flex-col gap-0.5 px-3.5 pb-3">
          {steps.map((s, i) => (
            <li key={s.id} className="relative flex items-start gap-2.5 py-1 text-[13px]">
              {i < steps.length - 1 && <span className="absolute left-[6.5px] top-6 h-[calc(100%-12px)] w-px bg-border" />}
              <span className="relative z-10 mt-0.5 bg-subtle">
                <StepIcon step={s} />
              </span>
              <StepKindIcon step={s} />
              <div className="min-w-0 flex-1">
                <span className={cn(s.status === "pending" && "text-muted-foreground")}>{s.label}</span>
                {s.detail && <span className="ml-2 text-[12px] text-muted-foreground">{s.detail}</span>}
              </div>
              {s.durationMs !== undefined && <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{(s.durationMs / 1000).toFixed(1)}s</span>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function PlanBlock({ steps, estimate, actual }: { steps: string[]; estimate: number; actual?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <div className="flex items-center gap-2 text-[13px]">
        <ListChecks className="size-4 text-primary" />
        <span className="font-medium">Plan</span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11.5px] text-muted-foreground tabular-nums">
          <Coins className="size-3" /> est. {formatCredits(estimate)} credits
          {actual !== undefined && <span className="text-foreground"> · actual {formatCredits(actual)}</span>}
        </span>
      </div>
      <ol className="mt-2 flex flex-col gap-1 text-[13px]">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary-soft-foreground">{i + 1}</span>
            <span className="pt-px">{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ConnectBlock({ appId, status }: { appId: string; status: "pending" | "connected" }) {
  const connect = useApp((s) => s.connectApp);
  const app = appById[appId];
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState(false);
  return (
    <div className={cn("flex flex-wrap items-center gap-3 rounded-xl border p-3.5", status === "pending" ? "border-primary/40 bg-primary-soft/40" : "border-border bg-subtle")}>
      <AppLogo appId={appId} size={36} />
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium">{status === "pending" ? `Connect ${app?.name} to continue` : `${app?.name} connected`}</p>
        <p className="text-[12px] text-muted-foreground">
          {status === "pending" ? "Read-only access to reports. Your run is paused — it resumes automatically." : "Run resumed where it left off."}
        </p>
      </div>
      {status === "pending" ? (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              // Live: OAuth / API key / sample data, then come back to this chat (the run resumes on its own).
              if (isLive()) return setDialog(true);
              setLoading(true);
              setTimeout(() => {
                connect(appId);
                toast.success(`${app?.name} connected`);
              }, 900);
            }}
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" /> : <KeyRound />} Connect with OAuth
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={loading}
            onClick={() => {
              setLoading(true);
              setTimeout(() => {
                connect(appId, "workspace");
                toast.success(isLive() ? `${app?.name} connected with sample data` : `Using the workspace ${app?.name} account`);
              }, 600);
            }}
          >
            {isLive() ? "Use sample data" : "Use shared account"}
          </Button>
        </div>
      ) : (
        <Badge variant="success">
          <Check /> Connected
        </Badge>
      )}
      {dialog && <ConnectDialog app={app ?? null} onClose={() => setDialog(false)} returnTo={typeof window !== "undefined" ? window.location.pathname : undefined} />}
    </div>
  );
}

export function ArtifactCard({ artifact }: { artifact: Artifact }) {
  const open = useChatUI((s) => s.open);
  const Icon = artifactIcon[artifact.kind];
  return (
    <button onClick={() => open(artifact)} className="group flex w-full max-w-md items-center gap-3 rounded-xl border border-border bg-card p-3 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-soft cursor-pointer">
      <span className={cn("flex size-11 items-center justify-center rounded-lg", artifactTone[artifact.kind])}>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-medium">{artifact.title}</span>
        <span className="block truncate text-[12px] text-muted-foreground">
          {artifact.subtitle}
          {artifact.size && ` · ${artifact.size}`}
        </span>
      </span>
      <ExternalLink className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

function HardenBlock({ threadId, messageId, workerName, status }: { threadId: string; messageId: string; workerName: string; status: "offered" | "saved" | "dismissed" }) {
  const update = useApp((s) => s.updateMessage);
  const savedWorker = useApp((s) => s.workers.find((w) => w.name === workerName));
  const [open, setOpen] = useState(false);
  const setStatus = (st: "saved" | "dismissed", name?: string) => update(threadId, messageId, (m) => patchBlock(m, "harden", (b) => ({ ...b, status: st, workerName: name ?? b.workerName })));
  if (status === "dismissed") return null;
  if (status === "saved")
    return (
      <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success-soft/50 px-3.5 py-2.5 text-[13px]">
        <Workflow className="size-4 text-success" />
        <span>
          Saved as AI Worker <b>“{workerName}”</b>
          {savedWorker ? ` — ${savedWorker.trigger}.` : " (since deleted)."}
        </span>
        {savedWorker && (
          <Link href={`/workers/${savedWorker.id}`} className="ml-auto shrink-0 font-medium text-primary hover:underline">
            Open in Studio →
          </Link>
        )}
      </div>
    );
  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-r from-primary-soft to-card p-3.5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-medium">Make this a reusable AI Worker?</p>
          <p className="text-[12px] text-muted-foreground">I’ll turn this run into a workflow with a schedule, approvals and tests — cheaper and more reliable next time.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setOpen(true)}>
            <Workflow /> Save as AI Worker
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setStatus("dismissed")}>
            Not now
          </Button>
        </div>
      </div>
      <SaveWorkerDialog open={open} onOpenChange={setOpen} threadId={threadId} defaultName={workerName} onSaved={(_, name) => setStatus("saved", name)} />
    </div>
  );
}

function Block({ block, threadId, messageId, onSuggestion }: { block: ChatBlock; threadId: string; messageId: string; onSuggestion?: (s: string) => void }) {
  switch (block.type) {
    case "text":
      return <Markdown text={block.text} />;
    case "plan":
      return <PlanBlock {...block} />;
    case "steps":
      return <StepsBlock steps={block.steps} />;
    case "connect":
      return <ConnectBlock appId={block.appId} status={block.status} />;
    case "approval":
      return <ApprovalCard approvalId={block.approvalId} compact />;
    case "artifact":
      return <ArtifactCard artifact={block.artifact} />;
    case "harden":
      return <HardenBlock threadId={threadId} messageId={messageId} workerName={block.workerName} status={block.status} />;
    case "sources":
      return (
        <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
          Sources:
          {block.sources.map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-1.5 py-0.5">
              <AppLogo appId={s.appId} size={14} /> {s.title}
            </span>
          ))}
        </div>
      );
    case "suggestions":
      return (
        <div className="flex flex-wrap gap-2">
          {block.items.map((s) => (
            <button key={s} onClick={() => onSuggestion?.(s)} className="rounded-full border border-border bg-card px-3 py-1.5 text-[12.5px] transition-colors hover:border-primary/40 hover:bg-primary-soft cursor-pointer">
              {s}
            </button>
          ))}
        </div>
      );
  }
}

function Feedback({ message }: { message: ChatMessage }) {
  const addMemory = useApp((s) => s.addMemory);
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [correction, setCorrection] = useState("");
  const [saved, setSaved] = useState(false);
  const text = message.blocks.map((b) => (b.type === "text" ? b.text : "")).filter(Boolean).join("\n\n");
  return (
    <div className="mt-2">
      <div className="flex items-center gap-0.5 text-muted-foreground">
        <button
          aria-label="Good answer"
          aria-pressed={vote === "up"}
          title="Good answer"
          onClick={() => {
            setVote("up");
            toast("Thanks — Anvita will keep doing it this way");
          }}
          className={cn("rounded-md p-1.5 hover:bg-muted hover:text-foreground cursor-pointer", vote === "up" && "text-success")}
        >
          <ThumbsUp className="size-3.5" />
        </button>
        <button aria-label="Needs correction" aria-pressed={vote === "down"} title="Needs correction" onClick={() => setVote(vote === "down" ? null : "down")} className={cn("rounded-md p-1.5 hover:bg-muted hover:text-foreground cursor-pointer", vote === "down" && "text-danger")}>
          <ThumbsDown className="size-3.5" />
        </button>
        <button
          aria-label="Copy"
          title="Copy"
          onClick={() => {
            navigator.clipboard?.writeText(text).catch(() => {});
            toast("Copied to clipboard");
          }}
          className="rounded-md p-1.5 hover:bg-muted hover:text-foreground cursor-pointer"
        >
          <Copy className="size-3.5" />
        </button>
      </div>
      {vote === "down" && !saved && (
        <form
          className="mt-2 flex max-w-xl gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!correction.trim()) return;
            addMemory({ scope: "workspace", type: "preference", content: correction.trim() });
            setSaved(true);
            toast.success("Saved to memory — Anvita will apply this next time", { action: { label: "View", onClick: () => (window.location.href = "/memory") } });
          }}
        >
          <input autoFocus value={correction} onChange={(e) => setCorrection(e.target.value)} placeholder="What should Anvita do differently? e.g. “Show amounts in lakhs”" aria-label="Correction" className="h-8 flex-1 rounded-lg border border-border bg-card px-2.5 text-[12.5px] outline-none focus:border-ring/60" />
          <Button size="sm" type="submit" disabled={!correction.trim()}>
            Remember
          </Button>
        </form>
      )}
    </div>
  );
}

export function Message({ message, threadId, onSuggestion }: { message: ChatMessage; threadId: string; onSuggestion?: (s: string) => void }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end gap-3 animate-fade-in">
        <div className="flex max-w-[85%] flex-col items-end gap-1.5">
          <div className="rounded-2xl rounded-tr-md bg-primary px-4 py-2.5 text-[14px] leading-relaxed text-primary-foreground shadow-sm">
            {message.blocks.map((b, i) => (b.type === "text" ? <p key={i} className="whitespace-pre-wrap">{b.text}</p> : null))}
          </div>
          {message.blocks.some((b) => b.type === "artifact") && (
            <div className="flex flex-wrap justify-end gap-1.5">
              {message.blocks.map((b, i) =>
                b.type === "artifact" ? (
                  <span key={i} className="inline-flex max-w-60 items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1 text-[12px]">
                    <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{b.artifact.title}</span>
                    {b.artifact.subtitle && <span className="shrink-0 text-muted-foreground">{b.artifact.subtitle}</span>}
                  </span>
                ) : null,
              )}
            </div>
          )}
        </div>
        <Avatar name={message.author} size={30} className="mt-0.5" />
      </div>
    );
  }
  return (
    <div className="flex gap-3 animate-fade-in">
      <LogoMark size={30} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-2 text-[12.5px]">
          <span className="font-semibold">Anvita</span>
          <span className="text-muted-foreground">{message.time}</span>
          {message.streaming && message.blocks.length === 0 && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Bot className="size-3.5" /> thinking
              <span className="inline-flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="size-1 rounded-full bg-muted-foreground animate-pulse-dot" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </span>
            </span>
          )}
        </div>
        <div className="flex flex-col gap-3">
          {message.blocks.map((b, i) => (
            <Block key={i} block={b} threadId={threadId} messageId={message.id} onSuggestion={onSuggestion} />
          ))}
        </div>
        {!message.streaming && message.blocks.length > 0 && <Feedback message={message} />}
      </div>
    </div>
  );
}
