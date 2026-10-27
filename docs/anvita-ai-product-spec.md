# Anvita AI — Product & Architecture Spec (v0.1)

> Anvita AI combines **Viktor's ambient, do-anything AI coworker** with **Ema's governed,
> enterprise "AI Employee" factory**. See `docs/research/viktor.md` and `docs/research/ema.md`
> for the source teardowns.

## 1. Thesis

| | Viktor | Ema | **Anvita AI** |
|---|---|---|---|
| Shape | One generalist coworker in chat | Many specialist AI Employees built in a studio | **A generalist coworker that can hire, build and manage specialist AI Workers** |
| Setup | Zero (install in Slack) | Heavy (sales and a builder) | Self-serve start, enterprise depth on demand |
| Execution | Free-form agent + code sandbox | Deterministic DAG + LLM nodes | **Both**: free-form runs that can be "hardened" into DAG workflows in one click |
| Knowledge | Implicit workspace memory | Scoped KBs with citations | Memory **and** cited KBs |
| Channels | Slack, Teams, Discord, Web | Slack, Teams, GChat, Web SDK, Voice, API | All of these plus **WhatsApp and Indic-language voice** |
| Governance | Approvals, audit (Ent) | RBAC, HITL, ISO/SOC2, on-prem | Ema-grade governance from day 1 |
| Pricing | Credits per workspace | Outcome-based enterprise | Credits for self-serve, outcome-based for enterprise |

**One-line pitch:** *"Anvita is the AI teammate that does the work today, and turns what it learned
into reliable AI Workers your company can trust tomorrow."*

### Key loop: Explore → Harden → Scale
1. **Explore (Viktor mode):** a user asks Anvita in Slack, WhatsApp or the web to do something. Anvita plans, calls tools, writes code in its sandbox and delivers an artifact.
2. **Harden (bridge):** after a successful run, Anvita offers to "**Save as AI Worker**". It compiles the run trace into a **DAG workflow** (agent, tool, code and approval nodes), with a KB, schedule or trigger, and permissions attached.
3. **Scale (Ema mode):** the AI Worker runs deterministically on a schedule, trigger, queue, voice line or API, with evals, versioning, approvals, audit and outcome metrics.

## 2. Personas
- **Founder or team lead (SMB):** wants work done now in Slack or WhatsApp; pays with a card.
- **Ops, RevOps or HR manager:** builds repeatable AI Workers without engineers.
- **IT, security or compliance admin:** RBAC, SSO, audit, data residency, approvals.
- **Developer:** API, MCP, custom tools, SDK.

## 3. Feature set

### P0: MVP (Explore mode and the bridge)
1. **Chat channels:** Slack app and web app (threads, history, file upload, artifact previews).
2. **Agent runtime:** a tool-use loop on Claude (default model Sonnet; Opus for hard planning; Haiku for routing and classification), with planning, reflection and step limits.
3. **Sandbox computer per workspace:** isolated container or microVM with Python and Node, persistent `/workspace` volume, headless browser, file outputs (PDF, XLSX, PNG, HTML).
4. **Integrations:** an aggregator (Composio, Pipedream Connect or Nango) for 1,000+ apps, plus native Google Workspace, Microsoft 365, HubSpot, Salesforce, Notion, Jira and GitHub; MCP client; in-chat OAuth "connect cards".
5. **Memory:** workspace and user memory (facts, preferences, glossary), editable and deletable in the UI.
6. **Approvals:** policy rules per tool and action (`email.send`, `crm.update`, `payments.*`); approve or edit in Slack with interactive buttons.
7. **Tasks:** schedules (cron) and triggers (webhook or app event) for saved prompts.
8. **Save as AI Worker v1:** convert a run into a linear workflow and re-run it with parameters.
9. **Credits and billing:** Stripe; metering on tokens, sandbox-seconds and tool calls; free trial credits; per-workspace plans.
10. **Admin basics:** Google and Microsoft SSO, workspace roles (Owner, Admin, Member), audit log.

### P1: Studio (Ema mode)
1. **AI Worker Studio:** a visual DAG canvas with node types `trigger`, `agent`, `tool`, `code` (deterministic), `branch`, `loop/map`, `human_approval`, `call_worker`, `send` (email/Slack/WhatsApp) and `end`. Plus **Autopilot**: build and edit the graph from natural language, explain it and debug failed runs.
2. **Knowledge bases:** connectors (Drive, SharePoint, Confluence, Notion, websites, uploads), hybrid search, per-Worker scoping, **citations** in answers, sync schedules.
3. **Prebuilt Worker templates:** Customer Support, IT Helpdesk, HR/Onboarding, SDR/Lead research, Invoice/AP processing, Weekly business report, RFP responder, Recruiter screening.
4. **Interaction types:** Chat, **Work-queue dashboard** (table of items, status, HITL review), API endpoint, Document processing.
5. **Evals:** test sets, LLM-as-judge plus assertions, regression gates on publish, versioning and rollback.
6. **Model router (AnvitaFusion):** route by task class, cost and latency budget, and fallback; per-workspace model allow-list; BYO model keys.
7. **More channels:** Microsoft Teams, Google Chat, **WhatsApp Business**, embeddable web chat widget.
8. **Analytics:** runs, success rate, approvals, time saved, cost per outcome.

