"use client";
import { useState } from "react";
import { toast } from "sonner";
import { BookOpen, FileText, Loader2, Pencil, Plus, RefreshCw, Search, Trash2, TriangleAlert, Upload, X } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { confirm } from "@/components/ui/confirm";
import { AppLogo } from "@/components/brand/app-logo";
import { AddSourceDialog, KbFormDialog } from "@/components/knowledge/dialogs";
import { useApp } from "@/lib/store";
import type { KnowledgeBase } from "@/lib/types";
import { cn, sleep } from "@/lib/utils";

interface Hit {
  doc: string;
  where: string;
  score: number;
  text: string;
}

const curated: Record<string, { q: string; hits: Hit[] }> = {
  "kb-help": {
    q: "Can a customer get a refund for a damaged box?",
    hits: [
      { doc: "Returns & Refunds Policy.pdf", where: "Page 2 · §3.1", score: 0.92, text: "Customers may request a return or refund within **7 days of delivery** for items that arrive damaged, defective or incorrect. Photo evidence is required for damaged goods." },
      { doc: "help.kesarfoods.in/returns", where: "“How do refunds work?”", score: 0.87, text: "Refunds are issued to the original payment method within **3–5 working days**. UPI refunds are usually instant." },
      { doc: "Support SOP.pdf", where: "Page 4 · Approvals", score: 0.81, text: "Refunds above **₹5,000** require approval by the support lead before processing." },
    ],
  },
  "kb-catalog": {
    q: "Is Kaju Katli gluten free?",
    hits: [
      { doc: "Kaju Katli 500g (SKU KK-500)", where: "Ingredients & allergens", score: 0.94, text: "Ingredients: cashew, sugar, ghee, silver leaf. **Gluten free.** Contains tree nuts and milk." },
      { doc: "Diwali Gift Box — Assorted", where: "Allergens", score: 0.79, text: "Contains wheat (Soan Papdi), tree nuts and milk. **Not gluten free.**" },
    ],
  },
  "kb-handbook": {
    q: "How many casual leaves do I get?",
    hits: [
      { doc: "Leave Policy", where: "Notion / People › Leave", score: 0.93, text: "Full-time employees get **12 casual leaves** and 12 sick leaves per calendar year, pro-rated for joiners." },
      { doc: "Holiday Calendar 2026", where: "Notion / People", score: 0.71, text: "Diwali (8–9 Nov) and Pongal are company holidays in all locations." },
    ],
  },
  "kb-finance": {
    q: "What is the approval matrix for vendor payments?",
    hits: [
      { doc: "AP Approval Matrix.xlsx", where: "Sheet 1", score: 0.9, text: "Payments up to **₹1,00,000**: Finance lead. Above ₹1,00,000: Finance lead **and** founder." },
      { doc: "GST SOP.docx", where: "§2 · ITC claims", score: 0.76, text: "Claim ITC only for invoices reflected in **GSTR-2B** for the period." },
    ],
  },
};

function hitsFor(kb: KnowledgeBase, q: string): Hit[] {
  if (kb.docs === 0 && kb.sources.every((s) => s.status !== "synced")) return [];
  const c = curated[kb.id];
  if (c) return c.hits;
  const words = q.split(/\s+/).filter((w) => w.length > 3).slice(0, 2);
  return kb.sources
    .filter((s) => s.status === "synced")
    .slice(0, 3)
    .map((s, i) => ({
      doc: s.label,
      where: `Passage ${i * 3 + 2}`,
      score: 0.88 - i * 0.07,
      text: `…relevant passage from ${s.label} mentioning ${words.length ? words.map((w) => `**${w}**`).join(" and ") : "your question"}, with the surrounding context Anvita would cite in an answer…`,
    }));
}

