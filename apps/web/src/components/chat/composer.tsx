"use client";
import { useRef, useState } from "react";
import { ArrowUp, AtSign, Globe, Mic, Paperclip, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function Composer({
  onSubmit,
  placeholder = "Ask Anvita to do anything — pull a report, reconcile GST, draft emails, build a dashboard…",
  autoFocus,
  disabled,
  size = "default",
  className,
}: {
  onSubmit: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  size?: "default" | "lg";
  className?: string;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const v = value.trim();
    if (!v || disabled) return;
    onSubmit(v);
    setValue("");
    if (ref.current) ref.current.style.height = "auto";
  };

  return (
    <div className={cn("rounded-2xl border border-border bg-card shadow-soft transition-shadow focus-within:border-ring/60 focus-within:shadow-pop", className)}>
      <textarea
        ref={ref}
        value={value}
        autoFocus={autoFocus}
        rows={size === "lg" ? 3 : 1}
        onChange={(e) => {
          setValue(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = Math.min(e.target.scrollHeight, 220) + "px";
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        className={cn("block w-full resize-none bg-transparent px-4 pt-3.5 text-[14.5px] leading-relaxed outline-none placeholder:text-muted-foreground/70", size === "lg" && "min-h-[84px]")}
      />
      <div className="flex items-center gap-1 px-2.5 pb-2.5 pt-1">
        {[
          { icon: Paperclip, label: "Attach files" },
          { icon: AtSign, label: "Mention an app, Worker or teammate" },
          { icon: Globe, label: "Web research" },
          { icon: Workflow, label: "Run an AI Worker" },
        ].map(({ icon: Icon, label }) => (
          <Tooltip key={label} content={label}>
            <button type="button" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer" aria-label={label}>
              <Icon className="size-4" />
            </button>
          </Tooltip>
        ))}
        <span className="ml-2 hidden text-[11.5px] text-muted-foreground sm:inline">EN · हिं · தமிழ் supported</span>
        <div className="ml-auto flex items-center gap-1.5">
          <Tooltip content="Voice input">
            <button type="button" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer" aria-label="Voice input">
              <Mic className="size-4" />
            </button>
          </Tooltip>
          <Button size="icon-sm" className="rounded-xl" onClick={submit} disabled={!value.trim() || disabled} aria-label="Send">
            <ArrowUp />
          </Button>
        </div>
      </div>
    </div>
  );
}
