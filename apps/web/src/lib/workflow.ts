"use client";
import { useEffect, useState } from "react";
import { get, isLive, patch, post } from "./api";
import type { WorkerEdge, WorkerNode } from "./types";

/** Live-mode helpers for the Studio: action catalog, validation, test runs and traces. */

export interface CatalogAction {
  action: string;
  name: string;
  appId: string;
  kind: string;
  description: string;
  sideEffect: "none" | "write" | "external" | "destructive";
  inputSchema: { properties?: Record<string, { type?: string; description?: string; enum?: string[]; items?: unknown }>; required?: string[] };
}

export interface WorkflowCatalog {
  actions: CatalogAction[];
  functions: string[];
  channels: string[];
  sandbox: boolean;
}

export interface Issue {
  nodeId: string | null;
  level: "error" | "warning";
  message: string;
}

export type TraceStatus = "pending" | "running" | "waiting" | "done" | "skipped" | "failed";

export interface TraceNode {
  id: string;
  kind: string;
  title: string;
  status: TraceStatus;
  detail: string | null;
  error: string | null;
  output: unknown;
  waitingFor: "approval" | "auth" | "child" | null;
  startedAt: string | null;
  endedAt: string | null;
  items: { total: number; done: number } | null;
}

export interface Trace {
  runId: string;
  status: string;
  error: string | null;
  nodes: TraceNode[];
  edges: { id: string; taken: boolean }[];
  output: unknown;
}

let catalog: Promise<WorkflowCatalog> | null = null;
export function loadCatalog(force = false): Promise<WorkflowCatalog> {
  if (!catalog || force) catalog = get<WorkflowCatalog>("/workflow/catalog").catch((e) => ((catalog = null), Promise.reject(e)));
  return catalog;
}

/** The workspace's action catalog (live mode only; null in demo mode or while loading). */
export function useWorkflowCatalog(): WorkflowCatalog | null {
  const [c, setC] = useState<WorkflowCatalog | null>(null);
  useEffect(() => {
    if (!isLive()) return;
    let alive = true;
    loadCatalog().then((x) => alive && setC(x), () => {});
    return () => {
      alive = false;
    };
  }, []);
  return c;
}

export const validateGraph = (workerId: string, nodes: WorkerNode[], edges: WorkerEdge[]) => post<{ ok: boolean; issues: Issue[] }>(`/workers/${workerId}/validate`, { nodes, edges });

/** Save the graph as it is on screen, then start a test run with these trigger inputs. */
export async function startTestRun(workerId: string, nodes: WorkerNode[], edges: WorkerEdge[], inputs: Record<string, unknown>) {
  await patch(`/workers/${workerId}`, { nodes, edges });
  return post<{ id: string; status: string }>(`/workers/${workerId}/runs`, { inputs, test: true });
}

export const fetchTrace = (runId: string) => get<Trace>(`/runs/${runId}/trace`);
export const fetchRun = (runId: string) => get<Record<string, any>>(`/runs/${runId}`);

export const TERMINAL = new Set(["succeeded", "failed", "cancelled"]);
