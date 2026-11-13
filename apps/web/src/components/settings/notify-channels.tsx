"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SettingRow } from "@/components/settings-section";
import { get, patch, post } from "@/lib/api";
import { useApp } from "@/lib/store";

const b64ToBytes = (b64: string) => {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

/** Browser push on this device: register the service worker and subscribe with the server's VAPID key. */
function useBrowserPush() {
  const [state, setState] = useState<{ supported: boolean; enabled: boolean; on: boolean; key: string | null }>({ supported: false, enabled: false, on: false, key: null });
  useEffect(() => {
    const supported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    get<{ enabled: boolean; publicKey: string | null }>("/push/key").then(async (k) => {
      let on = false;
      if (supported && k.enabled) on = !!(await (await navigator.serviceWorker.getRegistration("/sw.js"))?.pushManager.getSubscription());
      setState({ supported, enabled: k.enabled, on, key: k.publicKey });
    }, () => {});
  }, []);
  const toggle = async (v: boolean) => {
    try {
      if (v) {
        if ((await Notification.requestPermission()) !== "granted") throw new Error("Notifications are blocked for this site in your browser settings");
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(state.key!) });
        const j = sub.toJSON();
        await post("/me/push-subscriptions", { endpoint: j.endpoint, keys: j.keys });
      } else {
        const sub = await (await navigator.serviceWorker.getRegistration("/sw.js"))?.pushManager.getSubscription();
        if (sub) {
          await post("/me/push-subscriptions/remove", { endpoint: sub.endpoint });
          await sub.unsubscribe();
        }
      }
      setState((s) => ({ ...s, on: v }));
      toast.success(v ? "Browser notifications on for this device" : "Browser notifications off");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return { ...state, toggle };
}

/** Live mode: where approval requests reach you, and (admins) the workspace approvals channel. */
export function NotifyChannels() {
  const profile = useApp((s) => s.profile);
  const settings = useApp((s) => s.settings);
  const role = useApp((s) => s.workspaceInfo.role);
  const [phone, setPhone] = useState("");
  const [savedPhone, setSavedPhone] = useState("");
  const [channel, setChannel] = useState(String(settings["notify.approvalsSlackChannel"] ?? ""));
  const push = useBrowserPush();
  useEffect(() => {
    get<{ user: { phone?: string } }>("/me").then((m) => {
      const p = m.user?.phone ? `+${m.user.phone}` : "";
      setPhone(p);
      setSavedPhone(p);
    }, () => {});
  }, []);
  const admin = role === "owner" || role === "admin";

  return (
    <Card className="mt-4">
      <SettingRow title="WhatsApp number" description={profile.approvalChannel === "whatsapp" ? "Approval requests arrive here with Approve / Reject buttons" : "Used when you choose WhatsApp for approval requests"}>
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const u = await patch<{ phone?: string }>("/me", { phone });
              const p = u.phone ? `+${u.phone}` : "";
              setPhone(p);
              setSavedPhone(p);
              toast.success(p ? "WhatsApp number saved" : "WhatsApp number removed");
            } catch (err) {
              toast.error((err as Error).message);
            }
          }}
        >
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98200 11223" className="w-44" inputMode="tel" aria-label="WhatsApp number" />
          <Button size="sm" variant="outline" type="submit" disabled={phone === savedPhone}>
            Save
          </Button>
        </form>
      </SettingRow>
      <SettingRow title="Browser notifications" description={!push.enabled ? "Not configured on this server (VAPID keys)" : !push.supported ? "This browser doesn't support push notifications" : "Get approvals and run results on this device even when Anvita is closed"}>
        <Switch checked={push.on} disabled={!push.enabled || !push.supported} onCheckedChange={(v) => void push.toggle(v)} aria-label="Browser notifications" />
      </SettingRow>
      {admin && (
        <SettingRow title="Slack channel for approvals" description="Also post every approval request (with buttons) to this channel. Invite the Anvita app to it first. Leave empty to only DM approvers.">
          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const next = await patch<Record<string, string | number | boolean>>("/workspace/settings", { "notify.approvalsSlackChannel": channel.trim() });
                useApp.setState({ settings: next });
                toast.success("Approvals channel saved");
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          >
            <Input value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="C0123ABCD or #approvals" className="w-44 font-mono text-[12px]" aria-label="Slack approvals channel" />
            <Button size="sm" variant="outline" type="submit" disabled={channel === String(settings["notify.approvalsSlackChannel"] ?? "")}>
              Save
            </Button>
          </form>
        </SettingRow>
      )}
    </Card>
  );
}
