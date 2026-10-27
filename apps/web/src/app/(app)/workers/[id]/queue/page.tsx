"use client";
import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Check, ChevronRight, Filter, Loader2, Pencil, TriangleAlert, UserRoundPlus, X } from "lucide-react";
import { queueItems, workerById } from "@/lib/mock/workers";
import type { QueueItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const statusMeta: Record<QueueItem["status"], { label: string; variant: "warning" | "info" | "success" | "danger" | "primary" }> = {
  needs_review: { label: "Needs review", variant: "warning" },
  processing: { label: "Processing", variant: "info" },
  done: { label: "Posted", variant: "success" },
  failed: { label: "Failed", variant: "danger" },
  escalated: { label: "Escalated", variant: "primary" },
};

function InvoiceDoc({ item }: { item: QueueItem }) {
  return (
    <div className="mx-auto max-w-[620px] rounded-md bg-white p-6 text-[11.5px] leading-relaxed text-[#222] shadow-pop">
      <div className="flex justify-between border-b border-black/10 pb-3">
        <div>
          <p className="text-[15px] font-bold">{item.title}</p>
          <p className="text-black/60">Plot 14, MIDC Bhiwandi, Maharashtra 421302</p>
          <p className="mt-0.5">
            GSTIN: <span className="rounded bg-emerald-100 px-1">27AABCS1429B1Z5</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[14px] font-semibold tracking-wide">TAX INVOICE</p>
          <p>
            No. <span className="rounded bg-emerald-100 px-1">SPP/24-25/0912</span>
          </p>
          <p>Date: 21-10-2026</p>
        </div>
      </div>
      <p className="mt-3 text-black/60">Bill to: Kesar Foods Pvt Ltd · GSTIN 27AAKCK4410C1ZP · PO-3391</p>
      <table className="mt-3 w-full">
        <thead>
          <tr className="border-b border-black/10 text-left text-black/60">
            <th className="py-1">Item</th>
            <th>HSN</th>
            <th className="text-right">Qty</th>
            <th className="text-right">Rate</th>
            <th className="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-black/5">
            <td className="py-1">Rigid gift box 8×8 (gold foil)</td>
            <td>4819</td>
            <td className="text-right">
              <span className="rounded bg-amber-200 px-1">1,200</span>
            </td>
            <td className="text-right">112.00</td>
            <td className="text-right">1,34,400</td>
          </tr>
          <tr className="border-b border-black/5">
            <td className="py-1">Butter paper inserts</td>
            <td>4823</td>
            <td className="text-right">5,000</td>
            <td className="text-right">4.36</td>
            <td className="text-right">21,803</td>
          </tr>
        </tbody>
      </table>
      <div className="ml-auto mt-3 w-48">
        <div className="flex justify-between">
          <span>Taxable</span>
          <span>1,56,203</span>
        </div>
        <div className="flex justify-between">
          <span>IGST 18%</span>
          <span>28,117</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-black/20 pt-1 font-bold">
          <span>Total</span>
          <span className="rounded bg-emerald-100 px-1">₹1,84,320</span>
        </div>
      </div>
    </div>
  );
}

export default function QueuePage() {
  const { id } = useParams<{ id: string }>();
  const worker = workerById[id];
  const [filter, setFilter] = useState<"all" | "needs_review" | "done" | "failed">("needs_review");
  const [items, setItems] = useState(queueItems);
  const [selected, setSelected] = useState<string>("q1");
  const list = items.filter((i) => (filter === "all" ? true : filter === "done" ? i.status === "done" : filter === "failed" ? i.status === "failed" || i.status === "escalated" : i.status === "needs_review" || i.status === "processing"));
  const item = items.find((i) => i.id === selected) ?? items[0];

  const decide = (status: QueueItem["status"], msg: string) => {
    setItems((its) => its.map((i) => (i.id === item.id ? { ...i, status, assignee: "Priya Sharma" } : i)));
    toast.success(msg);
    const next = items.find((i) => i.id !== item.id && i.status === "needs_review");
    if (next) setSelected(next.id);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-3 md:px-6">
        <Link href={`/workers/${id}`} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Back">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] text-muted-foreground">{worker?.name ?? "Worker"} · Work queue</p>
          <h1 className="text-[17px] font-semibold tracking-tight">Review & approve</h1>
        </div>
        <div className="hidden gap-4 text-center text-[12px] md:flex">
          {[
            ["Today", "184"],
            ["Auto-posted", "88%"],
            ["Avg. review", "42 s"],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-[15px] font-semibold">{v}</p>
              <p className="text-muted-foreground">{k}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex w-full shrink-0 flex-col border-b border-border lg:w-[380px] lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2 p-3">
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: "needs_review", label: "To review" },
                { value: "done", label: "Done" },
                { value: "failed", label: "Issues" },
                { value: "all", label: "All" },
              ]}
            />
            <Button variant="ghost" size="icon-sm" className="ml-auto" aria-label="Filter">
              <Filter />
            </Button>
          </div>
          <div className="max-h-72 flex-1 overflow-y-auto lg:max-h-none scrollbar-thin">
            {list.map((i) => (
              <button
                key={i.id}
                onClick={() => setSelected(i.id)}
                className={cn("flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-subtle cursor-pointer", selected === i.id && "bg-primary-soft/50")}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13.5px] font-medium">{i.title}</p>
                    {i.status === "processing" && <Loader2 className="size-3.5 animate-spin text-info" />}
                  </div>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {i.ref} · {i.updatedAt}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-medium tabular-nums">{i.amount}</p>
                  <Badge variant={statusMeta[i.status].variant}>{statusMeta[i.status].label}</Badge>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 overflow-y-auto 2xl:grid-cols-2 scrollbar-thin">
          <div className="bg-subtle p-4 md:p-6">
            <p className="mb-2 text-[12px] text-muted-foreground">Source document · {item.source}</p>
            <InvoiceDoc item={item} />
          </div>
          <div className="flex flex-col gap-4 p-4 md:p-6">
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-semibold">{item.ref}</h2>
              <Badge variant={statusMeta[item.status].variant}>{statusMeta[item.status].label}</Badge>
              {item.confidence > 0 && (
                <Badge variant={item.confidence >= 95 ? "success" : "warning"} className="ml-auto">
                  {item.confidence}% confidence
                </Badge>
              )}
            </div>
            {item.confidence > 0 && item.confidence < 95 && (
              <div className="flex gap-2 rounded-xl border border-warning/30 bg-warning-soft p-3 text-[13px]">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
                <div>
                  <p className="font-medium">Why this needs review</p>
                  <p className="text-muted-foreground">Invoice quantity (1,200 boxes) doesn’t match PO-3391 (1,000) and GRN-8812 (1,000). The vendor may have over-billed by ₹22,400 + GST.</p>
                </div>
              </div>
            )}
            <div className="overflow-hidden rounded-xl border border-border">
              {(item.fields.length ? item.fields : queueItems[0].fields).map((f) => (
                <div key={f.label} className="grid grid-cols-[110px_1fr_auto] items-center gap-3 border-b border-border px-3.5 py-2 text-[13px] last:border-0">
                  <span className="text-muted-foreground">{f.label}</span>
                  <Input defaultValue={f.value} className={cn("h-8", (f.confidence ?? 100) < 80 && "border-warning bg-warning-soft/40")} />
                  <span className={cn("w-10 text-right text-[11.5px] tabular-nums", (f.confidence ?? 100) < 80 ? "text-warning font-semibold" : "text-muted-foreground")}>{f.confidence}%</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-border p-3.5 text-[13px]">
              <p className="font-medium">Will post to Tally</p>
              <p className="mt-1 text-muted-foreground">Purchase voucher · Ledger “Packaging Material (18%)” · Party “Sharma Packaging Pvt Ltd” · Due 20 Nov (30 days)</p>
            </div>
            {item.status === "needs_review" ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="success" onClick={() => decide("done", `${item.ref} approved and posted to Tally`)}>
                  <Check /> Approve & post
                </Button>
                <Button variant="outline" onClick={() => decide("done", "Posted with your edits — Anvita will learn from them")}>
                  <Pencil /> Post with edits
                </Button>
                <Button variant="outline" onClick={() => decide("escalated", "Escalated to Kabir Mehta")}>
                  <UserRoundPlus /> Escalate
                </Button>
                <Button variant="ghost" className="text-danger hover:bg-danger-soft" onClick={() => decide("failed", "Rejected — vendor will be emailed for a corrected invoice")}>
                  <X /> Reject & email vendor
                </Button>
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground">
                {statusMeta[item.status].label}
                {item.assignee && ` · ${item.assignee}`}
              </p>
            )}
            <p className="text-[11.5px] text-muted-foreground">Keyboard: A approve · E edit · R reject · J/K next/prev</p>
          </div>
        </div>
      </div>
    </div>
  );
}
