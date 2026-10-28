"use client";
import { toast } from "sonner";
import { API_URL, ApiError, del, get, getSession, patch, post, put, refreshSession } from "./api";
import { useApp } from "./store";
import type {
  ApiKey,
  Approval,
  AppNotification,
  AuditEvent,
  ChatMessage,
  Connection,
  EvalCase,
  InboxConversation,
  KnowledgeBase,
  McpServer,
  Member,
  MemoryItem,
  Policy,
  QueueItem,
  RunRecord,
  Skill,
  Thread,
  Webhook,
  Worker,
} from "./types";

/**
 * Live sync: keeps the zustand store (which every screen reads) in sync with the backend.
 *  - `hydrate()` loads the workspace into the store
 *  - `installLiveActions()` makes each store action also call the matching API endpoint
 *    (optimistic; on failure we toast and reload that slice from the server)
 *  - `connectEvents()` applies realtime SSE events (agent runs streaming, approvals, …)
 */

// ─── formatting server values for the UI ──────────────────────────────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad = (n: number) => String(n).padStart(2, "0");

export function rel(iso?: string | null): string {
  if (!iso || iso === "—" || iso === "never") return iso ?? "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400 && new Date().getDate() === d.getDate()) return `${Math.round(s / 3600)} h ago`;
  if (s < 2 * 86400) return "yesterday";
  if (s < 6 * 86400) return DAYS[d.getDay()];
  return `${MONTHS[d.getMonth()]} ${pad(d.getDate())}`;
}
const shortDate = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : `${MONTHS[d.getMonth()]} ${pad(d.getDate())}`;
};
const hhmm = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const hhmmss = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
const duration = (ms: number) => (ms < 1000 ? `${ms} ms` : ms < 60_000 ? `${Math.round(ms / 1000)}s` : `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`);

// ─── server → store mappers ───────────────────────────────────────────────────

type S = Record<string, any>;

const mapMessage = (m: S): ChatMessage => ({ id: m.id, role: m.role, author: m.author, time: hhmm(m.time), blocks: m.blocks ?? [], streaming: m.streaming || undefined });
const mapThread = (t: S, messages: ChatMessage[] = []): Thread => ({ id: t.id, title: t.title, channel: t.channel, channelLabel: t.channelLabel, updatedAt: rel(t.updatedAt), pinned: t.pinned || undefined, unread: t.unread || undefined, status: t.status, messages });
const mapApproval = (a: S): Approval => ({ ...(a as Approval), createdAt: rel(a.createdAt) });
const mapConnection = (c: S): Connection => ({ appId: c.appId, scope: c.scope, connectedBy: c.connectedBy, connectedAt: shortDate(c.connectedAt), status: c.status, sharedWith: c.sharedWith, actionsUsed30d: c.actionsUsed30d });
const mapWorker = (w: S): Worker => ({ ...(w as Worker), lastRun: rel(w.lastRun) });
const mapMember = (m: S): Member => ({ id: m.id, name: m.name, email: m.email, role: m.role, status: m.status, lastActive: rel(m.lastActive), sso: m.sso });
const mapKb = (k: S): KnowledgeBase => ({ ...(k as KnowledgeBase), updatedAt: rel(k.updatedAt), sources: (k.sources ?? []).map((s: S) => ({ ...s, lastSync: s.status === "syncing" ? "syncing…" : rel(s.lastSync) })) });
const mapMemory = (m: S): MemoryItem => ({ ...(m as MemoryItem), learnedAt: rel(m.learnedAt) });
const mapAudit = (a: S): AuditEvent => ({ id: a.id, time: hhmmss(a.time), actor: a.actor, actorType: a.actorType, action: a.action, target: a.target, channel: a.channel, ip: a.ip });
const mapKey = (k: S): ApiKey => ({ ...(k as ApiKey), createdAt: shortDate(k.createdAt), lastUsed: rel(k.lastUsed) });
const mapNotification = (n: S): AppNotification => ({ id: n.id, appId: n.appId, title: n.title, meta: n.meta, href: n.href, read: n.read });
const mapQueue = (q: S): QueueItem => ({ ...(q as QueueItem), updatedAt: rel(q.updatedAt) });
const mapInbox = (c: S): InboxConversation => ({ ...(c as InboxConversation), transcript: (c.transcript ?? []).filter((t: S) => t.from !== "agent") });
const inboxStateOf = (c: S) => ({
  taken: c.status === "taken" || undefined,
  resolved: c.status === "resolved" || undefined,
  notes: c.notes || undefined,
  replies: (c.transcript ?? []).filter((t: S) => t.from === "agent").map((t: S) => ({ text: t.text, time: hhmm(t.time) })),
});
const RUN_STATUS: Record<string, RunRecord["status"]> = { queued: "running", running: "running", waiting_auth: "waiting_approval", waiting_approval: "waiting_approval", succeeded: "succeeded", failed: "failed", cancelled: "failed" };

