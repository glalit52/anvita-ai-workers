"use client";
import { useState } from "react";
import { Bot, Download, Search, Settings2, User, Workflow } from "lucide-react";
import { auditEvents } from "@/lib/mock/workspace";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { SectionHeader } from "@/components/settings-section";

const icons = { user: User, agent: Bot, worker: Workflow, system: Settings2 };

export default function AuditPage() {
  const [q, setQ] = useState("");
  const list = auditEvents.filter((e) => (e.actor + e.action + e.target).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <SectionHeader title="Audit log" description="Tamper-evident (hash-chained) record of every action. Retained 7 years." actions={<Button variant="outline"><Download /> Export to SIEM</Button>} />
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by actor, action or target" className="pl-8" />
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
                    <Badge variant={e.action.includes("failed") || e.action.includes("rejected") ? "danger" : e.action.startsWith("approval") ? "warning" : "outline"} className="font-mono">
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
      </Card>
    </>
  );
}
