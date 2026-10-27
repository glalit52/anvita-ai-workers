"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock, Headset, Lightbulb, Sparkles, TriangleAlert, Workflow, Zap } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip as RTooltip, XAxis } from "recharts";
import { PageContainer } from "@/components/shell/app-shell";
import { Composer } from "@/components/chat/composer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Stat, StatusDot } from "@/components/ui/misc";
import { AppLogo, AppStack } from "@/components/brand/app-logo";
import { useApp } from "@/lib/store";
import { runAgent } from "@/lib/simulate";
import { workers, runs } from "@/lib/mock/workers";
import { inbox, usageDaily } from "@/lib/mock/workspace";
import { formatCredits } from "@/lib/utils";

const quickPrompts = [
  "Compare last week's ad spend with HubSpot deals and make a PDF",
  "Why did RTO go up in Tamil Nadu this month? Make a chart",
  "Reconcile September GST purchase register and list mismatches",
  "Research our top 5 competitors' Diwali pricing into a sheet",
];

const suggestions = [
  { id: 1, title: "Auto-reply to “where is my order” in #support", evidence: "Rahul answered this 46 times last week using Shopify + Delhivery", apps: ["slack", "shopify", "delhivery"], saving: "~6 h/week" },
  { id: 2, title: "Monthly GST reconciliation on the 14th", evidence: "You asked for this in Sep and Aug with the same steps", apps: ["tally", "gdrive"], saving: "~4 h/month" },
  { id: 3, title: "Chase overdue B2B invoices on WhatsApp", evidence: "₹18.4L overdue > 30 days across 22 corporate clients in Tally", apps: ["tally", "whatsapp", "razorpay"], saving: "₹ cash-flow" },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function HomePage() {
  const router = useRouter();
  const createThread = useApp((s) => s.createThread);
  const allApprovals = useApp((s) => s.approvals);
  const approvals = allApprovals.filter((a) => a.status === "pending");
  const status = useApp((s) => s.workerStatus);

  const ask = (text: string) => {
    const id = createThread(text.length > 48 ? text.slice(0, 46) + "…" : text);
    runAgent(id, text);
    router.push(`/chat/${id}`);
  };

  return (
    <PageContainer>
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card px-5 py-8 shadow-soft md:px-10 md:py-10">
        <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 size-60 rounded-full bg-saffron/15 blur-3xl" />
        <div className="relative mx-auto max-w-3xl">
          <p className="text-[13px] font-medium text-muted-foreground" suppressHydrationWarning>
            {greeting()}, Priya 👋
          </p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-balance md:text-[30px]">What should Anvita take off your plate today?</h1>
          <Composer className="mt-5" size="lg" onSubmit={ask} autoFocus />
          <div className="mt-3 flex flex-wrap gap-2">
            {quickPrompts.map((p) => (
              <button key={p} onClick={() => ask(p)} className="rounded-full border border-border bg-subtle px-3 py-1.5 text-[12.5px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground cursor-pointer">
                {p}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Hours saved · 30 days" value="970 h" delta={{ value: "+18%", positive: true }} hint="≈ 6 full-time teammates" />
        <Stat label="Tasks completed" value="20,982" delta={{ value: "+11%", positive: true }} hint="Agent 1,340 · Workers 19,642" />
        <Stat label="Automation rate" value="83%" delta={{ value: "+2.1 pts", positive: true }} hint="Resolved without a human" />
        <Stat label="Credits used" value={formatCredits(128450)} hint="64% of monthly plan · ₹0.42 per task" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Needs your attention</CardTitle>
              <p className="text-[12.5px] text-muted-foreground">Approvals, handoffs and issues waiting on people</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/approvals">
                View all <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {approvals.slice(0, 3).map((a) => (
              <Link key={a.id} href="/approvals" className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-subtle">
                <AppLogo appId={a.appId} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium">{a.title}</p>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {a.requestedBy.name} · {a.createdAt} · expires in {a.expiresIn}
                  </p>
                </div>
                <Badge variant={a.risk === "high" ? "danger" : a.risk === "medium" ? "warning" : "default"}>{a.risk} risk</Badge>
                <Badge variant="saffron">Approve</Badge>
              </Link>
            ))}
            {inbox.slice(0, 1).map((c) => (
              <Link key={c.id} href="/inbox" className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-subtle">
                <span className="flex size-8 items-center justify-center rounded-lg bg-info-soft text-info">
                  <Headset className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium">
                    {c.customer} handed off by {c.worker}
                  </p>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {c.reason} · waiting {c.waiting}
                  </p>
                </div>
                <Badge variant="info">Take over</Badge>
              </Link>
            ))}
            <Link href="/integrations" className="flex items-center gap-3 rounded-xl border border-danger/30 bg-danger-soft/40 p-3 transition-colors hover:bg-danger-soft">
              <span className="flex size-8 items-center justify-center rounded-lg bg-danger-soft text-danger">
                <TriangleAlert className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium">Delhivery integration is failing</p>
                <p className="truncate text-[12px] text-muted-foreground">Customer Support can’t fetch tracking — falling back to Shopify status</p>
              </div>
              <Badge variant="danger">Fix</Badge>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Work done by Anvita</CardTitle>
            <p className="text-[12.5px] text-muted-foreground">Runs per day, last 30 days</p>
          </CardHeader>
          <CardContent>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usageDaily} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="runsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" hide />
                  <RTooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }} />
                  <Area type="monotone" dataKey="runs" stroke="var(--primary)" strokeWidth={2} fill="url(#runsFill)" name="Runs" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                { icon: Zap, label: "Avg. task", value: "38 s" },
                { icon: Clock, label: "Approval wait", value: "11 min" },
                { icon: Workflow, label: "Live Workers", value: "4" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-xl bg-muted/60 py-2">
                  <Icon className="mx-auto size-4 text-muted-foreground" />
                  <p className="mt-1 text-[14px] font-semibold">{value}</p>
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <section id="suggestions" className="mt-6 scroll-mt-20">
        <div className="mb-3 flex items-center gap-2">
          <Lightbulb className="size-4 text-saffron" />
          <h2 className="text-[15px] font-semibold">Anvita noticed repeated work</h2>
          <Badge variant="saffron">3 new</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {suggestions.map((s) => (
            <Card key={s.id} className="flex flex-col p-4">
              <div className="flex items-center justify-between">
                <AppStack apps={s.apps} size={22} />
                <Badge variant="success">{s.saving}</Badge>
              </div>
              <p className="mt-3 text-[14px] font-medium leading-snug">{s.title}</p>
              <p className="mt-1 flex-1 text-[12.5px] text-muted-foreground">{s.evidence}</p>
              <div className="mt-4 flex gap-2">
                <Button asChild size="sm" className="flex-1">
                  <Link href="/workers/new?from=suggestion">
                    <Sparkles /> Automate it
                  </Link>
                </Button>
                <Button size="sm" variant="ghost">
                  Not now
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>AI Workers</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/workers">
                All Workers <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border">
            {workers.slice(0, 5).map((w) => (
              <Link key={w.id} href={`/workers/${w.id}`} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="flex size-9 items-center justify-center rounded-xl text-lg" style={{ background: w.color + "1f" }}>
                  {w.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium">{w.name}</p>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {w.trigger} · last run {w.lastRun}
                  </p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-[13px] font-medium tabular-nums">{w.runs30d.toLocaleString("en-IN")}</p>
                  <p className="text-[11px] text-muted-foreground">runs / 30d</p>
                </div>
                <StatusDot tone={status[w.id] === "live" ? "success" : status[w.id] === "canary" ? "warning" : "muted"} pulse={status[w.id] === "live"} />
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Live activity</CardTitle>
            <Badge variant="success">
              <StatusDot tone="success" pulse /> streaming
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {runs.slice(0, 6).map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-lg px-1 py-1.5 text-[13px]">
                <span className="w-16 shrink-0 font-mono text-[11.5px] text-muted-foreground">{r.startedAt}</span>
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{r.worker}</span> <span className="text-muted-foreground">· {r.trigger}</span>
                </span>
                <Badge variant={r.status === "succeeded" ? "success" : r.status === "failed" ? "danger" : r.status === "running" ? "info" : "warning"}>
                  {r.status.replace("_", " ")}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
