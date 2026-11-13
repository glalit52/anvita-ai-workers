"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Bot, CheckCircle2, ExternalLink, Globe, Headset, Phone, RotateCcw, Send, Sparkles, StickyNote, UserRound, Workflow } from "lucide-react";
import { useApp, nowTime } from "@/lib/store";
import { AppLogo } from "@/components/brand/app-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Segmented } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import type { InboxConversation } from "@/lib/types";
import { cn } from "@/lib/utils";

const sentimentTone = { negative: "danger", neutral: "default", positive: "success" } as const;

const suggestions: Record<string, string> = {
  c1: "Hi Meera, this is Rahul from Kesar Foods. I've approved your full refund of ₹6,499 — you'll see it in 3–5 working days (UPI refunds are usually instant). So sorry about the boxes! 🙏",
  c2: "Arjun ji, main IT team se Anita bol rahi hoon. Aapki identity verify karne ke liye kripya apna employee ID aur manager ka naam batayein — phir main MFA reset kar dungi.",
  c3: "Hi Sana! Aman from Kesar Foods corporate gifting here. We can do 250 custom-branded hampers by 5 Nov. Could you share your logo and preferred budget per box? I'll send a quote within the hour.",
};

function ChannelIcon({ c, size = 30 }: { c: InboxConversation; size?: number }) {
  if (c.channel === "whatsapp") return <AppLogo appId="whatsapp" size={size} />;
  return (
    <span className={cn("flex items-center justify-center rounded-[28%]", c.channel === "voice" ? "bg-info text-white" : "bg-muted")} style={{ width: size, height: size }}>
      {c.channel === "voice" ? <Phone className="size-4" /> : <Globe className="size-4" />}
    </span>
  );
}

