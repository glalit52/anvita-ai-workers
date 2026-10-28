"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, CreditCard, Download, Loader2, Smartphone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SectionHeader, SettingRow } from "@/components/settings-section";
import { Field } from "@/components/settings/field";
import { useApp, useSetting } from "@/lib/store";
import { downloadFile } from "@/lib/download";
import { isLive } from "@/lib/api";
import { checkout, useBillingInfo, type BillingInfo } from "@/lib/billing";
import { cn, formatCredits, sleep } from "@/lib/utils";

const plans = [
  { name: "Starter", price: "₹0", sub: "trial credits", features: ["2,000 trial credits", "Slack or WhatsApp", "Ask Anvita + 1 Worker"] },
  { name: "Team", price: "₹4,999", sub: "per workspace / month", features: ["50,000 credits", "All chat channels", "Unlimited Workers", "Approvals & audit log"] },
  { name: "Business", price: "₹19,999", sub: "per workspace / month", features: ["2,00,000 credits", "Studio + evals + versions", "Voice Workers", "SSO & SCIM"] },
  { name: "Enterprise", price: "Custom", sub: "outcome-based pricing", features: ["Pay per resolved outcome", "VPC / on-prem", "Custom DPA & SLAs", "Dedicated success team"] },
];

const packs = [
  { credits: 50000, price: 4999 },
  { credits: 100000, price: 8999, tag: "Save 10%" },
  { credits: 250000, price: 19999, tag: "Save 20%" },
];

const invoices = [
  { id: "INV-2026-10", date: "01 Oct 2026", amount: 23599 },
  { id: "INV-2026-09", date: "01 Sep 2026", amount: 23599 },
  { id: "INV-2026-08", date: "01 Aug 2026", amount: 5899 },
];

const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

