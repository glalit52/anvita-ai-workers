"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { AppLogo } from "@/components/brand/app-logo";
import { apps } from "@/lib/mock/apps";
import { useApp } from "@/lib/store";
import type { MemoryItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const types: MemoryItem["type"][] = ["fact", "preference", "glossary", "person", "process"];

export function MemoryDialog({ open, onOpenChange, memory }: { open: boolean; onOpenChange: (o: boolean) => void; memory?: MemoryItem }) {
  const add = useApp((s) => s.addMemory);
  const update = useApp((s) => s.updateMemory);
  const [scope, setScope] = useState<MemoryItem["scope"]>("workspace");
  const [type, setType] = useState<MemoryItem["type"]>("fact");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (open) {
      setScope(memory?.scope ?? "workspace");
      setType(memory?.type ?? "fact");
      setContent(memory?.content ?? "");
    }
  }, [open, memory]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{memory ? "Edit memory" : "Add memory"}</DialogTitle>
        <DialogDescription className="mt-1">Anvita uses this in every relevant chat and Worker run.</DialogDescription>
        <form
          className="mt-5 grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!content.trim()) return;
            if (memory) {
              update(memory.id, { scope, type, content: content.trim() });
              toast.success("Memory updated");
            } else {
              add({ scope, type, content: content.trim() });
              toast.success("Anvita will remember this");
            }
            onOpenChange(false);
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="mem-scope">Visible to</Label>
              <Select id="mem-scope" value={scope} onChange={(e) => setScope(e.target.value as MemoryItem["scope"])}>
                <option value="workspace">Whole workspace</option>
                <option value="user">Only me</option>
                <option value="worker">Workers only</option>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="mem-type">Type</Label>
              <Select id="mem-type" value={type} onChange={(e) => setType(e.target.value as MemoryItem["type"])}>
                {types.map((t) => (
                  <option key={t} value={t}>
                    {t[0].toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="mem-content">What should Anvita remember?</Label>
            <Textarea id="mem-content" rows={4} value={content} onChange={(e) => setContent(e.target.value)} placeholder="e.g. Our financial year starts in April. Report revenue in lakhs." autoFocus />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!content.trim()}>
              {memory ? "Save" : "Add memory"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SkillDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const add = useApp((s) => s.addSkill);
  const connections = useApp((s) => s.connections);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [when, setWhen] = useState("");
  const [tools, setTools] = useState<string[]>([]);
  const toolApps = apps.filter((a) => connections.some((c) => c.appId === a.id));

  const reset = () => {
    setName("");
    setDescription("");
    setWhen("");
    setTools([]);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogTitle>New skill</DialogTitle>
        <DialogDescription className="mt-1">Teach Anvita how your team does a recurring task. It loads the skill whenever the task comes up.</DialogDescription>
        <form
          className="mt-5 grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim() || !description.trim()) return;
            add({ name: name.trim(), description: when.trim() ? `${description.trim()} — Use when: ${when.trim()}` : description.trim(), tools });
            toast.success(`Skill “${name.trim()}” added`);
            reset();
            onOpenChange(false);
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="sk-name">Name</Label>
            <Input id="sk-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Monthly MIS pack" autoFocus />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sk-desc">How to do it</Label>
            <Textarea id="sk-desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Steps, formats, numbers to check, who to send it to…" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sk-when">When to use</Label>
            <Input id="sk-when" value={when} onChange={(e) => setWhen(e.target.value)} placeholder="e.g. Someone asks for the monthly MIS or board numbers" />
          </div>
          <div className="grid gap-1.5">
            <Label>Tools it may use</Label>
            <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto scrollbar-thin">
              {toolApps.map((a) => {
                const on = tools.includes(a.id);
                return (
                  <button key={a.id} type="button" onClick={() => setTools(on ? tools.filter((t) => t !== a.id) : [...tools, a.id])} className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[12px] cursor-pointer", on ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-border hover:bg-subtle")}>
                    <AppLogo appId={a.id} size={14} /> {a.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || !description.trim()}>
              Add skill
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
