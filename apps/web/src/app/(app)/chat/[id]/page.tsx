"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Globe, MoreHorizontal, Share2, Users } from "lucide-react";
import { useApp } from "@/lib/store";
import { runAgent } from "@/lib/simulate";
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
  const lastMsg = thread?.messages.at(-1);
  const signature = JSON.stringify(lastMsg?.blocks.length) + thread?.messages.length;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [signature]);

  useEffect(() => () => openArtifact(null), [id, openArtifact]);

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
            <p className="truncate text-[14px] font-semibold">{thread.title}</p>
            <p className="hidden truncate text-[12px] text-muted-foreground sm:block">{thread.channelLabel ? `Synced from ${thread.channelLabel}` : "Web chat"} · visible to you and workspace admins</p>
          </div>
          {thread.status === "waiting" && <Badge variant="saffron" className="hidden sm:inline-flex">Waiting on you</Badge>}
          {running && <Badge variant="info">Running</Badge>}
          <Button variant="ghost" size="icon-sm" aria-label="Share">
            <Share2 />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Participants">
            <Users />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="More">
            <MoreHorizontal />
          </Button>
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
          <Composer onSubmit={(t) => runAgent(thread.id, t)} disabled={running} placeholder={running ? "Anvita is working… you can still add context" : "Reply, refine or ask a follow-up…"} />
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
