"use client";
import { create } from "zustand";
import type { Approval, ChatBlock, ChatMessage, Connection, RunStep, Thread } from "./types";
import { approvals as seedApprovals, threads as seedThreads, workspace } from "./mock/workspace";
import { connections as seedConnections } from "./mock/apps";
import { workers as seedWorkers } from "./mock/workers";

type Decision = "approved" | "rejected";

interface AppState {
  threads: Thread[];
  approvals: Approval[];
  connections: Connection[];
  workerStatus: Record<string, "live" | "draft" | "paused" | "canary">;
  creditsUsed: number;
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  createThread: (title: string) => string;
  pushMessage: (threadId: string, msg: ChatMessage) => void;
  updateMessage: (threadId: string, msgId: string, fn: (m: ChatMessage) => ChatMessage) => void;
  updateThread: (threadId: string, patch: Partial<Thread>) => void;
  addApproval: (a: Approval) => void;
  decideApproval: (id: string, decision: Decision, by?: string) => void;
  connectApp: (appId: string) => void;
  addCredits: (n: number) => void;
  setWorkerStatus: (id: string, s: "live" | "draft" | "paused" | "canary") => void;
}

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

export const useApp = create<AppState>((set, get) => ({
  threads: seedThreads,
  approvals: seedApprovals,
  connections: seedConnections,
  workerStatus: Object.fromEntries(seedWorkers.map((w) => [w.id, w.status])),
  creditsUsed: workspace.creditsUsed,
  commandOpen: false,
  setCommandOpen: (open) => set({ commandOpen: open }),
  createThread: (title) => {
    const id = `t-${Math.random().toString(36).slice(2, 8)}`;
    set((s) => ({ threads: [{ id, title, channel: "web", updatedAt: "now", status: "running", messages: [] }, ...s.threads] }));
    return id;
  },
  pushMessage: (threadId, msg) =>
    set((s) => ({
      threads: s.threads.map((t) => (t.id === threadId ? { ...t, messages: [...t.messages, msg], updatedAt: "now" } : t)),
    })),
  updateMessage: (threadId, msgId, fn) =>
    set((s) => ({
      threads: s.threads.map((t) => (t.id === threadId ? { ...t, messages: t.messages.map((m) => (m.id === msgId ? fn(m) : m)) } : t)),
    })),
  updateThread: (threadId, patch) => set((s) => ({ threads: s.threads.map((t) => (t.id === threadId ? { ...t, ...patch } : t)) })),
  addApproval: (a) => set((s) => ({ approvals: [a, ...s.approvals] })),
  decideApproval: (id, decision, by = "Priya Sharma") => {
    set((s) => ({ approvals: s.approvals.map((a) => (a.id === id ? { ...a, status: decision, decidedBy: by } : a)) }));
    release(`approval:${id}`);
  },
  connectApp: (appId) => {
    const exists = get().connections.some((c) => c.appId === appId);
    set((s) => ({
      connections: exists
        ? s.connections.map((c) => (c.appId === appId ? { ...c, status: "healthy" } : c))
        : [...s.connections, { appId, scope: "user", connectedBy: "Priya Sharma", connectedAt: "now", status: "healthy", actionsUsed30d: 0 }],
    }));
    release(`connect:${appId}`);
  },
  addCredits: (n) => set((s) => ({ creditsUsed: s.creditsUsed + n })),
  setWorkerStatus: (id, st) => set((s) => ({ workerStatus: { ...s.workerStatus, [id]: st } })),
}));

/* helpers for blocks */
export function patchBlock<T extends ChatBlock["type"]>(m: ChatMessage, type: T, fn: (b: Extract<ChatBlock, { type: T }>) => ChatBlock): ChatMessage {
  return { ...m, blocks: m.blocks.map((b) => (b.type === type ? fn(b as Extract<ChatBlock, { type: T }>) : b)) };
}

export function patchStep(m: ChatMessage, stepId: string, patch: Partial<RunStep>): ChatMessage {
  return patchBlock(m, "steps", (b) => ({ ...b, steps: b.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)) }));
}
