"use client";
import { useState } from "react";
import { Download } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageContainer } from "@/components/shell/app-shell";
import { PageHeader, Stat } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Segmented } from "@/components/ui/tabs";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { usageDaily } from "@/lib/mock/workspace";
import { workers } from "@/lib/mock/workers";

const tooltipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12, color: "var(--foreground)" };
const axisTick = { fontSize: 11, fill: "var(--muted-foreground)" };

const series = [
  { key: "workers", label: "AI Workers", color: "var(--series-1)" },
  { key: "agent", label: "Ask Anvita", color: "var(--series-2)" },
  { key: "voice", label: "Voice", color: "var(--series-3)" },
] as const;

export default function AnalyticsPage() {
  const [range, setRange] = useState<"7" | "30" | "90">("30");
  const [view, setView] = useState<"chart" | "table">("chart");
  const data = range === "7" ? usageDaily.slice(-7) : usageDaily;
  const byWorker = workers.filter((w) => w.hoursSaved30d > 0).sort((a, b) => b.hoursSaved30d - a.hoursSaved30d);

  return (
    <PageContainer>
      <PageHeader
        title="Analytics"
        description="Work done, time saved and what it cost — by Worker, channel and team."
        actions={
          <>
            <Segmented
              value={range}
              onChange={setRange}
              options={[
                { value: "7", label: "7 days" },
                { value: "30", label: "30 days" },
                { value: "90", label: "90 days" },
              ]}
            />
            <Button variant="outline" size="sm">
              <Download /> Export CSV
            </Button>
          </>
        }
      />

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Hours saved" value="970 h" delta={{ value: "+18%", positive: true }} hint="valued at ₹4.85L (₹500/h)" />
        <Stat label="Cost per resolved task" value="₹0.42" delta={{ value: "−9%", positive: true }} hint="vs ₹38 human baseline" />
        <Stat label="Automation rate" value="83%" delta={{ value: "+2.1 pts", positive: true }} hint="no human involved" />
        <Stat label="Approval wait (median)" value="11 min" delta={{ value: "+3 min", positive: false }} hint="slowest: Finance (42 min)" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Credits used per day</CardTitle>
              <p className="text-[12.5px] text-muted-foreground">Split by where the work happened</p>
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
                    <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} interval={range === "7" ? 0 : 4} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} formatter={(value) => <span style={{ color: "var(--muted-foreground)" }}>{value}</span>} />
                    {series.map((s, i) => (
                      <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.color} stroke="var(--card)" strokeWidth={2} radius={i === series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
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
                    </tr>
                  </THead>
                  <tbody>
                    {data.map((d) => (
                      <TR key={d.day}>
                        <TD>{d.day}</TD>
                        {series.map((s) => (
                          <TD key={s.key} className="text-right tabular-nums">
                            {d[s.key].toLocaleString("en-IN")}
                          </TD>
                        ))}
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
                <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} interval={range === "7" ? 1 : 6} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} width={32} domain={[70, 90]} unit="%" />
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
            <CardTitle>Hours saved by Worker · 30 days</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byWorker} layout="vertical" margin={{ left: 8, right: 24 }}>
                <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={axisTick} axisLine={false} tickLine={false} width={150} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} formatter={(v) => [`${v} h`, "Hours saved"]} />
                <Bar dataKey="hoursSaved30d" fill="var(--series-1)" radius={[0, 4, 4, 0]} barSize={18} label={{ position: "right", fontSize: 11, fill: "var(--muted-foreground)" }} />
              </BarChart>
            </ResponsiveContainer>
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
              {workers
                .filter((w) => w.runs30d > 0)
                .map((w) => (
                  <TR key={w.id}>
                    <TD className="font-medium">
                      <span className="mr-1.5">{w.emoji}</span>
                      {w.name}
                    </TD>
                    <TD className="text-right tabular-nums">{w.runs30d.toLocaleString("en-IN")}</TD>
                    <TD className="text-right tabular-nums">{w.successRate}%</TD>
                    <TD className="text-right tabular-nums">{w.avgCredits}</TD>
                    <TD className="text-right tabular-nums">₹{((w.avgCredits * 0.045) / (w.successRate / 100)).toFixed(2)}</TD>
                  </TR>
                ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </PageContainer>
  );
}