function mapRun(r: S): RunRecord {
  const worker = useApp.getState().workers.find((w) => w.id === r.workerId);
  return { id: r.id, worker: worker?.name ?? "Worker", trigger: r.trigger, status: RUN_STATUS[r.status] ?? "running", startedAt: rel(r.startedAt ?? r.createdAt), duration: duration(r.durationMs ?? 0), credits: r.credits ?? 0, steps: r.steps ?? 0 };
}

const set = (patchState: Partial<ReturnType<typeof useApp.getState>>) => useApp.setState(patchState);
const upsert = <T extends { id: string }>(list: T[], item: T, front = true) => (list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : front ? [item, ...list] : [...list, item]);

// ─── loaders (one per store slice; also used to recover after a failed write) ─

const ignore403 = <T,>(p: Promise<T>, fallback: T) => p.catch((e) => (e instanceof ApiError && e.status === 403 ? fallback : Promise.reject(e)));

export const load = {
  async workspace() {
    const [w, settings] = await Promise.all([get("/workspace"), get("/workspace/settings")]);
    set({ creditsTotal: w.creditsTotal, creditsUsed: w.creditsUsed, installedPacks: w.installedPacks, settings, workspaceInfo: { name: w.name, plan: w.plan, region: w.region, renewsOn: w.renewsOn ? shortDate(w.renewsOn) : "—", role: w.role } });
  },
  async me() {
    const me = await get("/me");
    const u = me.user;
    set({ profile: { name: u.name, email: u.email, title: u.title, language: u.language, timezone: u.timezone, approvalChannel: u.approvalChannel, digest: u.digest, quietHours: u.quietHours } });
  },
  async threads() {
    const since = lastEventId;
    const r = await get("/threads?limit=100");
    const local = useApp.getState().threads;
    const existing = new Map(local.map((t) => [t.id, t.messages]));
    const fromServer = r.data.map((t: S) => mapThread(t, existing.get(t.id) ?? []));
    // Keep threads created (or updated over SSE) after this request started.
    const newer = local.filter((t) => !fromServer.some((x: Thread) => x.id === t.id) && (threadCreates.has(t.id) || (touched.get(t.id) ?? 0) > since));
    set({ threads: [...newer, ...fromServer] });
  },
  async approvals() {
    set({ approvals: (await get("/approvals")).data.map(mapApproval) });
  },
  async connections() {
    set({ connections: (await get("/connections")).data.map(mapConnection) });
  },
  async mcp() {
    set({ mcpServers: (await get("/mcp-servers")).data as McpServer[] });
  },
  async workers() {
    set({ workers: (await get("/workers")).data.map(mapWorker) });
  },
  async members() {
    set({ members: (await get("/members")).data.map(mapMember) });
  },
  async policies() {
    set({ policies: (await get("/policies")).data as Policy[] });
  },
  async knowledge() {
    set({ knowledgeBases: (await get("/knowledge-bases")).data.map(mapKb) });
  },
  async memories() {
    set({ memories: (await get("/memories")).data.map(mapMemory) });
  },
  async skills() {
    set({ skills: (await get("/skills")).data as Skill[] });
  },
  async developers() {
    const [keys, hooks] = await Promise.all([ignore403(get("/api-keys"), { data: [] }), ignore403(get("/webhooks"), { data: [] })]);
    set({ apiKeys: keys.data.map(mapKey), webhooks: hooks.data as Webhook[] });
  },
  async notifications() {
    set({ notifications: (await get("/notifications")).data.map(mapNotification) });
  },
  async audit() {
    set({ auditEvents: (await ignore403(get("/audit?limit=200"), { data: [] })).data.map(mapAudit) });
  },
  async inbox() {
    const rows = (await get("/inbox")).data as S[];
    set({ inbox: rows.map(mapInbox), inboxState: Object.fromEntries(rows.map((c) => [c.id, inboxStateOf(c)])) });
  },
  async runs() {
    const rows = (await get("/runs?limit=200")).data as S[];
    set({ runs: rows.filter((r) => r.kind === "worker").map(mapRun) });
  },
  async queues() {
    const queueWorkers = useApp.getState().workers.filter((w) => w.interaction === "queue");
    const lists = await Promise.all(queueWorkers.map((w) => get(`/workers/${w.id}/queue`)));
    set({ queueItems: lists.flatMap((l) => l.data.map(mapQueue)) });
  },
  async evals() {
    const workers = useApp.getState().workers;
    const lists = await Promise.all(workers.map((w) => get(`/workers/${w.id}/evals`).then((r) => [w.id, r.data as EvalCase[]] as const)));
    set({ evalCases: Object.fromEntries(lists.filter(([, c]) => c.length)) });
  },
};

