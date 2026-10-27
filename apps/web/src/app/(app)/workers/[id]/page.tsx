"use client";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, BookOpen, FlaskConical, GitBranch, History, Inbox, LayoutGrid, Pause, Play, Rocket, Settings, Share2, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { workerById } from "@/lib/mock/workers";
import { useApp } from "@/lib/store";
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
  const worker = workerById[id];
  const status = useApp((s) => s.workerStatus[id]);
  const setStatus = useApp((s) => s.setWorkerStatus);
  const [tab, setTab] = useState<TabId>("build");

  if (!worker)
    return (
      <div className="p-10">
        <EmptyState icon={<Workflow />} title="Worker not found" description="It may have been deleted." action={<Button asChild size="sm"><Link href="/workers">Back to Workers</Link></Button>} />
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
              <Badge variant="outline">v{worker.version} · draft v{worker.version + 1}</Badge>
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
                  <Inbox /> Work queue <Badge variant="saffron">2</Badge>
                </Link>
              </Button>
            )}
            <Button size="sm" variant="ghost" aria-label="Share">
              <Share2 />
            </Button>
            {status === "paused" || status === "draft" ? (
              <Button size="sm" variant="outline" onClick={() => { setStatus(worker.id, "live"); toast.success(`${worker.name} is live`); }}>
                <Play /> Resume
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
        {tab === "build" && <Builder worker={worker} />}
        {tab === "overview" && <OverviewTab worker={worker} />}
        {tab === "test" && <TestTab worker={worker} />}
        {tab === "runs" && <RunsTab worker={worker} />}
        {tab === "knowledge" && <KnowledgeTab />}
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
