"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe, Loader2, PauseCircle, Pin, Plus, Search } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { AppLogo } from "@/components/brand/app-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Thread } from "@/lib/types";
import { ThreadMenu } from "./thread-actions";

function ChannelIcon({ t }: { t: Thread }) {
  if (t.channel === "web") return <span className="flex size-[18px] items-center justify-center rounded-md bg-muted text-muted-foreground"><Globe className="size-3" /></span>;
  return <AppLogo appId={t.channel} size={18} />;
}

function Row({ t }: { t: Thread }) {
  const pathname = usePathname();
  const active = pathname === `/chat/${t.id}`;
  return (
    <Link href={`/chat/${t.id}`} className={cn("group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors hover:bg-card", active && "bg-card shadow-sm ring-1 ring-border")}>
      <ChannelIcon t={t} />
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate", active ? "font-medium" : "")}>{t.title}</span>
        <span className="block truncate text-[11.5px] text-muted-foreground">
          {t.channelLabel ?? "Web"} · {t.updatedAt}
        </span>
      </span>
      {t.status === "running" && <Loader2 className="size-3.5 animate-spin text-primary" />}
      {t.status === "waiting" && <PauseCircle className="size-3.5 text-saffron" />}
      <ThreadMenu thread={t} className="opacity-100 focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100" />
    </Link>
  );
}

export function ThreadList() {
  const threads = useApp((s) => s.threads);
  const [q, setQ] = useState("");
  const filtered = threads.filter((t) => t.title.toLowerCase().includes(q.toLowerCase()));
  const pinned = filtered.filter((t) => t.pinned);
  const rest = filtered.filter((t) => !t.pinned);

  return (
    <div className="flex h-full flex-col gap-3 bg-sidebar p-3">
      <Button asChild className="w-full justify-start">
        <Link href="/chat">
          <Plus /> New task
        </Link>
      </Button>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats" className="h-8 w-full rounded-lg border border-border bg-card pl-8 pr-2 text-[12.5px] outline-none focus:border-ring/60" />
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {pinned.length > 0 && (
          <>
            <p className="flex items-center gap-1 px-2.5 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
              <Pin className="size-3" /> Pinned
            </p>
            {pinned.map((t) => <Row key={t.id} t={t} />)}
          </>
        )}
        <p className="px-2.5 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">Recent</p>
        {rest.map((t) => <Row key={t.id} t={t} />)}
        {filtered.length === 0 && <p className="px-2.5 py-6 text-center text-[12.5px] text-muted-foreground">{q ? "No chats match" : "No chats yet"}</p>}
      </div>
      <div className="rounded-xl border border-border bg-card p-3 text-[12px] text-muted-foreground">
        Chats from <b className="text-foreground">Slack, WhatsApp & Teams</b> appear here too — same Anvita, same memory.
      </div>
    </div>
  );
}