export async function loadThread(id: string) {
  const since = lastEventId;
  try {
    const t = await get(`/threads/${id}`);
    const local = useApp.getState().threads.find((x) => x.id === id);
    // A snapshot can be older than SSE updates received while it was in flight: keep those.
    const fresh = (local?.messages ?? []).filter((m) => (touched.get(m.id) ?? 0) > since);
    const merged: ChatMessage[] = (t.messages ?? []).map((m: S) => fresh.find((f) => f.id === m.id) ?? mapMessage(m));
    for (const f of fresh) if (!merged.some((m) => m.id === f.id)) merged.push(f);
    set({ threads: upsert(useApp.getState().threads, mapThread(t, merged)) });
  } catch (e) {
    if (!(e instanceof ApiError && e.status === 404)) throw e;
  }
}

/** Load everything the screens need. Order matters only where a slice depends on workers. */
export async function hydrate() {
  await Promise.all([load.workspace(), load.me(), load.threads(), load.approvals(), load.connections(), load.mcp(), load.workers(), load.members(), load.policies(), load.knowledge(), load.memories(), load.skills(), load.developers(), load.notifications(), load.audit(), load.inbox()]);
  await Promise.all([load.runs(), load.queues(), load.evals()]);
  set({ liveReady: true });
}

// ─── writes ───────────────────────────────────────────────────────────────────

/** Run a write; on failure show the server's message and reload the affected slice. */
function sync(write: () => Promise<unknown>, reload?: () => Promise<void>) {
  return write().catch((e: unknown) => {
    toast.error(e instanceof Error ? e.message : "Couldn't save your change");
    if (reload) void reload().catch(() => {});
  });
}

/** Writes to the same resource run in order (e.g. publish, then status). */
const chains = new Map<string, Promise<unknown>>();
function serial(key: string, fn: () => Promise<unknown>) {
  const next = (chains.get(key) ?? Promise.resolve()).then(fn, fn);
  chains.set(key, next.catch(() => {}));
  return next;
}

