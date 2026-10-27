"use client";
import Link from "next/link";
import { useState } from "react";
import { Plus, Search, Sparkles } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/tabs";
import { AppStack } from "@/components/brand/app-logo";
import { InteractionBadge, WorkerStatusBadge } from "@/components/workers/meta";
import { workers, templates } from "@/lib/mock/workers";
import { useApp } from "@/lib/store";
import { TemplatesGrid } from "@/components/workers/templates-grid";
import { Avatar } from "@/components/ui/avatar";

export default function WorkersPage() {
  const [tab, setTab] = useState<"mine" | "templates">("mine");
  const [filter, setFilter] = useState<"all" | "live" | "draft">("all");
  const [q, setQ] = useState("");
  const status = useApp((s) => s.workerStatus);
  const list = workers
    .map((w) => ({ ...w, status: status[w.id] ?? w.status }))
    .filter((w) => (filter === "all" ? true : filter === "live" ? w.status === "live" || w.status === "canary" : w.status === "draft" || w.status === "paused"))
    .filter((w) => w.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <PageContainer>
      <PageHeader
        title="AI Workers"
        description="Reliable, governed automations — built from templates, plain language or your best chats."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/workers/new?mode=describe">
                <Sparkles /> Describe a Worker
              </Link>
            </Button>
            <Button asChild>
              <Link href="/workers/new">
                <Plus /> New AI Worker
              </Link>
            </Button>
          </>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Segmented value={tab} onChange={setTab} options={[{ value: "mine", label: `My Workers (${workers.length})` }, { value: "templates", label: `Templates (${templates.length})` }]} />
        {tab === "mine" && <Segmented value={filter} onChange={setFilter} options={[{ value: "all", label: "All" }, { value: "live", label: "Live" }, { value: "draft", label: "Drafts & paused" }]} />}
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Workers" className="h-9 w-full rounded-lg border border-border bg-card pl-8 pr-3 text-[13px] outline-none focus:border-ring/60" />
        </div>
      </div>

      {tab === "mine" ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((w) => (
            <Link key={w.id} href={w.interaction === "queue" ? `/workers/${w.id}` : `/workers/${w.id}`} className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-pop">
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl text-[22px]" style={{ background: w.color + "1f" }}>
                  {w.emoji}
                </span>
                <div className="flex flex-wrap justify-end gap-1.5">
                  <WorkerStatusBadge status={w.status} />
                  <Badge variant="outline">v{w.version}</Badge>
                </div>
              </div>
              <p className="mt-3 text-[15px] font-semibold">{w.name}</p>
              <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">{w.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <InteractionBadge type={w.interaction} />
                <span className="text-[12px] text-muted-foreground">{w.trigger}</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4">
                {[
                  ["Runs / 30d", w.runs30d.toLocaleString("en-IN")],
                  ["Success", w.successRate ? `${w.successRate}%` : "—"],
                  ["Hours saved", w.hoursSaved30d ? `${w.hoursSaved30d} h` : "—"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-[14px] font-semibold tabular-nums">{v}</p>
                    <p className="text-[11px] text-muted-foreground">{k}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <AppStack apps={w.apps} size={22} />
                <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <Avatar name={w.owner} size={18} /> {w.owner.split(" ")[0]}
                </span>
              </div>
            </Link>
          ))}
          <Link href="/workers/new" className="flex min-h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border p-5 text-center text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Plus className="size-5" />
            </span>
            <p className="text-[14px] font-medium">Create an AI Worker</p>
            <p className="max-w-56 text-[12.5px]">From a template, a description, or one of your successful chats.</p>
          </Link>
        </div>
      ) : (
        <TemplatesGrid />
      )}
    </PageContainer>
  );
}
