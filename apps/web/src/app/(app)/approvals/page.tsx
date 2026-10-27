"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Check, CheckCheck, Search, Smartphone, X } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { confirm } from "@/components/ui/confirm";
import { ApprovalCard } from "@/components/approvals/approval-card";
import { useApp } from "@/lib/store";
import { appById } from "@/lib/mock/apps";

export default function ApprovalsPage() {
  const approvals = useApp((s) => s.approvals);
  const decide = useApp((s) => s.decideApproval);
  const [tab, setTab] = useState<"pending" | "decided">("pending");
  const [risk, setRisk] = useState("all");
  const [app, setApp] = useState("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const pending = approvals.filter((a) => a.status === "pending");
  const decided = approvals.filter((a) => a.status !== "pending");
  const base = tab === "pending" ? pending : decided;
  const list = base
    .filter((a) => risk === "all" || a.risk === risk)
    .filter((a) => app === "all" || a.appId === app)
    .filter((a) => (a.title + a.requestedBy.name + a.action + a.onBehalfOf).toLowerCase().includes(q.toLowerCase()));
  const appsInList = Array.from(new Set(approvals.map((a) => a.appId)));
  const visibleSelected = selected.filter((id) => list.some((a) => a.id === id && a.status === "pending"));
  const allSelected = tab === "pending" && list.length > 0 && visibleSelected.length === list.length;

  const bulk = async (d: "approved" | "rejected") => {
    const n = visibleSelected.length;
    if (!n) return;
    if (!(await confirm({ title: `${d === "approved" ? "Approve" : "Reject"} ${n} request${n > 1 ? "s" : ""}?`, description: d === "approved" ? "Each action runs immediately and is logged in the audit trail." : "Requesters are notified; the actions won't run.", confirmLabel: d === "approved" ? `Approve ${n}` : `Reject ${n}`, danger: d === "rejected" }))) return;
    visibleSelected.forEach((id) => decide(id, d));
    setSelected([]);
    toast.success(`${n} request${n > 1 ? "s" : ""} ${d}`);
  };

  return (
    <PageContainer className="max-w-4xl">
      <PageHeader
        title="Approvals"
        description="Anvita and your Workers pause here before sending, paying or changing records."
        actions={
          <Badge variant="outline" className="px-2 py-1 text-[12px]">
            <Smartphone /> Also in Slack, WhatsApp & email
          </Badge>
        }
      />
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Segmented
          value={tab}
          onChange={(v) => {
            setTab(v);
            setSelected([]);
          }}
          options={[
            { value: "pending", label: `Waiting on you (${pending.length})` },
            { value: "decided", label: `Decided (${decided.length})` },
          ]}
        />
        <Select value={risk} onChange={(e) => setRisk(e.target.value)} className="h-8 w-32 text-[12.5px]" aria-label="Filter by risk">
          <option value="all">All risk</option>
          <option value="high">High risk</option>
          <option value="medium">Medium risk</option>
          <option value="low">Low risk</option>
        </Select>
        <Select value={app} onChange={(e) => setApp(e.target.value)} className="h-8 w-40 text-[12.5px]" aria-label="Filter by app">
          <option value="all">All apps</option>
          {appsInList.map((a) => (
            <option key={a} value={a}>
              {appById[a]?.name ?? a}
            </option>
          ))}
        </Select>
        <div className="relative w-full sm:ml-auto sm:w-56">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search approvals" aria-label="Search approvals" className="h-8 w-full rounded-lg border border-border bg-card pl-8 pr-2 text-[12.5px] outline-none focus:border-ring/60" />
        </div>
      </div>

      {tab === "pending" && list.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5 text-[13px]">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={allSelected} onChange={(e) => setSelected(e.target.checked ? list.map((a) => a.id) : [])} className="size-4 accent-[var(--primary)]" />
            {visibleSelected.length ? `${visibleSelected.length} selected` : "Select all"}
          </label>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="success" disabled={!visibleSelected.length} onClick={() => bulk("approved")}>
              <Check /> Approve selected
            </Button>
            <Button size="sm" variant="outline" disabled={!visibleSelected.length} onClick={() => bulk("rejected")}>
              <X /> Reject selected
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-4">
        {list.length === 0 && (
          <EmptyState
            icon={<CheckCheck />}
            title={base.length === 0 && tab === "pending" ? "You're all caught up" : "No approvals match"}
            description={base.length === 0 && tab === "pending" ? "New approval requests will appear here and in your preferred channel." : "Try clearing the filters."}
          />
        )}
        {list.map((a) => (
          <ApprovalCard
            key={a.id}
            approvalId={a.id}
            selected={selected.includes(a.id)}
            onSelect={tab === "pending" ? (v) => setSelected((s) => (v ? [...s, a.id] : s.filter((x) => x !== a.id))) : undefined}
          />
        ))}
      </div>
    </PageContainer>
  );
}
