import Link from "next/link";
import { ArrowRight, BadgeCheck, Bot, Check, FileText, Globe2, Languages, Lock, PauseCircle, Phone, ShieldCheck, Sparkles, Workflow, Zap } from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { AppLogo } from "@/components/brand/app-logo";
import { Button } from "@/components/ui/button";

const channels = ["slack", "whatsapp", "teams", "gmail", "hubspot", "shopify", "zendesk", "razorpay", "tally", "salesforce", "notion", "jira"];

const loop = [
  { step: "01", title: "Explore", icon: Bot, text: "Ask Anvita in Slack, WhatsApp or Teams. It plans, uses your apps, writes code on its own computer and delivers finished PDFs, sheets, dashboards and apps." },
  { step: "02", title: "Harden", icon: Sparkles, text: "One click turns a great run into an AI Worker. Deterministic steps become code, judgment stays with AI, approvals and tests are added automatically." },
  { step: "03", title: "Scale", icon: Workflow, text: "Workers run on schedules, triggers, queues, phone lines and APIs — versioned, evaluated, audited and priced per outcome." },
];

const features = [
  { icon: FileText, title: "Finished work, not chat", text: "Reports, reconciliations, decks, dashboards and hosted mini-apps — delivered in the thread." },
  { icon: PauseCircle, title: "Approvals built in", text: "Sends, payments and record changes wait for the right person, in Slack, WhatsApp or email." },
  { icon: Workflow, title: "Visual Studio + Autopilot", text: "Design Workers on a canvas or just describe the change. Autopilot edits, explains and debugs." },
  { icon: Phone, title: "Voice Workers", text: "Pick up support and IT lines in Hindi, English and 8 Indian languages, with warm transfer to humans." },
  { icon: Languages, title: "India-first", text: "WhatsApp, UPI, GST, Tally, Zoho and DPDP compliance out of the box. Data stays in India." },
  { icon: Zap, title: "Transparent cost", text: "Every task shows an estimate before it runs and its actual cost after. Budgets per Worker and team." },
];

