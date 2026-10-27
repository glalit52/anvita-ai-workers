"use client";
import { toast } from "sonner";
import { Copy, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { SectionHeader } from "@/components/settings-section";

const curl = `curl https://api.anvita.ai/v1/workers/invoices/runs \\
  -H "Authorization: Bearer $ANVITA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"inputs": {"file_url": "https://…/invoice.pdf"}}'`;

const mcp = `{
  "mcpServers": {
    "anvita": { "url": "https://api.anvita.ai/mcp", "auth": "oauth" }
  }
}`;

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-xl bg-[#0f1020] p-4 font-mono text-[12px] leading-relaxed text-[#d6d7f5]">{code}</pre>
      <button onClick={() => { navigator.clipboard?.writeText(code); toast("Copied"); }} className="absolute right-2 top-2 rounded-md p-1.5 text-[#9a9bd0] hover:bg-white/10 cursor-pointer" aria-label="Copy">
        <Copy className="size-3.5" />
      </button>
    </div>
  );
}

export default function DevelopersPage() {
  return (
    <>
      <SectionHeader title="API & MCP" description="Call Anvita and your Workers from code, Claude Code, Cursor or any MCP client." actions={<Button><Plus /> Create API key</Button>} />
      <Card>
        <Table>
          <THead>
            <tr>
              <TH>Name</TH>
              <TH>Key</TH>
              <TH>Scope</TH>
              <TH>Last used</TH>
            </tr>
          </THead>
          <tbody>
            {[
              ["ERP integration", "anv_live_••••3f9a", "workers:invoices:run", "2 min ago"],
              ["Data team notebook", "anv_live_••••a71c", "chat, kb:read", "yesterday"],
              ["Staging", "anv_test_••••90b2", "all (test)", "Oct 12"],
            ].map(([n, k, s, l]) => (
              <TR key={k}>
                <TD className="font-medium">{n}</TD>
                <TD className="font-mono text-[12px]">{k}</TD>
                <TD><Badge variant="outline" className="font-mono">{s}</Badge></TD>
                <TD className="text-muted-foreground">{l}</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Run a Worker via REST</CardTitle>
            <p className="text-[12.5px] text-muted-foreground">Also OpenAI-compatible: <code className="font-mono">POST /v1/chat/completions</code> with <code className="font-mono">model: &quot;anvita&quot;</code></p>
          </CardHeader>
          <CardContent>
            <CodeBlock code={curl} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Connect via MCP</CardTitle>
            <p className="text-[12.5px] text-muted-foreground">Tools: ask_anvita, run_worker, list_workers, get_run, search_knowledge</p>
          </CardHeader>
          <CardContent>
            <CodeBlock code={mcp} />
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Webhooks</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {["run.completed", "run.failed", "approval.requested", "approval.decided", "worker.published", "usage.threshold"].map((e) => (
            <Badge key={e} variant="outline" className="font-mono">{e}</Badge>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