/** Coalesce rapid edits (Studio drags, settings toggles) into one request per key. */
const pending = new Map<string, { timer: ReturnType<typeof setTimeout>; patch: Record<string, unknown> }>();
function debounced(key: string, partial: Record<string, unknown>, flush: (p: Record<string, unknown>) => Promise<unknown>, ms = 500) {
  const cur = pending.get(key);
  if (cur) clearTimeout(cur.timer);
  const merged = { ...(cur?.patch ?? {}), ...partial };
  pending.set(key, { patch: merged, timer: setTimeout(() => { pending.delete(key); void serial(key, () => flush(merged)); }, ms) });
}

const pick = <T extends object>(o: T, keys: string[]) => Object.fromEntries(Object.entries(o).filter(([k, v]) => keys.includes(k) && v !== undefined));

/** Threads created optimistically; messages wait for the create to land. */
const threadCreates = new Map<string, Promise<unknown>>();
/** Files picked in the composer, uploaded when the message is sent. */
const files = new Map<string, File>();
export function registerFile(id: string, file: File) {
  files.set(id, file);
}

const WORKER_FIELDS = ["name", "description", "emoji", "color", "interaction", "channels", "apps", "trigger", "pinned", "nodes", "edges"];
/** Last version/status the server confirmed per worker — publish/rollback decisions compare against it, not the optimistic store. */
const serverWorker = new Map<string, { version: number; status: string }>();
const rememberWorker = (w: S) => serverWorker.set(w.id, { version: w.version, status: w.status });

function applyWorker(w: S) {
  rememberWorker(w);
  set({ workers: upsert(useApp.getState().workers, mapWorker(w), false) });
}

