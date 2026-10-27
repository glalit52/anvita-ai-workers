import { CalendarClock, Code2, FileText, Inbox, MessageSquare, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/misc";
import type { InteractionType, Worker } from "@/lib/types";

export const interactionMeta: Record<InteractionType, { label: string; icon: typeof MessageSquare }> = {
  chat: { label: "Chat", icon: MessageSquare },
  queue: { label: "Work queue", icon: Inbox },
  voice: { label: "Voice", icon: Phone },
  api: { label: "API", icon: Code2 },
  document: { label: "Document", icon: FileText },
  scheduled: { label: "Scheduled", icon: CalendarClock },
};

export function InteractionBadge({ type }: { type: InteractionType }) {
  const { label, icon: Icon } = interactionMeta[type];
  return (
    <Badge variant="outline">
      <Icon /> {label}
    </Badge>
  );
}

export function WorkerStatusBadge({ status }: { status: Worker["status"] }) {
  const map = {
    live: { v: "success" as const, t: "success" as const, l: "Live" },
    canary: { v: "warning" as const, t: "warning" as const, l: "Canary 10%" },
    paused: { v: "default" as const, t: "muted" as const, l: "Paused" },
    draft: { v: "default" as const, t: "muted" as const, l: "Draft" },
  }[status];
  return (
    <Badge variant={map.v}>
      <StatusDot tone={map.t} pulse={status === "live"} /> {map.l}
    </Badge>
  );
}
