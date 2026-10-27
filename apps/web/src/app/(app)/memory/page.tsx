"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Brain, Check, Download, Lock, Package, Pencil, Plus, Search, Sparkles, Trash2, User, Users, Workflow } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Segmented } from "@/components/ui/tabs";
import { confirm } from "@/components/ui/confirm";
import { AppLogo } from "@/components/brand/app-logo";
import { MemoryDialog, SkillDialog } from "@/components/memory/dialogs";
import { useApp } from "@/lib/store";
import { downloadCSV } from "@/lib/download";
import type { MemoryItem } from "@/lib/types";

const typeTone = { fact: "info", preference: "primary", glossary: "saffron", person: "success", process: "warning" } as const;

const packs = [
  { name: "India Finance Pack (GST, TDS, e-invoice)", skills: 14, desc: "GSTR-2B reconciliation, TDS on vendor payments, e-invoice & e-way bill checks." },
  { name: "D2C Growth Pack", skills: 11, desc: "ROAS/CAC analysis, cohort retention, RTO root-cause and marketplace reports." },
  { name: "HR & Payroll (PF, ESI)", skills: 9, desc: "Payroll checks, PF/ESI challans, leave balances and offer letters." },
  { name: "Exports & Customs", skills: 7, desc: "Shipping bills, IEC, RoDTEP claims and LC document checks." },
];

export default function MemoryPage() {
  const memories = useApp((s) => s.memories);
  const skills = useApp((s) => s.skills);
  const installed = useApp((s) => s.installedPacks);
  const togglePack = useApp((s) => s.togglePack);
  const removeMemory = useApp((s) => s.removeMemory);
  const removeSkill = useApp((s) => s.removeSkill);
  const [tab, setTab] = useState<"memory" | "skills">("memory");
  const [scope, setScope] = useState<"all" | "workspace" | "user">("all");
  const [type, setType] = useState<"all" | MemoryItem["type"]>("all");
  const [q, setQ] = useState("");
  const [memOpen, setMemOpen] = useState(false);
  const [editing, setEditing] = useState<MemoryItem | undefined>();
  const [skillOpen, setSkillOpen] = useState(false);

  const list = memories.filter((m) => (scope === "all" || m.scope === scope) && (type === "all" || m.type === type) && (m.content + m.source).toLowerCase().includes(q.toLowerCase()));
  const skillList = skills.filter((s) => (s.name + s.description).toLowerCase().includes(q.toLowerCase()));

  const forget = async (m: MemoryItem) => {
    if (!(await confirm({ title: "Forget this memory?", description: `“${m.content.slice(0, 120)}${m.content.length > 120 ? "…" : ""}”`, confirmLabel: "Forget", danger: true }))) return;
    removeMemory(m.id);
    toast("Forgotten — Anvita won't use this again");
  };

  return (
    <PageContainer className="max-w-5xl">
      <PageHeader
        title="Memory & Skills"
        description="What Anvita has learned about your team and how it does recurring work. Fully editable; never used to train models."
        actions={
          tab === "memory" ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  downloadCSV("anvita-memory.csv", memories.map((m) => ({ scope: m.scope, type: m.type, content: m.content, source: m.source, learned: m.learnedAt, uses: m.uses })));
                  toast.success(`Exported ${memories.length} memories`);
                }}
              >
                <Download /> Export
              </Button>
              <Button
                onClick={() => {
                  setEditing(undefined);
                  setMemOpen(true);
                }}
              >
                <Plus /> Add memory
              </Button>
            </>
          ) : (
            <Button onClick={() => setSkillOpen(true)}>
              <Plus /> New skill
            </Button>
          )
        }
      />
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Segmented
          value={tab}
          onChange={(t) => {
            setTab(t);
            setQ("");
          }}
          options={[
            { value: "memory", label: `Memory (${memories.length})` },
            { value: "skills", label: `Skills (${skills.length})` },
          ]}
        />
        {tab === "memory" && (
          <>
            <Segmented
              value={scope}
              onChange={setScope}
              options={[
                { value: "all", label: "All" },
                { value: "workspace", label: "Workspace" },
                { value: "user", label: "Only me" },
              ]}
            />
            <Select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="h-8 w-36 text-[12.5px]" aria-label="Filter by type">
              <option value="all">All types</option>
              {Object.keys(typeTone).map((t) => (
                <option key={t} value={t}>
                  {t[0].toUpperCase() + t.slice(1)}
                </option>
              ))}
            </Select>
          </>
        )}
        <div className="relative ml-auto w-full sm:w-60">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === "memory" ? "Search memory" : "Search skills"} className="h-8 pl-8 text-[13px]" />
        </div>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[12px] text-muted-foreground">
        <Lock className="size-3.5" /> Stored in India (Mumbai) · encrypted
      </p>

      {tab === "memory" ? (
        list.length === 0 ? (
          <div className="mt-5">
            <EmptyState icon={<Brain />} title={memories.length ? "No memories match" : "Nothing remembered yet"} description={memories.length ? "Try a different search or filter." : "Anvita learns from your corrections and feedback. You can also add facts yourself."} />
          </div>
        ) : (
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
                <div className="flex gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Edit memory"
                    onClick={() => {
                      setEditing(m);
                      setMemOpen(true);
                    }}
                  >
                    <Pencil />
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label="Forget memory" className="hover:text-danger" onClick={() => forget(m)}>
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
          </Card>
        )
      ) : (
        <>
          {skillList.length === 0 && (
            <div className="mt-5">
              <EmptyState icon={<Sparkles />} title="No skills found" description="Create a skill to teach Anvita a recurring process." />
            </div>
          )}
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {skillList.map((s) => (
              <Card key={s.id} className="group p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    {s.author === "pack" ? <Package className="size-4" /> : s.author === "anvita" ? <Sparkles className="size-4" /> : <Brain className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <p className="flex-1 text-[14px] font-medium">{s.name}</p>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Delete ${s.name}`}
                        className="-mr-1 -mt-1 opacity-70 hover:text-danger group-hover:opacity-100"
                        onClick={async () => {
                          if (await confirm({ title: `Delete skill “${s.name}”?`, description: "Anvita will stop using this procedure.", confirmLabel: "Delete", danger: true })) {
                            removeSkill(s.id);
                            toast(`${s.name} deleted`);
                          }
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
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
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {packs.map((p) => {
                const on = installed.includes(p.name);
                return (
                  <div key={p.name} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3.5">
                    <Package className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-medium">{p.name}</p>
                      <p className="mt-0.5 text-[12px] text-muted-foreground">
                        {p.skills} skills · {p.desc}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={on ? "secondary" : "outline"}
                      onClick={() => {
                        togglePack(p.name);
                        toast.success(on ? `${p.name} removed` : `${p.name} installed — ${p.skills} skills available`);
                      }}
                    >
                      {on ? (
                        <>
                          <Check /> Installed
                        </>
                      ) : (
                        <>
                          <Plus /> Install
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <MemoryDialog open={memOpen} onOpenChange={setMemOpen} memory={editing} />
      <SkillDialog open={skillOpen} onOpenChange={setSkillOpen} />
    </PageContainer>
  );
}