export function installLiveActions() {
  const orig = useApp.getState();
  for (const w of orig.workers) serverWorker.set(w.id, { version: w.version, status: w.status });

  useApp.setState({
    createThread: (title) => {
      const id = orig.createThread(title);
      threadCreates.set(id, post("/threads", { id, title }).catch((e) => {
        toast.error(e.message);
        void load.threads();
        throw e;
      }));
      return id;
    },
    updateThread: (id, p) => {
      orig.updateThread(id, p);
      const body = pick(p, ["title", "pinned", "unread"]);
      if (Object.keys(body).length) void sync(() => patch(`/threads/${id}`, body), load.threads);
    },
    deleteThread: (id) => {
      orig.deleteThread(id);
      void sync(() => del(`/threads/${id}`), load.threads);
    },

    decideApproval: (id, decision, by) => {
      orig.decideApproval(id, decision, by);
      void sync(() => post(`/approvals/${id}/decision`, { decision }).then((a) => set({ approvals: upsert(useApp.getState().approvals, mapApproval(a)) })), load.approvals);
    },

    connectApp: (appId, scope = "user") => {
      orig.connectApp(appId, scope);
      void sync(() => post("/connections", { appId, scope }), load.connections);
    },
    disconnectApp: (appId) => {
      orig.disconnectApp(appId);
      void sync(() => del(`/connections/${appId}`), load.connections);
    },
    updateConnection: (appId, p) => {
      orig.updateConnection(appId, p);
      const body = pick(p, ["scope", "sharedWith", "status"]);
      if (Object.keys(body).length) void sync(() => patch(`/connections/${appId}`, body), load.connections);
    },
    addMcpServer: (s) => {
      orig.addMcpServer(s);
      void sync(() => post("/mcp-servers", { name: s.name, url: s.url, auth: s.auth }).then(load.mcp), load.mcp);
    },
    removeMcpServer: (id) => {
      orig.removeMcpServer(id);
      void sync(() => del(`/mcp-servers/${id}`), load.mcp);
    },

    addWorker: (w) => {
      orig.addWorker(w);
      void serial(`worker:${w.id}`, () =>
        sync(async () => {
          const created = await post("/workers", { id: w.id, from: "blank", createdFrom: w.createdFrom, ...pick(w, WORKER_FIELDS) });
          applyWorker(created);
          if (w.status === "live" || w.status === "canary") applyWorker(await post(`/workers/${w.id}/publish`, { canary: w.status === "canary" }));
        }, load.workers),
      );
    },
    updateWorker: (id, p) => {
      const before = useApp.getState().workers.find((x) => x.id === id);
      orig.updateWorker(id, p);
      const fields = pick(p, WORKER_FIELDS);
      if (Object.keys(fields).length) debounced(`worker:${id}`, fields, (body) => sync(() => patch(`/workers/${id}`, body).then(rememberWorker), load.workers));
      if (p.version !== undefined || p.status !== undefined) {
        void serial(`worker:${id}`, () =>
          sync(async () => {
            const server = serverWorker.get(id) ?? { version: before?.version ?? 0, status: before?.status ?? "draft" };
            if (p.version !== undefined && p.version > server.version) applyWorker(await post(`/workers/${id}/publish`, { canary: p.status === "canary" }));
            else if (p.version !== undefined && p.version < server.version) {
              await post(`/workers/${id}/versions/${p.version}/restore`);
              applyWorker(await post(`/workers/${id}/status`, { status: "live" }));
            } else if (p.status && p.status !== server.status) applyWorker(await post(`/workers/${id}/status`, { status: p.status }));
          }, load.workers),
        );
      }
    },
    setWorkerStatus: (id, status) => {
      orig.updateWorker(id, { status });
      void serial(`worker:${id}`, () =>
        sync(async () => {
          const server = serverWorker.get(id);
          // Going live from an unpublished draft means publishing v1.
          if ((status === "live" || status === "canary") && (server?.version ?? 0) === 0) applyWorker(await post(`/workers/${id}/publish`, { canary: status === "canary" }));
          else if (status !== server?.status) applyWorker(await post(`/workers/${id}/status`, { status }));
        }, load.workers),
      );
    },
    deleteWorker: (id) => {
      orig.deleteWorker(id);
      void sync(() => del(`/workers/${id}`), load.workers);
    },
    duplicateWorker: (id) => {
      const w = useApp.getState().workers.find((x) => x.id === id);
      if (!w) return null;
      const copyId = clientWorkerId();
      set({ workers: [{ ...w, id: copyId, name: `${w.name} (copy)`, status: "draft", version: 0, runs30d: 0, hoursSaved30d: 0, successRate: 0, lastRun: "—", owner: useApp.getState().profile.name }, ...useApp.getState().workers] });
      void serial(`worker:${copyId}`, () => sync(() => post(`/workers/${id}/duplicate`, { id: copyId }).then(applyWorker), load.workers));
      return copyId;
    },
    setEvalCases: (workerId, cases) => {
      orig.setEvalCases(workerId, cases);
      debounced(`evals:${workerId}`, { cases }, (b) => sync(() => put(`/workers/${workerId}/evals`, { cases: (b.cases as EvalCase[]).map((c) => ({ input: c.input, expected: c.expected, category: c.category || "general", score: c.score, pass: c.pass, ms: Math.round(c.ms) })) })), 800);
    },

    updateQueueItem: (id, p) => {
      orig.updateQueueItem(id, p);
      const body = pick(p, ["status", "assignee", "fields"]);
      if (Object.keys(body).length) void sync(() => patch(`/queue/${id}`, body), load.queues);
    },
    updateInbox: (id, p) => {
      const before = useApp.getState().inboxState[id] ?? {};
      orig.updateInbox(id, p);
      void serial(`inbox:${id}`, () =>
        sync(async () => {
          const newReplies = (p.replies ?? []).slice((before.replies ?? []).length);
          for (const r of newReplies) await post(`/inbox/${id}/reply`, { text: r.text });
          if (p.resolved === true) await post(`/inbox/${id}/resolve`);
          else if (p.resolved === false || (p.taken === false && !p.resolved)) await post(`/inbox/${id}/release`);
          else if (p.taken === true && !before.taken && !newReplies.length) await post(`/inbox/${id}/take`);
          if (p.notes !== undefined) await patch(`/inbox/${id}`, { notes: p.notes });
        }, load.inbox),
      );
    },

    inviteMember: (m) => {
      orig.inviteMember(m);
      void sync(
        () =>
          post("/members", m).then((r) => {
            if (!r.emailSent) toast.message("Invite link created", { description: r.inviteLink, duration: 15000 });
            return load.members();
          }),
        load.members,
      );
    },
    updateMember: (id, p) => {
      orig.updateMember(id, p);
      const body = pick(p, ["role", "name"]);
      if (Object.keys(body).length) void sync(() => patch(`/members/${id}`, body), load.members);
    },
    removeMember: (id) => {
      orig.removeMember(id);
      void sync(() => del(`/members/${id}`), load.members);
    },

    addPolicy: (p) => {
      orig.addPolicy(p);
      void sync(() => post("/policies", { ...p, approvers: p.approvers || null }).then(load.policies), load.policies);
    },
    updatePolicy: (id, p) => {
      orig.updatePolicy(id, p);
      const body = pick(p, ["name", "appliesTo", "condition", "effect", "approvers", "enabled"]);
      if (Object.keys(body).length) void sync(() => patch(`/policies/${id}`, body), load.policies);
    },
    removePolicy: (id) => {
      orig.removePolicy(id);
      void sync(() => del(`/policies/${id}`), load.policies);
    },

    createApiKey: (name, scope) =>
      post("/api-keys", { name, scope }).then(
        async (r) => {
          await load.developers();
          return r.secret as string;
        },
        (e) => {
          toast.error(e.message);
          throw e;
        },
      ),
    revokeApiKey: (id) => {
      orig.revokeApiKey(id);
      void sync(() => del(`/api-keys/${id}`), load.developers);
    },
    addWebhook: (w) => {
      orig.addWebhook(w);
      void sync(
        () =>
          post("/webhooks", w).then((r) => {
            toast.message("Signing secret (shown once)", { description: r.secret, duration: 20000 });
            return load.developers();
          }),
        load.developers,
      );
    },
    removeWebhook: (id) => {
      orig.removeWebhook(id);
      void sync(() => del(`/webhooks/${id}`), load.developers);
    },

    addKnowledgeBase: (kb) => {
      const id = orig.addKnowledgeBase(kb);
      void serial(id, () => sync(() => post("/knowledge-bases", { id, name: kb.name, description: kb.description }), load.knowledge));
      return id;
    },
    updateKnowledgeBase: (id, p) => {
      const before = useApp.getState().knowledgeBases.find((k) => k.id === id);
      orig.updateKnowledgeBase(id, p);
      const body = pick(p, ["name", "description", "usedBy"]);
      if (Object.keys(body).length) void serial(id, () => sync(() => patch(`/knowledge-bases/${id}`, body), load.knowledge));
      const added = (p.sources ?? []).filter((s) => !before?.sources.some((b) => b.label === s.label));
      for (const s of added) void serial(id, () => sync(() => post(`/knowledge-bases/${id}/sources`, { appId: s.appId, label: s.label }), load.knowledge));
    },
    removeKnowledgeBase: (id) => {
      orig.removeKnowledgeBase(id);
      void sync(() => del(`/knowledge-bases/${id}`), load.knowledge);
    },
    addMemory: (m) => {
      orig.addMemory(m);
      void sync(() => post("/memories", m).then(load.memories), load.memories);
    },
    updateMemory: (id, p) => {
      orig.updateMemory(id, p);
      const body = pick(p, ["content", "type", "scope"]);
      if (Object.keys(body).length) void sync(() => patch(`/memories/${id}`, body), load.memories);
    },
    removeMemory: (id) => {
      orig.removeMemory(id);
      void sync(() => del(`/memories/${id}`), load.memories);
    },
    addSkill: (s) => {
      orig.addSkill(s);
      void sync(() => post("/skills", s).then(load.skills), load.skills);
    },
    removeSkill: (id) => {
      orig.removeSkill(id);
      void sync(() => del(`/skills/${id}`), load.skills);
    },
    togglePack: (name) => {
      const installed = useApp.getState().installedPacks.includes(name);
      orig.togglePack(name);
      void sync(() => post(`/skill-packs/${encodeURIComponent(name)}/${installed ? "uninstall" : "install"}`).then(load.skills), load.workspace);
    },

    buyCredits: (n) => {
      orig.buyCredits(n);
      void sync(() => post("/billing/topup", { credits: n }).then((b) => set({ creditsTotal: b.creditsTotal, creditsUsed: b.creditsUsed })), load.workspace);
    },
    markNotificationsRead: (id) => {
      orig.markNotificationsRead(id);
      void sync(() => post("/notifications/read", id ? { id } : {}), load.notifications);
    },
    setSetting: (key, value) => {
      orig.setSetting(key, value);
      if (key === "workspace.name" || key === "workspace.region") {
        const field = key === "workspace.name" ? "name" : "region";
        if (String(value).trim()) debounced("workspace", { [field]: value }, (body) => sync(() => patch("/workspace", body).then(load.workspace), load.workspace), 600);
        return;
      }
      // Workspace settings are admin-only; for other roles the preference stays local.
      debounced("settings", { [key]: value }, (body) => patch("/workspace/settings", body).catch((e) => (e instanceof ApiError && e.status === 403 ? undefined : toast.error(e.message))), 600);
    },
    updateProfile: (p) => {
      orig.updateProfile(p);
      const body = pick(p, ["name", "title", "language", "timezone", "approvalChannel", "digest", "quietHours"]);
      if (Object.keys(body).length) void sync(() => patch("/me", body), load.me);
    },
    resetDemo: () => {
      void hydrate();
    },
  });
}

