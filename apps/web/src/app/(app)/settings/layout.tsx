"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, CreditCard, KeyRound, ScrollText, Shield, ShieldCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/settings/members", label: "Members & roles", icon: Users },
  { href: "/settings/security", label: "Security & SSO", icon: Shield },
  { href: "/settings/policies", label: "Policies & approvals", icon: ShieldCheck },
  { href: "/settings/models", label: "Models & data", icon: Brain },
  { href: "/settings/audit", label: "Audit log", icon: ScrollText },
  { href: "/settings/billing", label: "Billing & usage", icon: CreditCard },
  { href: "/settings/developers", label: "API & MCP", icon: KeyRound },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row md:px-8 md:py-8">
      <aside className="shrink-0 md:w-56">
        <h1 className="mb-3 text-[20px] font-semibold tracking-tight">Settings</h1>
        <nav className="flex gap-1 overflow-x-auto md:flex-col scrollbar-thin">
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13.5px] text-muted-foreground hover:bg-muted hover:text-foreground",
                pathname === i.href && "bg-muted font-medium text-foreground",
              )}
            >
              <i.icon className="size-4" /> {i.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
