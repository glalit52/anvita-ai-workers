"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowUp, AtSign, FileText, Globe, Mic, MicOff, Paperclip, Workflow, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AppLogo } from "@/components/brand/app-logo";
import { useApp } from "@/lib/store";
import { appById } from "@/lib/mock/apps";
import { formatBytes } from "@/lib/download";
import { useT } from "@/lib/i18n";
import type { Artifact } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface ComposerExtras {
  attachments: Artifact[];
  web: boolean;
}

function kindFor(name: string): Artifact["kind"] {
  if (/\.(csv|xlsx?|tsv)$/i.test(name)) return "sheet";
  if (/\.pdf$/i.test(name)) return "pdf";
  if (/\.(png|jpe?g|gif|webp|svg)$/i.test(name)) return "chart";
  return "doc";
}

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

export function Composer({
  onSubmit,
  placeholder,
  autoFocus,
  disabled,
  size = "default",
  className,
}: {
  onSubmit: (text: string, extras: ComposerExtras) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  size?: "default" | "lg";
  className?: string;
}) {
  const t = useT();
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<(Artifact & { size?: string })[]>([]);
  const [web, setWeb] = useState(false);
  const [listening, setListening] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [workerOpen, setWorkerOpen] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const baseRef = useRef("");
  const connections = useApp((s) => s.connections);
  const workers = useApp((s) => s.workers);
  const lang = useApp((s) => s.profile.language);

  useEffect(() => () => recRef.current?.stop(), []);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  };

  const insert = (text: string) => {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const before = value.slice(0, start).replace(/@$/, "");
    const next = before + (before && !before.endsWith(" ") ? " " : "") + text + value.slice(start);
    setValue(next);
    requestAnimationFrame(() => {
      el?.focus();
      resize();
    });
  };

  const submit = () => {
    const v = value.trim();
    if ((!v && !files.length) || disabled) return;
    recRef.current?.stop();
    onSubmit(v || `Please look at the attached file${files.length > 1 ? "s" : ""}`, { attachments: files, web });
    setValue("");
    setFiles([]);
    if (ref.current) ref.current.style.height = "auto";
  };

  const toggleVoice = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      toast.error("Voice input isn't supported in this browser", { description: "Try Chrome or Edge, or use the WhatsApp voice notes integration." });
      return;
    }
    const rec = new Ctor();
    rec.lang = lang === "hi" ? "hi-IN" : "en-IN";
    rec.interimResults = true;
    rec.continuous = true;
    baseRef.current = value ? value.trimEnd() + " " : "";
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setValue(baseRef.current + text);
      requestAnimationFrame(resize);
    };
    rec.onerror = (e) => {
      if (e.error !== "aborted" && e.error !== "no-speech") toast.error(e.error === "not-allowed" ? "Microphone permission was denied" : `Voice input error: ${e.error}`);
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
    };
    try {
      rec.start();
      recRef.current = rec;
      setListening(true);
    } catch {
      toast.error("Couldn't start voice input");
    }
  };

  const onFiles = (list: FileList | null) => {
    if (!list) return;
    const next = Array.from(list).map((f) => ({ id: crypto.randomUUID(), kind: kindFor(f.name), title: f.name, subtitle: formatBytes(f.size), size: formatBytes(f.size) }));
    setFiles((cur) => [...cur, ...next].slice(0, 10));
  };

  const connectedApps = connections.filter((c) => c.status === "healthy").map((c) => c.appId);

  return (
    <div
      className={cn("rounded-2xl border border-border bg-card shadow-soft transition-shadow focus-within:border-ring/60 focus-within:shadow-pop", className)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onFiles(e.dataTransfer.files);
      }}
    >
      {(files.length > 0 || web) && (
        <div className="flex flex-wrap gap-1.5 px-3 pt-3">
          {web && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-info-soft px-2 py-1 text-[12px] text-info">
              <Globe className="size-3.5" /> Web research on
              <button onClick={() => setWeb(false)} aria-label="Turn off web research" className="cursor-pointer">
                <X className="size-3" />
              </button>
            </span>
          )}
          {files.map((f) => (
            <span key={f.id} className="inline-flex max-w-56 items-center gap-1.5 rounded-lg border border-border bg-subtle px-2 py-1 text-[12px]">
              <FileText className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{f.title}</span>
              <span className="shrink-0 text-muted-foreground">{f.size}</span>
              <button onClick={() => setFiles((cur) => cur.filter((x) => x.id !== f.id))} aria-label={`Remove ${f.title}`} className="shrink-0 cursor-pointer text-muted-foreground hover:text-foreground">
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <textarea
        ref={ref}
        value={value}
        autoFocus={autoFocus}
        rows={size === "lg" ? 3 : 1}
        aria-label="Message Anvita"
        onChange={(e) => {
          setValue(e.target.value);
          resize();
          if (e.target.value.endsWith("@")) setMentionOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={listening ? "Listening… speak now" : (placeholder ?? t("composer.placeholder"))}
        className={cn("block w-full resize-none bg-transparent px-4 pt-3.5 text-[14.5px] leading-relaxed outline-none placeholder:text-muted-foreground/70", size === "lg" && "min-h-[84px]")}
      />
      <input
        ref={fileRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="flex items-center gap-1 px-2.5 pb-2.5 pt-1">
        <Tooltip content="Attach files (or drop them here)">
          <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer" aria-label="Attach files">
            <Paperclip className="size-4" />
          </button>
        </Tooltip>
        <Popover open={mentionOpen} onOpenChange={setMentionOpen}>
          <Tooltip content="Mention an app or Worker">
            <PopoverTrigger asChild>
              <button type="button" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer" aria-label="Mention an app or Worker">
                <AtSign className="size-4" />
              </button>
            </PopoverTrigger>
          </Tooltip>
          <PopoverContent align="start" className="w-64 p-1.5">
            <p className="px-2 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Connected apps</p>
            <div className="max-h-48 overflow-y-auto scrollbar-thin">
              {connectedApps.map((a) => (
                <button
                  key={a}
                  onClick={() => {
                    insert(`@${appById[a]?.name ?? a} `);
                    setMentionOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-muted cursor-pointer"
                >
                  <AppLogo appId={a} size={18} /> {appById[a]?.name ?? a}
                </button>
              ))}
            </div>
            <p className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">AI Workers</p>
            {workers.slice(0, 6).map((w) => (
              <button
                key={w.id}
                onClick={() => {
                  insert(`@${w.name} `);
                  setMentionOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-muted cursor-pointer"
              >
                <span>{w.emoji}</span> {w.name}
              </button>
            ))}
          </PopoverContent>
        </Popover>
        <Tooltip content={web ? "Web research on" : "Allow web research"}>
          <button type="button" onClick={() => setWeb(!web)} aria-pressed={web} className={cn("rounded-lg p-1.5 hover:bg-muted cursor-pointer", web ? "bg-info-soft text-info" : "text-muted-foreground hover:text-foreground")} aria-label="Web research">
            <Globe className="size-4" />
          </button>
        </Tooltip>
        <Popover open={workerOpen} onOpenChange={setWorkerOpen}>
          <Tooltip content="Run an AI Worker">
            <PopoverTrigger asChild>
              <button type="button" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer" aria-label="Run an AI Worker">
                <Workflow className="size-4" />
              </button>
            </PopoverTrigger>
          </Tooltip>
          <PopoverContent align="start" className="w-72 p-1.5">
            <p className="px-2 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Run a Worker now</p>
            {workers.length === 0 && <p className="px-2 py-3 text-[12.5px] text-muted-foreground">No Workers yet.</p>}
            {workers.map((w) => (
              <button
                key={w.id}
                onClick={() => {
                  setValue(`Run ${w.name} `);
                  setWorkerOpen(false);
                  requestAnimationFrame(() => ref.current?.focus());
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-muted cursor-pointer"
              >
                <span>{w.emoji}</span>
                <span className="min-w-0 flex-1 truncate">{w.name}</span>
                <span className="text-[11px] text-muted-foreground">{w.status}</span>
              </button>
            ))}
          </PopoverContent>
        </Popover>
        <span className="ml-2 hidden text-[11.5px] text-muted-foreground sm:inline">EN · हिं · தமிழ் supported</span>
        <div className="ml-auto flex items-center gap-1.5">
          <Tooltip content={listening ? "Stop listening" : "Voice input"}>
            <button type="button" onClick={toggleVoice} aria-pressed={listening} className={cn("rounded-lg p-1.5 cursor-pointer", listening ? "animate-pulse bg-danger-soft text-danger" : "text-muted-foreground hover:bg-muted hover:text-foreground")} aria-label={listening ? "Stop voice input" : "Voice input"}>
              {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            </button>
          </Tooltip>
          <Button size="icon-sm" className="rounded-xl" onClick={submit} disabled={(!value.trim() && !files.length) || disabled} aria-label="Send">
            <ArrowUp />
          </Button>
        </div>
      </div>
    </div>
  );
}