### P2: Enterprise and differentiation
1. **Voice Workers:** SIP/telephony (Twilio, Plivo, Exotel), real-time STT and TTS with **Hindi plus Indic languages**, escalation to a human.
2. **Governance:** fine-grained RBAC and ABAC, per-user OAuth (act as the user, not a shared bot), data residency (IN, EU, US), PII redaction, DLP, SAML and SCIM, customer-managed keys.
3. **Deployment:** VPC and on-prem (Kubernetes Helm chart) and air-gapped mode with local models.
4. **Developer platform:** OpenAI-compatible API, **Anvita MCP server** (`ask_anvita`, `run_worker`, `list_workers`), TypeScript and Python SDKs, custom tool SDK.
5. **Marketplace:** shareable Worker templates and skills; partner/SI management.
6. **Compliance track:** SOC 2 Type II, then ISO 27001, then ISO 42001; DPDP Act (India) and GDPR.
7. **Outcome-based pricing** for enterprise (per ticket resolved, invoice processed, etc.).

## 4. System architecture

```
┌──────────────────────────────── Channels ─────────────────────────────────┐
│ Slack · Teams · Discord · GChat · WhatsApp · Web app · Widget · Voice(SIP) │
│ REST/OpenAI-compatible API · MCP server                                    │
└───────────────┬────────────────────────────────────────────────────────────┘
                ▼
        Channel Gateway  (normalizes events → Conversation/Message; identity mapping;
                          interactive approvals; streaming replies)
                ▼
┌──────────────────────────── Core services ────────────────────────────────┐
│ Agent Runtime   – tool-use loop, planner, sub-agents, context assembly    │
│ Workflow Engine – durable DAG executor (Temporal), HITL waits, retries,   │
│                   schedules, triggers, map/parallel, call_worker          │
│ Model Router    – AnvitaFusion: policy + cost/latency routing, fallbacks, │
│                   caching, token accounting                               │
│ Tool Layer      – native connectors, aggregator (Composio/Pipedream/Nango),│
│                   MCP client, OAuth vault, action schemas, rate limits     │
│ Sandbox Service – per-workspace microVMs (Firecracker/E2B/Modal), volumes, │
│                   browser, artifact export, app hosting (*.anvita.app)     │
│ Knowledge       – ingestion, chunking, embeddings, hybrid search, citations│
│ Memory          – workspace/user memory, skills (reusable procedures)     │
│ Policy Engine   – RBAC/ABAC, approval rules, PII/DLP, budgets             │
│ Metering        – credits, usage events → Stripe                          │
│ Audit/Observability – immutable audit log, traces (OpenTelemetry), evals  │
└────────────────────────────────────────────────────────────────────────────┘
                ▼
   Postgres (+pgvector) · Redis · S3-compatible object store · ClickHouse (analytics)
   Secrets: KMS/Vault · Queue: Temporal (+ Redis streams for channel fan-out)
```

### 4.1 Recommended tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | **Next.js (React, TypeScript)**, Tailwind and shadcn/ui, **React Flow** for the Studio canvas, TanStack Query | Fast to build; React Flow is the standard for DAG editors |
| Backend API | **TypeScript (Node, Fastify or NestJS)** for API, gateway and channels; **Python (FastAPI)** for agent, knowledge and eval services | Slack, Teams and WhatsApp SDKs are strongest in TS; the AI and data ecosystem is strongest in Python |
| Orchestration | **Temporal** | Durable workflows, HITL waits lasting days, retries, schedules |
| LLMs | **Anthropic Claude** as the default (Opus, Sonnet, Haiku tiers) through the router; optional OpenAI, Gemini or open models for BYO and air-gapped use | Tool use, long context, code quality |
| Sandbox | E2B or Modal to start; self-hosted Firecracker later | Speed to market, then cost and on-prem |
| Integrations | Composio or Pipedream Connect plus native connectors; MCP | 1,000+ apps on day one |
| Data | Postgres + pgvector, Redis, S3, ClickHouse | Simple and proven |
| Auth | WorkOS or Clerk (SSO, SCIM) | Enterprise SSO without building it |
| Billing | Stripe (usage-based metering) | Credits and plans |
| Voice | LiveKit or Pipecat with Twilio/Exotel SIP; Deepgram or Sarvam STT; ElevenLabs or Sarvam TTS | Low latency; Indic language support |
| Infra | Kubernetes (EKS, or GKE in an India region), Terraform, OpenTelemetry, Grafana | Path to VPC and on-prem |

