"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  ApiKey,
  AppNotification,
  Approval,
  AuditEvent,
  ChatBlock,
  AppAuth,
  ChatMessage,
  Connection,
  RunRecord,
  EvalCase,
  InboxConversation,
  KnowledgeBase,
  McpServer,
  Member,
  MemoryItem,
  Policy,
  Profile,
  QueueItem,
  RunStep,
  Skill,
  Thread,
  Webhook,
  Worker,
} from "./types";
import { approvals as seedApprovals, auditEvents as seedAudit, inbox as seedInbox, knowledgeBases as seedKbs, members as seedMembers, memories as seedMemories, policies as seedPolicies, skills as seedSkills, threads as seedThreads, workspace } from "./mock/workspace";
import { connections as seedConnections } from "./mock/apps";
import { queueItems as seedQueue, runs as seedRuns, workers as seedWorkers } from "./mock/workers";
import { clientId, isLive } from "./api";
import { seedApiKeys, seedEvalCases, seedMcpServers, seedNotifications, seedProfile, seedWebhooks } from "./mock/extra";

type Decision = "approved" | "rejected";
type WorkerStatus = Worker["status"];
export type InboxState = Record<string, { taken?: boolean; resolved?: boolean; notes?: string; replies?: { text: string; time: string }[] }>;

const uid = (p = "") => `${p}${Math.random().toString(36).slice(2, 9)}`;
export function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

interface Data {
  threads: Thread[];
  approvals: Approval[];
  connections: Connection[];
  workers: Worker[];
  creditsUsed: number;
  creditsTotal: number;
  members: Member[];
  policies: Policy[];
  knowledgeBases: KnowledgeBase[];
  memories: MemoryItem[];
  skills: Skill[];
  installedPacks: string[];
  apiKeys: ApiKey[];
  webhooks: Webhook[];
  notifications: AppNotification[];
  mcpServers: McpServer[];
  auditEvents: AuditEvent[];
  queueItems: QueueItem[];
  inboxState: InboxState;
  evalCases: Record<string, EvalCase[]>;
  dismissedSuggestions: number[];
  settings: Record<string, string | number | boolean>;
  profile: Profile;
  workspaceInfo: WorkspaceInfo;
  inbox: InboxConversation[];
  runs: RunRecord[];
  /** Live mode: true once the workspace has been loaded from the API. */
  liveReady: boolean;
  /** Live mode: how each app can be connected. */
  appAuth: Record<string, AppAuth>;
}

export interface WorkspaceInfo {
  name: string;
  plan: string;
  region: string;
  renewsOn: string;
  role?: string;
}

