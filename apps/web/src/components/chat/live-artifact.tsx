"use client";
import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, FileSpreadsheet, Loader2, Lock, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/ui/markdown";
import { Tooltip as UITooltip } from "@/components/ui/tooltip";
import { apiBlob, get } from "@/lib/api";
import { parseCSV } from "@/lib/download";
import type { Artifact } from "@/lib/types";

interface Meta {
  id: string;
  title: string;
  subtitle?: string | null;
  mime: string;
  size: string;
}

/** Real artifact preview (live mode): PDFs, images, CSV tables, sandboxed HTML, Markdown/JSON/text. */
export function LiveArtifactPanel({ artifact, onClose }: { artifact: Artifact; onClose: () => void }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setMeta(null);
    setBlob(null);
    setText(null);
    setError(null);
    (async () => {
      try {
        const m = await get<Meta>(`/artifacts/${artifact.id}`);
        const b = await apiBlob(`/artifacts/${artifact.id}/content`);
        if (!alive) return;
        setMeta(m);
        setBlob(b);
        if (/^(text\/|application\/(json|xml))|svg/.test(m.mime) && !m.mime.includes("svg")) setText(await b.text());
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    })();
    return () => {
      alive = false;
    };
  }, [artifact.id]);

  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);

  const download = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = artifact.title;
    a.click();
    toast.success(`Downloaded ${artifact.title}`);
  };

  const mime = meta?.mime ?? "";
  const csv = text !== null && /csv|tab-separated/.test(mime) ? parseCSV(mime.includes("tab") ? text.replace(/\t/g, ",") : text) : null;
  const columns = csv?.length ? Object.keys(csv[0]) : [];

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold">{artifact.title}</p>
          <p className="truncate text-[12px] text-muted-foreground">{[artifact.subtitle, meta?.size].filter(Boolean).join(" · ")}</p>
        </div>
        <Badge variant="outline">
          <Lock /> Workspace only
        </Badge>
        <UITooltip content="Download">
          <Button variant="ghost" size="icon-sm" onClick={download} disabled={!url} aria-label="Download">
            <Download />
          </Button>
        </UITooltip>
        {url && (mime === "application/pdf" || mime.startsWith("image/")) && (
          <UITooltip content="Open in new tab">
            <Button variant="ghost" size="icon-sm" aria-label="Open in new tab" onClick={() => window.open(url, "_blank")}>
              <ExternalLink />
            </Button>
          </UITooltip>
        )}
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close preview">
          <X />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-5 scrollbar-thin" data-testid="artifact-preview">
        {error ? (
          <p className="rounded-lg bg-danger-soft p-3 text-[13px] text-danger">{error}</p>
        ) : !meta || !url ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : mime === "application/pdf" ? (
          <iframe title={artifact.title} src={url} className="h-full min-h-[70vh] w-full rounded-lg border border-border bg-white" />
        ) : mime.startsWith("image/") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={artifact.title} className="mx-auto max-w-full rounded-lg border border-border bg-white" />
        ) : mime === "text/html" ? (
          <iframe title={artifact.title} sandbox="allow-scripts" srcDoc={text ?? ""} className="h-full min-h-[70vh] w-full rounded-lg border border-border bg-white" />
        ) : csv ? (
          <div className="overflow-auto rounded-lg border border-border bg-card">
            <table className="w-full text-[12px]">
              <thead className="bg-subtle">
                <tr>
                  {columns.map((c) => (
                    <th key={c} className="whitespace-nowrap px-3 py-2 text-left font-semibold">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csv.slice(0, 300).map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    {columns.map((c) => (
                      <td key={c} className="whitespace-nowrap px-3 py-1.5 tabular-nums">
                        {r[c]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {csv.length > 300 && <p className="px-3 py-2 text-[12px] text-muted-foreground">Showing 300 of {csv.length} rows — download for the rest.</p>}
          </div>
        ) : mime === "text/markdown" ? (
          <div className="rounded-lg bg-card p-5 text-[13.5px]">
            <Markdown text={text ?? ""} />
          </div>
        ) : text !== null ? (
          <pre className="whitespace-pre-wrap rounded-lg bg-card p-4 font-mono text-[12px]">{mime.includes("json") ? (() => { try { return JSON.stringify(JSON.parse(text), null, 2); } catch { return text; } })() : text}</pre>
        ) : (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-[13px] text-muted-foreground">
            <FileSpreadsheet className="size-8" />
            <p>{/spreadsheet|excel/.test(mime) ? "Excel workbook" : "This file type can't be previewed here."}</p>
            <Button onClick={download}>
              <Download /> Download {artifact.title}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
