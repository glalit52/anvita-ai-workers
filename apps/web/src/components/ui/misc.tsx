import { cn } from "@/lib/utils";

export function Kbd({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1 font-mono text-[10px] text-muted-foreground", className)}
      {...props}
    />
  );
}

export function Separator({ className, vertical }: { className?: string; vertical?: boolean }) {
  return <div className={cn(vertical ? "w-px self-stretch" : "h-px w-full", "bg-border", className)} />;
}

export function StatusDot({ tone = "success", pulse }: { tone?: "success" | "warning" | "danger" | "muted" | "primary"; pulse?: boolean }) {
  const tones = { success: "bg-success", warning: "bg-warning", danger: "bg-danger", muted: "bg-muted-foreground/50", primary: "bg-primary" };
  return (
    <span className="relative inline-flex size-2">
      {pulse && <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", tones[tone])} />}
      <span className={cn("relative inline-flex size-2 rounded-full", tones[tone])} />
    </span>
  );
}

export function EmptyState({ icon, title, description, action }: { icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-10 text-center">
      <div className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary [&_svg]:size-5">{icon}</div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: string; actions?: React.ReactNode; eyebrow?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <div className="mb-1.5">{eyebrow}</div>}
        <h1 className="text-[22px] font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, delta, hint }: { label: string; value: React.ReactNode; delta?: { value: string; positive?: boolean }; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
        {delta && (
          <span className={cn("text-[12px] font-medium", delta.positive ? "text-success" : "text-danger")}>{delta.value}</span>
        )}
      </div>
      {hint && <p className="mt-1 text-[12px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
