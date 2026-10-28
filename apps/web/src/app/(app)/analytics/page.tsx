"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChartColumn, Download } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageContainer } from "@/components/shell/app-shell";
import { EmptyState, PageHeader, Stat } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Segmented } from "@/components/ui/tabs";
import { Select } from "@/components/ui/input";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { useApp } from "@/lib/store";
import { agentShareByTeam, teamMembers, usage90 as demoUsage90, workerTeam, type DailyUsage } from "@/lib/mock/analytics";
import { get, isLive } from "@/lib/api";
import { downloadCSV } from "@/lib/download";
import { formatCredits } from "@/lib/utils";

const tooltipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12, color: "var(--foreground)" };
const axisTick = { fontSize: 11, fill: "var(--muted-foreground)" };
const RUPEES_PER_CREDIT = 0.045;

type Range = "7" | "30" | "90";
type SeriesKey = "workers" | "agent" | "voice";

const allSeries: { key: SeriesKey; label: string; color: string }[] = [
  { key: "workers", label: "AI Workers", color: "var(--series-1)" },
  { key: "agent", label: "Ask Anvita", color: "var(--series-2)" },
  { key: "voice", label: "Voice", color: "var(--series-3)" },
];

function pctDelta(cur: number, prev: number | null, invert = false) {
  if (prev === null || prev === 0) return undefined;
  const d = ((cur - prev) / prev) * 100;
  const sign = d >= 0 ? "+" : "−";
  return { value: `${sign}${Math.abs(d).toFixed(0)}%`, positive: invert ? d <= 0 : d >= 0 };
}

interface Overview {
  byDay: { day: string; runs: number; agent: number; workers: number; automated: number }[];
  byMember: { name: string; runs: number; credits: number; succeeded: number }[];
  byWorker: { workerId: string; name: string; runs: number; succeeded: number; credits: number }[];
}

/** Live mode: 90 days of real usage, shaped like the demo series. */
function useLiveUsage(days: number) {
  const [series, setSeries] = useState<DailyUsage[] | null>(null);
  const [period, setPeriod] = useState<Overview | null>(null);
  useEffect(() => {
    if (!isLive()) return;
    get<Overview>("/analytics/overview?days=90")
      .then((o) => {
        const map = new Map(o.byDay.map((d) => [d.day, d]));
        setSeries(
          Array.from({ length: 90 }, (_, i) => {
            const date = new Date(Date.now() - (89 - i) * 86400_000);
            const d = map.get(date.toISOString().slice(0, 10));
            return { day: date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), agent: d?.agent ?? 0, workers: d?.workers ?? 0, voice: 0, runs: d?.runs ?? 0, automated: d && d.runs ? Math.round((d.automated / d.runs) * 100) : 0 };
          }),
        );
      })
      .catch(() => setSeries([]));
  }, []);
  useEffect(() => {
    if (!isLive()) return;
    get<Overview>(`/analytics/overview?days=${days}`).then(setPeriod).catch(() => {});
  }, [days]);
  return { series, period };
}

