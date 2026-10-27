# Anvita AI — Web app

The frontend for Anvita AI: the chat-first AI coworker (Explore) plus the AI Worker Studio
(Harden → Scale). It runs on realistic mock data, so every journey in `docs/user-journeys.md`
can be clicked through before the backend exists.

## Run

```bash
cd apps/web
npm install
npm run dev        # http://localhost:3000
npm run build      # production build + typecheck
```

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Radix primitives ·
React Flow (`@xyflow/react`) for the Studio canvas · Recharts · Zustand · cmdk · sonner.

## Screens → user journeys

| Route | Screen | Journey |
|---|---|---|
| `/` | Marketing landing | — |
| `/login` | Sign in / sign up (Google, Microsoft, email, WhatsApp OTP) | J1 |
| `/onboarding` | Workspace → role → home channel → connect apps → learn → first tasks | J1 |
| `/home` | Ask box, needs-attention, stats, proactive automation suggestions, live activity | J1, J2 |
| `/chat`, `/chat/[id]` | Plan + cost estimate, live step timeline, connect cards, inline approvals, artifact viewer, “Save as AI Worker” | J2, J3 |
| `/workers` | Worker gallery + templates | J4 |
| `/workers/new` | Describe (Autopilot) · template · from a chat · blank | J3, J4 |
| `/workers/[id]` | Studio: canvas, palette, inspector, Autopilot; Overview, Test & evals, Runs, Knowledge, Tools & access, Versions (canary), Settings | J4 |
| `/workers/[id]/queue` | Work queue with document + extracted fields + confidence review | J4, J6 |
| `/approvals` | Approval inbox (email / payment / record-diff previews, edit & approve) | J6 |
| `/inbox` | Human handoff inbox for WhatsApp / voice / widget conversations | J5 |
| `/integrations` | Connected apps, scopes (workspace / user / shared), app directory, MCP | J1, J7 |
| `/knowledge` | Knowledge bases, sources & sync, retrieval tester with citations | J4 |
| `/memory` | Workspace & personal memory, skills, skill packs | J2 |
| `/analytics` | Usage, automation rate, hours saved, unit economics | J9 |
| `/settings/*` | Members, Security & SSO, Policies, Models, Audit log, Billing, API & MCP | J7, J8, J9 |

## Structure

```
src/
  app/                 routes (App Router); (app)/ group shares the sidebar shell
  components/
    ui/                design-system primitives (button, card, badge, dialog, tabs…)
    shell/             sidebar, top bar, ⌘K command palette
    chat/              composer, message blocks, artifact panel, save-as-worker dialog
    studio/            React Flow canvas, nodes, inspector, Autopilot, Studio tabs
    approvals/         approval card + previews
    brand/             logo, app logos
  lib/
    types.ts           domain types (mirror docs/technical-architecture.md §6)
    mock/              mock workspace, apps, workers, approvals…
    store.ts           Zustand app state (threads, approvals, connections, credits)
    simulate.ts        scripted agent run: plan → steps → connect pause → approval → artifact
```

## Next steps

Replace `lib/mock` + `lib/simulate.ts` with the real API (`/v1/runs` streaming over SSE,
approvals, workers, connections) as the backend services land.
