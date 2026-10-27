"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Check, Sparkles } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { Markdown } from "@/components/ui/markdown";
import type { NodeKind, Worker } from "@/lib/types";
import { sleep } from "@/lib/utils";

interface Msg {
  role: "user" | "assistant";
  text: string;
  change?: string;
}

const suggestions = ["Escalate VIP customers to a human", "Add a CSAT survey at the end", "Explain this Worker", "Why did run_8f1e fail?"];

export function Autopilot({ worker, onAddNode }: { worker: Worker; onAddNode: (kind: NodeKind, title: string, subtitle: string) => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      text: `I'm Autopilot. I can **edit this workflow**, explain it, write tests, or debug failed runs.\n\n“${worker.name}” has ${worker.nodes.length} steps and runs on: ${worker.trigger.toLowerCase()}.`,
    },
  ]);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    setValue("");
    setBusy(true);
    setMsgs((m) => [...m, { role: "user", text }]);
    await sleep(900);
    const t = text.toLowerCase();
    let reply: Msg;
    if (t.includes("vip") || t.includes("escalat")) {
      onAddNode("handoff", "Escalate VIP customers", "If lifetime value > ₹25,000 → Support L2");
      reply = { role: "assistant", text: "Added a **Human handoff** step after the selected step: customers with lifetime value above ₹25,000 go to Support L2 with a summary. I also added 3 test cases for it.", change: "+1 step · +3 tests" };
    } else if (t.includes("csat") || t.includes("survey")) {
      onAddNode("send", "Send CSAT survey", "WhatsApp quick-reply 1–5 · 10 min after resolution");
      reply = { role: "assistant", text: "Added a **Send** step that asks for a 1–5 rating on WhatsApp 10 minutes after the conversation is resolved. Ratings flow into Analytics.", change: "+1 step" };
    } else if (t.includes("fail") || t.includes("debug")) {
      reply = { role: "assistant", text: "Run **run_8f1e** failed at *Get order + tracking*: Delhivery returned `503` three times.\n\n• Root cause: Delhivery MCP server outage (since 05:12).\n• Fix: I can add a fallback to Shopify fulfilment status when tracking is unavailable.\n\nWant me to add the fallback branch?" };
    } else {
      reply = {
        role: "assistant",
        text: `Here's how **${worker.name}** works:\n\n• Starts on: ${worker.trigger}.\n• ${worker.nodes.filter((n) => n.kind === "agent").length} AI steps make judgment calls; ${worker.nodes.filter((n) => n.kind === "tool" || n.kind === "code").length} deterministic steps call apps or run code.\n• ${worker.nodes.filter((n) => n.kind === "approval").length} approval gate(s) protect risky actions.\n• Success rate ${worker.successRate || "—"}% over ${worker.runs30d.toLocaleString("en-IN")} runs in 30 days.`,
      };
    }
    setMsgs((m) => [...m, reply]);
    setBusy(false);
  };

  return (
    <div className="flex h-full max-h-[calc(100dvh-180px)] min-h-[420px] flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        <div className="flex flex-col gap-4">
          {msgs.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="ml-8 self-end rounded-2xl rounded-tr-md bg-primary px-3 py-2 text-[13px] text-primary-foreground">
                {m.text}
              </div>
            ) : (
              <div key={i} className="flex gap-2.5">
                <LogoMark size={24} />
                <div className="min-w-0 flex-1">
                  <Markdown text={m.text} className="text-[13px]" />
                  {m.change && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-success-soft px-1.5 py-0.5 text-[11.5px] font-medium text-success">
                      <Check className="size-3" /> {m.change} · undo
                    </span>
                  )}
                </div>
              </div>
            ),
          )}
          {busy && (
            <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
              <Sparkles className="size-3.5 animate-pulse text-primary" /> Autopilot is editing the workflow…
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-border p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button key={s} onClick={() => send(s)} className="rounded-full border border-border px-2.5 py-1 text-[11.5px] text-muted-foreground hover:border-primary/40 hover:text-foreground cursor-pointer">
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2 rounded-xl border border-border bg-card p-1.5 focus-within:border-ring/60">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(value);
              }
            }}
            rows={1}
            placeholder="Ask Autopilot to change this Worker…"
            className="max-h-28 flex-1 resize-none bg-transparent px-2 py-1.5 text-[13px] outline-none"
          />
          <button onClick={() => send(value)} disabled={!value.trim()} className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40 cursor-pointer" aria-label="Send">
            <ArrowUp className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
