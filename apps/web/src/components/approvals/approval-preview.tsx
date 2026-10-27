import type { Approval } from "@/lib/types";

export function ApprovalPreview({ approval, editable, onBodyChange, bodyOverride }: { approval: Approval; editable?: boolean; onBodyChange?: (v: string) => void; bodyOverride?: string }) {
  const p = approval.preview;
  if (p.kind === "email") {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-subtle text-[13px]">
        <div className="space-y-1 border-b border-border px-3.5 py-2.5">
          <div className="flex gap-2">
            <span className="w-14 shrink-0 text-muted-foreground">To</span>
            <span className="flex flex-wrap gap-1">
              {p.to.map((t) => (
                <span key={t} className={`rounded px-1.5 py-0.5 text-[12px] ${t.endsWith("kesarfoods.in") ? "bg-muted" : "bg-warning-soft text-warning font-medium"}`}>
                  {t}
                </span>
              ))}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="w-14 shrink-0 text-muted-foreground">Subject</span>
            <span className="font-medium">{p.subject}</span>
          </div>
        </div>
        {editable ? (
          <textarea aria-label="Email body" defaultValue={bodyOverride ?? p.body} onChange={(e) => onBodyChange?.(e.target.value)} rows={8} className="block w-full resize-y bg-card px-3.5 py-3 leading-relaxed outline-none" />
        ) : (
          <p className="whitespace-pre-line px-3.5 py-3 leading-relaxed">{bodyOverride ?? p.body}</p>
        )}
      </div>
    );
  }
  if (p.kind === "payment") {
    return (
      <div className="rounded-xl border border-border bg-subtle p-3.5 text-[13px]">
        <div className="flex items-baseline justify-between">
          <span className="text-muted-foreground">Amount</span>
          <span className="text-xl font-semibold tabular-nums">{p.amount}</span>
        </div>
        <div className="mt-2 flex justify-between gap-4">
          <span className="text-muted-foreground">Payee</span>
          <span className="text-right">{p.payee}</span>
        </div>
        <div className="mt-1 flex justify-between gap-4">
          <span className="shrink-0 text-muted-foreground">Reference</span>
          <span className="text-right">{p.reference}</span>
        </div>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-border text-[13px]">
      <div className="border-b border-border bg-subtle px-3.5 py-2 font-medium">{p.record}</div>
      <table className="w-full">
        <tbody>
          {p.changes.map((c) => (
            <tr key={c.field} className="border-b border-border last:border-0">
              <td className="w-28 px-3.5 py-2 text-muted-foreground">{c.field}</td>
              <td className="px-2 py-2 text-muted-foreground line-through decoration-danger/60">{c.from}</td>
              <td className="px-2 py-2 font-medium text-success">{c.to}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
