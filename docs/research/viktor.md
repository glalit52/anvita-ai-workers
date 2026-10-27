# Viktor (viktor.com, formerly getviktor.com) — Product Teardown

> Research date: 2026-10-27. Compiled from public sources (vendor pages, changelog, funding
> announcements, third-party reviews). The product site could not be opened directly from the
> research environment, and no account was created, so items marked *(3rd-party)* are not
> confirmed against the vendor. **Do not confuse with viktor.ai**, an unrelated engineering app
> platform.

## 1. What it is

"The AI employee for your team. Not a tool. A hire." Viktor is a **single, generalist AI coworker
that lives inside the team's chat** (Slack, Microsoft Teams, Discord, plus a web app). You @mention
it like a colleague; it does the work end to end and comes back with a finished deliverable.

- **Company:** Founded by Fryderyk Wiatrowski (CEO) and Peter Albert (CTO), both ex-Meta. They
  previously built JaceAI, an inbox email assistant. Poland-based.
- **Funding:** $75M Series A led by Accel (May 2026); Bek Ventures, Kaya VC, Inovo VC, Tenacity.
  Angels include Slack co-founders Stewart Butterfield and Cal Henderson.
- **Traction:** Accel reports 2,000+ organizations and a $15M revenue run rate about ten weeks after launch.
  Self-reported counts of "45,000+ teams" also appear *(unverified)*.

## 2. Core user experience

| Moment | What happens |
|---|---|
| Install | Add to Slack/Teams workspace with OAuth. Shortly after install, Viktor **reads channels and proposes a list of tasks it could take off your plate** (proactive onboarding). |
| Ask | `@Viktor pull last week's ad spend from Meta + Google, compare to HubSpot pipeline, send me a PDF` |
| Work | Plans the work, calls integrations, **writes and runs code in its own cloud computer** (persistent sandbox per workspace). |
| Deliver | Posts back finished artifacts: PDFs, spreadsheets, charts, **dashboards, hosted web apps**, drafted emails/issues/docs. |
| Approve | Sensitive actions (send email, post, modify records) **wait for human approval** per admin rules. |
| Repeat | Turns it into a **recurring Task** or an **event trigger** that runs in the background. |

## 3. Feature inventory

### 3.1 Channels / surfaces
- Slack (primary), Microsoft Teams (GA mid-2026), Discord ("AI Coworker (Discord)", Aug 2026; same memory/skills/integrations).
- **Web app chat** (Aug 2026): full conversations outside Slack, searchable history, auto-titled threads, unread indicators, image generation, keyboard shortcuts; later a chat-first Viktor page.
- DMs and channels; multiplayer by design (one Viktor shared by the team rather than one private assistant per person).

### 3.2 Execution
- **Persistent sandboxed compute** per workspace: Viktor writes and runs code (data analysis, scraping, file generation, app building); files persist between sessions.
- Output types: PDF reports, CSV/XLSX, charts, dashboards, **deployed web apps**, generated images.
- Long-running/background work; scheduled tasks (cron-like) and event triggers.

### 3.3 Integrations (3,000 to 9,800+, depending on source)
- Aggregated through **Pipedream, Composio, Zapier and MCP**; in-chat "connect card" OAuth flow, after which Viktor resumes the conversation.
- Commonly tested: Google Workspace, HubSpot, Notion, Jira, GitHub, Meta/Google Ads, Salesforce, Stripe, Linear, etc.
- **Private integrations:** a user connects their own account and shares it with selected people/groups.
- New first-party integrations are announced in the changelog (e.g. Keenable, Sep 2026).

### 3.4 Memory and skills
- **Workspace-scoped memory**: learns the team, its processes and preferences. Not used for training and deletable on request.
- **Skills**: reusable know-how Viktor records about how the team does things, plus **Viktor Skills** toolkits of expert-built skills (≈55 skills across 2 toolkits at time of review).

### 3.5 Control, security, admin
- **Approval rules per tool/action** (e.g. require approval for any outbound email).
- Admin controls: who can use Viktor and whom it may DM.
- **Audit logs** (Enterprise), viewable in Settings or via API.
- **SAML SSO** (Enterprise); SOC 2 claimed by third parties.
- Gaps reported mid-2026 *(3rd-party)*: per-user OAuth / RBAC and a per-user private mode not fully shipped.

### 3.6 Developer platform
- **OpenAI-compatible public API.**
- **MCP server** at `api.viktor.com/mcp` with tools such as `ask_viktor`, so you can call Viktor from Claude Code, Cursor and similar clients.
- Public docs and changelog.

## 4. Pricing (credit-based, per workspace, not per seat)

| Plan | Price | Credits | Notes |
|---|---|---|---|
| Free | $0 | up to $100 of non-expiring credits | trial |
| Team | $50/mo (20k credits) **or** $100/mo (40k credits); sources disagree | | per workspace |
| Enterprise | custom | | SSO, audit logs |

Typical burn *(3rd-party)*: quick task 100–300 credits; complex workflow 500–1,500; full project
2,000–5,000. Reviewers warn that credits track real model and compute usage, so heavy months can
cost a multiple of the sticker price.

## 5. Inferred architecture

Inferred from behavior; Viktor has not published its internals.

```
Slack/Teams/Discord/Web ──► Channel gateway (events, threads, identity mapping)
                               │
                               ▼
                      Agent orchestrator (LLM tool-use loop; frontier models, closely
                      tracking Claude releases per the changelog)
        ┌──────────────┬───────────┴───────────┬───────────────────┐
        ▼              ▼                       ▼                   ▼
  Workspace sandbox  Integration layer     Memory / skills     Scheduler + triggers
  (persistent VM/    (Pipedream, Composio, store (per-         (cron, webhooks)
   container, code   Zapier, MCP; OAuth    workspace)
   exec, file store, vault)
   app hosting)
        │
        ▼
  Approval engine ─► Audit log ─► Credit metering/billing
```

## 6. Strengths and weaknesses

**Strengths:** zero setup (it's just a coworker in Slack); generalist that can do almost anything
because it can write code; finished deliverables instead of chat answers; huge integration surface
via aggregators; proactive onboarding; viral multiplayer distribution inside Slack.

**Weaknesses:** no deterministic, auditable workflow designer; unpredictable credit spend;
governance is thinner than enterprise needs (RBAC, per-user auth); no voice or phone; no
knowledge-base product with citations; only useful if the team already lives in a supported chat
app.

## Sources
- https://viktor.com/ · https://viktor.com/startups · https://viktor.com/integrations · https://viktor.com/changelog · https://viktor.com/blog/viktor-vs-openai-dots
- https://www.accel.com/news/welcome-viktor-the-ai-coworker-for-the-modern-workplace
- https://ventureburn.com/viktor-raises-75m-for-slack-and-teams-ai-growth/ · https://fundraiseinsider.com/blog/viktor-raises-75-million-to-put-an-ai-coworker-inside-slack-and-teams/ · https://sacra.com/c/viktor/
- https://rywalker.com/research/viktor · https://www.vellum.ai/blog/official-viktor-breakdown · https://www.vellum.ai/blog/best-viktor-alternatives
- https://www.lindy.ai/blog/viktor-review · https://www.eesel.ai/blog/viktor-ai-review · https://www.thisandthat.chat/blog/viktor-review-2026/ · https://contractortoolstack.com/software/getviktor/ · https://theaiagentindex.com/agents/viktor · https://sistava.com/en/ai-agent-platform-reviews/ai-workforce/viktor · https://efficient.app/apps/viktor · https://saascrmreview.com/viktor-review/ · https://smartkeys.org/viktor-review/