function clientWorkerId() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return `w-${Array.from(bytes, (b) => "0123456789abcdefghjkmnpqrstvwxyz"[b & 31]).join("")}`;
}

// ─── chat ─────────────────────────────────────────────────────────────────────

export async function liveRunAgent(threadId: string, text: string, extras?: { attachments?: { id: string }[]; web?: boolean }) {
  const s = useApp.getState();
  s.updateThread(threadId, { status: "running" });
  try {
    await threadCreates.get(threadId);
    const attachments: string[] = [];
    for (const a of extras?.attachments ?? []) {
      const file = files.get(a.id);
      if (!file) continue;
      const form = new FormData();
      form.append("file", file, file.name);
      const r = await post("/files", form);
      attachments.push(r.data[0].id);
      files.delete(a.id);
    }
    const r = await post(`/threads/${threadId}/messages`, { text, attachments, web: extras?.web });
    // SSE may already have delivered newer versions of these messages; only fill gaps.
    applyMessage(threadId, r.userMessage, true);
    applyMessage(threadId, r.assistantMessage, true);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Couldn't send your message");
    useApp.getState().updateThread(threadId, { status: "done" });
  }
}

function applyMessage(threadId: string, m: S, insertOnly = false) {
  const msg = mapMessage(m);
  set({
    threads: useApp.getState().threads.map((t) => {
      if (t.id !== threadId) return t;
      const exists = t.messages.some((x) => x.id === msg.id);
      if (exists && insertOnly) return t;
      return { ...t, messages: exists ? t.messages.map((x) => (x.id === msg.id ? msg : x)) : [...t.messages, msg] };
    }),
  });
}