export default function InboxPage() {
  const inbox = useApp((s) => s.inbox);
  const state = useApp((s) => s.inboxState);
  const updateInbox = useApp((s) => s.updateInbox);
  const log = useApp((s) => s.log);
  const me = useApp((s) => s.profile.name);
  const [view, setView] = useState<"open" | "resolved">("open");
  const open = inbox.filter((c) => !state[c.id]?.resolved);
  const resolved = inbox.filter((c) => state[c.id]?.resolved);
  const list = view === "open" ? open : resolved;
  const [selected, setSelected] = useState(inbox[0]?.id ?? "");
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const c = list.find((x) => x.id === selected) ?? list[0];
  const st = c ? state[c.id] ?? {} : {};
  const [notes, setNotes] = useState(st.notes ?? "");

  useEffect(() => {
    setNotes(c ? state[c.id]?.notes ?? "" : "");
    setDraft("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [c?.id, st.replies?.length]);

  const send = () => {
    if (!c || !draft.trim()) return;
    updateInbox(c.id, { taken: true, replies: [...(st.replies ?? []), { text: draft.trim(), time: nowTime().slice(0, 5) }] });
    if (!st.taken) log("inbox.taken_over", `${c.customer} (${c.worker})`);
    setDraft("");
  };

  const resolve = () => {
    if (!c) return;
    updateInbox(c.id, { resolved: true, taken: false });
    log("inbox.resolved", `${c.customer} · ${c.reason}`);
    toast.success(`Resolved — ${c.customer}'s conversation is closed and logged`);
    const next = open.find((x) => x.id !== c.id);
    if (next) setSelected(next.id);
  };

  return (
    <div className="flex h-full flex-col md:flex-row">
      <div className="w-full shrink-0 border-b border-border md:w-80 md:border-b-0 md:border-r">
        <div className="border-b border-border px-4 py-3">
          <h1 className="text-[16px] font-semibold">Handoff inbox</h1>
          <p className="text-[12px] text-muted-foreground">Conversations Workers escalated to a person</p>
          <Segmented
            className="mt-3"
            value={view}
            onChange={(v) => {
              setView(v);
              const first = (v === "open" ? open : resolved)[0];
              if (first) setSelected(first.id);
            }}
            options={[
              { value: "open", label: `Open ${open.length}` },
              { value: "resolved", label: `Resolved ${resolved.length}` },
            ]}
          />
        </div>
        {list.length === 0 && <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">{view === "open" ? "No open handoffs — your Workers are handling everything. 🎉" : "Nothing resolved yet."}</p>}
        {list.map((x) => (
          <button key={x.id} onClick={() => setSelected(x.id)} className={cn("flex w-full gap-3 border-b border-border px-4 py-3 text-left hover:bg-subtle cursor-pointer", c?.id === x.id && "bg-primary-soft/50")}>
            <ChannelIcon c={x} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-[13.5px] font-medium">{x.customer}</p>
                <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{state[x.id]?.resolved ? "resolved" : x.waiting}</span>
              </div>
              <p className="truncate text-[12px] text-muted-foreground">{x.reason}</p>
              <div className="mt-1 flex gap-1">
                <Badge variant={sentimentTone[x.sentiment]}>{x.sentiment}</Badge>
                <Badge variant="outline">{x.language}</Badge>
                {state[x.id]?.taken && <Badge variant="primary">You</Badge>}
              </div>
            </div>
          </button>
        ))}
      </div>

      {!c ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <EmptyState icon={<Headset />} title="Nothing selected" description="Pick a conversation on the left." />
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 md:px-6">
            <Avatar name={c.customer} size={34} />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold">{c.customer}</p>
              <p className="text-[12px] text-muted-foreground">
                {c.phone} · via {c.worker}
              </p>
            </div>
            {st.resolved ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  updateInbox(c.id, { resolved: false });
                  setView("open");
                  toast("Conversation reopened");
                }}
              >
                <RotateCcw /> Reopen
              </Button>
            ) : (
              <>
                {st.taken ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      updateInbox(c.id, { taken: false });
                      log("inbox.handed_back", `${c.customer} → ${c.worker}`);
                      toast(`Handed back to ${c.worker}`);
                    }}
                  >
                    <Workflow /> Hand back to Worker
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      updateInbox(c.id, { taken: true });
                      log("inbox.taken_over", `${c.customer} (${c.worker})`);
                      toast.success("You're now in the conversation — the Worker is paused");
                    }}
                  >
                    <UserRound /> Take over
                  </Button>
                )}
                <Button size="sm" variant="success" onClick={resolve}>
                  <CheckCircle2 /> Resolve
                </Button>
              </>
            )}
          </div>
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <div className="flex min-h-0 flex-1 flex-col">
              <div ref={scrollRef} className="flex-1 overflow-y-auto bg-subtle p-4 md:p-6 scrollbar-thin">
                <div className="mx-auto flex max-w-2xl flex-col gap-2.5">
                  {[...c.transcript, ...(st.replies ?? []).map((e) => ({ from: "agent" as const, ...e }))].map((m, i) => (
                    <div key={i} className={cn("flex max-w-[80%] flex-col gap-0.5", m.from === "customer" ? "self-start" : "self-end items-end")}>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        {m.from === "worker" && <Bot className="size-3" />}
                        {m.from === "agent" && <UserRound className="size-3" />}
                        {m.from === "customer" ? c.customer.split(" ")[0] : m.from === "worker" ? c.worker : me.split(" ")[0]} · {m.time}
                      </span>
                      <div className={cn("rounded-2xl px-3.5 py-2 text-[13.5px] shadow-sm", m.from === "customer" ? "rounded-tl-md bg-card" : m.from === "worker" ? "rounded-tr-md bg-primary-soft text-foreground" : "rounded-tr-md bg-primary text-primary-foreground")}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                  {st.resolved && <p className="mt-2 self-center rounded-full bg-success-soft px-3 py-1 text-[12px] text-success">Conversation resolved</p>}
                </div>
              </div>
              {!st.resolved && (
                <form
                  className="border-t border-border p-3 md:px-6"
                  onSubmit={(e) => {
                    e.preventDefault();
                    send();
                  }}
                >
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-1.5">
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder={`Reply to ${c.customer.split(" ")[0]} on ${c.channel === "voice" ? "SMS" : c.channel === "widget" ? "web chat" : "WhatsApp"}…`}
                      aria-label="Reply"
                      className="min-w-0 flex-1 bg-transparent px-2 text-[13.5px] outline-none"
                    />
                    <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(suggestions[c.id] ?? `Hi ${c.customer.split(" ")[0]}, thanks for your patience — I'm looking into this now.`)}>
                      <Sparkles /> Suggest
                    </Button>
                    <Button type="submit" size="icon-sm" aria-label="Send" disabled={!draft.trim()}>
                      <Send />
                    </Button>
                  </div>
                  {!st.taken && <p className="mt-1.5 text-[11.5px] text-muted-foreground">Sending a reply takes over the conversation and pauses the Worker.</p>}
                </form>
              )}
            </div>
            <aside className="w-full shrink-0 overflow-y-auto border-t border-border p-4 lg:w-80 lg:border-l lg:border-t-0 scrollbar-thin">
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
                <button onClick={() => toast("Opening customer in Shopify…", { description: "In production this deep-links to the Shopify admin." })} className="mt-2 flex w-full items-center gap-2 rounded-md p-1 text-left text-[12.5px] hover:bg-muted cursor-pointer">
                  <AppLogo appId="shopify" size={18} /> <span className="flex-1">7 orders · ₹24,310 lifetime</span>
                  <ExternalLink className="size-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => toast("Opening ticket #44120 in Zendesk…", { description: "In production this deep-links to the Zendesk ticket." })} className="mt-1 flex w-full items-center gap-2 rounded-md p-1 text-left text-[12.5px] hover:bg-muted cursor-pointer">
                  <AppLogo appId="zendesk" size={18} /> <span className="flex-1">1 open ticket #44120</span>
                  <ExternalLink className="size-3.5 text-muted-foreground" />
                </button>
              </div>
              <div className="mt-4">
                <label htmlFor="notes" className="flex items-center gap-1.5 text-[12px] font-medium">
                  <StickyNote className="size-3.5" /> Internal notes
                </label>
                <Textarea id="notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Only visible to your team" className="mt-1.5 text-[13px]" />
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  disabled={notes === (st.notes ?? "")}
                  onClick={() => {
                    updateInbox(c.id, { notes });
                    toast.success("Note saved");
                  }}
                >
                  Save note
                </Button>
              </div>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
