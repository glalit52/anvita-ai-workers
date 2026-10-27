"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/tabs";
import { AppLogo } from "@/components/brand/app-logo";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const notifications = useApp((s) => s.notifications);
  const markRead = useApp((s) => s.markNotificationsRead);
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const unread = notifications.filter((n) => !n.read).length;
  const list = filter === "all" ? notifications : notifications.filter((n) => !n.read);

  return (
    <PageContainer className="max-w-3xl">
      <PageHeader
        title="Notifications"
        description="Approvals, failures, deliveries and integration health."
        actions={
          <Button variant="outline" size="sm" disabled={unread === 0} onClick={() => markRead()}>
            <CheckCheck /> Mark all read
          </Button>
        }
      />
      <div className="mt-6">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: `All (${notifications.length})` },
            { value: "unread", label: `Unread (${unread})` },
          ]}
        />
      </div>
      {list.length === 0 ? (
        <div className="mt-5">
          <EmptyState icon={<Bell />} title={filter === "unread" ? "No unread notifications" : "No notifications yet"} description="We'll let you know when something needs you." />
        </div>
      ) : (
        <Card className="mt-5 divide-y divide-border">
          {list.map((n) => (
            <div key={n.id} className={cn("flex items-center gap-3 px-4 py-3.5", !n.read && "bg-primary-soft/25")}>
              <button
                onClick={() => {
                  markRead(n.id);
                  router.push(n.href);
                }}
                className="flex min-w-0 flex-1 items-center gap-3 text-left cursor-pointer"
              >
                <AppLogo appId={n.appId} size={32} />
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate text-[13.5px]", n.read ? "text-muted-foreground" : "font-medium")}>{n.title}</p>
                  <p className="text-[12px] text-muted-foreground">{n.meta}</p>
                </div>
              </button>
              {!n.read ? (
                <Button variant="ghost" size="sm" onClick={() => markRead(n.id)}>
                  Mark read
                </Button>
              ) : (
                <span className="w-[76px]" />
              )}
            </div>
          ))}
        </Card>
      )}
    </PageContainer>
  );
}
