"use client";
import { useRouter } from "next/navigation";
import { AppWindow, FileSpreadsheet, FileText, LayoutDashboard, Mail, Search } from "lucide-react";
import { Composer, type ComposerExtras } from "@/components/chat/composer";
import { LogoMark } from "@/components/brand/logo";
import { useApp } from "@/lib/store";
import { runAgent } from "@/lib/simulate";

const capabilities = [
  { icon: FileText, title: "Reports & PDFs", prompt: "Make a PDF report of last month's sales by state with charts" },
  { icon: FileSpreadsheet, title: "Spreadsheets", prompt: "Reconcile September GST purchase register with GSTR-2B into a sheet" },
  { icon: LayoutDashboard, title: "Live dashboards", prompt: "Build a dashboard of daily orders, RTO and ad spend" },
  { icon: Mail, title: "Draft & send", prompt: "Draft follow-up emails to leads from last week's webinar and send them" },
  { icon: Search, title: "Research", prompt: "Research competitor Diwali hamper pricing into a sheet" },
  { icon: AppWindow, title: "Mini apps", prompt: "Build an app to calculate B2B hamper quotes with GST" },
];

export default function NewChatPage() {
  const router = useRouter();
  const createThread = useApp((s) => s.createThread);
  const connected = useApp((s) => s.connections.filter((c) => c.status === "healthy").length);
  const ask = (text: string, extras?: ComposerExtras) => {
    const id = createThread(text.length > 48 ? text.slice(0, 46) + "…" : text);
    runAgent(id, text, extras);
    router.push(`/chat/${id}`);
  };
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="flex flex-col items-center text-center">
          <LogoMark size={44} />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">What can I do for you?</h1>
          <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
            I can use your {connected} connected apps, run code on my own computer and deliver finished files, dashboards and apps.
          </p>
        </div>
        <Composer className="mt-6" size="lg" onSubmit={ask} autoFocus />
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {capabilities.map(({ icon: Icon, title, prompt }) => (
            <button key={title} onClick={() => ask(prompt)} className="group rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-primary/40 hover:shadow-soft cursor-pointer">
              <Icon className="size-4 text-primary" />
              <p className="mt-2 text-[13px] font-medium">{title}</p>
              <p className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">{prompt}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
