"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Brain, Lock, Pencil, Plus, Sparkles, Trash2, User, Users, Workflow, Package } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/tabs";
import { AppLogo } from "@/components/brand/app-logo";
import { memories as seedMemories, skills } from "@/lib/mock/workspace";

const typeTone = { fact: "info", preference: "primary", glossary: "saffron", person: "success", process: "warning" } as const;

export default function MemoryPage() {
  const [tab, setTab] = useState<"memory" | "skills">("memory");
  const [scope, setScope] = useState<"all" | "workspace" | "user">("all");
  const [memories, setMemories] = useState(seedMemories);
  const list = memories.filter((m) => scope === "all" || m.scope === scope);

  return (
    <PageContainer className="max-w-5xl">
      <PageHeader
        title="Memory & Skills"
        description="What Anvita has learned about your team and how it does recurring work. Fully editable; never used to train models."
        actions={
          <Button variant="outline">
            <Plus /> {tab === "memory" ? "Add memory" : "New skill"}
          </Button>
        }
      />
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "memory", label: `Memory (${memories.length})` },
            { value: "skills", label: `Skills (${skills.length})` },
          ]}
        />
        {tab === "memory" && (
          <Segmented
            value={scope}
            onChange={setScope}
            options={[
              { value: "all", label: "All" },
              { value: "workspace", label: "Workspace" },
              { value: "user", label: "Only me" },
            ]}
          />
        )}
        <span className="ml-auto flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <Lock className="size-3.5" /> Stored in India (Mumbai) · encrypted
        </span>
      </div>

      {tab === "memory" ? (
        <Card className="mt-5 divide-y divide-border">
          {list.map((m) => (
            <div key={m.id} className="group flex items-start gap-3 px-4 py-3.5">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                {m.scope === "user" ? <User className="size-4" /> : m.scope === "worker" ? <Workflow className="size-4" /> : <Users className="size-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] leading-relaxed">{m.content}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                  <Badge variant={typeTone[m.type]}>{m.type}</Badge>
                  <span>{m.source}</span>
                  <span>· learned {m.learnedAt}</span>
                  <span>· used {m.uses}×</span>
                </div>
              </div>
              <div className="flex gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                <Button size="icon-sm" variant="ghost" aria-label="Edit">
                  <Pencil />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Forget"
                  className="hover:text-danger"
                  onClick={() => {
                    setMemories((ms) => ms.filter((x) => x.id !== m.id));
                    toast("Forgotten — Anvita won't use this again");
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
        </Card>
      ) : (
        <>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {skills.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    {s.author === "pack" ? <Package className="size-4" /> : s.author === "anvita" ? <Sparkles className="size-4" /> : <Brain className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium">{s.name}</p>
                    <p className="mt-0.5 text-[12.5px] text-muted-foreground">{s.description}</p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <Badge variant={s.author === "pack" ? "info" : s.author === "anvita" ? "primary" : "default"}>{s.author === "pack" ? s.pack : s.author === "anvita" ? "Learned by Anvita" : "Written by team"}</Badge>
                      <span className="text-[12px] text-muted-foreground">used {s.uses}×</span>
                      <span className="ml-auto flex gap-1">
                        {s.tools.map((t) => (
                          <AppLogo key={t} appId={t} size={18} />
                        ))}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-border bg-gradient-to-r from-primary-soft to-saffron-soft p-5">
            <p className="text-[15px] font-semibold">Skill packs</p>
            <p className="mt-1 text-[13px] text-muted-foreground">Expert-built know-how for Indian businesses.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["India Finance Pack (GST, TDS, e-invoice)", "D2C Growth Pack", "HR & Payroll (PF, ESI)", "Exports & Customs"].map((p, i) => (
                <Button key={p} size="sm" variant={i === 0 ? "secondary" : "outline"} className="bg-card">
                  {i === 0 ? "✓ " : "+ "}
                  {p}
                </Button>
              ))}
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
}