function TopUpDialog({ open, onOpenChange, payment, info }: { open: boolean; onOpenChange: (o: boolean) => void; payment: string; info: BillingInfo | null }) {
  const buy = useApp((s) => s.buyCredits);
  const profile = useApp((s) => s.profile);
  const [pick, setPick] = useState(1);
  const [paying, setPaying] = useState(false);
  // Live: prices come from the server (incl. volume discount); tax is added at checkout.
  const livePacks = isLive() && info?.packs.length ? info.packs.map((p) => ({ credits: p.credits, price: p.price, tag: p.discount ? `Save ${Math.round(p.discount * 100)}%` : undefined, total: p.total })) : null;
  const list: { credits: number; price: number; tag?: string; total?: number }[] = livePacks ?? packs;
  const pack = list[Math.min(pick, list.length - 1)];
  const provider = info?.razorpay ? "Razorpay (UPI, cards, netbanking)" : info?.stripe ? "Stripe Checkout" : null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Buy a credit top-up</DialogTitle>
        <DialogDescription className="mt-1">Top-up credits never expire and are used after your monthly plan credits.</DialogDescription>
        <div className="mt-5 grid gap-2">
          {list.map((p, i) => (
            <button
              key={p.credits}
              onClick={() => setPick(i)}
              className={cn("flex items-center gap-3 rounded-xl border p-3.5 text-left cursor-pointer", pick === i ? "border-primary bg-primary-soft/40" : "border-border hover:bg-subtle")}
            >
              <span className={cn("flex size-4 items-center justify-center rounded-full border", pick === i ? "border-primary" : "border-input")}>{pick === i && <span className="size-2 rounded-full bg-primary" />}</span>
              <span className="flex-1 text-[14px] font-medium tabular-nums">{formatCredits(p.credits)} credits</span>
              {p.tag && <Badge variant="success">{p.tag}</Badge>}
              <span className="text-[14px] font-semibold tabular-nums">{inr(p.price)}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-muted-foreground">
          + {Math.round((info?.taxRate ?? 0.18) * 100)}% GST ({inr(Math.round(pack.price * (info?.taxRate ?? 0.18)))}) · {isLive() ? (provider ? `pay with ${provider}` : "recorded as a manual top-up (no payment provider configured)") : `charged to ${payment}`}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={paying}
            onClick={async () => {
              setPaying(true);
              if (isLive() && provider) {
                try {
                  const result = await checkout(pack.credits, { name: profile.name, email: profile.email });
                  if (result === "paid") {
                    toast.success(`${formatCredits(pack.credits)} credits added`);
                    onOpenChange(false);
                  }
                  if (result === "redirected") return;
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Payment failed");
                }
                setPaying(false);
                return;
              }
              await sleep(1100);
              buy(pack.credits);
              setPaying(false);
              onOpenChange(false);
              toast.success(isLive() ? `${formatCredits(pack.credits)} credits added` : `${formatCredits(pack.credits)} credits added — GST invoice emailed`);
            }}
          >
            {paying ? <Loader2 className="animate-spin" /> : <CreditCard />} Pay {inr(pack.total ?? Math.round(pack.price * (1 + (info?.taxRate ?? 0.18))))}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PaymentDialog({ open, onOpenChange, onSave }: { open: boolean; onOpenChange: (o: boolean) => void; onSave: (label: string) => void }) {
  const [method, setMethod] = useState<"upi" | "card">("upi");
  const [upi, setUpi] = useState("");
  const [card, setCard] = useState("");
  const [exp, setExp] = useState("");
  const [touched, setTouched] = useState(false);
  const upiOk = /^[\w.\-]{2,}@[a-z]{2,}$/i.test(upi.trim());
  const digits = card.replace(/\D/g, "");
  const cardOk = digits.length >= 15 && digits.length <= 16 && /^\d{2}\/\d{2}$/.test(exp);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Update payment method</DialogTitle>
        <div className="mt-4 inline-flex rounded-lg bg-muted p-0.5 text-[12.5px]">
          {(["upi", "card"] as const).map((m) => (
            <button key={m} onClick={() => setMethod(m)} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 cursor-pointer", method === m ? "bg-card font-medium shadow-sm" : "text-muted-foreground")}>
              {m === "upi" ? <Smartphone className="size-3.5" /> : <CreditCard className="size-3.5" />} {m === "upi" ? "UPI AutoPay" : "Card"}
            </button>
          ))}
        </div>
        <form
          className="mt-4 grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (method === "upi" ? !upiOk : !cardOk) return;
            onSave(method === "upi" ? `UPI AutoPay · ${upi.trim()}` : `Card ending ${digits.slice(-4)} · exp ${exp}`);
          }}
        >
          {method === "upi" ? (
            <Field label="UPI ID" hint="You'll approve a one-time AutoPay mandate in your UPI app." error={touched && !upiOk ? "Enter a valid UPI ID like name@okhdfc" : undefined}>
              <Input value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="priya@okicici" autoFocus />
            </Field>
          ) : (
            <>
              <Field label="Card number" error={touched && !(digits.length >= 15 && digits.length <= 16) ? "Enter a valid card number" : undefined}>
                <Input inputMode="numeric" value={card} onChange={(e) => setCard(e.target.value.replace(/[^\d ]/g, "").slice(0, 19))} placeholder="4111 1111 1111 1111" autoFocus />
              </Field>
              <Field label="Expiry (MM/YY)" error={touched && !/^\d{2}\/\d{2}$/.test(exp) ? "Use MM/YY" : undefined}>
                <Input value={exp} onChange={(e) => setExp(e.target.value.slice(0, 5))} placeholder="08/29" className="w-28" />
              </Field>
            </>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save payment method</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function BillingPage() {
  const workspace = useApp((s) => s.workspaceInfo);
  const { info: billing, payments, refresh: refreshBilling } = useBillingInfo();
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const c = q.get("checkout");
    if (!c) return;
    if (c === "success") toast.success("Payment received — credits appear as soon as the provider confirms it");
    else toast("Checkout cancelled");
    window.history.replaceState(null, "", window.location.pathname);
  }, []);
  const used = useApp((s) => s.creditsUsed);
  const total = useApp((s) => s.creditsTotal);
  const log = useApp((s) => s.log);
  const [plan, setPlan] = useSetting<string>("billing.plan", "Business");
  const [payment, setPayment] = useSetting<string>("billing.payment", "UPI AutoPay · priya@okicici");
  const [cap, setCap] = useSetting<string>("billing.cap", "220000");
  const [ask, setAsk] = useSetting<string>("billing.askAbove", "2000");
  const [alerts, setAlerts] = useSetting<boolean>("billing.alerts", true);
  const [capDraft, setCapDraft] = useState(cap);
  const [askDraft, setAskDraft] = useState(ask);
  const [topUp, setTopUp] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const pct = (used / total) * 100;
  const dirty = capDraft !== cap || askDraft !== ask;

  return (
    <>
      <SectionHeader
        title="Billing & usage"
        description="Credits are per workspace — not per seat. Invite your whole team."
      />
      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[12.5px] text-muted-foreground">Credits used this cycle · renews {workspace.renewsOn}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatCredits(used)} <span className="text-[14px] font-normal text-muted-foreground">/ {formatCredits(total)}</span>
            </p>
          </div>
          <Button variant="outline" onClick={() => setTopUp(true)}>
            Buy top-up
          </Button>
        </div>
        <Progress value={pct} className="mt-4 h-2" tone={pct > 80 ? "warning" : "primary"} />
        <p className="mt-2 text-[12px] text-muted-foreground">
          {formatCredits(Math.max(0, total - used))} credits left · at the current pace you'll use ~{formatCredits(Math.round(used * 1.5))} this cycle.
        </p>
      </Card>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((p) => {
          const current = plan === p.name;
          return (
            <div key={p.name} className={cn("flex flex-col rounded-2xl border bg-card p-5", current ? "border-primary shadow-[0_0_0_3px] shadow-primary/15" : "border-border")}>
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-semibold">{p.name}</p>
                {current && <Badge variant="primary">Current</Badge>}
              </div>
              <p className="mt-2 text-2xl font-semibold">{p.price}</p>
              <p className="text-[12px] text-muted-foreground">{p.sub}</p>
              <ul className="mt-4 flex flex-1 flex-col gap-1.5 text-[13px]">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-success" /> {f}
                  </li>
                ))}
              </ul>
              <Button
                variant={current ? "secondary" : "outline"}
                className="mt-4"
                disabled={current}
                onClick={() => {
                  if (p.name === "Enterprise") {
                    toast.success("Thanks! Our team will reach out within one business day.");
                    log("billing.enterprise_inquiry", "Enterprise plan");
                    return;
                  }
                  setPlan(p.name);
                  log("billing.plan_changed", p.name);
                  toast.success(`Switched to ${p.name} — prorated on your next invoice`);
                }}
              >
                {current ? "Current plan" : p.name === "Enterprise" ? "Talk to sales" : "Switch"}
              </Button>
            </div>
          );
        })}
      </div>

      <h3 className="mb-3 mt-8 text-[15px] font-semibold">Budgets & alerts</h3>
      <Card>
        <SettingRow title="Workspace monthly cap (credits)" description="Pause non-critical runs when reached; critical Workers can overdraft up to 10%">
          <Input inputMode="numeric" value={capDraft} onChange={(e) => setCapDraft(e.target.value.replace(/\D/g, ""))} className="w-36" aria-label="Monthly cap" />
        </SettingRow>
        <SettingRow title="Ask before expensive tasks (credits)" description="Anvita asks for confirmation when a single task is estimated above">
          <Input inputMode="numeric" value={askDraft} onChange={(e) => setAskDraft(e.target.value.replace(/\D/g, ""))} className="w-36" aria-label="Ask above" />
        </SettingRow>
        <SettingRow title="Alerts" description="Notify owners at 50%, 80% and 100% of the monthly plan">
          <Switch checked={alerts} onCheckedChange={(v) => { setAlerts(v); toast.success(`Budget alerts ${v ? "on" : "off"}`); }} aria-label="Budget alerts" />
        </SettingRow>
        <SettingRow title="Payment method" description={`${payment} · GST invoice to Kesar Foods Pvt Ltd (27AAKCK4410C1ZP)`}>
          <Button variant="outline" size="sm" onClick={() => setPayOpen(true)}>
            <CreditCard /> Update
          </Button>
        </SettingRow>
        <div className="flex justify-end gap-2 px-5 py-3">
          <Button variant="ghost" size="sm" disabled={!dirty} onClick={() => { setCapDraft(cap); setAskDraft(ask); }}>
            Discard
          </Button>
          <Button
            size="sm"
            disabled={!dirty || !capDraft || !askDraft}
            onClick={() => {
              setCap(capDraft);
              setAsk(askDraft);
              log("billing.budget_updated", `cap ${capDraft}, ask above ${askDraft}`);
              toast.success("Budgets saved");
            }}
          >
            Save budgets
          </Button>
        </div>
      </Card>

      <h3 className="mb-3 mt-8 text-[15px] font-semibold">Invoices</h3>
      <Card className="divide-y divide-border">
        {isLive() && payments.length === 0 && <p className="px-5 py-4 text-[13px] text-muted-foreground">No payments yet.</p>}
        {(isLive() ? payments.map((p) => ({ id: p.id, date: new Date(p.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }), amount: p.amount, status: p.status })) : invoices.map((i) => ({ ...i, status: "paid" as const }))).map((i) => (
          <div key={i.id} className="flex items-center gap-3 px-5 py-3 text-[13px]">
            <span className="font-mono text-[12px]">{i.id}</span>
            <span className="flex-1 text-muted-foreground">{i.date}</span>
            <span className="tabular-nums">{inr(i.amount)}</span>
            <Badge variant={i.status === "paid" ? "success" : i.status === "failed" ? "danger" : "default"} className="capitalize">{i.status === "created" ? "Pending" : i.status}</Badge>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Download ${i.id}`}
              onClick={() =>
                downloadFile(
                  `${i.id}.txt`,
                  `TAX INVOICE ${i.id}\nAnvita AI Pvt Ltd · GSTIN 27AAXCA0000A1Z5\nBill to: ${isLive() ? workspace.name : "Kesar Foods Pvt Ltd · GSTIN 27AAKCK4410C1ZP"}\nDate: ${i.date}\n\n${isLive() ? "Credit top-up               " : "Subscription (Business plan)"}  ${inr(Math.round(i.amount / 1.18))}\nIGST 18%                        ${inr(i.amount - Math.round(i.amount / 1.18))}\nTotal                           ${inr(i.amount)}\n`,
                )
              }
            >
              <Download />
            </Button>
          </div>
        ))}
      </Card>

      <TopUpDialog key={topUp ? "t-open" : "t-closed"} open={topUp} onOpenChange={(o) => { setTopUp(o); if (!o) refreshBilling(); }} payment={payment} info={billing} />
      <PaymentDialog
        key={payOpen ? "p-open" : "p-closed"}
        open={payOpen}
        onOpenChange={setPayOpen}
        onSave={(label) => {
          setPayment(label);
          log("billing.payment_method_updated", label);
          toast.success("Payment method updated");
          setPayOpen(false);
        }}
      />
    </>
  );
}
