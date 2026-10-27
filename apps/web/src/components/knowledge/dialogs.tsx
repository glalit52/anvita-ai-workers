"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Globe, Loader2, Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { AppLogo } from "@/components/brand/app-logo";
import { useApp } from "@/lib/store";
import type { KnowledgeBase } from "@/lib/types";
import { formatBytes } from "@/lib/download";
import { cn } from "@/lib/utils";

type Source = KnowledgeBase["sources"][number];

export function KbFormDialog({ open, onOpenChange, kb, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; kb?: KnowledgeBase; onCreated?: (id: string) => void }) {
  const add = useApp((s) => s.addKnowledgeBase);
  const update = useApp((s) => s.updateKnowledgeBase);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) {
      setName(kb?.name ?? "");
      setDescription(kb?.description ?? "");
    }
  }, [open, kb]);

  const submit = () => {
    if (!name.trim()) return;
    if (kb) {
      update(kb.id, { name: name.trim(), description: description.trim(), updatedAt: "just now" });
      toast.success("Knowledge base updated");
    } else {
      const id = add({ name: name.trim(), description: description.trim() });
      toast.success(`“${name.trim()}” created — add a source to fill it`);
      onCreated?.(id);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{kb ? "Edit knowledge base" : "New knowledge base"}</DialogTitle>
        <DialogDescription className="mt-1">Group the documents a Worker should search. Answers always cite these sources.</DialogDescription>
        <form
          className="mt-5 grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="kb-name">Name</Label>
            <Input id="kb-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Vendor contracts" autoFocus />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="kb-desc">Description</Label>
            <Textarea id="kb-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's in it and who should use it" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              {kb ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type Kind = "gdrive" | "notion" | "sharepoint" | "web" | "upload";

const kinds: { id: Kind; label: string; appId: string; hint: string; placeholder?: string }[] = [
  { id: "gdrive", label: "Google Drive", appId: "gdrive", hint: "A folder — sub-folders included", placeholder: "Drive / Policies" },
  { id: "notion", label: "Notion", appId: "notion", hint: "A page or database and its children", placeholder: "Notion / Support wiki" },
  { id: "sharepoint", label: "SharePoint", appId: "outlook", hint: "A site or document library", placeholder: "Finance / Shared Documents" },
  { id: "web", label: "Website", appId: "web", hint: "Crawls the URL and pages under it", placeholder: "https://help.example.com" },
  { id: "upload", label: "Upload files", appId: "sandbox", hint: "PDF, DOCX, XLSX, PPTX, TXT, images" },
];

/** Adds a source to a KB, then simulates indexing (syncing → synced). */
export function startSourceSync(kbId: string, source: Source, delay = 2400) {
  const { knowledgeBases, updateKnowledgeBase } = useApp.getState();
  const kb = knowledgeBases.find((k) => k.id === kbId);
  if (!kb) return;
  updateKnowledgeBase(kbId, { sources: [...kb.sources, source], updatedAt: "syncing" });
  setTimeout(() => {
    const fresh = useApp.getState().knowledgeBases.find((k) => k.id === kbId);
    if (!fresh) return;
    const sources = fresh.sources.map((s) => (s.label === source.label && s.status === "syncing" ? { ...s, status: "synced" as const, lastSync: "just now" } : s));
    const docs = sources.reduce((a, s) => a + s.docs, 0);
    useApp.getState().updateKnowledgeBase(kbId, { sources, docs, chunks: fresh.chunks + source.docs * 14, updatedAt: "just now" });
    toast.success(`${source.label} indexed — ${source.docs} documents`);
  }, delay);
}

export function AddSourceDialog({ kb, open, onOpenChange }: { kb: KnowledgeBase; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [kind, setKind] = useState<Kind>("gdrive");
  const [path, setPath] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const meta = kinds.find((k) => k.id === kind)!;
  const urlOk = kind !== "web" || /^https?:\/\/\S+\.\S+/.test(path.trim());
  const valid = kind === "upload" ? files.length > 0 : path.trim().length > 1 && urlOk;

  const reset = () => {
    setKind("gdrive");
    setPath("");
    setFiles([]);
    setBusy(false);
  };

  const submit = () => {
    if (!valid) return;
    setBusy(true);
    const docs = kind === "upload" ? files.length : kind === "web" ? 20 + (path.length % 60) : 6 + (path.length % 30);
    const label = kind === "upload" ? (files.length === 1 ? files[0].name : `${files.length} uploaded files`) : kind === "web" ? path.trim().replace(/^https?:\/\//, "").replace(/\/$/, "") : path.trim();
    startSourceSync(kb.id, { appId: meta.appId, label, docs, status: "syncing", lastSync: "syncing…" });
    toast(`Indexing ${label}…`);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogTitle>Add a source to {kb.name}</DialogTitle>
        <DialogDescription className="mt-1">Anvita keeps sources in sync and respects the original sharing permissions.</DialogDescription>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {kinds.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => {
                setKind(k.id);
                setPath("");
              }}
              className={cn("flex flex-col items-center gap-2 rounded-xl border p-3 text-[12px] font-medium cursor-pointer", kind === k.id ? "border-primary bg-primary-soft/40" : "border-border hover:bg-subtle")}
            >
              {k.id === "upload" ? (
                <span className="flex size-7 items-center justify-center rounded-[28%] bg-muted">
                  <Upload className="size-4" />
                </span>
              ) : k.id === "web" ? (
                <span className="flex size-7 items-center justify-center rounded-[28%] bg-muted">
                  <Globe className="size-4" />
                </span>
              ) : (
                <AppLogo appId={k.appId} size={28} />
              )}
              {k.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[12.5px] text-muted-foreground">{meta.hint}</p>

        {kind === "upload" ? (
          <div className="mt-3">
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.png,.jpg,.jpeg"
              className="hidden"
              onChange={(e) => {
                const list = Array.from(e.target.files ?? []);
                setFiles((f) => [...f, ...list.filter((n) => !f.some((x) => x.name === n.name))]);
                e.target.value = "";
              }}
            />
            <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border p-6 text-[13px] text-muted-foreground hover:border-primary/40 hover:text-foreground cursor-pointer">
              <Upload className="size-5" /> Choose files
            </button>
            {files.length > 0 && (
              <div className="mt-3 max-h-48 overflow-y-auto rounded-xl border border-border scrollbar-thin">
                {files.map((f) => (
                  <div key={f.name} className="flex items-center gap-2 border-b border-border px-3 py-2 text-[13px] last:border-0">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{f.name}</span>
                    <span className="text-[12px] text-muted-foreground">{formatBytes(f.size)}</span>
                    <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((x) => x.filter((y) => y.name !== f.name))} className="rounded p-0.5 text-muted-foreground hover:text-danger cursor-pointer">
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3 grid gap-1.5">
            <Label htmlFor="src-path">{kind === "web" ? "Website URL" : "Folder or page"}</Label>
            <Input id="src-path" value={path} onChange={(e) => setPath(e.target.value)} placeholder={meta.placeholder} className={cn(!urlOk && path && "border-danger")} />
            {!urlOk && path && <p className="text-[11.5px] text-danger">Enter a full URL, e.g. https://help.example.com</p>}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!valid || busy}>
            {busy && <Loader2 className="animate-spin" />} Add & index
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