### 4.2 Core data model (abridged)

```
Organization ─< Workspace ─< Member(role)
Workspace ─< ChannelInstall(slack|teams|whatsapp|…)
Workspace ─< Connection(app, oauth_ref, scope: workspace|user|shared_with[])
Workspace ─< Conversation ─< Message ─< Run ─< Step(type, input, output, cost, tool_call)
Workspace ─< Worker ─< WorkerVersion(graph_json, interaction_type, model_policy, status)
Worker ─< KnowledgeBase ─< Document ─< Chunk(embedding)
Worker ─< Trigger(cron|webhook|app_event|queue) · Worker ─< EvalSet ─< EvalCase
Workspace ─< Memory(scope, key, value, source_run) · Skill(name, procedure_md, tools[])
Workspace ─< Policy(rule: tool/action → allow|approve|deny, approvers)
Run ─< ApprovalRequest(status, approver, diff)
Workspace ─< Artifact(file|dashboard|app, url, run_id)
AuditEvent(actor, action, target, ts, hash_chain) · UsageEvent(credits, kind, run_id)
```

### 4.3 Workflow graph schema (Studio ↔ engine contract)

```json
{
  "nodes": [
    {"id": "t1", "type": "trigger", "config": {"kind": "cron", "expr": "0 9 * * MON"}},
    {"id": "a1", "type": "agent", "config": {"instructions": "Summarize last week's pipeline", "tools": ["hubspot.*"], "kb": ["kb_sales"], "model_policy": "balanced", "hitl": "none"}},
    {"id": "c1", "type": "code", "config": {"lang": "python", "source": "…builds chart + PDF…"}},
    {"id": "h1", "type": "human_approval", "config": {"approvers": ["role:sales_lead"], "timeout": "24h"}},
    {"id": "s1", "type": "send", "config": {"channel": "slack", "target": "#sales"}}
  ],
  "edges": [["t1", "a1"], ["a1", "c1"], ["c1", "h1"], ["h1", "s1"]]
}
```

## 5. Frontend surfaces

1. **Chat (web):** threads, streaming, tool-call timeline ("what Anvita is doing"), artifact panel (PDF, table, chart, app preview), approve and reject cards, "Save as AI Worker" button.
2. **AI Workers:** gallery and templates, Studio canvas with Autopilot side panel, KB manager, triggers, evals, versions, publish.
3. **Work queue:** a per-Worker table of items with status, HITL review and edit, and bulk actions.
4. **Integrations:** catalog, connect, share-with, per-user vs. workspace auth.
5. **Memory and skills:** view, edit and delete what Anvita knows.
6. **Admin:** members and roles, SSO and SCIM, policies and approvals, audit log, data residency, model allow-list, budgets and usage, billing.
7. **Analytics:** runs, success rate, time saved, cost per outcome, top Workers.

## 6. Roadmap (indicative)

| Phase | Weeks | Deliverables |
|---|---|---|
| 0. Foundations | 1–3 | Monorepo, auth, Postgres schema, Slack app skeleton, Claude agent loop, sandbox (E2B), 10 native tools |
| 1. MVP (Explore) | 4–10 | Web chat, artifacts, aggregator integrations, memory, approvals, tasks and triggers, credits and Stripe, audit log → **private beta** |
| 2. Bridge and Studio | 11–18 | Save as AI Worker, DAG engine on Temporal, Studio canvas and Autopilot, KBs with citations, evals, 5 templates, Teams and WhatsApp |
| 3. Enterprise | 19–30 | RBAC and SSO/SCIM, per-user OAuth, model router, voice (Indic), API, MCP server and SDKs, SOC 2 Type I → II, VPC deploy |

## 7. Differentiation vs. both
1. **Explore → Harden → Scale**: neither competitor turns ad-hoc agent runs into governed workflows.
2. **India-first channels**: WhatsApp, Indic voice and DPDP compliance (neither competitor focuses here).
3. **Transparent cost**: a per-run cost preview and budgets, which addresses Viktor's "credit burn" complaint.
4. **Self-serve and enterprise in one product**, which addresses Ema's sales-only onboarding.

## 8. Open questions for the founding team
- Initial wedge: horizontal SMB coworker (Viktor-like GTM) or one vertical with enterprise Workers (Ema-like)?
- Primary first channel: Slack or WhatsApp?
- Build vs. buy for integrations and sandbox in year 1 (recommendation: buy, i.e. Composio or Pipedream plus E2B).
- Data residency requirements of the first 10 design partners.
