"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, Sparkles, Trash2, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AppLogo } from "@/components/brand/app-logo";
import { nodeMeta } from "@/components/studio/node-meta";
import { compileThread } from "@/components/workers/factory";
import { useApp } from "@/lib/store";
import { cn, sleep } from "@/lib/utils";

const steps = ["Review workflow", "Inputs & schedule", "Test & publish"];
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export function SaveWorkerDialog({
  open,
  onOpenChange,
  threadId,
  defaultName,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  threadId: string;
  defaultName: string;
  onSaved: (workerId: string, name: string) => void;
}) {
  const thread = useApp((s) => s.threads.find((t) => t.id === threadId));
  const owner = useApp((s) => s.profile.name);
  const addWorker = useApp((s) => s.addWorker);
  const updateWorker = useApp((s) => s.updateWorker);
  const [step, setStep] = useState(0);
  const [name, setName] = useState(defaultName.startsWith("Compare") ? "Weekly Growth Report (from chat)" : defaultName);
  const [freq, setFreq] = useState("weekly");
  const [day, setDay] = useState("Monday");
  const [time, setTime] = useState("09:00");
  const [shared, setShared] = useState(true);
  const [approval, setApproval] = useState(true);
  const [cap, setCap] = useState("6,000");
  const [testing, setTesting] = useState<"idle" | "running" | "passed">("idle");
  const router = useRouter();

  const schedule = freq === "manual" ? "Only when asked" : freq === "daily" ? `Every day ${time} IST` : freq === "monthly" ? `Monthly on the 1st ${time} IST` : `Every ${day} ${time} IST`;

  const compiled = useMemo(() => {
    if (!thread) return null;
    const w = compileThread(thread, name || "Untitled Worker", owner, schedule);
    if (!approval) {
      const ap = w.nodes.find((n) => n.kind === "approval");
      if (ap) {
        const into = w.edges.find((e) => e.target === ap.id);
        const out = w.edges.find((e) => e.source === ap.id);
        w.nodes = w.nodes.filter((n) => n.id !== ap.id);
        w.edges = w.edges.filter((e) => e !== into && e !== out);
        if (into && out) w.edges.push({ id: `${into.source}-${out.target}`, source: into.source, target: out.target });
      }
    }
    return w;
  }, [thread, name, owner, schedule, approval]);

  const toolCount = compiled?.nodes.filter((n) => n.kind === "tool").length ?? 0;

  const runTest = async () => {
    setTesting("running");
    await sleep(2200);
    setTesting("passed");
  };

  const save = (status: "live" | "draft") => {
    if (!compiled) return null;
    const w = { ...compiled, status, version: status === "live" ? 1 : 0 };
    addWorker(w);
    useApp.getState().setSetting(`worker:${w.id}:cap`, cap);
    useApp.getState().setSetting(`worker:${w.id}:sharedConnection`, shared);
    if (status === "live") updateWorker(w.id, { lastRun: "—" });
    onSaved(w.id, w.name);
    return w;
  };

  const reset = () => {
    setStep(0);
    setTesting("idle");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-2xl p-0">
        <div className="border-b border-border px-6 pb-4 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" /> Save as AI Worker
          </DialogTitle>
          <DialogDescription className="mt-1">Anvita compiled this run into a workflow. Deterministic steps run as code; only judgment steps use AI.</DialogDescription>
          <div className="mt-4 flex items-center gap-2">
            {steps.map((s, i) => (
              <div key={s} className="flex flex-1 items-center gap-2">
                <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold", i < step ? "bg-success text-white" : i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                  {i < step ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span className={cn("hidden text-[12.5px] sm:inline", i === step ? "font-medium" : "text-muted-foreground")}>{s}</span>
                {i < steps.length - 1 && <span className="h-px flex-1 bg-border" />}
              </div>
            ))}
          </div>
        </div>

        <div className="max-h-[55vh] overflow-y-auto px-6 py-5 scrollbar-thin">
          {!thread && <p className="text-[13px] text-muted-foreground">This chat no longer exists.</p>}
          {thread && step === 0 && compiled && (
            <div className="flex flex-col gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="wname">Worker name</Label>
                <Input id="wname" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="rounded-xl border border-border">
                {compiled.nodes.map((n, i) => {
                  const meta = nodeMeta[n.kind];
                  return (
                    <div key={n.id} className="flex items-center gap-3 border-b border-border px-3.5 py-2.5 last:border-0">
                      <span className="w-5 text-center text-[11px] text-muted-foreground">{i + 1}</span>
                      {n.appId && n.kind === "tool" ? (
                        <AppLogo appId={n.appId} size={28} />
                      ) : (
                        <span className="flex size-7 items-center justify-center rounded-lg text-white" style={{ background: meta.color }}>
                          <meta.icon className="size-3.5" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium">{n.title}</p>
                        <p className="truncate font-mono text-[11.5px] text-muted-foreground">
                          {meta.label.toLowerCase()} · {n.subtitle}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
                <Trash2 className="size-3.5" /> Removed exploratory steps and retries from the original run.
                <Badge variant="success" className="ml-auto">
                  <Zap /> ~62% cheaper per run
                </Badge>
              </p>
            </div>
          )}

          {thread && step === 1 && (
            <div className="grid gap-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="freq">Run</Label>
                  <Select id="freq" value={freq} onChange={(e) => setFreq(e.target.value)}>
                    <option value="weekly">Weekly</option>
                    <option value="daily">Daily</option>
                    <option value="monthly">Monthly</option>
                    <option value="manual">Only when asked</option>
                  </Select>
                </div>
                {freq !== "manual" && (
                  <div className="grid gap-1.5">
                    <Label htmlFor="day">{freq === "weekly" ? "On" : "At"}</Label>
                    <div className="flex gap-2">
                      {freq === "weekly" && (
                        <Select id="day" value={day} onChange={(e) => setDay(e.target.value)} className="flex-1">
                          {days.map((d) => (
                            <option key={d}>{d}</option>
                          ))}
                        </Select>
                      )}
                      <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-28" aria-label="Time" />
                    </div>
                  </div>
                )}
              </div>
              <p className="rounded-lg bg-subtle px-3 py-2 text-[12.5px] text-muted-foreground">
                Schedule: <b className="text-foreground">{schedule}</b> · {toolCount} data source{toolCount === 1 ? "" : "s"} parameterised with <code className="font-mono">range = last_period</code>
              </p>
              <div className="grid gap-3 rounded-xl border border-border p-3.5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[13px] font-medium">Use shared connections</p>
                    <p className="text-[12px] text-muted-foreground">Runs with workspace accounts instead of your personal logins.</p>
                  </div>
                  <Switch checked={shared} onCheckedChange={setShared} aria-label="Use shared connections" />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[13px] font-medium">Require approval before sending</p>
                    <p className="text-[12px] text-muted-foreground">You’ll get an approval card with the preview each run.</p>
                  </div>
                  <Switch checked={approval} onCheckedChange={setApproval} aria-label="Require approval" />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[13px] font-medium">Monthly budget cap (credits)</p>
                    <p className="text-[12px] text-muted-foreground">Pause and notify the owner if exceeded.</p>
                  </div>
                  <Input value={cap} onChange={(e) => setCap(e.target.value)} className="w-32" aria-label="Monthly budget cap" />
                </div>
              </div>
            </div>
          )}

          {thread && step === 2 && (
            <div className="flex flex-col gap-4">
              <p className="text-[13px] text-muted-foreground">A test run executes every step with side effects stubbed (nothing is sent) and compares the output to your original run.</p>
              <div className="rounded-xl border border-border">
                {[`All ${toolCount} data sources return data`, "Frozen script produces the same file", "Summary matches the output schema", "Totals within 0.5% of the original run", approval ? "Approval + send steps stubbed" : "Send step stubbed"].map((c) => (
                  <div key={c} className="flex items-center gap-3 border-b border-border px-3.5 py-2.5 text-[13px] last:border-0">
                    {testing === "passed" ? <Check className="size-4 text-success" /> : testing === "running" ? <Loader2 className="size-4 animate-spin text-primary" /> : <span className="size-4 rounded-full border border-border" />}
                    {c}
                  </div>
                ))}
              </div>
              {testing === "passed" && (
                <div className="flex items-center gap-2 rounded-xl bg-success-soft px-3.5 py-2.5 text-[13px] text-success">
                  <Check className="size-4" /> 5/5 checks passed · est. 420 credits per run
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <Button variant="ghost" onClick={() => (step === 0 ? onOpenChange(false) : setStep(step - 1))}>
            {step === 0 ? "Cancel" : "Back"}
          </Button>
          {step < 2 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!thread || !name.trim()}>
              Continue
            </Button>
          ) : testing !== "passed" ? (
            <Button onClick={runTest} disabled={testing === "running"}>
              {testing === "running" ? <Loader2 className="animate-spin" /> : <Zap />} Run test
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  const w = save("draft");
                  onOpenChange(false);
                  reset();
                  if (w) router.push(`/workers/${w.id}`);
                }}
              >
                Save draft & open Studio
              </Button>
              <Button
                onClick={() => {
                  const w = save("live");
                  onOpenChange(false);
                  reset();
                  if (w) toast.success(`“${w.name}” published as v1 — next run: ${schedule}`);
                }}
              >
                <Check /> Publish v1
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
