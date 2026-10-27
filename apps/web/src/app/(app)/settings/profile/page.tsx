"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Avatar } from "@/components/ui/avatar";
import { confirm } from "@/components/ui/confirm";
import { SectionHeader, SettingRow } from "@/components/settings-section";
import { Field } from "@/components/settings/field";
import { useApp } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const profile = useApp((s) => s.profile);
  const updateProfile = useApp((s) => s.updateProfile);
  const resetDemo = useApp((s) => s.resetDemo);
  const [name, setName] = useState(profile.name);
  const [title, setTitle] = useState(profile.title);

  useEffect(() => {
    setName(profile.name);
    setTitle(profile.title);
  }, [profile.name, profile.title]);

  const dirty = name !== profile.name || title !== profile.title;
  const pref = <K extends keyof Profile>(k: K, v: Profile[K], msg = "Preference saved") => {
    updateProfile({ [k]: v } as Partial<Profile>);
    toast.success(msg);
  };

  return (
    <>
      <SectionHeader title="Profile" description="How you appear to teammates and how Anvita reaches you." />
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <Avatar name={name || profile.name} size={56} />
          <div>
            <p className="text-[15px] font-semibold">{profile.name}</p>
            <p className="text-[13px] text-muted-foreground">
              {profile.title} · {profile.email}
            </p>
          </div>
        </div>
        <form
          className="mt-6 grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            updateProfile({ name: name.trim(), title: title.trim() });
            toast.success("Profile updated");
          }}
        >
          <Field label="Full name" error={!name.trim() ? "Name can't be empty" : undefined}>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Email" hint="Managed by your SSO provider (Google Workspace).">
            <Input value={profile.email} readOnly disabled />
          </Field>
          <div className="flex items-end justify-end gap-2">
            <Button type="button" variant="ghost" disabled={!dirty} onClick={() => { setName(profile.name); setTitle(profile.title); }}>
              Discard
            </Button>
            <Button type="submit" disabled={!dirty || !name.trim()}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>

      <h3 className="mb-3 mt-8 text-[15px] font-semibold">Preferences</h3>
      <Card>
        <SettingRow title="Language" description="Interface language. Anvita always replies in the language you write in.">
          <div className="inline-flex rounded-lg bg-muted p-0.5 text-[13px]">
            {([
              ["en", "English"],
              ["hi", "हिन्दी"],
            ] as const).map(([v, l]) => (
              <button key={v} onClick={() => pref("language", v, v === "hi" ? "भाषा बदली गई" : "Language updated")} className={cn("rounded-md px-3 py-1.5 cursor-pointer", profile.language === v ? "bg-card font-medium shadow-sm" : "text-muted-foreground")}>
                {l}
              </button>
            ))}
          </div>
        </SettingRow>
        <SettingRow title="Time zone" description="Used for schedules, digests and timestamps">
          <Select value={profile.timezone} onChange={(e) => pref("timezone", e.target.value)} className="w-52" aria-label="Time zone">
            <option value="Asia/Kolkata">India (IST, UTC+5:30)</option>
            <option value="Asia/Dubai">Dubai (GST, UTC+4)</option>
            <option value="Europe/London">London (UK)</option>
            <option value="America/New_York">New York (ET)</option>
            <option value="Asia/Singapore">Singapore (SGT)</option>
          </Select>
        </SettingRow>
        <SettingRow title="Approval requests" description="Where Anvita sends approve / edit / reject cards first">
          <Select value={profile.approvalChannel} onChange={(e) => pref("approvalChannel", e.target.value as Profile["approvalChannel"])} className="w-40" aria-label="Approval channel">
            <option value="slack">Slack DM</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
          </Select>
        </SettingRow>
        <SettingRow title="Activity digest" description="A summary of what Anvita and your Workers did">
          <Select value={profile.digest} onChange={(e) => pref("digest", e.target.value as Profile["digest"])} className="w-40" aria-label="Digest">
            <option value="daily">Daily at 8 am</option>
            <option value="weekly">Monday mornings</option>
            <option value="off">Off</option>
          </Select>
        </SettingRow>
        <SettingRow title="Quiet hours" description="Hold non-urgent notifications between 9 pm and 8 am (approvals still come through)">
          <Switch checked={profile.quietHours} onCheckedChange={(v) => pref("quietHours", v)} aria-label="Quiet hours" />
        </SettingRow>
      </Card>

      <h3 className="mb-3 mt-8 text-[15px] font-semibold text-danger">Demo data</h3>
      <Card className="border-danger/40">
        <SettingRow title="Reset demo workspace" description="Restore all chats, Workers, approvals, settings and connections to the original sample data. Everything you created in this browser is removed.">
          <Button
            variant="danger"
            onClick={async () => {
              if (await confirm({ title: "Reset all demo data?", description: "This removes everything you created or changed in this browser.", confirmLabel: "Reset", danger: true })) {
                resetDemo();
                toast.success("Demo data restored");
              }
            }}
          >
            <RotateCcw /> Reset
          </Button>
        </SettingRow>
      </Card>
    </>
  );
}
