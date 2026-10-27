import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { AppStack } from "@/components/brand/app-logo";
import { templates } from "@/lib/mock/workers";

export function TemplatesGrid() {
  const route: Record<string, string> = { "tpl-support": "support", "tpl-report": "growth-report", "tpl-invoice": "invoices", "tpl-it": "it-voice", "tpl-sdr": "sdr", "tpl-onboard": "onboarding" };
  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {templates.map((t) => (
        <Link key={t.id} href={`/workers/${route[t.id] ?? "support"}?template=${t.id}`} className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-soft">
          <div className="flex items-start justify-between">
            <span className="flex size-10 items-center justify-center rounded-xl text-xl" style={{ background: t.color + "1f" }}>
              {t.emoji}
            </span>
            {t.popular && <Badge variant="saffron">Popular</Badge>}
          </div>
          <p className="mt-3 text-[14.5px] font-semibold">{t.name}</p>
          <p className="mt-1 flex-1 text-[13px] text-muted-foreground">{t.description}</p>
          <div className="mt-4 flex items-center justify-between">
            <AppStack apps={t.apps} size={20} />
            <span className="text-[12px] text-muted-foreground">
              {t.category} · {t.installs} installs
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
