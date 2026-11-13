"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, Globe, Loader2, Pencil, Share2, Users, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ThreadMenu, copyThreadLink } from "@/components/chat/thread-actions";
import { useHydrated } from "@/components/workers/use-hydrated";
import { useApp } from "@/lib/store";
import { runAgent } from "@/lib/simulate";
import { isLive } from "@/lib/api";
import { loadThread } from "@/lib/backend";
import { Message, useChatUI } from "@/components/chat/message";
import { Composer } from "@/components/chat/composer";
import { ArtifactPanel } from "@/components/chat/artifact-panel";
import { AppLogo } from "@/components/brand/app-logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  const thread = useApp((s) => s.threads.find((t) => t.id === id));
  const artifact = useChatUI((s) => s.artifact);
  const openArtifact = useChatUI((s) => s.open);
  const scrollRef = useRef<HTMLDivElement>(null);
  const updateThread = useApp((s) => s.updateThread);
  const me = useApp((s) => s.profile.name);
  const members = useApp((s) => s.members);
  const hydrated = useHydrated();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const lastMsg = thread?.messages.at(-1);
  const signature = JSON.stringify(lastMsg?.blocks.length) + thread?.messages.length;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [signature]);

  useEffect(() => () => openArtifact(null), [id, openArtifact]);

  // Live mode: the thread list has no messages; fetch this conversation's history.
  const liveReady = useApp((s) => s.liveReady);
  useEffect(() => {
    if (isLive() && liveReady) void loadThread(id);
  }, [id, liveReady]);

  if (!thread && !hydrated)
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );

  if (!thread)
    return (
      <div className="p-10">
        <EmptyState icon={<Globe />} title="Chat not found" description="It may have been deleted or belongs to another workspace." action={<Button asChild size="sm"><Link href="/chat">New task</Link></Button>} />
      </div>
    );

  const running = thread.status === "running";

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-border px-4 py-2.5 md:px-6">
          {thread.channel === "web" ? <Globe className="size-4 text-muted-foreground" /> : <AppLogo appId={thread.channel} size={20} />}
          <div className="min-w-0 flex-1">
            {editing ? (
              <form
                className="flex items-center gap-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (title.trim()) updateThread(thread.id, { title: title.trim() });
                  setEditing(false);
                }}
              >
                <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setEditing(false)} className="h-7 max-w-md text-[14px] font-semibold" aria-label="Chat title" />
                <Button type="submit" size="icon-sm" variant="ghost" aria-label="Save title">
                  <Check />
                </Button>
                <Button type="button" size="icon-sm" variant="ghost" aria-label="Cancel" onClick={() => setEditing(false)}>
                  <X />
                </Button>
              </form>
            ) : (
              <button
                onClick={() => {
                  setTitle(thread.title);
                  setEditing(true);
                }}
                className="group flex max-w-full items-center gap-1.5 text-left cursor-pointer"
                title="Rename"
              >
                <span className="truncate text-[14px] font-semibold">{thread.title}</span>
                <Pencil className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            )}
            <p className="hidden truncate text-[12px] text-muted-foreground sm:block">{thread.channelLabel ? `Synced from ${thread.channelLabel}` : "Web chat"} · visible to you and workspace admins</p>
          </div>
          {thread.status === "waiting" && <Badge variant="saffron" className="hidden sm:inline-flex">Waiting on you</Badge>}
          {running && <Badge variant="info">Running</Badge>}
          <Button variant="ghost" size="icon-sm" aria-label="Share" onClick={() => copyThreadLink(thread.id)}>
            <Share2 />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Participants">
                <Users />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3">
              <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">Can see this chat</p>
              <div className="mt-2 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[13px]">
                  <Avatar name={me} size={24} /> {me} <span className="ml-auto text-[11px] text-muted-foreground">owner</span>
                </div>
                {members
                  .filter((m) => m.role === "admin" || m.role === "owner")
                  .filter((m) => m.name !== me)
                  .map((m) => (
                    <div key={m.id} className="flex items-center gap-2 text-[13px]">
                      <Avatar name={m.name} size={24} /> {m.name} <span className="ml-auto text-[11px] text-muted-foreground">{m.role}</span>
                    </div>
                  ))}
                {thread.channelLabel && <p className="text-[12px] text-muted-foreground">Plus everyone in {thread.channelLabel}.</p>}
              </div>
              <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => copyThreadLink(thread.id)}>
                Copy invite link
              </Button>
            </PopoverContent>
          </Popover>
          <ThreadMenu
            thread={thread}
            className="p-2"
            onRename={() => {
              setTitle(thread.title);
              setEditing(true);
            }}
          />
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto flex max-w-3xl flex-col gap-7 px-4 py-6 md:px-6">
            {thread.messages.length === 0 && (
              <p className="py-20 text-center text-[13px] text-muted-foreground">This is an archived demo chat. Ask something below to continue.</p>
            )}
            {thread.messages.map((m) => (
              <Message key={m.id} message={m} threadId={thread.id} onSuggestion={(s) => runAgent(thread.id, s)} />
            ))}
          </div>
        </div>
        <div className="mx-auto w-full max-w-3xl px-4 pb-4 md:px-6">
          <Composer onSubmit={(t, extras) => runAgent(thread.id, t, extras)} disabled={running} placeholder={running ? "Anvita is working… you can still add context" : "Reply, refine or ask a follow-up…"} />
          <p className="mt-1.5 text-center text-[11px] text-muted-foreground">Anvita asks before sending, paying or changing records. Every action is logged.</p>
        </div>
      </div>
      {artifact && (
        <div className="fixed inset-0 z-40 md:static md:z-auto md:w-[46%] md:max-w-[680px] md:shrink-0 md:border-l md:border-border">
          <ArtifactPanel artifact={artifact} onClose={() => openArtifact(null)} />
        </div>
      )}
    </div>
  );
}
