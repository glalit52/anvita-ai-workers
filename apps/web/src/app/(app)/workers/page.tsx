"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, ExternalLink, MoreHorizontal, Pause, Pin, PinOff, Play, Plus, Search, Sparkles, Trash2, Workflow } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/tabs";
import { AppStack } from "@/components/brand/app-logo";
import { InteractionBadge, WorkerStatusBadge } from "@/components/workers/meta";
import { templates } from "@/lib/mock/workers";
import { useApp } from "@/lib/store";
import { TemplatesGrid } from "@/components/workers/templates-grid";
import { Avatar } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { confirm } from "@/components/ui/confirm";
import type { Worker } from "@/lib/types";
import { cn } from "@/lib/utils";

function WorkerMenu({ w }: { w: Worker }) {
  const router = useRouter();
  const updateWorker = useApp((s) => s.updateWorker);
  const setStatus = useApp((s) => s.setWorkerStatus);
  const duplicate = useApp((s) => s.duplicateWorker);
  const remove = useApp((s) => s.deleteWorker);
  const paused = w.status === "paused" || w.status === "draft";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button onClick={(e) => e.stopPropagation()} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer" aria-label={`Actions for ${w.name}`}>
          <MoreHorizontal className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={() => router.push(`/workers/${w.id}`)}>
          <ExternalLink /> Open in Studio
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            updateWorker(w.id, { pinned: !w.pinned });
            toast(w.pinned ? "Unpinned from sidebar" : "Pinned to sidebar");
          }}
        >
          {w.pinned ? <PinOff /> : <Pin />} {w.pinned ? "Unpin" : "Pin to sidebar"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            const id = duplicate(w.id);
            if (id) toast.success(`Duplicated as “${w.name} (copy)”`, { action: { label: "Open", onClick: () => router.push(`/workers/${id}`) } });
          }}
        >
          <Copy /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            setStatus(w.id, paused ? "live" : "paused");
            toast(paused ? `${w.name} is live` : `${w.name} paused — triggers will queue`);
          }}
        >
          {paused ? <Play /> : <Pause />} {paused ? (w.status === "draft" ? "Publish & go live" : "Resume") : "Pause"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-danger [&_svg]:text-danger"
          onSelect={async () => {
            if (await confirm({ title: `Delete “${w.name}”?`, description: "Its workflow, versions and test cases will be removed. Run history stays in the audit log.", confirmLabel: "Delete Worker", danger: true })) {
              remove(w.id);
              toast(`Deleted ${w.name}`);
            }
          }}
        >
          <Trash2 /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function WorkersPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"mine" | "templates">("mine");
  const [filter, setFilter] = useState<"all" | "live" | "draft">("all");
  const [q, setQ] = useState("");
  const workers = useApp((s) => s.workers);
  const counts = {
    all: workers.length,
    live: workers.filter((w) => w.status === "live" || w.status === "canary").length,
    draft: workers.filter((w) => w.status === "draft" || w.status === "paused").length,
  };
  const list = workers
    .filter((w) => (filter === "all" ? true : filter === "live" ? w.status === "live" || w.status === "canary" : w.status === "draft" || w.status === "paused"))
    .filter((w) => (w.name + " " + w.description).toLowerCase().includes(q.toLowerCase()));

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
        {tab === "mine" && (
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: `All ${counts.all}` },
              { value: "live", label: `Live ${counts.live}` },
              { value: "draft", label: `Drafts & paused ${counts.draft}` },
            ]}
          />
        )}
        {tab === "mine" && (
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Workers" aria-label="Search Workers" className="h-9 w-full rounded-lg border border-border bg-card pl-8 pr-3 text-[13px] outline-none focus:border-ring/60" />
          </div>
        )}
      </div>

      {tab === "mine" ? (
        <>
          {list.length === 0 && workers.length > 0 && (
            <div className="mt-6">
              <EmptyState icon={<Search />} title="No Workers match" description="Try a different search or filter." />
            </div>
          )}
          {workers.length === 0 && (
            <div className="mt-6">
              <EmptyState icon={<Workflow />} title="No AI Workers yet" description="Create one from a template, a description, or a chat that went well." action={<Button asChild size="sm"><Link href="/workers/new">Create AI Worker</Link></Button>} />
            </div>
          )}
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {list.map((w) => (
              <div
                key={w.id}
                role="link"
                tabIndex={0}
                onClick={() => router.push(`/workers/${w.id}`)}
                onKeyDown={(e) => e.key === "Enter" && router.push(`/workers/${w.id}`)}
                className="group flex cursor-pointer flex-col rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-pop"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-11 items-center justify-center rounded-xl text-[22px]" style={{ background: w.color + "1f" }}>
                    {w.emoji}
                  </span>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {w.pinned && <Pin className="size-3.5 text-primary" aria-label="Pinned" />}
                    <WorkerStatusBadge status={w.status} />
                    <Badge variant="outline">v{w.version}</Badge>
                    <WorkerMenu w={w} />
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
              </div>
            ))}
            <Link href="/workers/new" className={cn("flex min-h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border p-5 text-center text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground", list.length === 0 && "hidden")}>
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Plus className="size-5" />
              </span>
              <p className="text-[14px] font-medium">Create an AI Worker</p>
              <p className="max-w-56 text-[12.5px]">From a template, a description, or one of your successful chats.</p>
            </Link>
          </div>
        </>
      ) : (
        <TemplatesGrid />
      )}
    </PageContainer>
  );
}
