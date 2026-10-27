"use client";
import { useState } from "react";
import { Bot, Download, Search, Settings2, User, Workflow } from "lucide-react";
import { useApp } from "@/lib/store";
import type { AuditEvent } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/tabs";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { SectionHeader } from "@/components/settings-section";
import { downloadCSV } from "@/lib/download";

const icons = { user: User, agent: Bot, worker: Workflow, system: Settings2 };
type Filter = "all" | AuditEvent["actorType"];

export default function AuditPage() {
  const events = useApp((s) => s.auditEvents);
  const log = useApp((s) => s.log);
  const [q, setQ] = useState("");
  const [type, setType] = useState<Filter>("all");
  const [limit, setLimit] = useState(50);
  const filtered = events.filter((e) => (type === "all" || e.actorType === type) && (e.actor + e.action + e.target + e.channel).toLowerCase().includes(q.toLowerCase()));
  const list = filtered.slice(0, limit);

  return (
    <>
      <SectionHeader
        title="Audit log"
        description="Tamper-evident (hash-chained) record of every action. Retained 7 years."
        actions={
          <Button
            variant="outline"
            onClick={() => {
              downloadCSV(`anvita-audit-${new Date().toISOString().slice(0, 10)}.csv`, filtered as unknown as Record<string, unknown>[], ["time", "actor", "actorType", "action", "target", "channel", "ip"]);
              log("audit.exported", `${filtered.length} events`);
            }}
            disabled={filtered.length === 0}
          >
            <Download /> Export CSV
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by actor, action or target" className="pl-8" />
        </div>
        <Segmented
          value={type}
          onChange={setType}
          options={[
            { value: "all", label: "All" },
            { value: "user", label: "People" },
            { value: "agent", label: "Anvita" },
            { value: "worker", label: "Workers" },
            { value: "system", label: "System" },
          ]}
        />
        <span className="ml-auto text-[12px] text-muted-foreground">{filtered.length} events</span>
      </div>
      <Card>
        <Table>
          <THead>
            <tr>
              <TH>Time</TH>
              <TH>Actor</TH>
              <TH>Action</TH>
              <TH>Target</TH>
              <TH>Channel</TH>
            </tr>
          </THead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <TD colSpan={5} className="py-8 text-center text-muted-foreground">
                  No events match these filters.
                </TD>
              </tr>
            )}
            {list.map((e) => {
              const Icon = icons[e.actorType];
              return (
                <TR key={e.id}>
                  <TD className="whitespace-nowrap font-mono text-[12px] text-muted-foreground">{e.time}</TD>
                  <TD>
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      <Icon className="size-3.5 text-muted-foreground" /> {e.actor}
                    </span>
                  </TD>
                  <TD>
                    <Badge variant={/failed|rejected|deleted|revoked|removed/.test(e.action) ? "danger" : e.action.startsWith("approval") ? "warning" : "outline"} className="font-mono">
                      {e.action}
                    </Badge>
                  </TD>
                  <TD className="max-w-80 truncate">{e.target}</TD>
                  <TD className="whitespace-nowrap text-muted-foreground">
                    {e.channel}
                    {e.ip && <span className="ml-1 font-mono text-[11px]">· {e.ip}</span>}
                  </TD>
                </TR>
              );
            })}
          </tbody>
        </Table>
        {filtered.length > limit && (
          <div className="border-t border-border p-3 text-center">
            <Button variant="ghost" size="sm" onClick={() => setLimit(limit + 50)}>
              Load more ({filtered.length - limit} remaining)
            </Button>
          </div>
        )}
      </Card>
    </>
  );
}