// ─── realtime ─────────────────────────────────────────────────────────────────

let source: EventSource | null = null;
const buffered: [string, S][] = [];
/** Latest SSE event id seen per resource id — lets snapshot loads avoid clobbering newer pushes. */
const touched = new Map<string, number>();

/** Apply events that arrived while the snapshot was loading (called right after hydrate). */
export function flushBufferedEvents() {
  for (const [type, data] of buffered.splice(0)) handle(type, data);
}
let lastEventId = 0;
let creditsTimer: ReturnType<typeof setTimeout> | null = null;

function handle(type: string, data: S) {
  const st = useApp.getState();
  switch (type) {
    case "message.created":
    case "message.updated":
      if (!st.threads.some((t) => t.id === data.threadId)) return void loadThread(data.threadId);
      return applyMessage(data.threadId, data);
    case "thread.created":
    case "thread.updated": {
      const existing = st.threads.find((t) => t.id === data.id);
      return set({ threads: upsert(st.threads, mapThread(data, existing?.messages ?? [])) });
    }
    case "thread.deleted":
      return set({ threads: st.threads.filter((t) => t.id !== data.id) });
    case "approval.created":
    case "approval.updated":
      return set({ approvals: upsert(st.approvals, mapApproval(data)) });
    case "notification.created":
      return set({ notifications: upsert(st.notifications, mapNotification(data)) });
    case "connection.updated": {
      const c = mapConnection(data);
      return set({ connections: st.connections.some((x) => x.appId === c.appId) ? st.connections.map((x) => (x.appId === c.appId ? c : x)) : [...st.connections, c] });
    }
    case "connection.deleted":
      return set({ connections: st.connections.filter((c) => c.appId !== data.appId) });
    case "queue.updated":
      return set({ queueItems: upsert(st.queueItems, mapQueue(data)) });
    case "inbox.updated":
      return set({ inbox: upsert(st.inbox, mapInbox(data)), inboxState: { ...st.inboxState, [data.id]: inboxStateOf(data) } });
    case "billing.updated":
      return set({ creditsTotal: data.creditsTotal, creditsUsed: data.creditsUsed });
    case "run.created":
    case "run.updated":
      if (data.kind === "worker") set({ runs: upsert(st.runs, mapRun(data)) });
      // Credits move with every run step; refresh the meter shortly after activity settles.
      if (creditsTimer) clearTimeout(creditsTimer);
      creditsTimer = setTimeout(() => void load.workspace().catch(() => {}), 1500);
      if (data.kind === "worker" && ["succeeded", "failed"].includes(data.status)) void load.workers().catch(() => {});
      return;
  }
}

