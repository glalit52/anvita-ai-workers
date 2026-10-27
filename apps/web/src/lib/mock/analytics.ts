import type { Worker } from "../types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export interface DailyUsage {
  day: string;
  agent: number;
  workers: number;
  voice: number;
  runs: number;
  automated: number;
}

/** Day label `n` days before 27 Oct 2026 (deterministic, no Date locale differences). */
function labelDaysAgo(n: number) {
  let month = 9;
  let day = 27 - n;
  while (day < 1) {
    month -= 1;
    day += DAYS_IN_MONTH[month];
  }
  return `${day} ${MONTHS[month]}`;
}

/** 90 days of workspace usage ending 27 Oct, oldest first. */
export const usage90: DailyUsage[] = Array.from({ length: 90 }, (_, i) => {
  const t = i - 60; // keeps the last 30 days close to the original series
  const base = 2600 + Math.round(Math.sin(i / 3) * 520) + i * 22;
  const weekend = (i + 2) % 7 >= 5 ? 0.82 : 1;
  return {
    day: labelDaysAgo(89 - i),
    agent: Math.round(base * 0.35 * weekend),
    workers: Math.round(base * 0.55 * weekend),
    voice: Math.round(base * 0.1 * weekend),
    runs: Math.round((520 + Math.cos(i / 4) * 80 + i * 4.5) * weekend),
    automated: Math.round(74 + Math.sin(i / 5) * 3.5 + Math.max(0, t) * 0.12 + i * 0.05),
  };
});

const teamOf: Record<string, string> = {
  support: "Support",
  "cod-verify": "Support",
  invoices: "Finance",
  "growth-report": "Growth",
  sdr: "Sales",
  "it-voice": "IT",
  onboarding: "HR",
};

export function workerTeam(w: Worker) {
  return teamOf[w.id] ?? "Other";
}

/** Share of Ask Anvita (agent) usage by team — from chat attribution. */
export const agentShareByTeam: Record<string, number> = { Growth: 0.34, Finance: 0.27, Support: 0.14, Sales: 0.12, IT: 0.05, HR: 0.05, Other: 0.03 };

export const teamMembers: Record<string, number> = { Growth: 2, Finance: 1, Support: 2, Sales: 1, IT: 1, HR: 1, Other: 0 };
