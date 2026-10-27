"use client";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Link2, MoreHorizontal, Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { confirm } from "@/components/ui/confirm";
import { useApp } from "@/lib/store";
import type { Thread } from "@/lib/types";
import { cn } from "@/lib/utils";

export function copyThreadLink(id: string) {
  navigator.clipboard?.writeText(`${window.location.origin}/chat/${id}`).catch(() => {});
  toast.success("Link copied — workspace members can open this chat");
}

export function useDeleteThread() {
  const deleteThread = useApp((s) => s.deleteThread);
  const router = useRouter();
  const pathname = usePathname();
  return async (t: Thread) => {
    if (!(await confirm({ title: `Delete “${t.title}”?`, description: "The conversation and its files are removed for everyone. Audit events are kept.", confirmLabel: "Delete chat", danger: true }))) return;
    deleteThread(t.id);
    toast(`Deleted “${t.title}”`);
    if (pathname === `/chat/${t.id}`) router.push("/chat");
  };
}

export function RenameThreadDialog({ thread, open, onOpenChange }: { thread: Thread; open: boolean; onOpenChange: (o: boolean) => void }) {
  const updateThread = useApp((s) => s.updateThread);
  const [title, setTitle] = useState(thread.title);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) setTitle(thread.title);
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogTitle>Rename chat</DialogTitle>
        <form
          className="mt-4 grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            updateThread(thread.id, { title: title.trim() });
            onOpenChange(false);
            toast.success("Chat renamed");
          }}
        >
          <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Chat title" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ThreadMenu({ thread, className, onRename }: { thread: Thread; className?: string; onRename?: () => void }) {
  const updateThread = useApp((s) => s.updateThread);
  const del = useDeleteThread();
  const [renaming, setRenaming] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className={cn("rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer", className)}
            aria-label={`Actions for ${thread.title}`}
          >
            <MoreHorizontal className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onSelect={() => (onRename ? onRename() : setRenaming(true))}>
            <Pencil /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              updateThread(thread.id, { pinned: !thread.pinned });
              toast(thread.pinned ? "Unpinned" : "Pinned to top");
            }}
          >
            {thread.pinned ? <PinOff /> : <Pin />} {thread.pinned ? "Unpin" : "Pin"}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => copyThreadLink(thread.id)}>
            <Link2 /> Copy link
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-danger [&_svg]:text-danger" onSelect={() => del(thread)}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {!onRename && <RenameThreadDialog thread={thread} open={renaming} onOpenChange={setRenaming} />}
    </>
  );
}