interface Actions {
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  // chat
  createThread: (title: string) => string;
  pushMessage: (threadId: string, msg: ChatMessage) => void;
  updateMessage: (threadId: string, msgId: string, fn: (m: ChatMessage) => ChatMessage) => void;
  updateThread: (threadId: string, patch: Partial<Thread>) => void;
  deleteThread: (threadId: string) => void;
  // approvals
  addApproval: (a: Approval) => void;
  decideApproval: (id: string, decision: Decision, by?: string) => void;
  // integrations
  connectApp: (appId: string, scope?: Connection["scope"]) => void;
  disconnectApp: (appId: string) => void;
  updateConnection: (appId: string, patch: Partial<Connection>) => void;
  addMcpServer: (s: Omit<McpServer, "id">) => void;
  removeMcpServer: (id: string) => void;
  // workers
  addWorker: (w: Worker) => void;
  updateWorker: (id: string, patch: Partial<Worker>) => void;
  deleteWorker: (id: string) => void;
  duplicateWorker: (id: string) => string | null;
  setWorkerStatus: (id: string, s: WorkerStatus) => void;
  setEvalCases: (workerId: string, cases: EvalCase[]) => void;
  // queue & inbox
  updateQueueItem: (id: string, patch: Partial<QueueItem>) => void;
  updateInbox: (id: string, patch: InboxState[string]) => void;
  // admin
  inviteMember: (m: Pick<Member, "name" | "email" | "role">) => void;
  updateMember: (id: string, patch: Partial<Member>) => void;
  removeMember: (id: string) => void;
  addPolicy: (p: Omit<Policy, "id" | "hits30d">) => void;
  updatePolicy: (id: string, patch: Partial<Policy>) => void;
  removePolicy: (id: string) => void;
  /** Returns the secret (a promise in live mode, where the server mints it). */
  createApiKey: (name: string, scope: string) => string | Promise<string>;
  revokeApiKey: (id: string) => void;
  addWebhook: (w: Omit<Webhook, "id">) => void;
  removeWebhook: (id: string) => void;
  // knowledge & memory
  addKnowledgeBase: (kb: Pick<KnowledgeBase, "name" | "description">) => string;
  updateKnowledgeBase: (id: string, patch: Partial<KnowledgeBase>) => void;
  removeKnowledgeBase: (id: string) => void;
  addMemory: (m: Pick<MemoryItem, "scope" | "type" | "content">) => void;
  updateMemory: (id: string, patch: Partial<MemoryItem>) => void;
  removeMemory: (id: string) => void;
  addSkill: (s: Pick<Skill, "name" | "description" | "tools">) => void;
  removeSkill: (id: string) => void;
  togglePack: (name: string) => void;
  // misc
  addCredits: (n: number) => void;
  buyCredits: (n: number) => void;
  markNotificationsRead: (id?: string) => void;
  pushNotification: (n: Omit<AppNotification, "id" | "read">) => void;
  dismissSuggestion: (id: number) => void;
  setSetting: (key: string, value: string | number | boolean) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  log: (action: string, target: string, actor?: string, actorType?: AuditEvent["actorType"]) => void;
  resetDemo: () => void;
}

const emptyProfile: Profile = { name: "", email: "", title: "", language: "en", timezone: "Asia/Kolkata", approvalChannel: "email", digest: "daily", quietHours: false };

/** Live mode starts empty and is filled from the API; demo mode starts from the mock workspace. */
const liveSeed = (): Data => ({
  threads: [],
  approvals: [],
  connections: [],
  workers: [],
  creditsUsed: 0,
  creditsTotal: 0,
  members: [],
  policies: [],
  knowledgeBases: [],
  memories: [],
  skills: [],
  installedPacks: [],
  apiKeys: [],
  webhooks: [],
  notifications: [],
  mcpServers: [],
  auditEvents: [],
  queueItems: [],
  inboxState: {},
  evalCases: {},
  dismissedSuggestions: [],
  settings: {},
  profile: emptyProfile,
  workspaceInfo: { name: "", plan: "", region: "", renewsOn: "—" },
  inbox: [],
  runs: [],
  liveReady: false,
  appAuth: {},
});

const seed = (): Data => isLive() ? liveSeed() : ({
  threads: seedThreads,
  approvals: seedApprovals,
  connections: seedConnections,
  workers: seedWorkers,
  creditsUsed: workspace.creditsUsed,
  creditsTotal: workspace.creditsTotal,
  members: seedMembers,
  policies: seedPolicies,
  knowledgeBases: seedKbs,
  memories: seedMemories,
  skills: seedSkills,
  installedPacks: ["India Finance Pack (GST, TDS, e-invoice)"],
  apiKeys: seedApiKeys,
  webhooks: seedWebhooks,
  notifications: seedNotifications,
  mcpServers: seedMcpServers,
  auditEvents: seedAudit,
  queueItems: seedQueue,
  inboxState: {},
  evalCases: { support: seedEvalCases },
  dismissedSuggestions: [],
  settings: {},
  profile: seedProfile,
  workspaceInfo: { name: workspace.name, plan: workspace.plan, region: workspace.region, renewsOn: workspace.renewsOn },
  inbox: seedInbox,
  runs: seedRuns,
  liveReady: false,
  appAuth: {},
});

