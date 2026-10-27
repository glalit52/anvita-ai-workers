"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Brain, Check, Clock, Code2, Loader2, PauseCircle, Send, Sparkles, Trash2, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AppLogo } from "@/components/brand/app-logo";
import { cn, sleep } from "@/lib/utils";

const compiled = [
  { icon: Clock, title: "Schedule trigger", sub: "Every Monday 09:00 IST", tone: "bg-info-soft text-info" },
  { app: "metaads", title: "Meta Ads insights", sub: "tool · range = {{inputs.range}}" },
  { app: "googleads", title: "Google Ads report", sub: "tool · range = {{inputs.range}}" },
  { app: "hubspot", title: "HubSpot deals", sub: "tool · created in {{inputs.range}}" },
  { icon: Code2, title: "build_report.py", sub: "code · frozen from this run (no LLM cost)", tone: "bg-muted text-foreground" },
  { icon: Brain, title: "Executive summary", sub: "agent · Balanced model · output schema", tone: "bg-primary-soft text-primary" },
  { icon: PauseCircle, title: "Owner approval", sub: "human · 24h timeout", tone: "bg-saffron-soft text-saffron" },
  { icon: Send, title: "Email + Slack #growth", sub: "send · {{inputs.recipients}}", tone: "bg-success-soft text-success" },
];

const steps = ["Review workflow", "Inputs & schedule", "Test & publish"];

export function SaveWorkerDialog({ open, onOpenChange, defaultName, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; defaultName: string; onSaved: () => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(defaultName.startsWith("Compare") ? "Weekly Growth Report" : defaultName);
  const [testing, setTesting] = useState<"idle" | "running" | "passed">("idle");
  const router = useRouter();

  const runTest = async () => {
    setTesting("running");
    await sleep(2200);
    setTesting("passed");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <div className="border-b border-border px-6 pb-4 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" /> Save as AI Worker
          </DialogTitle>
          <DialogDescription className="mt-1">Anvita compiled this run into a workflow. Deterministic steps run as code; only judgment steps use AI.</DialogDescription>
          <div className="mt-4 flex items-center gap-2">
            {steps.map((s, i) => (
              <div key={s} className="flex flex-1 items-center gap-2">
                <span className={cn("flex size-6 items-center justify-center rounded-full text-[12px] font-semibold", i < step ? "bg-success text-white" : i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                  {i < step ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span className={cn("text-[12.5px]", i === step ? "font-medium" : "text-muted-foreground")}>{s}</span>
                {i < steps.length - 1 && <span className="h-px flex-1 bg-border" />}
              </div>
            ))}
          </div>
        </div>

        <div className="max-h-[55vh] overflow-y-auto px-6 py-5 scrollbar-thin">
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="wname">Worker name</Label>
                <Input id="wname" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="rounded-xl border border-border">
                {compiled.map((n, i) => (
                  <div key={i} className="flex items-center gap-3 border-b border-border px-3.5 py-2.5 last:border-0">
                    <span className="w-5 text-center text-[11px] text-muted-foreground">{i + 1}</span>
                    {"app" in n && n.app ? (
                      <AppLogo appId={n.app} size={28} />
                    ) : (
                      <span className={cn("flex size-7 items-center justify-center rounded-lg", n.tone)}>{n.icon && <n.icon className="size-3.5" />}</span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium">{n.title}</p>
                      <p className="truncate font-mono text-[11.5px] text-muted-foreground">{n.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                <Trash2 className="size-3.5" /> Removed 3 exploratory steps and 1 retry from the original run.
                <Badge variant="success" className="ml-auto">
                  <Zap /> ~62% cheaper per run
                </Badge>
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label>Run</Label>
                  <Select defaultValue="weekly">
                    <option value="weekly">Weekly</option>
                    <option value="daily">Daily</option>
                    <option value="monthly">Monthly</option>
                    <option value="manual">Only when asked</option>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>On</Label>
                  <div className="flex gap-2">
                    <Select defaultValue="mon" className="flex-1">
                      {["mon", "tue", "wed", "thu", "fri"].map((d) => (
                        <option key={d} value={d}>
                          {d[0].toUpperCase() + d.slice(1)}day
                        </option>
                      ))}
                    </Select>
                    <Input defaultValue="09:00" className="w-24" />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[13px] font-medium">Inputs detected from your request</p>
                <div className="mt-2 grid gap-2">
                  {[
                    ["range", "Date range", "last_week"],
                    ["recipients", "Recipients", "founders@kesarfoods.in, investors@saffronvc.in"],
                    ["channel", "Slack channel", "#growth"],
                  ].map(([k, l, v]) => (
                    <div key={k} className="grid grid-cols-[120px_1fr] items-center gap-3">
                      <span className="font-mono text-[12px] text-muted-foreground">{k}</span>
                      <Input defaultValue={v} aria-label={l} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 rounded-xl border border-border p-3.5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[13px] font-medium">Use a shared connection</p>
                    <p className="text-[12px] text-muted-foreground">Runs with the workspace Google Ads account instead of your personal login.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[13px] font-medium">Require approval before sending</p>
                    <p className="text-[12px] text-muted-foreground">You’ll get a Slack card every Monday with the preview.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[13px] font-medium">Monthly budget cap</p>
                    <p className="text-[12px] text-muted-foreground">Pause and notify the owner if exceeded.</p>
                  </div>
                  <Input defaultValue="6,000 credits" className="w-36" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <p className="text-[13px] text-muted-foreground">A test run executes every step with side effects stubbed (no email is sent) and compares the output to your original run.</p>
              <div className="rounded-xl border border-border">
                {[
                  "All 3 data sources return data for last_week",
                  "build_report.py produces a 4-page PDF",
                  "Summary matches output schema (3 bullets + risks)",
                  "Totals within 0.5% of original run",
                  "Approval + send steps stubbed",
                ].map((c, i) => (
                  <div key={c} className="flex items-center gap-3 border-b border-border px-3.5 py-2.5 text-[13px] last:border-0">
                    {testing === "passed" ? (
                      <Check className="size-4 text-success" />
                    ) : testing === "running" ? (
                      <Loader2 className="size-4 animate-spin text-primary" style={{ animationDelay: `${i * 0.1}s` }} />
                    ) : (
                      <span className="size-4 rounded-full border border-border" />
                    )}
                    {c}
                  </div>
                ))}
              </div>
              {testing === "passed" && (
                <div className="flex items-center gap-2 rounded-xl bg-success-soft px-3.5 py-2.5 text-[13px] text-success">
                  <Check className="size-4" /> 5/5 checks passed · test cost 410 credits · est. 420 credits per run
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
            <Button onClick={() => setStep(step + 1)}>Continue</Button>
          ) : testing !== "passed" ? (
            <Button onClick={runTest} disabled={testing === "running"}>
              {testing === "running" ? <Loader2 className="animate-spin" /> : <Zap />} Run test
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  router.push("/workers/growth-report");
                }}
              >
                Open in Studio
              </Button>
              <Button
                onClick={() => {
                  onSaved();
                  onOpenChange(false);
                  toast.success(`“${name}” published as v1 — next run Monday 09:00 IST`);
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