export default function Landing() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 md:px-6">
          <Logo />
          <nav className="hidden items-center gap-6 text-[14px] text-muted-foreground md:flex">
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#security" className="hover:text-foreground">Security</a>
            <a href="#pricing" className="hover:text-foreground">Pricing</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/login?mode=signup">Start free</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-[-200px] size-[700px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute right-[-120px] top-40 size-80 rounded-full bg-saffron/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[12.5px] text-muted-foreground shadow-sm">
              <Sparkles className="size-3.5 text-saffron" /> The AI coworker that becomes your AI workforce
            </span>
            <h1 className="mt-5 text-[40px] font-semibold leading-[1.05] tracking-tight text-balance md:text-[56px]">
              Anvita does the work. <span className="bg-gradient-to-r from-primary to-saffron bg-clip-text text-transparent">Then makes it automatic.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-muted-foreground">
              Ask in Slack, WhatsApp or Teams and get finished reports, reconciliations and dashboards. Turn anything that worked into a governed AI Worker — with approvals, tests and audit built in.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/login?mode=signup">
                  Start free — 2,000 credits <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/home">See the live demo</Link>
              </Button>
            </div>
            <p className="mt-4 text-[12.5px] text-muted-foreground">No card needed · Works in 5 minutes · Data stays in India</p>
          </div>

          <div className="relative">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-pop">
              <div className="flex items-center gap-2 border-b border-border pb-3 text-[13px]">
                <AppLogo appId="slack" size={20} />
                <span className="font-semibold">#growth</span>
                <span className="ml-auto text-[12px] text-muted-foreground">Kesar Foods</span>
              </div>
              <div className="mt-3 flex gap-2.5 text-[13px]">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[11px] font-semibold text-white">PS</span>
                <p>
                  <b>@Anvita</b> compare last week’s Meta + Google spend with HubSpot deals, make a PDF and email the founders
                </p>
              </div>
              <div className="mt-3 flex gap-2.5">
                <LogoMark size={28} />
                <div className="flex-1 space-y-2 text-[12.5px]">
                  {["Fetched Meta Ads · 14 campaigns", "Fetched Google Ads · 9 campaigns", "Searched HubSpot · 38 deals", "Built Weekly Growth Report.pdf"].map((s) => (
                    <div key={s} className="flex items-center gap-2 text-muted-foreground">
                      <Check className="size-3.5 text-success" /> {s}
                    </div>
                  ))}
                  <div className="rounded-lg border border-saffron/40 bg-saffron-soft/60 p-2.5">
                    <p className="font-medium text-foreground">Send to founders + investors@saffronvc.in?</p>
                    <div className="mt-2 flex gap-2">
                      <span className="rounded-md bg-success px-2 py-1 text-[11.5px] font-medium text-white">Approve</span>
                      <span className="rounded-md border border-border bg-card px-2 py-1 text-[11.5px]">Edit</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-primary-soft p-2.5 text-primary-soft-foreground">
                    <Sparkles className="size-3.5" /> Make this a weekly AI Worker?
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -right-4 -top-8 hidden rounded-xl border border-border bg-card p-3 shadow-pop sm:block">
              <p className="text-[11px] text-muted-foreground">This month</p>
              <p className="text-xl font-semibold">970 h saved</p>
              <p className="text-[11px] text-success">≈ 6 teammates</p>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-14 md:px-6">
          <p className="text-center text-[12.5px] text-muted-foreground">Works where your team already works — and with 3,000+ apps</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            {channels.map((c) => (
              <AppLogo key={c} appId={c} size={34} />
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="border-y border-border bg-subtle py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <h2 className="text-center text-[32px] font-semibold tracking-tight">Explore → Harden → Scale</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">Other tools make you choose between a flexible assistant and a reliable automation platform. Anvita is both — and moves your work from one to the other.</p>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {loop.map((l) => (
              <div key={l.step} className="relative rounded-2xl border border-border bg-card p-6 shadow-soft">
                <span className="font-mono text-[12px] text-muted-foreground">{l.step}</span>
                <span className="mt-3 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <l.icon className="size-5" />
                </span>
                <p className="mt-4 text-[18px] font-semibold">{l.title}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{l.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <h2 className="text-[32px] font-semibold tracking-tight">Built for real work</h2>
          <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title}>
                <f.icon className="size-5 text-primary" />
                <p className="mt-3 text-[16px] font-semibold">{f.title}</p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className="bg-[#0f1020] py-20 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 md:px-6 lg:grid-cols-2">
          <div>
            <h2 className="text-[32px] font-semibold tracking-tight">Enterprise trust from day one</h2>
            <p className="mt-3 text-white/70">Policies are enforced outside the model, every action is logged in a tamper-evident audit trail, and your data never trains a model.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              [ShieldCheck, "SOC 2 Type II · ISO 27001"],
              [Globe2, "Data residency: India, EU, US"],
              [Lock, "SSO, SCIM, RBAC, per-user OAuth"],
              [BadgeCheck, "DPDP Act & GDPR ready"],
            ].map(([Icon, t]) => {
              const I = Icon as typeof ShieldCheck;
              return (
                <div key={t as string} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-[14px]">
                  <I className="size-5 text-[#b9b1ff]" /> {t as string}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-4xl px-4 text-center md:px-6">
          <h2 className="text-[32px] font-semibold tracking-tight">Priced per workspace, not per seat</h2>
          <p className="mt-3 text-muted-foreground">Start free with 2,000 credits. Team from ₹4,999/month. Enterprise pays per outcome.</p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/login?mode=signup">
              Get started <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 text-[13px] text-muted-foreground md:px-6">
          <Logo />
          <p>© 2026 Anvita AI · Made in India 🇮🇳</p>
        </div>
      </footer>
    </div>
  );
}
