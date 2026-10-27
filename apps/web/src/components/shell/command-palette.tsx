"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, MessageSquare, Plus, Sparkles } from "lucide-react";
import { useApp } from "@/lib/store";
import { workers } from "@/lib/mock/workers";
import { apps } from "@/lib/mock/apps";
import { AppLogo } from "@/components/brand/app-logo";
import { buildNav, mainNav, settingsNav } from "./nav";

const itemCls =
  "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] data-[selected=true]:bg-muted [&_svg]:size-4 [&_svg]:text-muted-foreground";
const groupCls = "[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground";

export function CommandPalette() {
  const open = useApp((s) => s.commandOpen);
  const setOpen = useApp((s) => s.setCommandOpen);
  const threads = useApp((s) => s.threads);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useApp.getState().commandOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-[14vh] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-popover shadow-pop animate-fade-in">
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <Command loop>
            <div className="flex items-center gap-2 border-b border-border px-4">
              <Sparkles className="size-4 text-primary" />
              <Command.Input autoFocus placeholder="Ask Anvita, jump to a Worker, page or app…" className="h-12 w-full bg-transparent text-[14px] outline-none placeholder:text-muted-foreground" />
            </div>
            <Command.List className="max-h-[60vh] overflow-y-auto p-1.5 scrollbar-thin">
              <Command.Empty className="px-3 py-6 text-center text-[13px] text-muted-foreground">
                No matches — press <b>Enter</b> on “Ask Anvita” to run it as a task.
              </Command.Empty>
              <Command.Group heading="Actions" className={groupCls}>
                <Command.Item className={itemCls} onSelect={() => go("/chat")}>
                  <MessageSquare /> Ask Anvita to do something
                  <ArrowRight className="ml-auto" />
                </Command.Item>
                <Command.Item className={itemCls} onSelect={() => go("/workers/new")}>
                  <Plus /> Create an AI Worker
                </Command.Item>
                <Command.Item className={itemCls} onSelect={() => go("/integrations")}>
                  <Plus /> Connect an app
                </Command.Item>
              </Command.Group>
              <Command.Group heading="Pages" className={groupCls}>
                {[...mainNav, ...buildNav, settingsNav].map((n) => (
                  <Command.Item key={n.href} className={itemCls} onSelect={() => go(n.href)}>
                    <n.icon /> {n.label}
                  </Command.Item>
                ))}
              </Command.Group>
              <Command.Group heading="AI Workers" className={groupCls}>
                {workers.map((w) => (
                  <Command.Item key={w.id} value={`worker ${w.name}`} className={itemCls} onSelect={() => go(`/workers/${w.id}`)}>
                    <span className="text-[15px]">{w.emoji}</span> {w.name}
                    <span className="ml-auto text-[11px] text-muted-foreground">{w.interaction}</span>
                  </Command.Item>
                ))}
              </Command.Group>
              <Command.Group heading="Recent chats" className={groupCls}>
                {threads.slice(0, 5).map((t) => (
                  <Command.Item key={t.id} value={`chat ${t.title}`} className={itemCls} onSelect={() => go(`/chat/${t.id}`)}>
                    <MessageSquare /> {t.title}
                  </Command.Item>
                ))}
              </Command.Group>
              <Command.Group heading="Apps" className={groupCls}>
                {apps.slice(0, 12).map((a) => (
                  <Command.Item key={a.id} value={`app ${a.name}`} className={itemCls} onSelect={() => go("/integrations")}>
                    <AppLogo appId={a.id} size={18} /> {a.name}
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
