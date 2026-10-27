# Anvita AI — Web app

The frontend for Anvita AI: the chat-first AI coworker (Explore) plus the AI Worker Studio
(Harden → Scale). Every screen in `docs/user-journeys.md` is built and fully interactive:
everything you create, edit, approve or delete is saved in the browser (localStorage) and
survives a reload. Data starts from a realistic demo workspace and AI runs are simulated,
so it works end to end before the backend exists. Settings → Profile → "Reset demo data"
restores the seed.

## Run

```bash
cd apps/web
npm install
npm run dev        # http://localhost:3000
npm run build      # production build + typecheck
```

## Tests

End-to-end tests drive the real app in Chromium (Playwright) — 21 scenarios covering every
page at desktop and mobile width plus the main journeys (ask → connect → approve → save as
Worker, Studio edits, evals, queue shortcuts, approvals, inbox, knowledge, memory, analytics
export, members, API keys, policies, Hindi UI, notifications, onboarding).

```bash
npm run build && npx next start -p 3100 &
BASE_URL=http://localhost:3100 npm run test:e2e
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
| `/settings/*` | Profile, Members, Security & SSO, Policies (rule builder + generated policy code), Models, Audit log, Billing, API & MCP | J7, J8, J9 |
| `/notifications` | All notifications, unread filter, mark read | — |
| `/help` | Searchable help, keyboard shortcuts, contact support | — |

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
    store.ts           persisted Zustand store for every entity + actions (auto audit-logged)
    simulate.ts        scripted agent run: plan → steps → connect pause → approval → artifact
    i18n.ts            English / हिन्दी strings for the app shell and Home
    download.ts        CSV/file export and CSV import helpers
```

## What is still simulated

- AI runs (`lib/simulate.ts`) are scripted, not a real model call.
- Sign-in, OAuth connections, payments and outbound messages are UI-only; nothing leaves the browser.
- Data is per-browser (localStorage), not shared between users.
- Hindi covers the navigation, top bar and Home; deeper pages are English.
- Run history in a Worker's Runs tab is demo data.

## Next steps

Replace `lib/store.ts` actions and `lib/simulate.ts` with calls to the real API (`/v1/runs`
streaming over SSE, approvals, workers, connections) as the backend services land — the
component layer already talks only to the store.
