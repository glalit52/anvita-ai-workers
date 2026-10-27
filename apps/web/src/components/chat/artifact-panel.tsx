"use client";
import { useRef } from "react";
import { Download, ExternalLink, Lock, Printer, Share2, X } from "lucide-react";
import { downloadCSV, downloadFile } from "@/lib/download";
import { Tooltip as UITooltip } from "@/components/ui/tooltip";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Artifact } from "@/lib/types";

const spend = [
  { ch: "Meta", spend: 6.8, rev: 25.1 },
  { ch: "Google Search", spend: 2.1, rev: 5.2 },
  { ch: "Google PMax", spend: 1.0, rev: 3.6 },
  { ch: "Organic", spend: 0, rev: 7.9 },
];
const trend = ["W37", "W38", "W39", "W40", "W41", "W42", "W43"].map((w, i) => ({ w, roas: [2.6, 2.8, 2.7, 2.9, 3.0, 3.1, 3.4][i], cac: [480, 466, 471, 452, 447, 438, 412][i] }));
const tooltipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 };

function PdfPreview() {
  return (
    <div className="mx-auto w-full max-w-[560px] rounded-md bg-white p-8 text-[#111] shadow-pop">
      <div className="flex items-center justify-between border-b border-black/10 pb-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#5B4CF0]">Kesar Foods · Weekly Growth</p>
          <p className="mt-1 text-xl font-semibold">20 – 26 October 2026</p>
        </div>
        <span className="text-[11px] text-black/50">Page 1 of 4</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          ["Blended ROAS", "3.4x", "+0.3"],
          ["CAC", "₹412", "−6%"],
          ["New pipeline", "₹46.2L", "38 deals"],
        ].map(([k, v, d]) => (
          <div key={k} className="rounded-lg bg-black/[0.04] p-2.5">
            <p className="text-[10px] text-black/50">{k}</p>
            <p className="text-lg font-semibold">{v}</p>
            <p className="text-[10px] text-emerald-700">{d}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[11px] font-semibold">Spend vs attributed revenue (₹ lakh)</p>
      <div className="mt-1 h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={spend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#0001" vertical={false} />
            <XAxis dataKey="ch" tick={{ fontSize: 10, fill: "#555" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#555" }} axisLine={false} tickLine={false} width={24} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} formatter={(value) => <span style={{ color: "#444" }}>{value}</span>} />
            <Bar dataKey="spend" fill="#2a78d6" stroke="#fff" strokeWidth={2} radius={[4, 4, 0, 0]} name="Spend" />
            <Bar dataKey="rev" fill="#eb6834" stroke="#fff" strokeWidth={2} radius={[4, 4, 0, 0]} name="Attributed revenue" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-[11px] font-semibold">Summary</p>
      <ul className="mt-1 list-disc space-y-1 pl-4 text-[11.5px] leading-relaxed text-black/80">
        <li>Meta’s Diwali creatives drove most of the lift; ROAS 3.7x on “Gifting” ad sets.</li>
        <li>Google Search CAC up 22% — generic keywords (“sweets online”) are underperforming.</li>
        <li>9 of 38 new B2B deals came from the corporate gifting landing page.</li>
      </ul>
    </div>
  );
}

const SHEET_HEAD = ["GSTIN", "Invoice", "ITC (Books)", "ITC (2B)", "Status"];
const SHEET_ROWS = [
    ["27AABCS1429B1Z5", "SPP/0912", "₹28,117", "₹28,117", "Missing in 2B"],
    ["33AAFCA2290L1Z1", "AS/2231", "₹56,160", "₹54,000", "Amount diff"],
    ["29AAGCK8812Q1Z8", "KCC/771", "₹11,241", "—", "Missing in 2B"],
    ["27AAKFP7781M1ZQ", "PSM/118", "₹4,460", "₹4,460", "GSTIN typo"],
    ["24AADCG1190P1ZT", "GLA/5521", "₹1,51,290", "₹1,51,290", "Matched"],
    ["07AABCC7710R1Z2", "CN/9902", "₹2,232", "₹2,232", "Matched"],
    ["27AAACD6620E1Z9", "DCB/312", "₹17,334", "₹17,000", "Amount diff"],
];

function SheetPreview() {
  const rows = SHEET_ROWS;
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex gap-1 border-b border-border bg-subtle px-2 pt-2 text-[12px]">
        {["Mismatches (17)", "Matched (395)", "Vendor follow-ups"].map((t, i) => (
          <span key={t} className={`rounded-t-md px-3 py-1.5 ${i === 0 ? "border border-b-0 border-border bg-card font-medium" : "text-muted-foreground"}`}>
            {t}
          </span>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full font-mono text-[12px]">
          <thead>
            <tr className="bg-subtle text-left text-muted-foreground">
              {["", "GSTIN", "Invoice", "ITC (Books)", "ITC (2B)", "Status"].map((h) => (
                <th key={h} className="border-b border-r border-border px-2.5 py-1.5 font-medium last:border-r-0">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="border-b border-r border-border bg-subtle px-2 py-1.5 text-center text-muted-foreground">{i + 2}</td>
                {r.map((c, j) => (
                  <td key={j} className={`border-b border-r border-border px-2.5 py-1.5 last:border-r-0 ${j === 4 ? (c === "Matched" ? "text-success" : "text-danger") : ""}`}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DashboardPreview({ url }: { url: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
      <div className="flex items-center gap-2 border-b border-border bg-subtle px-3 py-2">
        <span className="flex gap-1">
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <span key={c} className="size-2.5 rounded-full" style={{ background: c }} />
          ))}
        </span>
        <span className="flex flex-1 items-center gap-1.5 rounded-md bg-card px-2 py-1 text-[11.5px] text-muted-foreground">
          <Lock className="size-3" /> {url}
        </span>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            ["ROAS", "3.4x"],
            ["CAC", "₹412"],
            ["Orders", "12,480"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-border p-2.5">
              <p className="text-[11px] text-muted-foreground">{k}</p>
              <p className="text-lg font-semibold">{v}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {([
            { key: "roas", label: "ROAS (x)" },
            { key: "cac", label: "CAC (₹)" },
          ] as const).map((m) => (
            <div key={m.key} className="rounded-lg border border-border p-2.5">
              <p className="text-[11.5px] font-medium text-muted-foreground">{m.label} · last 7 weeks</p>
              <div className="mt-1 h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="w" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={30} domain={["auto", "auto"]} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey={m.key} stroke="var(--series-1)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name={m.label} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DocPreview() {
  return (
    <div className="mx-auto max-w-[560px] rounded-md bg-white p-8 text-[13px] leading-relaxed text-[#111] shadow-pop">
      <p className="text-lg font-semibold">Draft</p>
      <p className="mt-3">Hi team,</p>
      <p className="mt-2">Sharing the results you asked for. The key numbers are summarised below, with the detailed breakdown attached as a spreadsheet.</p>
      <ul className="mt-2 list-disc pl-5">
        <li>Week-over-week growth of 12%, led by Tamil Nadu and Karnataka.</li>
        <li>Three outliers flagged for review.</li>
      </ul>
      <p className="mt-2">— Anvita, on behalf of Priya</p>
    </div>
  );
}

export function ArtifactPanel({ artifact, onClose }: { artifact: Artifact; onClose: () => void }) {
  const url = "kesar.anvita.app/" + artifact.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
  const previewRef = useRef<HTMLDivElement>(null);
  const baseName = artifact.title.replace(/\.[a-z0-9]+$/i, "");

  const snapshot = (print: boolean) => {
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((n) => n.outerHTML)
      .join("\n");
    const body = previewRef.current?.innerHTML ?? "";
    return `<!doctype html><html class="${document.documentElement.className}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${artifact.title}</title>${styles}<style>body{background:var(--background);padding:24px}@media print{body{background:#fff;padding:0}}</style></head><body>${body}${print ? "<script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script>" : ""}</body></html>`;
  };

  const openWindow = (print: boolean) => {
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Pop-up blocked — allow pop-ups for Anvita to open previews");
      return;
    }
    w.document.open();
    w.document.write(snapshot(print));
    w.document.close();
  };

  const download = () => {
    if (artifact.kind === "sheet") {
      downloadCSV(`${baseName}.csv`, SHEET_ROWS.map((r) => Object.fromEntries(SHEET_HEAD.map((h, i) => [h, r[i]]))), SHEET_HEAD);
      toast.success(`Downloaded ${baseName}.csv`);
    } else if (artifact.kind === "pdf" || artifact.kind === "doc") {
      openWindow(true);
      toast("Choose “Save as PDF” in the print dialog");
    } else {
      downloadFile(`${baseName}.html`, snapshot(false), "text/html;charset=utf-8");
      toast.success(`Downloaded ${baseName}.html`);
    }
  };
  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold">{artifact.title}</p>
          <p className="truncate text-[12px] text-muted-foreground">{artifact.subtitle}</p>
        </div>
        <Badge variant="outline">
          <Lock /> Workspace only
        </Badge>
        <UITooltip content="Copy link">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              navigator.clipboard?.writeText(`https://${url}`).catch(() => {});
              toast.success("Link copied — workspace members can open it");
            }}
            aria-label="Share"
          >
            <Share2 />
          </Button>
        </UITooltip>
        <UITooltip content={artifact.kind === "pdf" || artifact.kind === "doc" ? "Download as PDF" : artifact.kind === "sheet" ? "Download CSV" : "Download HTML"}>
          <Button variant="ghost" size="icon-sm" onClick={download} aria-label="Download">
            {artifact.kind === "pdf" || artifact.kind === "doc" ? <Printer /> : <Download />}
          </Button>
        </UITooltip>
        <UITooltip content="Open in new tab">
          <Button variant="ghost" size="icon-sm" aria-label="Open in new tab" onClick={() => openWindow(false)}>
            <ExternalLink />
          </Button>
        </UITooltip>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close preview">
          <X />
        </Button>
      </div>
      <div ref={previewRef} className="flex-1 overflow-y-auto p-5 scrollbar-thin">
        {artifact.kind === "pdf" && <PdfPreview />}
        {artifact.kind === "sheet" && <SheetPreview />}
        {(artifact.kind === "dashboard" || artifact.kind === "app" || artifact.kind === "chart") && <DashboardPreview url={url} />}
        {artifact.kind === "doc" && <DocPreview />}
      </div>
    </div>
  );
}
