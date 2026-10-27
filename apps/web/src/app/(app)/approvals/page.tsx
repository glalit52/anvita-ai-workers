"use client";
import { useState } from "react";
import { CheckCheck, Smartphone } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ApprovalCard } from "@/components/approvals/approval-card";
import { useApp } from "@/lib/store";

export default function ApprovalsPage() {
  const approvals = useApp((s) => s.approvals);
  const [tab, setTab] = useState<"pending" | "decided">("pending");
  const pending = approvals.filter((a) => a.status === "pending");
  const decided = approvals.filter((a) => a.status !== "pending");
  const list = tab === "pending" ? pending : decided;
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
      <div className="mt-6 flex items-center gap-3">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "pending", label: `Waiting on you (${pending.length})` },
            { value: "decided", label: `Decided (${decided.length})` },
          ]}
        />
        <span className="ml-auto hidden text-[12px] text-muted-foreground sm:block">Median decision time: 11 min</span>
      </div>
      <div className="mt-5 flex flex-col gap-4">
        {list.length === 0 && <EmptyState icon={<CheckCheck />} title="You're all caught up" description="New approval requests will appear here and in your preferred channel." />}
        {list.map((a) => (
          <ApprovalCard key={a.id} approvalId={a.id} />
        ))}
      </div>
    </PageContainer>
  );
}
