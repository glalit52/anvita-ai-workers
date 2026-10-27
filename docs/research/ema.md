# Ema (ema.ai) — Product Teardown

> Research date: 2026-10-27. Compiled from Ema's public site, builder docs (builder.ema.ai/v2),
> engineering blog, funding coverage and third-party guides. The site could not be opened directly
> from the research environment. Ema has no self-serve pricing (signup routes to a demo request),
> so no account was created.

## 1. What it is

Ema is an enterprise **"Universal AI Employee" platform**. Customers deploy prebuilt or custom
**AI Employees**, each a multi-agent mesh that automates a complete piece of enterprise work
(HR, IT helpdesk, finance, customer support, sales ops, compliance). It is sold top-down to large
enterprises with heavy governance.

- **Company:** Founded in 2023 by Surojit Chatterjee (CEO; ex-Google, ex-Coinbase CPO) and Souvik Sen (ex-Okta).
- **Funding:** $77M Series B led by Creaegis (Sep 2026), $140M total; Accel, Section 32 and Prosus participating.
- **Traction:** 50+ active enterprise deals, 1M+ active enterprise users, 5M+ actions and queries processed, $150M+ bookings (multi-year TCV, not ARR).

## 2. Core concepts (v2 builder)

| Concept | Definition |
|---|---|
| **AI Employee (AIE)** | The unit you build, test, publish and run. It bundles a workflow, an interaction type, knowledge bases, allowed Tools and allowed users. |
| **Interaction type** | Chat, Dashboard (batch/table of work items), Voice (Beta), Document, API. |
| **Workflow** | A **DAG** of typed nodes joined by edges. Node types: `start`, `agent` (LLM), `transform` (deterministic, no model), `call_aie` (invoke another AI Employee), `send_email`, `publish`, `end`. Limits: 500 nodes per workflow, 5 running in parallel. |
| **Agent** | The LLM-driven step a node runs, defined by Instructions and an agent type. The v2 library consolidates many agents into fewer, more autonomous ones, e.g. `search_respond` (reasoning loop over KBs and Tools that returns a cited answer) and **Intelligent Actions** (performs actions in 200+ apps). |
| **Human-in-the-loop** | A setting on an agent node (pause for approval or edit), not a separate node type. |
| **Knowledge base** | Scoped to exactly one AIE; documents are searched only by that AIE's agents. Answers come with citations. |
| **Tools / connectors** | 200+ apps and internal APIs. Providers include the Ema native external tool, the Ema universal connector, **Paragon, Composio (tool + MCP), Workato**, and custom MCP servers. |
| **Autopilot** | A conversational builder copilot that creates and edits workflows from plain language, configures agents, sets up KBs and connectors, explains AIEs, debugs runs, self-corrects and generates artifacts. |
| **Generative Workflow Engine (GWE)** | Ema's "describe the process → generate the orchestration" engine, which mixes LLM steps with deterministic steps and wires prebuilt connectors. |
| **EmaFusion** | A model-routing and ensembling layer over 100+ public and private models (foundation, specialized, domain). It picks models per task by accuracy, cost and availability and can combine outputs. |

## 3. Feature inventory

### 3.1 Prebuilt AI Employees / templates
Customer Support, Agent Assist, Employee Onboarding, IT Helpdesk, HR Q&A, recruiting/screening,
sales/RFP response, compliance analyst, finance ops (invoice and claims processing) and
data-entry style document processing.

### 3.2 Channels and deployment
- Chat embeddable in **Slack, Microsoft Teams and Google Chat**; an embeddable web chat SDK.
- **Voice AI Employees** (Beta): real-time phone calls over a provisioned number and **SIP trunk** (inbound and outbound). The docs require an escalation path to a human.
- Dashboard interaction for batch work queues; Document interaction; REST and Data API.
- Deployment options: multi-tenant SaaS, **private VPC, on-prem and air-gapped** *(3rd-party)*.

### 3.3 MCP (bidirectional)
- **Ema as an MCP server**: Claude Code, Codex, Claude Desktop or any MCP client can invoke Ema AIEs over OAuth.
- **Ema as an MCP client**: workflows can call your custom MCP servers.

