"use client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { AppStack } from "@/components/brand/app-logo";
import { templates } from "@/lib/mock/workers";
import { useApp } from "@/lib/store";
import { workerFromTemplate } from "./factory";

export function TemplatesGrid() {
  const router = useRouter();
  const addWorker = useApp((s) => s.addWorker);
  const owner = useApp((s) => s.profile.name);
  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {templates.map((t) => (
        <button
          key={t.id}
          onClick={() => {
            const w = workerFromTemplate(t, owner);
            addWorker(w);
            toast.success(`“${w.name}” created from template — connect apps and run the tests`);
            router.push(`/workers/${w.id}?template=${t.id}`);
          }}
          className="group flex flex-col rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-primary/30 hover:shadow-soft cursor-pointer"
        >
          <div className="flex w-full items-start justify-between">
            <span className="flex size-10 items-center justify-center rounded-xl text-xl" style={{ background: t.color + "1f" }}>
              {t.emoji}
            </span>
            {t.popular && <Badge variant="saffron">Popular</Badge>}
          </div>
          <p className="mt-3 text-[14.5px] font-semibold">{t.name}</p>
          <p className="mt-1 flex-1 text-[13px] text-muted-foreground">{t.description}</p>
          <div className="mt-4 flex w-full items-center justify-between">
            <AppStack apps={t.apps} size={20} />
            <span className="text-[12px] text-muted-foreground">
              {t.category} · {t.installs} installs
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
