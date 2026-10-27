"use client";
import { appById } from "./mock/apps";
import { patchBlock, patchStep, useApp, waitFor } from "./store";
import type { Artifact, ChatBlock, RunStep } from "./types";
import { sleep } from "./utils";

const keywordApps: [RegExp, string, string][] = [
  [/\b(ads?|roas|cac|meta|campaign)/i, "metaads", "Fetched Meta Ads insights"],
  [/\b(google ads|search ads)/i, "googleads", "Fetched Google Ads report"],
  [/\b(traffic|analytics|ga4|sessions|funnel)/i, "ga4", "Pulled Google Analytics sessions"],
  [/\b(deals?|leads?|pipeline|crm|hubspot)/i, "hubspot", "Searched HubSpot deals"],
  [/\b(orders?|rto|sales|shopify|returns?|sku)/i, "shopify", "Queried Shopify orders"],
  [/\b(gst|invoice|voucher|tally|ledger)/i, "tally", "Exported Tally vouchers"],
  [/\b(tickets?|support|zendesk|csat)/i, "zendesk", "Searched Zendesk tickets"],
  [/\b(competitor|research|market|web|news)/i, "web", "Researched the web"],
  [/\b(calendar|meeting|schedule a)/i, "gcal", "Checked Google Calendar"],
];

function now() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function artifactFor(text: string): Artifact | null {
  if (/dashboard/i.test(text)) return { id: crypto.randomUUID(), kind: "dashboard", title: "Live dashboard", subtitle: "Hosted at kesar.anvita.app · refreshes hourly" };
  if (/\bapp\b|tool|calculator/i.test(text)) return { id: crypto.randomUUID(), kind: "app", title: "Mini app", subtitle: "Hosted at kesar.anvita.app · members only" };
  if (/pdf|report|deck|summary/i.test(text)) return { id: crypto.randomUUID(), kind: "pdf", title: "Report.pdf", subtitle: "5 pages · 3 charts", size: "540 KB" };
  if (/sheet|excel|xlsx|csv|list|reconcile|table/i.test(text)) return { id: crypto.randomUUID(), kind: "sheet", title: "Results.xlsx", subtitle: "2 sheets · 148 rows", size: "64 KB" };
  if (/chart|graph|plot|trend/i.test(text)) return { id: crypto.randomUUID(), kind: "chart", title: "Trend chart.png", subtitle: "1600×900" };
  if (/doc|draft|copy|write|email/i.test(text)) return { id: crypto.randomUUID(), kind: "doc", title: "Draft.docx", subtitle: "1 page" };
  return null;
}

