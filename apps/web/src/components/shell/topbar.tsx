"use client";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Bell, CheckCheck, Coins, LogOut, Menu, Monitor, Moon, PenSquare, Search, Settings, Sun, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/misc";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useApp } from "@/lib/store";
import { currentUser, workspace } from "@/lib/mock/workspace";
import { formatCredits } from "@/lib/utils";
import { AppLogo } from "@/components/brand/app-logo";

const notifications = [
  { id: 1, appId: "razorpay", title: "Refund ₹6,499 needs your approval", meta: "Customer Support · 9 min ago", href: "/approvals" },
  { id: 2, appId: "gdrive", title: "Finance SOPs sync failed — permission revoked", meta: "Knowledge · 3 h ago", href: "/knowledge" },
  { id: 3, appId: "sandbox", title: "Weekly Growth Report delivered to #growth", meta: "Worker run · Mon 09:02", href: "/workers/growth-report" },
  { id: 4, appId: "delhivery", title: "Delhivery MCP server is returning errors", meta: "Integrations · 5 h ago", href: "/integrations" },
];

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { setTheme, theme } = useTheme();
  const creditsUsed = useApp((s) => s.creditsUsed);
  const setCommandOpen = useApp((s) => s.setCommandOpen);
  const pct = (creditsUsed / workspace.creditsTotal) * 100;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur md:px-5">
      <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu />
      </Button>

      <button
        onClick={() => setCommandOpen(true)}
        className="flex h-9 w-full max-w-md items-center gap-2 rounded-lg border border-border bg-card px-3 text-[13px] text-muted-foreground shadow-sm transition-colors hover:bg-subtle cursor-pointer"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Search or ask Anvita…</span>
        <span className="hidden items-center gap-0.5 sm:flex">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <Popover>
          <PopoverTrigger asChild>
            <button className="hidden h-9 items-center gap-2 rounded-lg px-2.5 text-[13px] hover:bg-muted md:flex cursor-pointer">
              <Coins className="size-4 text-saffron" />
              <span className="tabular-nums font-medium">{formatCredits(workspace.creditsTotal - creditsUsed)}</span>
              <span className="text-muted-foreground">credits</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4">
            <p className="text-[13px] font-semibold">Credits this cycle</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">Renews {workspace.renewsOn} · {workspace.plan} plan</p>
            <Progress value={pct} className="mt-3" tone={pct > 80 ? "warning" : "primary"} />
            <div className="mt-2 flex justify-between text-[12px] tabular-nums">
              <span>{formatCredits(creditsUsed)} used</span>
              <span className="text-muted-foreground">{formatCredits(workspace.creditsTotal)}</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
              {[["Agent", "35%"], ["Workers", "55%"], ["Voice", "10%"]].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-muted py-1.5">
                  <div className="font-semibold">{v}</div>
                  <div className="text-muted-foreground">{k}</div>
                </div>
              ))}
            </div>
            <Button asChild size="sm" variant="outline" className="mt-3 w-full">
              <Link href="/settings/billing">Manage billing</Link>
            </Button>
          </PopoverContent>
        </Popover>

        <Button asChild variant="ghost" size="icon-sm" aria-label="New chat">
          <Link href="/chat">
            <PenSquare />
          </Link>
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="relative" aria-label="Notifications">
              <Bell />
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-saffron ring-2 ring-background" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-[13px] font-semibold">Notifications</p>
              <button className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground cursor-pointer">
                <CheckCheck className="size-3.5" /> Mark all read
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto p-1.5">
              {notifications.map((n) => (
                <Link key={n.id} href={n.href} className="flex gap-3 rounded-lg p-2.5 hover:bg-muted">
                  <AppLogo appId={n.appId} size={28} />
                  <div className="min-w-0">
                    <p className="text-[13px] leading-snug">{n.title}</p>
                    <p className="mt-0.5 text-[11.5px] text-muted-foreground">{n.meta}</p>
                  </div>
                </Link>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 rounded-full cursor-pointer" aria-label="Account menu">
              <Avatar name={currentUser.name} size={30} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-60">
            <div className="px-2 py-2">
              <p className="text-[13px] font-medium">{currentUser.name}</p>
              <p className="text-[12px] text-muted-foreground">{currentUser.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/memory">
                <User /> What Anvita knows about me
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings/members">
                <Settings /> Workspace settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Theme</DropdownMenuLabel>
            <div className="grid grid-cols-3 gap-1 px-1 pb-1">
              {[
                { v: "light", icon: Sun },
                { v: "dark", icon: Moon },
                { v: "system", icon: Monitor },
              ].map(({ v, icon: Icon }) => (
                <button
                  key={v}
                  onClick={() => setTheme(v)}
                  className={`flex flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] capitalize cursor-pointer ${theme === v ? "bg-primary-soft text-primary-soft-foreground" : "hover:bg-muted"}`}
                >
                  <Icon className="size-4" />
                  {v}
                </button>
              ))}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/login">
                <LogOut /> Sign out
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