### 3.4 Testing and operations
- Test sets and evaluation before launch, versioned publish, run monitoring and debugging (Autopilot can debug runs).
- Partner management (v2) for SIs and resellers.

### 3.5 Security, governance and compliance
- SOC 2 Type II, ISO 27001, ISO 27017, ISO 27701, **ISO 42001 (AI management)**, GDPR, EU AI Act readiness, HIPAA-aligned.
- TLS 1.2+ in transit and AES-256 at rest; strict RBAC; audit logging; human approval chains; granular permissions.
- An integrated management system with a cross-functional Security & Governance Committee.

## 4. Pricing
No public list prices; everything goes through sales and a demo. Pricing is described as **tied to
tasks completed and business outcomes** (outcome-based) under multi-year enterprise contracts.

## 5. Inferred architecture

```
Channels: Slack · Teams · GChat · Web SDK · Voice (SIP) · Dashboard · API · MCP
                │
                ▼
     AIE runtime ── Workflow engine (DAG executor; durable; HITL pauses; parallelism caps)
                │        │
                │        ├── Agent nodes ──► EmaFusion model router (100+ models)
                │        ├── Transform nodes (deterministic code)
                │        └── call_aie (composition)
                ▼
  Knowledge layer (ingestion, chunking, vector + keyword search, per-AIE scoping, citations)
  Tool layer (native + Paragon/Composio/Workato/MCP; OAuth; action schemas)
  Builder (canvas + Autopilot, generated by GWE) · Evals/Test sets · Versioning
  Governance (RBAC, audit, approvals, data residency, on-prem)
```

## 6. Strengths and weaknesses

**Strengths:** deterministic and auditable DAG workflows; composable employees (`call_aie`);
first-class knowledge and citations; voice; model routing for cost and accuracy; enterprise-grade
compliance and on-prem; outcome pricing that matches what buyers care about.

**Weaknesses:** heavy, sales-led onboarding with no self-serve; builder-centric (someone has to
design workflows); less of an "ambient coworker" feel; no general-purpose code sandbox producing
arbitrary artifacts or apps; smaller integration catalog than Viktor's aggregator approach.

## Sources
- https://www.ema.ai/index · https://www.ema.ai/gwe-generative-workflow-engine
- https://www.ema.ai/blog/agentic-ai/introducing-generative-workflow-engine-ema-s-revolutionary-ai-employee-builder
- https://www.ema.ai/blog/engineering-in-ai/raising-the-bar-for-trust-in-agentic-ai-ema-s-integrated-management-system
- https://builder.ema.ai/v2 · https://builder.ema.ai/v2/introduction/key-concepts · https://builder.ema.ai/v2/core-concepts/workflows · https://builder.ema.ai/v2/release-notes · https://builder.ema.ai/v2/ema-mcp · https://builder.ema.ai/v2/getting-started/create-your-first-ai-employee · https://builder.ema.ai/v2/builder-guides/knowledge-base-setup · https://builder.ema.ai/v2/templates/agent-assist-ai-employee
- https://builder.ema.ai/emafusion/how-it-works · https://builder.ema.ai/agent-reference/core/intelligent-actions · https://builder.ema.ai/use-cases-patterns/voice-ai · https://builder.ema.ai/api-reference/workflows/overview · https://builder.ema.ai/administration/security-compliance · https://builder.ema.ai/introduction/what-is-ema
- https://inc42.com/buzz/ema-raises-77-mn-to-scale-its-universal-ai-employee-platform-globally/ · https://ventureburn.com/ema-raises-77-million-scale-ai-employees-platform/ · https://digidai.github.io/2026/09/28/ema-ai-employees-software-services-budget/
- https://www.getmacha.com/blog/ema-ai-complete-guide · https://www.layer3labs.io/guides/ema-ai-explained · https://www.zenml.io/llmops-database/enterprise-ai-agent-platform-for-end-to-end-business-process-automation · https://www.therundown.ai/tools/ema
