"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { get, isLive, post } from "@/lib/api";

interface Status {
  mode: "hybrid" | "keyword";
  provider: string;
  model: string | null;
  chunks: number;
  embedded: number;
}

/** Live mode: how knowledge search works here (keyword + semantic), and how much is indexed. */
export function SearchStatus() {
  const [s, setS] = useState<Status | null>(null);
  const refresh = () => get<Status>("/knowledge/status").then(setS, () => {});
  useEffect(() => {
    if (!isLive()) return;
    void refresh();
    const t = setInterval(refresh, 15_000);
    return () => clearInterval(t);
  }, []);
  if (!s) return null;
  const pending = s.mode === "hybrid" ? Math.max(0, s.chunks - s.embedded) : 0;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-[12.5px]">
      <Sparkles className="size-4 text-primary" />
      {s.mode === "hybrid" ? (
        <span>
          <span className="font-medium">Hybrid search</span> — keyword + meaning ({s.model}). {pending ? `Indexing ${pending} of ${s.chunks} passages…` : `${s.embedded} passages indexed.`}
        </span>
      ) : (
        <span>
          <span className="font-medium">Keyword search.</span> Semantic search turns on when the server has pgvector and an embeddings key.
        </span>
      )}
      {s.mode === "hybrid" && (
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
          onClick={async () => {
            try {
              await post("/knowledge/reindex");
              toast.success("Re-indexing missing passages");
              setTimeout(refresh, 2000);
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        >
          <RefreshCw /> Re-index
        </Button>
      )}
    </div>
  );
}
