"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Bot, Globe, Phone, Send, Sparkles, UserRound, Workflow } from "lucide-react";
import { inbox } from "@/lib/mock/workspace";
import { AppLogo } from "@/components/brand/app-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const sentimentTone = { negative: "danger", neutral: "default", positive: "success" } as const;

export default function InboxPage() {
  const [selected, setSelected] = useState(inbox[0].id);
  const [taken, setTaken] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState("");
  const [extra, setExtra] = useState<Record<string, { text: string; time: string }[]>>({});
  const c = inbox.find((x) => x.id === selected)!;

  return (
    <div className="flex h-full flex-col md:flex-row">
      <div className="w-full shrink-0 border-b border-border md:w-80 md:border-b-0 md:border-r">
        <div className="border-b border-border px-4 py-3">
          <h1 className="text-[16px] font-semibold">Handoff inbox</h1>
          <p className="text-[12px] text-muted-foreground">Conversations Workers escalated to a person</p>
        </div>
        {inbox.map((x) => (
          <button key={x.id} onClick={() => setSelected(x.id)} className={cn("flex w-full gap-3 border-b border-border px-4 py-3 text-left hover:bg-subtle cursor-pointer", selected === x.id && "bg-primary-soft/50")}>
            {x.channel === "whatsapp" ? <AppLogo appId="whatsapp" size={30} /> : x.channel === "voice" ? (
              <span className="flex size-[30px] items-center justify-center rounded-[28%] bg-info text-white"><Phone className="size-4" /></span>
            ) : (
              <span className="flex size-[30px] items-center justify-center rounded-[28%] bg-muted"><Globe className="size-4" /></span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-[13.5px] font-medium">{x.customer}</p>
                <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{x.waiting}</span>
              </div>
              <p className="truncate text-[12px] text-muted-foreground">{x.reason}</p>
              <div className="mt-1 flex gap-1">
                <Badge variant={sentimentTone[x.sentiment]}>{x.sentiment}</Badge>
                <Badge variant="outline">{x.language}</Badge>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 md:px-6">
          <Avatar name={c.customer} size={34} />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold">{c.customer}</p>
            <p className="text-[12px] text-muted-foreground">
              {c.phone} · via {c.worker}
            </p>
          </div>
          {taken[c.id] ? (
            <Button size="sm" variant="outline" onClick={() => { setTaken({ ...taken, [c.id]: false }); toast("Handed back to the Worker"); }}>
              <Workflow /> Hand back to Worker
            </Button>
          ) : (
            <Button size="sm" onClick={() => { setTaken({ ...taken, [c.id]: true }); toast.success("You're now in the conversation — the Worker is paused"); }}>
              <UserRound /> Take over
            </Button>
          )}
        </div>
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto bg-subtle p-4 md:p-6 scrollbar-thin">
              <div className="mx-auto flex max-w-2xl flex-col gap-2.5">
                {[...c.transcript, ...(extra[c.id] ?? []).map((e) => ({ from: "agent" as const, ...e }))].map((m, i) => (
                  <div key={i} className={cn("flex max-w-[80%] flex-col gap-0.5", m.from === "customer" ? "self-start" : "self-end items-end")}>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      {m.from === "worker" && <Bot className="size-3" />}
                      {m.from === "agent" && <UserRound className="size-3" />}
                      {m.from === "customer" ? c.customer.split(" ")[0] : m.from === "worker" ? c.worker : "You"} · {m.time}
                    </span>
                    <div className={cn("rounded-2xl px-3.5 py-2 text-[13.5px] shadow-sm", m.from === "customer" ? "rounded-tl-md bg-card" : m.from === "worker" ? "rounded-tr-md bg-primary-soft text-foreground" : "rounded-tr-md bg-primary text-primary-foreground")}>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <form
              className="border-t border-border p-3 md:px-6"
              onSubmit={(e) => {
                e.preventDefault();
                if (!draft.trim()) return;
                setExtra({ ...extra, [c.id]: [...(extra[c.id] ?? []), { text: draft, time: "now" }] });
                setDraft("");
                if (!taken[c.id]) setTaken({ ...taken, [c.id]: true });
              }}
            >
              <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-1.5">
                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Reply to ${c.customer.split(" ")[0]} on ${c.channel === "voice" ? "SMS" : c.channel}…`} className="flex-1 bg-transparent px-2 text-[13.5px] outline-none" />
                <Button type="button" size="sm" variant="ghost" onClick={() => setDraft("Hi Meera, this is Rahul from Kesar Foods. I've approved your full refund of ₹6,499 — you'll see it in 3–5 working days. So sorry about the boxes! 🙏")}>
                  <Sparkles /> Suggest
                </Button>
                <Button type="submit" size="icon-sm" aria-label="Send">
                  <Send />
                </Button>
              </div>
            </form>
          </div>
          <aside className="w-full shrink-0 border-t border-border p-4 lg:w-80 lg:border-l lg:border-t-0">
            <p className="flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" /> Handoff summary
            </p>
            <p className="mt-2 text-[13px] leading-relaxed">{c.summary}</p>
            <div className="mt-4 grid gap-2 text-[12.5px]">
              {[
                ["Reason", c.reason],
                ["Language", c.language],
                ["Waiting", c.waiting],
                ["Worker", c.worker],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="text-right">{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-border p-3">
              <p className="text-[12px] font-medium">Customer</p>
              <div className="mt-2 flex items-center gap-2 text-[12.5px]">
                <AppLogo appId="shopify" size={18} /> 7 orders · ₹24,310 lifetime
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-[12.5px]">
                <AppLogo appId="zendesk" size={18} /> 1 open ticket #44120
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
