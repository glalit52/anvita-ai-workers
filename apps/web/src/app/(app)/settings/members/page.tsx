"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MailPlus, MoreHorizontal, Search, Trash2, UserPlus } from "lucide-react";
import { useApp } from "@/lib/store";
import type { Role } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { confirm } from "@/components/ui/confirm";
import { SectionHeader } from "@/components/settings-section";
import { Field, isEmail } from "@/components/settings/field";

const roles: { r: Role; label: string; d: string }[] = [
  { r: "owner", label: "Owner", d: "Billing, security, everything" },
  { r: "admin", label: "Admin", d: "Members, policies, connections" },
  { r: "builder", label: "Builder", d: "Create & publish Workers" },
  { r: "member", label: "Member", d: "Use Anvita and shared Workers" },
  { r: "viewer", label: "Viewer", d: "Read-only dashboards & runs" },
];

function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const invite = useApp((s) => s.inviteMember);
  const members = useApp((s) => s.members);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [touched, setTouched] = useState(false);
  const dup = members.some((m) => m.email.toLowerCase() === email.trim().toLowerCase());
  const emailError = !touched ? undefined : !isEmail(email) ? "Enter a valid email address" : dup ? "This person is already in the workspace" : undefined;
  const nameError = touched && !name.trim() ? "Name is required" : undefined;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!name.trim() || !isEmail(email) || dup) return;
    invite({ name: name.trim(), email: email.trim().toLowerCase(), role });
    toast.success(`Invite sent to ${email.trim()}`);
    setName("");
    setEmail("");
    setRole("member");
    setTouched(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Invite a teammate</DialogTitle>
        <DialogDescription className="mt-1">They’ll get an email to join Kesar Foods on Anvita. Seats are free — you pay per workspace.</DialogDescription>
        <form onSubmit={submit} className="mt-5 grid gap-4" noValidate>
          <Field label="Full name" error={nameError}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Riya Kapoor" autoFocus />
          </Field>
          <Field label="Work email" error={emailError}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="riya@kesarfoods.in" />
          </Field>
          <Field label="Role" hint={roles.find((r) => r.r === role)?.d}>
            <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {roles.filter((r) => r.r !== "owner").map((r) => (
                <option key={r.r} value={r.r}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              <MailPlus /> Send invite
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function MembersPage() {
  const members = useApp((s) => s.members);
  const updateMember = useApp((s) => s.updateMember);
  const removeMember = useApp((s) => s.removeMember);
  const [q, setQ] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const list = members.filter((m) => (m.name + m.email + m.role).toLowerCase().includes(q.toLowerCase()));
  const active = members.filter((m) => m.status === "active").length;
  const invited = members.length - active;

  return (
    <>
      <SectionHeader
        title="Members & roles"
        description={`${members.length} seats · ${active} active${invited ? ` · ${invited} invited` : ""} · provisioned via Google Workspace SSO + SCIM`}
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus /> Invite
          </Button>
        }
      />
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email or role" className="pl-8" />
      </div>
      <Card>
        <Table>
          <THead>
            <tr>
              <TH>Member</TH>
              <TH>Role</TH>
              <TH>Status</TH>
              <TH>Last active</TH>
              <TH />
            </tr>
          </THead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <TD colSpan={5} className="py-8 text-center text-muted-foreground">
                  No members match “{q}”.
                </TD>
              </tr>
            )}
            {list.map((m) => (
              <TR key={m.id}>
                <TD>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={m.name} size={30} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{m.name}</p>
                      <p className="truncate text-[12px] text-muted-foreground">{m.email}</p>
                    </div>
                  </div>
                </TD>
                <TD>
                  <Select
                    value={m.role}
                    aria-label={`Role for ${m.name}`}
                    className="h-8 w-28"
                    disabled={m.role === "owner"}
                    onChange={(e) => {
                      updateMember(m.id, { role: e.target.value as Role });
                      toast.success(`${m.name} is now ${e.target.value}`);
                    }}
                  >
                    {roles.map((r) => (
                      <option key={r.r} value={r.r} disabled={r.r === "owner" && m.role !== "owner"}>
                        {r.label}
                      </option>
                    ))}
                  </Select>
                </TD>
                <TD>{m.status === "active" ? <Badge variant="success">Active{m.sso ? " · SSO" : ""}</Badge> : <Badge variant="warning">Invited</Badge>}</TD>
                <TD className="whitespace-nowrap text-muted-foreground">{m.lastActive}</TD>
                <TD className="text-right">
                  {m.role !== "owner" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${m.name}`}>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {m.status === "invited" && (
                          <DropdownMenuItem onSelect={() => toast.success(`Invite re-sent to ${m.email}`)}>
                            <MailPlus /> Resend invite
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onSelect={() => {
                            navigator.clipboard?.writeText(m.email);
                            toast("Email copied");
                          }}
                        >
                          Copy email
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-danger [&_svg]:text-danger"
                          onSelect={async () => {
                            if (await confirm({ title: `Remove ${m.name}?`, description: "They lose access immediately. Workers they own are transferred to you.", confirmLabel: "Remove", danger: true })) {
                              removeMember(m.id);
                              toast(`${m.name} removed`);
                            }
                          }}
                        >
                          <Trash2 /> Remove from workspace
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {roles.map((r) => (
          <div key={r.r} className="rounded-xl border border-border bg-card p-3">
            <p className="text-[13px] font-medium">
              {r.label} <span className="text-muted-foreground">· {members.filter((m) => m.role === r.r).length}</span>
            </p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">{r.d}</p>
          </div>
        ))}
      </div>
      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </>
  );
}