function highlight(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") ? (
      <mark key={i} className="rounded bg-saffron-soft px-0.5 text-foreground">
        {p.slice(2, -2)}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export default function KnowledgePage() {
  const kbs = useApp((s) => s.knowledgeBases);
  const update = useApp((s) => s.updateKnowledgeBase);
  const remove = useApp((s) => s.removeKnowledgeBase);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [q, setQ] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [results, setResults] = useState<Hit[]>([]);

  const kb = kbs.find((k) => k.id === selectedId) ?? kbs[0];
  const query = q ?? (kb ? curated[kb.id]?.q ?? "" : "");

  const select = (id: string) => {
    setSelectedId(id);
    setQ(null);
    setState("idle");
    setResults([]);
  };

  const syncSource = async (label: string) => {
    if (!kb) return;
    const id = kb.id;
    update(id, { sources: kb.sources.map((s) => (s.label === label ? { ...s, status: "syncing", lastSync: "syncing…" } : s)) });
    await sleep(1800);
    const fresh = useApp.getState().knowledgeBases.find((k) => k.id === id);
    if (!fresh) return;
    useApp.getState().updateKnowledgeBase(id, { sources: fresh.sources.map((s) => (s.label === label ? { ...s, status: "synced", lastSync: "just now" } : s)), updatedAt: "just now" });
    toast.success(`${label} synced`);
  };

  const removeSource = async (label: string) => {
    if (!kb) return;
    if (!(await confirm({ title: `Remove ${label}?`, description: "Its documents will be removed from this knowledge base. Workers will stop citing them.", confirmLabel: "Remove", danger: true }))) return;
    const src = kb.sources.find((s) => s.label === label);
    const sources = kb.sources.filter((s) => s.label !== label);
    update(kb.id, { sources, docs: sources.reduce((a, s) => a + s.docs, 0), chunks: Math.max(0, kb.chunks - (src?.docs ?? 0) * 14) });
    toast(`${label} removed`);
  };

  const deleteKb = async () => {
    if (!kb) return;
    const ok = await confirm({
      title: `Delete “${kb.name}”?`,
      description: kb.usedBy.length ? `Used by ${kb.usedBy.join(", ")}. Those Workers will lose access to these documents.` : "All indexed documents will be removed. This can't be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    remove(kb.id);
    setSelectedId(null);
    toast(`${kb.name} deleted`);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Knowledge"
        description="Sources Anvita and your Workers search to answer with citations. Permissions from the source are respected."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus /> New knowledge base
          </Button>
        }
      />

      {!kb ? (
        <div className="mt-6">
          <EmptyState icon={<BookOpen />} title="No knowledge bases yet" description="Create one and add Drive folders, Notion pages, websites or files. Workers answer from them with citations." action={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus /> New knowledge base</Button>} />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="flex flex-col gap-2">
            {kbs.map((k) => (
              <button key={k.id} onClick={() => select(k.id)} className={cn("rounded-xl border bg-card p-4 text-left transition-all cursor-pointer", kb.id === k.id ? "border-primary shadow-[0_0_0_3px] shadow-primary/10" : "border-border hover:border-primary/30")}>
                <div className="flex items-center gap-2">
                  <BookOpen className="size-4 text-primary" />
                  <p className="flex-1 truncate text-[14px] font-medium">{k.name}</p>
                  {k.sources.some((s) => s.status === "error") && <TriangleAlert className="size-4 text-danger" />}
                  {k.sources.some((s) => s.status === "syncing") && <Loader2 className="size-4 animate-spin text-info" />}
                </div>
                <p className="mt-1 text-[12.5px] text-muted-foreground">
                  {k.docs} docs · {k.chunks.toLocaleString("en-IN")} chunks · updated {k.updatedAt}
                </p>
                {k.sources.length > 0 && (
                  <div className="mt-2 flex gap-1">
                    {k.sources.map((s) => (
                      <AppLogo key={s.label} appId={s.appId} size={18} />
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="flex min-w-0 flex-col gap-6">
            <Card>
              <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle>{kb.name}</CardTitle>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{kb.description || "No description"}</p>
                  <p className="mt-2 text-[12px] text-muted-foreground">Used by: {kb.usedBy.length ? kb.usedBy.join(", ") : "not attached to any Worker yet"}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon-sm" variant="ghost" aria-label="Edit knowledge base" onClick={() => setEditOpen(true)}>
                    <Pencil />
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label="Delete knowledge base" className="hover:text-danger" onClick={deleteKb}>
                    <Trash2 />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSourceOpen(true)}>
                    <Upload /> Add source
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {kb.sources.length === 0 && (
                  <button onClick={() => setSourceOpen(true)} className="rounded-xl border border-dashed border-border p-6 text-center text-[13px] text-muted-foreground hover:border-primary/40 hover:text-foreground cursor-pointer">
                    No sources yet — add a Drive folder, Notion page, website or upload files.
                  </button>
                )}
                {kb.sources.map((s) => (
                  <div key={s.label} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3">
                    <AppLogo appId={s.appId} size={30} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium">{s.label}</p>
                      <p className="text-[12px] text-muted-foreground">
                        {s.docs} documents · last sync {s.lastSync} · auto-sync every 6 h
                      </p>
                    </div>
                    <Badge variant={s.status === "synced" ? "success" : s.status === "syncing" ? "info" : "danger"}>{s.status}</Badge>
                    <Button size="icon-sm" variant="ghost" aria-label={`Sync ${s.label} now`} disabled={s.status === "syncing"} onClick={() => syncSource(s.label)}>
                      <RefreshCw className={cn(s.status === "syncing" && "animate-spin")} />
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label={`Remove ${s.label}`} className="hover:text-danger" onClick={() => removeSource(s.label)}>
                      <X />
                    </Button>
                  </div>
                ))}
                {kb.sources.some((s) => s.status === "error") && (
                  <div className="flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-[13px]">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-danger" />
                    <div>
                      <p className="font-medium">Sync failed — the folder permission was revoked</p>
                      <p className="text-muted-foreground">Re-share the folder with the Anvita service account, then press sync to retry.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Test retrieval</CardTitle>
                <p className="text-[12.5px] text-muted-foreground">See exactly which passages a Worker would cite from “{kb.name}”.</p>
              </CardHeader>
              <CardContent>
                <form
                  className="flex gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!query.trim()) return;
                    setState("loading");
                    await sleep(800);
                    setResults(hitsFor(kb, query));
                    setState("done");
                  }}
                >
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={query} onChange={(e) => setQ(e.target.value)} className="pl-8" placeholder="Ask a question your users would ask" />
                  </div>
                  <Button type="submit" disabled={!query.trim()}>
                    {state === "loading" ? <Loader2 className="animate-spin" /> : "Search"}
                  </Button>
                </form>
                {state === "done" && results.length === 0 && (
                  <p className="mt-4 rounded-xl bg-subtle p-4 text-center text-[13px] text-muted-foreground">No matching passages. {kb.sources.length === 0 ? "Add a source first." : "Try different words or add more documents."}</p>
                )}
                {state === "done" && results.length > 0 && (
                  <div className="mt-4 flex flex-col gap-2">
                    {results.map((r, i) => (
                      <div key={r.doc + i} className="rounded-xl border border-border p-3.5">
                        <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
                          <span className="flex size-5 items-center justify-center rounded bg-primary-soft text-[11px] font-semibold text-primary">{i + 1}</span>
                          <FileText className="size-3.5 text-muted-foreground" />
                          <span className="font-medium">{r.doc}</span>
                          <span className="text-muted-foreground">{r.where}</span>
                          <span className="ml-auto font-mono text-[11px] text-muted-foreground">{r.score.toFixed(2)}</span>
                        </div>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{highlight(r.text)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <KbFormDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={select} />
      {kb && <KbFormDialog open={editOpen} onOpenChange={setEditOpen} kb={kb} />}
      {kb && <AddSourceDialog kb={kb} open={sourceOpen} onOpenChange={setSourceOpen} />}
    </PageContainer>
  );
}
