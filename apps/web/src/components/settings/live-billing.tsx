"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Download, Loader2, Receipt } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { confirm } from "@/components/ui/confirm";
import { Field } from "@/components/settings/field";
import { apiBlob, get, post, put } from "@/lib/api";
import { load } from "@/lib/backend";
import { downloadFile } from "@/lib/download";
import { useApp } from "@/lib/store";
import { subscribeCheckout } from "@/lib/billing";
import { cn, formatCredits } from "@/lib/utils";

type PlanId = "starter" | "growth" | "business" | "enterprise";
interface Plan {
  id: PlanId;
  name: string;
  description: string;
  price: number | null;
  yearlyPrice: number | null;
  credits: number;
  limits: { members: number | null; workers: number | null; connections: number | null };
  featureLabels: string[];
}
export interface Subscription {
  plan: PlanId;
  interval: "month" | "year";
  status: "trialing" | "active" | "past_due" | "cancelled";
  provider: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  pendingPlan: string | null;
}
interface PlansResponse {
  plans: Plan[];
  subscription: Subscription;
  usage: { members: number; workers: number; connections: number };
  providers: { razorpay: boolean; stripe: boolean };
}
interface Invoice {
  id: string;
  number: string;
  kind: "subscription" | "credits";
  status: "paid" | "due" | "void";
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  description: string;
  issuedAt: string;
}
interface Profile {
  legalName: string;
  gstin: string;
  address: string;
  stateCode: string;
  country: string;
  email: string;
}

const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const limit = (n: number | null, what: string) => (n === null ? `Unlimited ${what}` : `${n} ${what}`);

