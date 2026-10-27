import { Bot, BookOpen, CircleStop, Code2, GitBranch, Headset, Layers, PauseCircle, Repeat, Send, Workflow, Zap, Wrench, type LucideIcon } from "lucide-react";
import type { NodeKind } from "@/lib/types";

export const nodeMeta: Record<NodeKind, { label: string; icon: LucideIcon; color: string; description: string }> = {
  trigger: { label: "Trigger", icon: Zap, color: "#0284C7", description: "Schedule, webhook, app event or channel message" },
  agent: { label: "AI Agent", icon: Bot, color: "#5B4CF0", description: "LLM step with instructions, tools and knowledge" },
  tool: { label: "App action", icon: Wrench, color: "#0F766E", description: "Call one action in a connected app" },
  code: { label: "Code", icon: Code2, color: "#334155", description: "Deterministic Python/JS in the sandbox" },
  branch: { label: "Branch", icon: GitBranch, color: "#B45309", description: "Route by rule or AI classification" },
  map: { label: "Loop / Map", icon: Repeat, color: "#7C3AED", description: "Run steps for each item in a list" },
  approval: { label: "Human approval", icon: PauseCircle, color: "#D97706", description: "Pause for approve / edit / reject" },
  call_worker: { label: "Call Worker", icon: Layers, color: "#DB2777", description: "Run another AI Worker as a step" },
  send: { label: "Send", icon: Send, color: "#15803D", description: "Slack, WhatsApp, email, Teams or webhook" },
  handoff: { label: "Human handoff", icon: Headset, color: "#0369A1", description: "Transfer the conversation to a person" },
  kb: { label: "Knowledge search", icon: BookOpen, color: "#9333EA", description: "Search a knowledge base with citations" },
  end: { label: "End", icon: CircleStop, color: "#64748B", description: "Finish and record the outcome" },
};

export const paletteKinds: NodeKind[] = ["trigger", "agent", "tool", "kb", "code", "branch", "map", "approval", "handoff", "call_worker", "send", "end"];

export { Workflow };
