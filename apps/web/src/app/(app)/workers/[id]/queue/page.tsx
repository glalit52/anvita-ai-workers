"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Check, CheckCheck, ChevronRight, Inbox, Keyboard, Loader2, Pencil, Search, TriangleAlert, UserRoundPlus, X } from "lucide-react";
import { useApp, useWorker } from "@/lib/store";
import { confirm } from "@/components/ui/confirm";
import { EmptyState, Kbd } from "@/components/ui/misc";
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
  const worker = useWorker(id);
  const items = useApp((s) => s.queueItems);
  const update = useApp((s) => s.updateQueueItem);
  const log = useApp((s) => s.log);
  const me = useApp((s) => s.profile.name);
  const [filter, setFilter] = useState<"review" | "done" | "issues" | "all">("review");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string>(items[0]?.id ?? "");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const match = (i: QueueItem, f: typeof filter) =>
    f === "all" ? true : f === "done" ? i.status === "done" : f === "issues" ? i.status === "failed" || i.status === "escalated" : i.status === "needs_review" || i.status === "processing";
  const counts = { review: items.filter((i) => match(i, "review")).length, done: items.filter((i) => match(i, "done")).length, issues: items.filter((i) => match(i, "issues")).length, all: items.length };
  const list = items.filter((i) => match(i, filter)).filter((i) => (i.title + i.ref).toLowerCase().includes(q.toLowerCase()));
  const item = items.find((i) => i.id === selected) ?? list[0] ?? items[0];
  const fields = item ? (item.fields.length ? item.fields : items[0].fields) : [];
  const bulkCandidates = items.filter((i) => i.status === "needs_review" && i.confidence >= 95);

  const move = useCallback(
    (dir: 1 | -1) => {
      if (!list.length) return;
      const idx = Math.max(0, list.findIndex((i) => i.id === item?.id));
      const next = list[Math.min(list.length - 1, Math.max(0, idx + dir))];
      if (next) setSelected(next.id);
    },
    [list, item?.id],
  );

  const decide = useCallback(
    (status: QueueItem["status"], msg: string) => {
      if (!item || item.status !== "needs_review") return;
      const edited = Object.keys(drafts).length > 0;
      const newFields = fields.map((f) => (drafts[f.label] !== undefined ? { ...f, value: drafts[f.label], confidence: 100 } : f));
      update(item.id, { status, assignee: me, updatedAt: "just now", fields: newFields, confidence: edited && status === "done" ? 100 : item.confidence });
      log(`queue.${status === "done" ? "approved" : status}`, `${item.ref} · ${item.title}`);
      setDrafts({});
      toast.success(msg);
      const next = list.find((i) => i.id !== item.id && i.status === "needs_review");
      if (next) setSelected(next.id);
    },
    [item, drafts, fields, update, me, log, list],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable || e.metaKey || e.ctrlKey || e.altKey) {
        if (e.key === "Escape") el.blur();
        return;
      }
      const k = e.key.toLowerCase();
      if (k === "j") move(1);
      else if (k === "k") move(-1);
      else if (k === "a") decide("done", `${item?.ref} approved and posted to Tally`);
      else if (k === "r") decide("failed", "Rejected — vendor will be emailed for a corrected invoice");
      else if (k === "e") {
        e.preventDefault();
        firstFieldRef.current?.focus();
        firstFieldRef.current?.select();
      } else return;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, decide, item?.ref]);

  useEffect(() => setDrafts({}), [selected]);

  const bulkApprove = async () => {
    if (!bulkCandidates.length) return;
    if (!(await confirm({ title: `Approve ${bulkCandidates.length} high-confidence item${bulkCandidates.length > 1 ? "s" : ""}?`, description: "Every item at 95% confidence or above will be posted to Tally. This is logged in the audit trail.", confirmLabel: "Approve & post all" }))) return;
    bulkCandidates.forEach((i) => update(i.id, { status: "done", assignee: me, updatedAt: "just now" }));
    log("queue.bulk_approved", `${bulkCandidates.length} items`);
    toast.success(`${bulkCandidates.length} items approved and posted`);
  };

  const done = items.filter((i) => i.status === "done").length;

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
            ["To review", String(counts.review)],
            ["Posted", String(done)],
            ["Auto-posted", `${Math.round((items.filter((i) => i.assignee === "Auto-posted").length / Math.max(1, done)) * 100)}%`],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-[15px] font-semibold tabular-nums">{v}</p>
              <p className="text-muted-foreground">{k}</p>
            </div>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={bulkApprove} disabled={!bulkCandidates.length}>
          <CheckCheck /> Approve all ≥95% {bulkCandidates.length > 0 && `(${bulkCandidates.length})`}
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex w-full shrink-0 flex-col border-b border-border lg:w-[380px] lg:border-b-0 lg:border-r">
          <div className="flex flex-col gap-2 p-3">
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: "review", label: `To review ${counts.review}` },
                { value: "done", label: `Done ${counts.done}` },
                { value: "issues", label: `Issues ${counts.issues}` },
                { value: "all", label: `All ${counts.all}` },
              ]}
            />
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search vendor or invoice no." aria-label="Search queue" className="h-8 w-full rounded-lg border border-border bg-card pl-8 pr-2 text-[12.5px] outline-none focus:border-ring/60" />
            </div>
          </div>
          <div className="max-h-72 flex-1 overflow-y-auto lg:max-h-none scrollbar-thin">
            {list.length === 0 && <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">{filter === "review" ? "Nothing to review — nice work! 🎉" : "No items here."}</p>}
            {list.map((i) => (
              <button
                key={i.id}
                onClick={() => setSelected(i.id)}
                className={cn("flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-subtle cursor-pointer", item?.id === i.id && "bg-primary-soft/50")}
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
          <div className="hidden items-center gap-1.5 border-t border-border px-4 py-2.5 text-[11.5px] text-muted-foreground lg:flex">
            <Keyboard className="size-3.5" /> <Kbd>J</Kbd>/<Kbd>K</Kbd> move · <Kbd>A</Kbd> approve · <Kbd>E</Kbd> edit · <Kbd>R</Kbd> reject
          </div>
        </div>

        {!item ? (
          <div className="flex-1 p-8">
            <EmptyState icon={<Inbox />} title="Queue is empty" description="New invoices will appear here as they arrive." />
          </div>
        ) : (
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
              {item.status === "processing" && (
                <div className="flex items-center gap-2 rounded-xl bg-info-soft p-3 text-[13px] text-info">
                  <Loader2 className="size-4 animate-spin" /> Extracting fields… this usually takes under a minute.
                </div>
              )}
              {item.status === "needs_review" && item.confidence < 95 && (
                <div className="flex gap-2 rounded-xl border border-warning/30 bg-warning-soft p-3 text-[13px]">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
                  <div>
                    <p className="font-medium">Why this needs review</p>
                    <p className="text-muted-foreground">
                      {fields.filter((f) => (f.confidence ?? 100) < 80).map((f) => `${f.label}: ${f.value}`).join(" · ") || "Low overall confidence in the extraction."}
                    </p>
                  </div>
                </div>
              )}
              <div className="overflow-hidden rounded-xl border border-border">
                {fields.map((f, idx) => {
                  const low = (f.confidence ?? 100) < 80;
                  const value = drafts[f.label] ?? f.value;
                  return (
                    <div key={f.label} className="grid grid-cols-[110px_1fr_auto] items-center gap-3 border-b border-border px-3.5 py-2 text-[13px] last:border-0">
                      <label htmlFor={`f-${idx}`} className="text-muted-foreground">
                        {f.label}
                      </label>
                      <Input
                        id={`f-${idx}`}
                        ref={idx === 0 ? firstFieldRef : undefined}
                        value={value}
                        disabled={item.status !== "needs_review"}
                        onChange={(e) => setDrafts({ ...drafts, [f.label]: e.target.value })}
                        className={cn("h-8", low && drafts[f.label] === undefined && "border-warning bg-warning-soft/40", drafts[f.label] !== undefined && "border-primary")}
                      />
                      <span className={cn("w-10 text-right text-[11.5px] tabular-nums", low ? "text-warning font-semibold" : "text-muted-foreground")}>{drafts[f.label] !== undefined ? "✎" : `${f.confidence}%`}</span>
                    </div>
                  );
                })}
              </div>
              <div className="rounded-xl border border-border p-3.5 text-[13px]">
                <p className="font-medium">Will post to Tally</p>
                <p className="mt-1 text-muted-foreground">Purchase voucher · Party “{item.title}” · Amount {item.amount} · Due in 30 days</p>
              </div>
              {item.status === "needs_review" ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="success" onClick={() => decide("done", Object.keys(drafts).length ? "Posted with your edits — Anvita will learn from them" : `${item.ref} approved and posted to Tally`)}>
                    <Check /> {Object.keys(drafts).length ? "Post with edits" : "Approve & post"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      firstFieldRef.current?.focus();
                      firstFieldRef.current?.select();
                    }}
                  >
                    <Pencil /> Edit fields
                  </Button>
                  <Button variant="outline" onClick={() => decide("escalated", "Escalated to Kabir Mehta")}>
                    <UserRoundPlus /> Escalate
                  </Button>
                  <Button variant="ghost" className="text-danger hover:bg-danger-soft" onClick={() => decide("failed", "Rejected — vendor will be emailed for a corrected invoice")}>
                    <X /> Reject & email vendor
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3 text-[13px] text-muted-foreground">
                  <span>
                    {statusMeta[item.status].label}
                    {item.assignee && ` · ${item.assignee}`}
                  </span>
                  {(item.status === "failed" || item.status === "escalated") && (
                    <Button size="sm" variant="outline" onClick={() => { update(item.id, { status: "needs_review" }); toast("Moved back to review"); }}>
                      Reopen
                    </Button>
                  )}
                </div>
              )}
              <p className="text-[11.5px] text-muted-foreground lg:hidden">Tip: on a keyboard use J/K to move, A to approve, E to edit, R to reject.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