const waiters = new Map<string, () => void>();
export function waitFor(key: string) {
  return new Promise<void>((resolve) => waiters.set(key, resolve));
}
function release(key: string) {
  const fn = waiters.get(key);
  if (fn) {
    waiters.delete(key);
    fn();
  }
}

export const useApp = create<Data & Actions>()(
  persist(
    (set, get) => {
      const log: Actions["log"] = (action, target, actor, actorType = "user") =>
        set((s) => ({ auditEvents: [{ id: uid("a"), time: nowTime(), actor: actor ?? s.profile.name, actorType, action, target, channel: "Web" }, ...s.auditEvents].slice(0, 500) }));

      return {
        ...seed(),
        commandOpen: false,
        setCommandOpen: (open) => set({ commandOpen: open }),

        createThread: (title) => {
          const id = clientId("t");
          set((s) => ({ threads: [{ id, title, channel: "web", updatedAt: "now", status: "running", messages: [] }, ...s.threads] }));
          return id;
        },
        pushMessage: (threadId, msg) => set((s) => ({ threads: s.threads.map((t) => (t.id === threadId ? { ...t, messages: [...t.messages, msg], updatedAt: "now" } : t)) })),
        updateMessage: (threadId, msgId, fn) => set((s) => ({ threads: s.threads.map((t) => (t.id === threadId ? { ...t, messages: t.messages.map((m) => (m.id === msgId ? fn(m) : m)) } : t)) })),
        updateThread: (threadId, patch) => set((s) => ({ threads: s.threads.map((t) => (t.id === threadId ? { ...t, ...patch } : t)) })),
        deleteThread: (threadId) => set((s) => ({ threads: s.threads.filter((t) => t.id !== threadId) })),

        addApproval: (a) => {
          set((s) => ({ approvals: [a, ...s.approvals] }));
          get().pushNotification({ appId: a.appId, title: `${a.title} needs your approval`, meta: `${a.requestedBy.name} · just now`, href: "/approvals" });
        },
        decideApproval: (id, decision, by) => {
          const a = get().approvals.find((x) => x.id === id);
          set((s) => ({ approvals: s.approvals.map((x) => (x.id === id ? { ...x, status: decision, decidedBy: by ?? s.profile.name } : x)) }));
          if (a) log(`approval.${decision}`, `${a.action} · ${a.title}`);
          release(`approval:${id}`);
        },

        connectApp: (appId, scope = "user") => {
          const exists = get().connections.some((c) => c.appId === appId);
          set((s) => ({
            connections: exists
              ? s.connections.map((c) => (c.appId === appId ? { ...c, status: "healthy", scope } : c))
              : [...s.connections, { appId, scope, connectedBy: s.profile.name, connectedAt: "today", status: "healthy", actionsUsed30d: 0 }],
          }));
          log("connection.created", `${appId} (${scope})`);
          release(`connect:${appId}`);
        },
        disconnectApp: (appId) => {
          set((s) => ({ connections: s.connections.filter((c) => c.appId !== appId) }));
          log("connection.revoked", appId);
        },
        updateConnection: (appId, patch) => set((s) => ({ connections: s.connections.map((c) => (c.appId === appId ? { ...c, ...patch } : c)) })),
        addMcpServer: (srv) => {
          set((s) => ({ mcpServers: [...s.mcpServers, { ...srv, id: uid("mcp") }] }));
          log("mcp.server.added", srv.url);
        },
        removeMcpServer: (id) => set((s) => ({ mcpServers: s.mcpServers.filter((m) => m.id !== id) })),

        addWorker: (w) => {
          set((s) => ({ workers: [w, ...s.workers] }));
          log("worker.created", w.name);
        },
        updateWorker: (id, patch) => set((s) => ({ workers: s.workers.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),
        deleteWorker: (id) => {
          const w = get().workers.find((x) => x.id === id);
          set((s) => ({ workers: s.workers.filter((x) => x.id !== id) }));
          if (w) log("worker.deleted", w.name);
        },
        duplicateWorker: (id) => {
          const w = get().workers.find((x) => x.id === id);
          if (!w) return null;
          const copy: Worker = { ...w, id: clientId("w"), name: `${w.name} (copy)`, status: "draft", version: 0, runs30d: 0, hoursSaved30d: 0, successRate: 0, lastRun: "—", owner: get().profile.name };
          get().addWorker(copy);
          return copy.id;
        },
        setWorkerStatus: (id, st) => {
          get().updateWorker(id, { status: st });
          const w = get().workers.find((x) => x.id === id);
          log(`worker.${st === "paused" ? "paused" : st === "live" ? "resumed" : st}`, w?.name ?? id);
        },
        setEvalCases: (workerId, cases) => set((s) => ({ evalCases: { ...s.evalCases, [workerId]: cases } })),

        updateQueueItem: (id, patch) => set((s) => ({ queueItems: s.queueItems.map((q) => (q.id === id ? { ...q, ...patch } : q)) })),
        updateInbox: (id, patch) => set((s) => ({ inboxState: { ...s.inboxState, [id]: { ...s.inboxState[id], ...patch } } })),

        inviteMember: (m) => {
          set((s) => ({ members: [...s.members, { ...m, id: uid("u"), status: "invited", lastActive: "—" }] }));
          log("member.invited", `${m.email} as ${m.role}`);
        },
        updateMember: (id, patch) => {
          set((s) => ({ members: s.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
          if (patch.role) log("member.role_changed", `${get().members.find((m) => m.id === id)?.email} → ${patch.role}`);
        },
        removeMember: (id) => {
          const m = get().members.find((x) => x.id === id);
          set((s) => ({ members: s.members.filter((x) => x.id !== id) }));
          if (m) log("member.removed", m.email);
        },
        addPolicy: (p) => {
          set((s) => ({ policies: [...s.policies, { ...p, id: uid("p"), hits30d: 0 }] }));
          log("policy.created", p.name);
        },
        updatePolicy: (id, patch) => {
          set((s) => ({ policies: s.policies.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
          log("policy.updated", get().policies.find((p) => p.id === id)?.name ?? id);
        },
        removePolicy: (id) => {
          const p = get().policies.find((x) => x.id === id);
          set((s) => ({ policies: s.policies.filter((x) => x.id !== id) }));
          if (p) log("policy.deleted", p.name);
        },
        createApiKey: (name, scope) => {
          const secret = `anv_live_${Array.from({ length: 32 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("")}`;
          set((s) => ({ apiKeys: [{ id: uid("k"), name, scope, prefix: `anv_live_••••${secret.slice(-4)}`, createdAt: "today", lastUsed: "never" }, ...s.apiKeys] }));
          log("api_key.created", `${name} (${scope})`);
          return secret;
        },
        revokeApiKey: (id) => {
          set((s) => ({ apiKeys: s.apiKeys.map((k) => (k.id === id ? { ...k, revoked: true } : k)) }));
          log("api_key.revoked", get().apiKeys.find((k) => k.id === id)?.name ?? id);
        },
        addWebhook: (w) => {
          set((s) => ({ webhooks: [...s.webhooks, { ...w, id: uid("wh") }] }));
          log("webhook.created", w.url);
        },
        removeWebhook: (id) => set((s) => ({ webhooks: s.webhooks.filter((w) => w.id !== id) })),

        addKnowledgeBase: (kb) => {
          const id = clientId("kb");
          set((s) => ({ knowledgeBases: [...s.knowledgeBases, { ...kb, id, sources: [], docs: 0, chunks: 0, usedBy: [], updatedAt: "just now" }] }));
          log("kb.created", kb.name);
          return id;
        },
        updateKnowledgeBase: (id, patch) => set((s) => ({ knowledgeBases: s.knowledgeBases.map((k) => (k.id === id ? { ...k, ...patch } : k)) })),
        removeKnowledgeBase: (id) => {
          const k = get().knowledgeBases.find((x) => x.id === id);
          set((s) => ({ knowledgeBases: s.knowledgeBases.filter((x) => x.id !== id) }));
          if (k) log("kb.deleted", k.name);
        },
        addMemory: (m) => set((s) => ({ memories: [{ ...m, id: uid("mem"), source: `Added by ${s.profile.name}`, learnedAt: "today", uses: 0 }, ...s.memories] })),
        updateMemory: (id, patch) => set((s) => ({ memories: s.memories.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
        removeMemory: (id) => {
          set((s) => ({ memories: s.memories.filter((m) => m.id !== id) }));
          log("memory.deleted", id);
        },
        addSkill: (sk) => set((s) => ({ skills: [{ ...sk, id: uid("sk"), author: "user", uses: 0 }, ...s.skills] })),
        removeSkill: (id) => set((s) => ({ skills: s.skills.filter((x) => x.id !== id) })),
        togglePack: (name) => set((s) => ({ installedPacks: s.installedPacks.includes(name) ? s.installedPacks.filter((p) => p !== name) : [...s.installedPacks, name] })),

        addCredits: (n) => set((s) => ({ creditsUsed: s.creditsUsed + n })),
        buyCredits: (n) => {
          set((s) => ({ creditsTotal: s.creditsTotal + n }));
          log("billing.topup", `${n.toLocaleString("en-IN")} credits`);
        },
        markNotificationsRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => (!id || n.id === id ? { ...n, read: true } : n)) })),
        pushNotification: (n) => set((s) => ({ notifications: [{ ...n, id: uid("n"), read: false }, ...s.notifications].slice(0, 100) })),
        dismissSuggestion: (id) => set((s) => ({ dismissedSuggestions: [...s.dismissedSuggestions, id] })),
        setSetting: (key, value) => set((s) => ({ settings: { ...s.settings, [key]: value } })),
        updateProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
        log,
        resetDemo: () => set({ ...seed() }),
      };
    },
    {
      // Live data comes from the API, so only UI preferences are cached locally in live mode.
      name: isLive() ? "anvita-live-prefs-v1" : "anvita-demo-v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => {
        if (isLive()) return { dismissedSuggestions: s.dismissedSuggestions } as Partial<Data>;
        const { commandOpen: _c, liveReady: _l, ...rest } = s;
        void _l;
        void _c;
        return Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== "function")) as Partial<Data>;
      },
      onRehydrateStorage: () => (state) => {
        // runs interrupted by a reload can't resume — close them cleanly
        if (!state) return;
        const threads = state.threads.map((t) =>
          t.status === "running" ? { ...t, status: "done" as const, messages: t.messages.map((m) => (m.streaming ? { ...m, streaming: false } : m)) } : t,
        );
        useApp.setState({ threads });
      },
    },
  ),
);

/** Persisted key/value for simple settings forms. */
type Widen<T> = T extends string ? string : T extends number ? number : T extends boolean ? boolean : T;

export function useSetting<T extends string | number | boolean>(key: string, fallback: T): [Widen<T>, (v: Widen<T>) => void];
export function useSetting<T extends string | number | boolean>(key: string, fallback: T): [T, (v: T) => void] {
  const value = useApp((s) => s.settings[key]) as T | undefined;
  const setSetting = useApp((s) => s.setSetting);
  return [value ?? fallback, (v: T) => setSetting(key, v)];
}

export function useWorker(id: string) {
  return useApp((s) => s.workers.find((w) => w.id === id));
}

/* helpers for blocks */
export function patchBlock<T extends ChatBlock["type"]>(m: ChatMessage, type: T, fn: (b: Extract<ChatBlock, { type: T }>) => ChatBlock): ChatMessage {
  return { ...m, blocks: m.blocks.map((b) => (b.type === type ? fn(b as Extract<ChatBlock, { type: T }>) : b)) };
}

export function patchStep(m: ChatMessage, stepId: string, patch: Partial<RunStep>): ChatMessage {
  return patchBlock(m, "steps", (b) => ({ ...b, steps: b.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)) }));
}

export type { InboxConversation };
