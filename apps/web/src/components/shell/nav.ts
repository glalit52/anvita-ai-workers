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
  icon: LucideIcon;
  badge?: "approvals" | "inbox";
}

export const mainNav: NavItem[] = [
  { href: "/home", label: "Home", icon: House },
  { href: "/chat", label: "Ask Anvita", icon: MessageSquare },
  { href: "/workers", label: "AI Workers", icon: Workflow },
  { href: "/approvals", label: "Approvals", icon: CheckCheck, badge: "approvals" },
  { href: "/inbox", label: "Handoff inbox", icon: Headset, badge: "inbox" },
];

export const buildNav: NavItem[] = [
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/memory", label: "Memory & Skills", icon: Brain },
  { href: "/analytics", label: "Analytics", icon: ChartColumn },
];

export const settingsNav: NavItem = { href: "/settings/members", label: "Settings", icon: Settings };