export async function runAgent(threadId: string, text: string) {
  const s = useApp.getState();
  s.pushMessage(threadId, { id: crypto.randomUUID(), role: "user", author: "Priya Sharma", time: now(), blocks: [{ type: "text", text }] });
  s.updateThread(threadId, { status: "running" });

  const assistantId = crypto.randomUUID();
  s.pushMessage(threadId, { id: assistantId, role: "assistant", author: "Anvita", time: now(), blocks: [], streaming: true });
  const update = (fn: Parameters<typeof s.updateMessage>[2]) => useApp.getState().updateMessage(threadId, assistantId, fn);
  const append = (b: ChatBlock) => update((m) => ({ ...m, blocks: [...m.blocks, b] }));

  await sleep(700);

  const matched = keywordApps.filter(([re]) => re.test(text));
  const apps = (matched.length ? matched : [keywordApps[7]]).slice(0, 3);
  const art = artifactFor(text);
  const needsApproval = /\b(email|send|post|share with|refund|whatsapp them|message them)/i.test(text);

  const planSteps = [
    ...apps.map(([, appId]) => `Get data from ${appById[appId]?.name ?? appId}`),
    "Analyse it in my computer (Python)",
    art ? `Build the ${{ pdf: "PDF report", sheet: "spreadsheet", chart: "chart", dashboard: "live dashboard", doc: "draft", app: "mini app" }[art.kind]}` : "Write up the answer",
    ...(needsApproval ? ["Send it (I'll ask for your approval first)"] : []),
  ];
  const estimate = 120 + apps.length * 60 + (art ? 300 : 80) + (needsApproval ? 10 : 0);
  append({ type: "plan", steps: planSteps, estimate });
  await sleep(600);

  const steps: RunStep[] = [
    ...apps.map(([, appId, label], i) => ({ id: `s${i}`, label, kind: "tool" as const, appId, status: "pending" as const })),
    { id: "code", label: "Analysed data", kind: "code", appId: "sandbox", status: "pending" },
    { id: "llm", label: art ? `Built ${art.title}` : "Wrote the answer", kind: "llm", status: "pending" },
  ];
  append({ type: "steps", steps });

  for (const step of steps) {
    update((m) => patchStep(m, step.id, { status: "running" }));
    const conn = useApp.getState().connections.find((c) => c.appId === step.appId);
    const needsConnect = step.kind === "tool" && step.appId && step.appId !== "web" && (!conn || conn.status !== "healthy");
    if (needsConnect && step.appId) {
      update((m) => patchStep(m, step.id, { status: "waiting", detail: `Waiting for you to connect ${appById[step.appId!]?.name}` }));
      append({ type: "connect", appId: step.appId, status: "pending" });
      useApp.getState().updateThread(threadId, { status: "waiting" });
      await waitFor(`connect:${step.appId}`);
      update((m) => patchBlock(m, "connect", (b) => (b.appId === step.appId ? { ...b, status: "connected" } : b)));
      useApp.getState().updateThread(threadId, { status: "running" });
      update((m) => patchStep(m, step.id, { status: "running", detail: undefined }));
    }
    const dur = step.kind === "code" ? 2200 : 1200 + Math.random() * 800;
    await sleep(dur);
    const credits = step.kind === "code" ? 180 : step.kind === "llm" ? 140 : 30;
    const details: Record<string, string> = { tool: `${Math.floor(20 + Math.random() * 400)} records`, code: "analysis.py · 0.8s CPU", llm: art?.subtitle ?? "Summary with sources" };
    update((m) => patchStep(m, step.id, { status: "done", durationMs: Math.round(dur), credits, detail: step.detail ?? details[step.kind] }));
    useApp.getState().addCredits(credits);
  }

  if (art) append({ type: "artifact", artifact: art });
  await sleep(300);
  append({
    type: "text",
    text: `Done. Here's what I found:\n\n• **Top insight:** the last 7 days are up 12% vs the previous week, driven mostly by Tamil Nadu and Karnataka.\n• **Watch out:** 3 items look unusual — I've flagged them in the ${art ? "file" : "notes below"}.\n• **Next step:** I can keep tracking this and alert you if it moves more than 10%.`,
  });
  append({ type: "sources", sources: apps.map(([, appId, label]) => ({ title: label, appId })) });

  if (needsApproval) {
    const approvalId = `ap-${Math.random().toString(36).slice(2, 7)}`;
    useApp.getState().addApproval({
      id: approvalId,
      title: "Send results by email",
      action: "gmail.send",
      appId: "gmail",
      requestedBy: { type: "agent", name: "Anvita" },
      onBehalfOf: "Priya Sharma",
      reason: "Policy “External email needs owner approval”",
      risk: "medium",
      createdAt: "just now",
      expiresIn: "24 h",
      status: "pending",
      credits: 4,
      threadId,
      preview: { kind: "email", to: ["founders@kesarfoods.in"], subject: "Results: " + text.slice(0, 48), body: "Hi team,\n\nSharing the results you asked for — key points are in the summary below and the full file is attached.\n\n— Anvita, on behalf of Priya" },
    });
    append({ type: "approval", approvalId });
    useApp.getState().updateThread(threadId, { status: "waiting" });
    await waitFor(`approval:${approvalId}`);
    const decided = useApp.getState().approvals.find((a) => a.id === approvalId);
    append({ type: "text", text: decided?.status === "approved" ? "✅ Sent. I've logged it in the audit trail." : "Okay — I won't send it. The draft is saved if you change your mind." });
  }

  update((m) => patchBlock(m, "plan", (b) => ({ ...b, actual: Math.round(estimate * (0.8 + Math.random() * 0.3)) })));
  if (/weekly|every|daily|monthly|each (week|month|day)|recurring/i.test(text) || art) {
    append({ type: "harden", workerName: text.length > 42 ? text.slice(0, 40).trim() + "…" : text, status: "offered" });
  }
  update((m) => ({ ...m, streaming: false }));
  useApp.getState().updateThread(threadId, { status: "done" });
}
