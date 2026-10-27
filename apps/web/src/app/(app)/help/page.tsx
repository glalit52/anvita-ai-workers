"use client";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { BookOpen, ChevronDown, Code2, Keyboard, LifeBuoy, Loader2, Search, ShieldCheck, Workflow } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { PageHeader, Kbd } from "@/components/ui/misc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Field } from "@/components/settings/field";
import { useApp } from "@/lib/store";
import { cn, sleep } from "@/lib/utils";

const articles = [
  { cat: "Getting started", q: "What can I ask Anvita to do?", a: "Anything that uses your connected apps, the web or code: reports and PDFs, spreadsheets and reconciliations, dashboards, research, drafting emails and messages, updating records. Anvita shows a plan and a credit estimate before it starts and asks before it sends, pays or changes anything." },
  { cat: "Getting started", q: "Where can I talk to Anvita?", a: "In the web app, Slack, Microsoft Teams, WhatsApp and Discord. It's the same Anvita everywhere — one memory, one set of Workers and the same approval rules." },
  { cat: "AI Workers", q: "What is an AI Worker?", a: "A saved, reliable workflow that runs on a schedule, trigger, queue, phone line or API. Deterministic steps run as code; only judgment steps use AI. Workers are versioned, tested with eval suites and governed by your policies." },
  { cat: "AI Workers", q: "How do I turn a chat into a Worker?", a: "After a successful run, click “Save as AI Worker”. Anvita compiles the run into a workflow, detects inputs (dates, recipients), lets you set a schedule and approvals, runs a test with side effects stubbed and publishes v1." },
  { cat: "AI Workers", q: "How do canary releases work?", a: "In Versions, release a draft to a percentage of traffic. If success rate or cost regresses, the release rolls back automatically. Every publish must pass the eval gate." },
  { cat: "Approvals & safety", q: "When does Anvita ask for approval?", a: "Whenever a policy says so — by default for writes to external systems (emails outside your domain, payments, CRM updates) — and never for reads. Admins manage rules in Settings → Policies. Deletes are denied by default." },
  { cat: "Approvals & safety", q: "Is my data used to train models?", a: "No. Your data is never used for training, it's stored in your chosen region (India by default) and you can delete memory, chats and knowledge at any time." },
  { cat: "Billing", q: "How do credits work?", a: "Credits are shared by the whole workspace — there are no per-seat fees. Each task shows an estimate before it runs and the actual cost afterwards. Set monthly caps and an “ask above” threshold in Settings → Billing." },
  { cat: "Integrations", q: "Can I connect my own tools or databases?", a: "Yes. Add any MCP server or import an OpenAPI spec in Integrations. Connections can be workspace-wide, personal, or shared with specific people." },
];

const shortcuts = [
  { keys: ["⌘", "K"], label: "Open search & command palette" },
  { keys: ["Enter"], label: "Send message" },
  { keys: ["Shift", "Enter"], label: "New line in message" },
  { keys: ["A"], label: "Work queue: approve & post" },
  { keys: ["E"], label: "Work queue: post with edits" },
  { keys: ["R"], label: "Work queue: reject" },
  { keys: ["J", "K"], label: "Work queue: next / previous item" },
  { keys: ["Esc"], label: "Close dialogs and panels" },
];

export default function HelpPage() {
  const profile = useApp((s) => s.profile);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<number | null>(0);
  const [topic, setTopic] = useState("Question");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [touched, setTouched] = useState(false);
  const results = articles.map((a, i) => ({ ...a, i })).filter((a) => (a.q + a.a + a.cat).toLowerCase().includes(q.toLowerCase()));

  return (
    <PageContainer className="max-w-5xl">
      <PageHeader title="Help & docs" description="Answers, shortcuts and a direct line to the Anvita team." />
      <div className="relative mt-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search help articles — e.g. approvals, credits, WhatsApp" className="h-11 pl-9 text-[14px]" />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: BookOpen, t: "Getting started", d: "Your first tasks and channels", href: "/chat" },
          { icon: Workflow, t: "Building Workers", d: "Studio, Autopilot and evals", href: "/workers/new" },
          { icon: ShieldCheck, t: "Security & policies", d: "Approvals, SSO, residency", href: "/settings/policies" },
          { icon: Code2, t: "API & MCP", d: "Keys, webhooks, MCP clients", href: "/settings/developers" },
        ].map((c) => (
          <Link key={c.t} href={c.href} className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
            <c.icon className="size-5 text-primary" />
            <p className="mt-2 text-[14px] font-medium">{c.t}</p>
            <p className="text-[12.5px] text-muted-foreground">{c.d}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          <h2 className="mb-3 text-[15px] font-semibold">Frequently asked questions</h2>
          <Card className="divide-y divide-border">
            {results.length === 0 && <p className="px-5 py-8 text-center text-[13px] text-muted-foreground">No articles match “{q}”. Ask us below — we reply within a few hours.</p>}
            {results.map((a) => {
              const isOpen = open === a.i || q.length > 1;
              return (
                <div key={a.i}>
                  <button onClick={() => setOpen(open === a.i ? null : a.i)} aria-expanded={isOpen} className="flex w-full items-center gap-3 px-5 py-3.5 text-left cursor-pointer">
                    <span className="flex-1">
                      <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{a.cat}</span>
                      <span className="text-[14px] font-medium">{a.q}</span>
                    </span>
                    <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                  </button>
                  {isOpen && <p className="px-5 pb-4 text-[13.5px] leading-relaxed text-muted-foreground">{a.a}</p>}
                </div>
              );
            })}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Keyboard className="size-4" /> Keyboard shortcuts
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {shortcuts.map((s) => (
                <div key={s.label} className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="flex shrink-0 gap-1">
                    {s.keys.map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LifeBuoy className="size-4" /> Contact support
              </CardTitle>
              <p className="text-[12.5px] text-muted-foreground">Business plan · typical reply under 2 hours</p>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setTouched(true);
                  if (message.trim().length < 10) return;
                  setSending(true);
                  await sleep(900);
                  setSending(false);
                  setMessage("");
                  setTouched(false);
                  toast.success(`Ticket #${Math.floor(40000 + Math.random() * 9999)} created — we'll reply to ${profile.email}`);
                }}
              >
                <Field label="Topic">
                  <Select value={topic} onChange={(e) => setTopic(e.target.value)}>
                    <option>Question</option>
                    <option>Bug report</option>
                    <option>Billing</option>
                    <option>Security</option>
                    <option>Feature request</option>
                  </Select>
                </Field>
                <Field label="Message" error={touched && message.trim().length < 10 ? "Tell us a bit more (at least 10 characters)" : undefined}>
                  <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What's going on?" />
                </Field>
                <Button type="submit" disabled={sending}>
                  {sending && <Loader2 className="animate-spin" />} Send to support
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