/** Live mode: plan catalogue, current subscription and usage against the plan's limits. */
export function LivePlans() {
  const [data, setData] = useState<PlansResponse | null>(null);
  const [yearly, setYearly] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const profile = useApp((s) => s.profile);
  const reload = () => get<PlansResponse>("/billing/plans").then(setData, (e) => toast.error((e as Error).message));
  useEffect(() => {
    void reload();
  }, []);
  if (!data) return <Card className="mt-6 p-5 text-[13px] text-muted-foreground">Loading plans…</Card>;
  const { subscription: sub, usage } = data;
  const current = data.plans.find((p) => p.id === sub.plan) ?? data.plans[0];

  const choose = async (p: Plan) => {
    if (p.id === "enterprise") {
      window.location.href = "mailto:sales@anvita.ai?subject=Anvita%20Enterprise";
      return;
    }
    const downgrade = (p.price ?? 0) < (current.price ?? 0);
    if (downgrade && !(await confirm({ title: `Move to ${p.name}?`, description: p.id === "starter" ? "Paid features stop at the end of the current period. Limits above Starter (members, Workers, connections) stop new additions." : "The new plan starts with your next billing period.", confirmLabel: `Switch to ${p.name}` }))) return;
    setBusy(p.id);
    try {
      const r = await subscribeCheckout(p.id, yearly ? "year" : "month", { name: profile.name, email: profile.email });
      if (r === "redirected") return;
      if (r === "activated") toast.success(`You're on ${p.name}`);
      if (r === "scheduled") toast.success(`${p.name} starts when the current period ends`);
      if (r === "paid") toast.success(`Payment received — ${p.name} activates as soon as the provider confirms it`);
      await Promise.all([reload(), load.workspace()]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const meter = (label: string, used: number, max: number | null) => (
    <div>
      <div className="flex justify-between text-[12px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          {used} / {max ?? "∞"}
        </span>
      </div>
      <Progress value={max ? Math.min(100, (used / max) * 100) : 4} className="mt-1 h-1.5" tone={max && used >= max ? "warning" : "primary"} />
    </div>
  );

  return (
    <>
      <Card className="mt-6 p-5" data-testid="subscription">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[12.5px] text-muted-foreground">Current plan</p>
            <p className="mt-1 flex items-center gap-2 text-lg font-semibold">
              {current.name}
              {sub.status === "trialing" && <Badge variant="primary">Trial</Badge>}
              {sub.status === "past_due" && <Badge variant="danger">Payment due</Badge>}
              {sub.cancelAtPeriodEnd && <Badge variant="warning">Ends {day(sub.currentPeriodEnd)}</Badge>}
            </p>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              {sub.status === "trialing"
                ? `Trial ends ${day(sub.trialEndsAt ?? sub.currentPeriodEnd)} — then Starter unless you choose a plan`
                : sub.cancelAtPeriodEnd
                  ? `Moves to ${sub.pendingPlan ?? "Starter"} on ${day(sub.currentPeriodEnd)}`
                  : current.price
                    ? `${inr(sub.interval === "year" ? current.yearlyPrice ?? 0 : current.price)} + GST per ${sub.interval} · renews ${day(sub.currentPeriodEnd)}${sub.provider === "manual" ? " (invoiced)" : ""}`
                    : `Free · ${formatCredits(current.credits)} credits every month`}
            </p>
          </div>
          <div className="flex gap-2">
            {sub.cancelAtPeriodEnd && sub.provider !== "razorpay" ? (
              <Button size="sm" variant="outline" onClick={async () => { await post("/billing/subscription/resume"); toast.success("Subscription resumed"); void reload(); }}>
                Keep {current.name}
              </Button>
            ) : (
              sub.plan !== "starter" &&
              !sub.cancelAtPeriodEnd && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    if (!(await confirm({ title: sub.status === "trialing" ? "End the trial now?" : `Cancel ${current.name}?`, description: sub.status === "trialing" ? "The workspace moves to Starter immediately." : `You keep ${current.name} until ${day(sub.currentPeriodEnd)}, then move to Starter.`, confirmLabel: "Cancel plan", danger: true }))) return;
                    try {
                      await post("/billing/subscription/cancel");
                      toast("Plan cancelled");
                      await Promise.all([reload(), load.workspace()]);
                    } catch (e) {
                      toast.error((e as Error).message);
                    }
                  }}
                >
                  Cancel plan
                </Button>
              )
            )}
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {meter("Members", usage.members, current.limits.members)}
          {meter("Workers", usage.workers, current.limits.workers)}
          {meter("Connected apps", usage.connections, current.limits.connections)}
        </div>
      </Card>

      <div className="mb-3 mt-8 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold">Plans</h3>
        <div className="inline-flex rounded-lg bg-muted p-0.5 text-[12.5px]" role="group" aria-label="Billing period">
          {[false, true].map((y) => (
            <button key={String(y)} onClick={() => setYearly(y)} className={cn("rounded-md px-3 py-1.5 cursor-pointer", yearly === y ? "bg-card font-medium shadow-sm" : "text-muted-foreground")}>
              {y ? "Yearly · 2 months free" : "Monthly"}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {data.plans.map((p) => {
          const isCurrent = p.id === sub.plan && (p.price === 0 || sub.status === "trialing" || (sub.interval === "year") === yearly);
          const price = p.price === null ? "Custom" : p.price === 0 ? "₹0" : inr(yearly ? p.yearlyPrice ?? 0 : p.price);
          return (
            <div key={p.id} data-testid={`plan-${p.id}`} className={cn("flex flex-col rounded-2xl border bg-card p-5", p.id === sub.plan ? "border-primary shadow-[0_0_0_3px] shadow-primary/15" : "border-border")}>
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-semibold">{p.name}</p>
                {p.id === sub.plan && <Badge variant="primary">{sub.status === "trialing" ? "Trial" : "Current"}</Badge>}
              </div>
              <p className="mt-2 text-2xl font-semibold">{price}</p>
              <p className="text-[12px] text-muted-foreground">{p.price === null ? "talk to us" : p.price === 0 ? "free forever" : `+ GST per workspace / ${yearly ? "year" : "month"}`}</p>
              <p className="mt-2 text-[12.5px] text-muted-foreground">{p.description}</p>
              <ul className="mt-4 flex flex-1 flex-col gap-1.5 text-[13px]">
                {[`${formatCredits(p.credits)} credits / month`, limit(p.limits.members, "members"), limit(p.limits.workers, "Workers"), limit(p.limits.connections, "connected apps"), ...p.featureLabels].map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-success" /> {f}
                  </li>
                ))}
              </ul>
              <Button variant={isCurrent && sub.status !== "trialing" ? "secondary" : p.id === "business" ? "default" : "outline"} className="mt-4" disabled={(isCurrent && sub.status !== "trialing") || busy !== null} onClick={() => void choose(p)}>
                {busy === p.id && <Loader2 className="animate-spin" />}
                {isCurrent && sub.status !== "trialing" ? "Current plan" : p.id === "enterprise" ? "Talk to sales" : sub.status === "trialing" && p.id === sub.plan ? `Subscribe to ${p.name}` : `Choose ${p.name}`}
              </Button>
            </div>
          );
        })}
      </div>
      {!data.providers.razorpay && !data.providers.stripe && <p className="mt-2 text-[12px] text-muted-foreground">No payment provider is configured on this server — plan changes take effect immediately and are invoiced for offline payment.</p>}
    </>
  );
}

/** GST details printed on invoices. */
export function BillingProfileCard() {
  const [p, setP] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    get<Profile>("/billing/profile").then(setP, () => {});
  }, []);
  if (!p) return null;
  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) => setP({ ...p, [k]: e.target.value });
  return (
    <Card className="p-5">
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          try {
            setP(await put<Profile>("/billing/profile", { legalName: p.legalName, gstin: p.gstin, address: p.address, email: p.email }));
            toast.success("Billing details saved");
          } catch (err) {
            toast.error((err as Error).message);
          } finally {
            setSaving(false);
          }
        }}
      >
        <Field label="Legal name">
          <Input value={p.legalName} onChange={set("legalName")} placeholder="Kesar Foods Pvt Ltd" aria-label="Legal name" />
        </Field>
        <Field label="GSTIN" hint="Leave empty if you aren't GST-registered. Sets the place of supply.">
          <Input value={p.gstin} onChange={set("gstin")} placeholder="27AAKCK4410C1ZP" className="font-mono uppercase" maxLength={15} aria-label="GSTIN" />
        </Field>
        <Field label="Billing address">
          <Input value={p.address} onChange={set("address")} placeholder="Street, city, PIN" aria-label="Billing address" />
        </Field>
        <Field label="Invoice email">
          <Input type="email" value={p.email} onChange={set("email")} placeholder="accounts@company.in" aria-label="Invoice email" />
        </Field>
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit" size="sm" disabled={saving}>
            {saving && <Loader2 className="animate-spin" />} Save billing details
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** Tax invoices with PDF download. */
export function LiveInvoices() {
  const [rows, setRows] = useState<Invoice[] | null>(null);
  useEffect(() => {
    get<{ data: Invoice[] }>("/billing/invoices").then((r) => setRows(r.data), () => setRows([]));
  }, []);
  return (
    <Card className="divide-y divide-border" data-testid="invoices">
      {rows === null && <p className="px-5 py-4 text-[13px] text-muted-foreground">Loading…</p>}
      {rows?.length === 0 && <p className="px-5 py-4 text-[13px] text-muted-foreground">No invoices yet — they appear here for every subscription charge and credit purchase.</p>}
      {rows?.map((i) => (
        <div key={i.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-[13px]">
          <Receipt className="size-4 text-muted-foreground" />
          <span className="font-mono text-[12px]">{i.number}</span>
          <span className="min-w-0 flex-1 truncate text-muted-foreground">
            {i.description} · {day(i.issuedAt)}
          </span>
          <span className="text-[11.5px] text-muted-foreground tabular-nums">{i.igst ? `IGST ${inr(i.igst)}` : i.cgst ? `CGST+SGST ${inr(i.cgst + i.sgst)}` : "Zero-rated"}</span>
          <span className="font-medium tabular-nums">{inr(i.total)}</span>
          <Badge variant={i.status === "paid" ? "success" : i.status === "due" ? "warning" : "default"} className="capitalize">
            {i.status}
          </Badge>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Download ${i.number}`}
            onClick={async () => {
              try {
                downloadFile(`${i.number.replaceAll("/", "-")}.pdf`, await apiBlob(`/billing/invoices/${i.id}/pdf`));
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          >
            <Download />
          </Button>
        </div>
      ))}
    </Card>
  );
}
