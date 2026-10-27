"use client";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, BookOpen, FlaskConical, GitBranch, History, Inbox, LayoutGrid, Pause, Pin, PinOff, Play, Rocket, Settings, Share2, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { useApp, useWorker } from "@/lib/store";
import { Tooltip } from "@/components/ui/tooltip";
import { useHydrated } from "@/components/workers/use-hydrated";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { AppStack } from "@/components/brand/app-logo";
import { InteractionBadge, WorkerStatusBadge } from "@/components/workers/meta";
import { Builder } from "@/components/studio/builder";
import { AccessTab, KnowledgeTab, OverviewTab, RunsTab, SettingsTab, TestTab, VersionsTab } from "@/components/studio/tabs";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "build", label: "Build", icon: Workflow },
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "test", label: "Test & evals", icon: FlaskConical },
  { id: "runs", label: "Runs", icon: History },
  { id: "knowledge", label: "Knowledge", icon: BookOpen },
  { id: "access", label: "Tools & access", icon: ShieldCheck },
  { id: "versions", label: "Versions", icon: GitBranch },
  { id: "settings", label: "Settings", icon: Settings },
] as const;
type TabId = (typeof tabs)[number]["id"];

function WorkerStudio() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const worker = useWorker(id);
  const setStatus = useApp((s) => s.setWorkerStatus);
  const updateWorker = useApp((s) => s.updateWorker);
  const pendingQueue = useApp((s) => s.queueItems.filter((q) => q.status === "needs_review").length);
  const [tab, setTab] = useState<TabId>((params.get("tab") as TabId) || "build");
  const status = worker?.status;
  const hydrated = useHydrated();

  if (!hydrated)
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );

  if (!worker)
    return (
      <div className="p-10">
        <EmptyState icon={<Workflow />} title="Worker not found" description="It may have been deleted, or the link is from another workspace." action={<Button asChild size="sm"><Link href="/workers">Back to Workers</Link></Button>} />
      </div>
    );

  const fromTemplate = params.get("template");
  const fromAutopilot = params.get("autopilot");

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-card px-4 pt-3 md:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/workers" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Back">
            <ArrowLeft className="size-4" />
          </Link>
          <span className="flex size-10 items-center justify-center rounded-xl text-xl" style={{ background: worker.color + "1f" }}>
            {worker.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-[17px] font-semibold tracking-tight">{worker.name}</h1>
              <WorkerStatusBadge status={status ?? worker.status} />
              <Badge variant="outline">{worker.version > 0 ? `v${worker.version} · draft v${worker.version + 1}` : "Unpublished draft"}</Badge>
              <InteractionBadge type={worker.interaction} />
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
              <AppStack apps={worker.apps} size={16} max={6} />
              <span>{worker.channels.join(" · ")}</span>
              <span>· owner {worker.owner}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {worker.interaction === "queue" && (
              <Button asChild size="sm" variant="outline">
                <Link href={`/workers/${worker.id}/queue`}>
                  <Inbox /> Work queue {pendingQueue > 0 && <Badge variant="saffron">{pendingQueue}</Badge>}
                </Link>
              </Button>
            )}
            <Tooltip content={worker.pinned ? "Unpin from sidebar" : "Pin to sidebar"}>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={worker.pinned ? "Unpin" : "Pin"}
                onClick={() => {
                  updateWorker(worker.id, { pinned: !worker.pinned });
                  toast(worker.pinned ? "Unpinned from sidebar" : "Pinned to sidebar");
                }}
              >
                {worker.pinned ? <PinOff /> : <Pin />}
              </Button>
            </Tooltip>
            <Tooltip content="Copy link">
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Share"
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.origin + `/workers/${worker.id}`).catch(() => {});
                  toast.success("Link copied — workspace members with access can open it");
                }}
              >
                <Share2 />
              </Button>
            </Tooltip>
            {status === "paused" || status === "draft" ? (
              <Button size="sm" variant="outline" onClick={() => { setStatus(worker.id, "live"); if (worker.version === 0) updateWorker(worker.id, { version: 1 }); toast.success(`${worker.name} is live`); }}>
                <Play /> {status === "draft" ? "Go live" : "Resume"}
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => { setStatus(worker.id, "paused"); toast(`${worker.name} paused — triggers will queue`); }}>
                <Pause /> Pause
              </Button>
            )}
            <Button size="sm" onClick={() => setTab("versions")}>
              <Rocket /> Publish
            </Button>
          </div>
        </div>
        {(fromTemplate || fromAutopilot) && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-primary-soft px-3 py-2 text-[12.5px] text-primary-soft-foreground">
            <Sparkles className="size-4" />
            {fromAutopilot ? "Autopilot generated this draft from your description. Review the steps, connect apps and run the tests before publishing." : "Created from template. Connect your apps and knowledge, then run the eval suite."}
          </div>
        )}
        <div className="-mb-px mt-3 flex gap-1 overflow-x-auto scrollbar-thin">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium transition-colors cursor-pointer",
                tab === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <t.icon className="size-3.5" /> {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className={cn("min-h-0 flex-1", tab === "build" ? "" : "overflow-y-auto")}>
        {tab === "build" && <Builder key={worker.id} worker={worker} />}
        {tab === "overview" && <OverviewTab worker={worker} />}
        {tab === "test" && <TestTab worker={worker} />}
        {tab === "runs" && <RunsTab worker={worker} />}
        {tab === "knowledge" && <KnowledgeTab worker={worker} />}
        {tab === "access" && <AccessTab worker={worker} />}
        {tab === "versions" && <VersionsTab worker={worker} />}
        {tab === "settings" && <SettingsTab worker={worker} />}
      </div>
    </div>
  );
}

export default function WorkerPage() {
  return (
    <Suspense>
      <WorkerStudio />
    </Suspense>
  );
}
