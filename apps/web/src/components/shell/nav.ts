import type { TKey } from "@/lib/i18n";
import {
  BookOpen,
  Brain,
  ChartColumn,
  CheckCheck,
  Headset,
  House,
  MessageSquare,
  Plug,
  Settings,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  tkey: TKey;
  icon: LucideIcon;
  badge?: "approvals" | "inbox";
}

export const mainNav: NavItem[] = [
  { href: "/home", tkey: "nav.home", label: "Home", icon: House },
  { href: "/chat", tkey: "nav.ask", label: "Ask Anvita", icon: MessageSquare },
  { href: "/workers", tkey: "nav.workers", label: "AI Workers", icon: Workflow },
  { href: "/approvals", tkey: "nav.approvals", label: "Approvals", icon: CheckCheck, badge: "approvals" },
  { href: "/inbox", tkey: "nav.inbox", label: "Handoff inbox", icon: Headset, badge: "inbox" },
];

export const buildNav: NavItem[] = [
  { href: "/integrations", tkey: "nav.integrations", label: "Integrations", icon: Plug },
  { href: "/knowledge", tkey: "nav.knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/memory", tkey: "nav.memory", label: "Memory & Skills", icon: Brain },
  { href: "/analytics", tkey: "nav.analytics", label: "Analytics", icon: ChartColumn },
];

export const settingsNav: NavItem = { href: "/settings/members", tkey: "nav.settings", label: "Settings", icon: Settings };
