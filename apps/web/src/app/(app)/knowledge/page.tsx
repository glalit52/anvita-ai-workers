"use client";
import { useState } from "react";
import { BookOpen, FileText, Loader2, Plus, RefreshCw, Search, TriangleAlert, Upload } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AppLogo } from "@/components/brand/app-logo";
import { knowledgeBases } from "@/lib/mock/workspace";
import { cn, sleep } from "@/lib/utils";

const results = [
  { doc: "Returns & Refunds Policy.pdf", where: "Page 2 · §3.1", score: 0.92, text: "Customers may request a return or refund within **7 days of delivery** for items that arrive damaged, defective or incorrect. Photo evidence is required for damaged goods." },
  { doc: "help.kesarfoods.in/returns", where: "“How do refunds work?”", score: 0.87, text: "Refunds are issued to the original payment method within 3–5 working days. UPI refunds are usually instant." },
  { doc: "Support SOP.pdf", where: "Page 4 · Approvals", score: 0.81, text: "Refunds above ₹5,000 require approval by the support lead before processing." },
];

export default function KnowledgePage() {
  const [selected, setSelected] = useState(knowledgeBases[0].id);
  const [q, setQ] = useState("Can a customer get a refund for a damaged box?");
  const [state, setState] = useState<"idle" | "loading" | "done">("done");
  const kb = knowledgeBases.find((k) => k.id === selected)!;

  return (
    <PageContainer>
      <PageHeader
        title="Knowledge"
        description="Sources Anvita and your Workers search to answer with citations. Permissions from the source are respected."
        actions={
          <Button>
            <Plus /> New knowledge base
          </Button>
        }
      />
      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="flex flex-col gap-2">
          {knowledgeBases.map((k) => (
            <button key={k.id} onClick={() => setSelected(k.id)} className={cn("rounded-xl border bg-card p-4 text-left transition-all cursor-pointer", selected === k.id ? "border-primary shadow-[0_0_0_3px] shadow-primary/10" : "border-border hover:border-primary/30")}>
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-primary" />
                <p className="flex-1 text-[14px] font-medium">{k.name}</p>
                {k.sources.some((s) => s.status === "error") && <TriangleAlert className="size-4 text-danger" />}
                {k.sources.some((s) => s.status === "syncing") && <Loader2 className="size-4 animate-spin text-info" />}
              </div>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                {k.docs} docs · {k.chunks.toLocaleString("en-IN")} chunks · updated {k.updatedAt}
              </p>
              <div className="mt-2 flex gap-1">
                {k.sources.map((s) => (
                  <AppLogo key={s.label} appId={s.appId} size={18} />
                ))}
              </div>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>{kb.name}</CardTitle>
                <p className="mt-0.5 text-[13px] text-muted-foreground">{kb.description}</p>
                <p className="mt-2 text-[12px] text-muted-foreground">Used by: {kb.usedBy.join(", ")}</p>
              </div>
              <Button size="sm" variant="outline">
                <Upload /> Add source
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {kb.sources.map((s) => (
                <div key={s.label} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3">
                  <AppLogo appId={s.appId} size={30} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium">{s.label}</p>
                    <p className="text-[12px] text-muted-foreground">
                      {s.docs} documents · last sync {s.lastSync} · auto-sync every 6 h
                    </p>
                  </div>
                  <Badge variant={s.status === "synced" ? "success" : s.status === "syncing" ? "info" : "danger"}>{s.status}</Badge>
                  <Button size="icon-sm" variant="ghost" aria-label="Sync now">
                    <RefreshCw />
                  </Button>
                </div>
              ))}
              {kb.sources.some((s) => s.status === "error") && (
                <div className="flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-[13px]">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-danger" />
                  <div>
                    <p className="font-medium">Sync failed — Drive folder permission was revoked</p>
                    <p className="text-muted-foreground">Ask the folder owner to re-share “Finance SOPs” with the Anvita service account, or reconnect Drive.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Test retrieval</CardTitle>
              <p className="text-[12.5px] text-muted-foreground">See exactly which passages a Worker would cite.</p>
            </CardHeader>
            <CardContent>
              <form
                className="flex gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setState("loading");
                  await sleep(900);
                  setState("done");
                }}
              >
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
                </div>
                <Button type="submit">{state === "loading" ? <Loader2 className="animate-spin" /> : "Search"}</Button>
              </form>
              {state === "done" && (
                <div className="mt-4 flex flex-col gap-2">
                  {results.map((r, i) => (
                    <div key={r.doc} className="rounded-xl border border-border p-3.5">
                      <div className="flex items-center gap-2 text-[12.5px]">
                        <span className="flex size-5 items-center justify-center rounded bg-primary-soft text-[11px] font-semibold text-primary">{i + 1}</span>
                        <FileText className="size-3.5 text-muted-foreground" />
                        <span className="font-medium">{r.doc}</span>
                        <span className="text-muted-foreground">{r.where}</span>
                        <span className="ml-auto font-mono text-[11px] text-muted-foreground">{r.score.toFixed(2)}</span>
                      </div>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground" dangerouslySetInnerHTML={{ __html: r.text.replace(/\*\*(.+?)\*\*/g, '<mark class="bg-saffron-soft text-foreground rounded px-0.5">$1</mark>') }} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