const EVENT_TYPES = ["message.created", "message.updated", "thread.created", "thread.updated", "thread.deleted", "approval.created", "approval.updated", "notification.created", "connection.updated", "connection.deleted", "queue.updated", "inbox.updated", "billing.updated", "run.created", "run.updated"];

export function connectEvents() {
  const s = getSession();
  if (!s || typeof EventSource === "undefined") return;
  source?.close();
  const url = `${API_URL}/v1/events/stream?access_token=${encodeURIComponent(s.accessToken)}${lastEventId ? `&after=${lastEventId}` : ""}`;
  const es = new EventSource(url);
  source = es;
  for (const type of EVENT_TYPES) {
    es.addEventListener(type, (ev) => {
      const e = ev as MessageEvent<string>;
      const eventId = Number(e.lastEventId) || 0;
      lastEventId = Math.max(lastEventId, eventId);
      try {
        const data = JSON.parse(e.data);
        if (typeof data?.id === "string") touched.set(data.id, eventId);
        if (typeof data?.threadId === "string") touched.set(data.threadId, eventId);
        // Until the snapshot is loaded, hold events so the snapshot can't overwrite them.
        if (!useApp.getState().liveReady) buffered.push([type, data]);
        else handle(type, data);
      } catch {
        // malformed event — ignore
      }
    });
  }
  es.onerror = () => {
    // Usually an expired access token or a dropped connection: refresh and reconnect from the last event.
    es.close();
    if (source !== es) return;
    setTimeout(() => void refreshSession().then((ok) => (ok ? connectEvents() : getSession() && setTimeout(connectEvents, 5000))), 2000);
  };
}

export function disconnectEvents() {
  buffered.length = 0;
  source?.close();
  source = null;
  lastEventId = 0;
}