export default function AnalyticsPage() {
  const workers = useApp((s) => s.workers);
  const [range, setRange] = useState<Range>("30");
  const [view, setView] = useState<"chart" | "table">("chart");
  const [workerId, setWorkerId] = useState<string>("all");
  const days = Number(range);
  const worker = workers.find((w) => w.id === workerId) ?? null;
  const liveUsage = useLiveUsage(days);
  const usage90 = isLive() ? (liveUsage.series ?? []) : demoUsage90;

  const activeWorkers = workers.filter((w) => w.runs30d > 0);
  const totalRuns30 = activeWorkers.reduce((a, w) => a + w.runs30d, 0) || 1;
  const nonVoiceRuns = activeWorkers.filter((w) => w.interaction !== "voice").reduce((a, w) => a + w.runs30d, 0) || 1;

  // Per-day data for the selected scope (whole workspace or one Worker)
  const scoped = useMemo(() => {
    return usage90.map((d) => {
      if (!worker) return d;
      const runShare = worker.runs30d / totalRuns30;
      const isVoice = worker.interaction === "voice";
      const creditShare = isVoice ? 0 : worker.runs30d / nonVoiceRuns;
      const automation = worker.automationRate ?? worker.successRate;
      return {
        day: d.day,
        workers: isVoice ? 0 : Math.round(d.workers * creditShare),
        agent: 0,
        voice: isVoice ? d.voice : 0,
        runs: Math.round(d.runs * runShare),
        automated: automation ? Math.round(automation + (d.automated - 80) * 0.4) : 0,
      };
    });
  }, [worker, totalRuns30, nonVoiceRuns, usage90]);

  const data = scoped.slice(-days);
  const prev = scoped.length >= days * 2 ? scoped.slice(-days * 2, -days) : null;

  const series = allSeries
    .filter((s) => data.some((d) => d[s.key] > 0))
    .map((s) => (worker && s.key !== "agent" ? { ...s, label: worker.name } : s));

  const sum = (rows: typeof data, k: "workers" | "agent" | "voice" | "runs") => rows.reduce((a, r) => a + r[k], 0);
  const credits = (rows: typeof data) => sum(rows, "workers") + sum(rows, "agent") + sum(rows, "voice");
  const avgAuto = (rows: typeof data) => (rows.length ? rows.reduce((a, r) => a + r.automated, 0) / rows.length : 0);

  const totalCredits = credits(data);
  const totalRuns = sum(data, "runs");
  const costPerTask = totalRuns ? (totalCredits * RUPEES_PER_CREDIT) / totalRuns : 0;
  const prevCost = prev && sum(prev, "runs") ? (credits(prev) * RUPEES_PER_CREDIT) / sum(prev, "runs") : null;
  const hoursSaved = Math.round(((worker ? worker.hoursSaved30d : activeWorkers.reduce((a, w) => a + w.hoursSaved30d, 0)) * days) / 30);

  const byWorker = (worker ? [worker] : workers)
    .filter((w) => w.hoursSaved30d > 0)
    .map((w) => ({ name: w.name, hours: Math.round((w.hoursSaved30d * days) / 30) }))
    .sort((a, b) => b.hours - a.hours);

  const teams = useMemo(() => {
    // Live: attribute Ask Anvita usage to the people who ran it; Workers as one row each.
    if (isLive()) {
      const p = liveUsage.period;
      if (!p) return [];
      const people = p.byMember.map((m) => ({ team: m.name, workers: 0, runs: m.runs, hours: Math.round((m.succeeded * 12) / 60), credits: m.credits }));
      const ws = p.byWorker.filter((w) => !worker || w.workerId === worker.id).map((w) => ({ team: `${w.name} (Worker)`, workers: 1, runs: w.runs, hours: Math.round((w.succeeded * 12) / 60), credits: w.credits }));
      return [...(worker ? [] : people), ...ws].sort((a, b) => b.credits - a.credits);
    }
    const agentCredits = sum(usage90.slice(-days), "agent");
    const map = new Map<string, { team: string; workers: number; runs: number; hours: number; credits: number }>();
    for (const t of Object.keys(agentShareByTeam)) map.set(t, { team: t, workers: 0, runs: 0, hours: 0, credits: Math.round(agentCredits * agentShareByTeam[t]) });
    for (const w of workers) {
      const t = workerTeam(w);
      const row = map.get(t) ?? { team: t, workers: 0, runs: 0, hours: 0, credits: 0 };
      const runs = Math.round((w.runs30d * days) / 30);
      row.workers += 1;
      row.runs += runs;
      row.hours += Math.round((w.hoursSaved30d * days) / 30);
      row.credits += runs * w.avgCredits;
      map.set(t, row);
    }
    let rows = [...map.values()].filter((r) => r.workers > 0 || r.credits > 0);
    if (worker) rows = rows.filter((r) => r.team === workerTeam(worker));
    return rows.sort((a, b) => b.credits - a.credits);
  }, [workers, days, worker, liveUsage.period, usage90]);

  const exportCsv = () => {
    const rows = data.map((d) => ({
      day: d.day,
      ...Object.fromEntries(series.map((s) => [`credits_${s.key}`, d[s.key]])),
      runs: d.runs,
      automation_rate_pct: d.automated,
    }));
    downloadCSV(`anvita-analytics-${days}d-${worker ? worker.id : "all"}.csv`, rows);
    toast.success(`Exported ${rows.length} days`);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Analytics"
        description="Work done, time saved and what it cost — by Worker, channel and team."
        actions={
          <>
            <Select value={workerId} onChange={(e) => setWorkerId(e.target.value)} className="w-52" aria-label="Filter by Worker">
              <option value="all">All Workers & chat</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.emoji} {w.name}
                </option>
              ))}
            </Select>
            <Segmented
              value={range}
              onChange={setRange}
              options={[
                { value: "7", label: "7 days" },
                { value: "30", label: "30 days" },
                { value: "90", label: "90 days" },
              ]}
            />
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download /> Export CSV
            </Button>
          </>
        }
      />

      {worker && worker.runs30d === 0 ? (
        <div className="mt-6">
          <EmptyState icon={<ChartColumn />} title={`No runs for ${worker.name} yet`} description="Analytics appear once this Worker is live and has handled work." action={<Button size="sm" variant="outline" onClick={() => setWorkerId("all")}>Show all Workers</Button>} />
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Hours saved" value={`${hoursSaved.toLocaleString("en-IN")} h`} hint={`valued at ₹${((hoursSaved * 500) / 100000).toFixed(2)}L (₹500/h)`} />
            <Stat label="Cost per task" value={`₹${costPerTask.toFixed(2)}`} delta={pctDelta(costPerTask, prevCost, true)} hint="vs ₹38 human baseline" />
            <Stat label="Automation rate" value={`${avgAuto(data).toFixed(0)}%`} delta={prev ? { value: `${avgAuto(data) - avgAuto(prev) >= 0 ? "+" : "−"}${Math.abs(avgAuto(data) - avgAuto(prev)).toFixed(1)} pts`, positive: avgAuto(data) >= avgAuto(prev) } : undefined} hint="no human involved" />
            <Stat label="Credits used" value={formatCredits(totalCredits)} delta={pctDelta(totalCredits, prev ? credits(prev) : null, true)} hint={`${totalRuns.toLocaleString("en-IN")} runs in ${days} days`} />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>Credits used per day</CardTitle>
                  <p className="text-[12.5px] text-muted-foreground">{worker ? worker.name : "Split by where the work happened"}</p>
                </div>
                <Segmented
                  value={view}
                  onChange={setView}
                  options={[
                    { value: "chart", label: "Chart" },
                    { value: "table", label: "Table" },
                  ]}
                />
              </CardHeader>
              <CardContent>
                {view === "chart" ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data} margin={{ left: 0, right: 8, top: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} interval={days === 7 ? 0 : days === 30 ? 4 : 13} />
                        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={44} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                        {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} formatter={(value) => <span style={{ color: "var(--muted-foreground)" }}>{value}</span>} />}
                        {series.map((s, i) => (
                          <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.color} stroke="var(--card)" strokeWidth={days === 90 ? 0 : 2} radius={i === series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto scrollbar-thin">
                    <Table>
                      <THead>
                        <tr>
                          <TH>Day</TH>
                          {series.map((s) => (
                            <TH key={s.key} className="text-right">
                              {s.label}
                            </TH>
                          ))}
                          <TH className="text-right">Runs</TH>
                        </tr>
                      </THead>
                      <tbody>
                        {[...data].reverse().map((d) => (
                          <TR key={d.day}>
                            <TD>{d.day}</TD>
                            {series.map((s) => (
                              <TD key={s.key} className="text-right tabular-nums">
                                {d[s.key].toLocaleString("en-IN")}
                              </TD>
                            ))}
                            <TD className="text-right tabular-nums">{d.runs.toLocaleString("en-IN")}</TD>
                          </TR>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Automation rate</CardTitle>
                <p className="text-[12.5px] text-muted-foreground">% of tasks completed without a human</p>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ left: 0, right: 8, top: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} interval={days === 7 ? 1 : days === 30 ? 6 : 20} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} width={36} domain={["dataMin - 3", "dataMax + 3"]} unit="%" allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, "Automation"]} />
                    <Line type="monotone" dataKey="automated" stroke="var(--series-1)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Hours saved by Worker · {days} days</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                {byWorker.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">No hours saved in this period.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byWorker} layout="vertical" margin={{ left: 8, right: 32 }}>
                      <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={axisTick} axisLine={false} tickLine={false} width={150} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} formatter={(v) => [`${v} h`, "Hours saved"]} />
                      <Bar dataKey="hours" fill="var(--series-1)" radius={[0, 4, 4, 0]} barSize={18} label={{ position: "right", fontSize: 11, fill: "var(--muted-foreground)" }} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Unit economics by Worker</CardTitle>
              </CardHeader>
              <Table>
                <THead>
                  <tr>
                    <TH>Worker</TH>
                    <TH className="text-right">Runs</TH>
                    <TH className="text-right">Success</TH>
                    <TH className="text-right">Credits / run</TH>
                    <TH className="text-right">Cost / outcome</TH>
                  </tr>
                </THead>
                <tbody>
                  {(worker ? [worker] : activeWorkers).map((w) => (
                    <TR key={w.id}>
                      <TD className="font-medium">
                        <span className="mr-1.5">{w.emoji}</span>
                        {w.name}
                      </TD>
                      <TD className="text-right tabular-nums">{Math.round((w.runs30d * days) / 30).toLocaleString("en-IN")}</TD>
                      <TD className="text-right tabular-nums">{w.successRate}%</TD>
                      <TD className="text-right tabular-nums">{w.avgCredits}</TD>
                      <TD className="text-right tabular-nums">₹{w.successRate ? ((w.avgCredits * RUPEES_PER_CREDIT) / (w.successRate / 100)).toFixed(2) : "—"}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>{isLive() ? "By person & Worker" : "By team"} · {days} days</CardTitle>
              <p className="text-[12.5px] text-muted-foreground">{isLive() ? "Ask Anvita usage by the person who ran it, plus each Worker's runs" : "Worker runs plus Ask Anvita usage attributed to each team"}</p>
            </CardHeader>
            <Table>
              <THead>
                <tr>
                  <TH>{isLive() ? "Person / Worker" : "Team"}</TH>
                  <TH className="text-right">Members</TH>
                  <TH className="text-right">Workers</TH>
                  <TH className="text-right">Runs</TH>
                  <TH className="text-right">Hours saved</TH>
                  <TH className="text-right">Credits</TH>
                  <TH className="text-right">Cost</TH>
                </tr>
              </THead>
              <tbody>
                {teams.map((t) => (
                  <TR key={t.team}>
                    <TD className="font-medium">{t.team}</TD>
                    <TD className="text-right tabular-nums">{isLive() ? (t.workers ? "—" : 1) : (teamMembers[t.team] ?? "—")}</TD>
                    <TD className="text-right tabular-nums">{t.workers}</TD>
                    <TD className="text-right tabular-nums">{t.runs.toLocaleString("en-IN")}</TD>
                    <TD className="text-right tabular-nums">{t.hours.toLocaleString("en-IN")} h</TD>
                    <TD className="text-right tabular-nums">{formatCredits(t.credits)}</TD>
                    <TD className="text-right tabular-nums">₹{Math.round(t.credits * RUPEES_PER_CREDIT).toLocaleString("en-IN")}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </Card>
        </>
      )}
    </PageContainer>
  );
}
