"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsUpDown, CircleHelp, Plus, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { useApp, useSetting } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { workspace } from "@/lib/mock/workspace";
import { cn } from "@/lib/utils";
import { buildNav, mainNav, settingsNav, type NavItem } from "./nav";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { StatusDot } from "@/components/ui/misc";

import { inbox as seedInbox } from "@/lib/mock/workspace";
import type { InboxState } from "@/lib/store";

function inboxCount(state: InboxState) {
  return seedInbox.filter((c) => !state[c.id]?.resolved).length;
}

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const pending = useApp((s) => s.approvals.filter((a) => a.status === "pending").length);
  const handoffs = useApp((s) => inboxCount(s.inboxState));
  const t = useT();
  const active = pathname === item.href || pathname.startsWith(item.href + "/") || (item.href.startsWith("/settings") && pathname.startsWith("/settings"));
  const badge = item.badge === "approvals" ? pending : item.badge === "inbox" ? handoffs : 0;
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13.5px] font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground",
        active && "bg-card text-foreground shadow-sm ring-1 ring-border",
      )}
    >
      <Icon className={cn("size-[17px]", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
      <span className="flex-1">{t(item.tkey)}</span>
      {badge > 0 && (
        <span className={cn("rounded-full px-1.5 text-[11px] font-semibold tabular-nums", item.badge === "approvals" ? "bg-saffron text-white" : "bg-primary text-primary-foreground")}>
          {badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const workers = useApp((s) => s.workers);
  const [wsName] = useSetting("workspace.name", workspace.name);
  const [wsRegion] = useSetting("workspace.region", workspace.region);
  const t = useT();
  const pinned = workers.filter((w) => w.pinned);
  return (
    <aside className="flex h-full w-full flex-col gap-4 bg-sidebar px-3 py-3">
      <div className="flex items-center justify-between px-1">
        <Link href="/home" onClick={onNavigate}>
          <Logo />
        </Link>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-card px-2.5 py-2 text-left shadow-sm transition-colors hover:bg-subtle cursor-pointer">
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 text-sm font-bold text-white">{(wsName || "W").slice(0, 1).toUpperCase()}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold">{wsName}</span>
              <span className="block truncate text-[11.5px] text-muted-foreground">{workspace.plan} · {wsRegion}</span>
            </span>
            <ChevronsUpDown className="size-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuItem>
            <span className="flex size-5 items-center justify-center rounded bg-gradient-to-br from-amber-400 to-orange-600 text-[10px] font-bold text-white">K</span>
            {wsName} <span className="ml-auto text-[11px] text-muted-foreground">current</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <span className="flex size-5 items-center justify-center rounded bg-gradient-to-br from-sky-400 to-indigo-600 text-[10px] font-bold text-white">K</span>
            Kesar Exports (EU region)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Plus /> Create workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <nav className="flex flex-col gap-0.5">
        {mainNav.map((i) => (
          <NavLink key={i.href} item={i} onNavigate={onNavigate} />
        ))}
      </nav>

      <div>
        <p className="px-2.5 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">{t("nav.build")}</p>
        <nav className="flex flex-col gap-0.5">
          {buildNav.map((i) => (
            <NavLink key={i.href} item={i} onNavigate={onNavigate} />
          ))}
        </nav>
      </div>

      <div>
        <div className="flex items-center justify-between px-2.5 pb-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">{t("nav.pinned")}</p>
          <Link href="/workers/new" onClick={onNavigate} className="rounded p-0.5 text-muted-foreground hover:bg-card hover:text-foreground" aria-label="New worker">
            <Plus className="size-3.5" />
          </Link>
        </div>
        <div className="flex flex-col gap-0.5">
          {pinned.map((w) => (
            <Link key={w.id} href={`/workers/${w.id}`} onClick={onNavigate} className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] text-muted-foreground hover:bg-card hover:text-foreground">
              <span className="text-[15px] leading-none">{w.emoji}</span>
              <span className="flex-1 truncate">{w.name}</span>
              <StatusDot tone={w.status === "live" ? "success" : w.status === "canary" ? "warning" : "muted"} />
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
          <div className="flex items-center gap-2 text-[13px] font-medium">
            <Sparkles className="size-4 text-saffron" /> {t("suggestions.card")}
          </div>
          <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{t("suggestions.cardSub")}</p>
          <Link href="/home#suggestions" onClick={onNavigate} className="mt-2 inline-block text-[12px] font-medium text-primary hover:underline">
            {t("suggestions.review")}
          </Link>
        </div>
        <nav className="flex flex-col gap-0.5">
          <NavLink item={settingsNav} onNavigate={onNavigate} />
          <Link href="/help" onClick={onNavigate} className="flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13.5px] font-medium text-muted-foreground hover:bg-card hover:text-foreground">
            <CircleHelp className="size-[17px]" /> {t("nav.help")}
          </Link>
        </nav>
      </div>
    </aside>
  );
}
