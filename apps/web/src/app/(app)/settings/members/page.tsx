"use client";
import { MoreHorizontal, UserPlus } from "lucide-react";
import { members } from "@/lib/mock/workspace";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { SectionHeader } from "@/components/settings-section";

const roles = [
  { r: "Owner", d: "Billing, security, everything" },
  { r: "Admin", d: "Members, policies, connections" },
  { r: "Builder", d: "Create & publish Workers" },
  { r: "Member", d: "Use Anvita and shared Workers" },
  { r: "Viewer", d: "Read-only dashboards & runs" },
];

export default function MembersPage() {
  return (
    <>
      <SectionHeader title="Members & roles" description="7 seats · provisioned via Google Workspace SSO + SCIM" actions={<Button><UserPlus /> Invite</Button>} />
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
            {members.map((m) => (
              <TR key={m.id}>
                <TD>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={m.name} size={30} />
                    <div>
                      <p className="font-medium">{m.name}</p>
                      <p className="text-[12px] text-muted-foreground">{m.email}</p>
                    </div>
                  </div>
                </TD>
                <TD>
                  <Select defaultValue={m.role} className="h-8 w-28 capitalize" disabled={m.role === "owner"}>
                    {["owner", "admin", "builder", "member", "viewer"].map((r) => (
                      <option key={r} value={r}>
                        {r[0].toUpperCase() + r.slice(1)}
                      </option>
                    ))}
                  </Select>
                </TD>
                <TD>
                  {m.status === "active" ? <Badge variant="success">Active{m.sso ? " · SSO" : ""}</Badge> : <Badge variant="warning">Invited</Badge>}
                </TD>
                <TD className="text-muted-foreground">{m.lastActive}</TD>
                <TD className="text-right">
                  <Button variant="ghost" size="icon-sm" aria-label="More">
                    <MoreHorizontal />
                  </Button>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {roles.map((r) => (
          <div key={r.r} className="rounded-xl border border-border bg-card p-3">
            <p className="text-[13px] font-medium">{r.r}</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">{r.d}</p>
          </div>
        ))}
      </div>
    </>
  );
}
