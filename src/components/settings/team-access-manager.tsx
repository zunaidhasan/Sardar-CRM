"use client";

import * as React from "react";
import { toast } from "sonner";
import { KeyRound, Loader2, Plus, ShieldCheck, UserCog, Users } from "lucide-react";
import { createUserAction, updateUserAction } from "@/app/actions";
import type { AppUser, TeamRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLE_LABELS: Record<TeamRole, string> = {
  ceo: "CEO",
  executive: "Executive",
  developer: "Developer",
  designer: "Designer",
};

const ROLE_OPTIONS: TeamRole[] = ["ceo", "executive", "developer", "designer"];

export function TeamAccessManager({ users }: { users: AppUser[] }) {
  const [open, setOpen] = React.useState(false);
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<TeamRole>("executive");
  const [saving, setSaving] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [resetFor, setResetFor] = React.useState<string | null>(null);
  const [newPassword, setNewPassword] = React.useState("");

  function resetForm() {
    setOpen(false);
    setUsername("");
    setPassword("");
    setName("");
    setEmail("");
    setRole("executive");
  }

  async function handleCreate() {
    if (!username.trim() || !name.trim() || !password) {
      toast.error("Username, full name and password are required");
      return;
    }
    setSaving(true);
    const result = await createUserAction({
      username: username.trim(),
      password,
      name: name.trim(),
      email: email.trim() || undefined,
      role,
    });
    setSaving(false);
    if (result.ok) {
      toast.success(`Login "${result.data?.username}" created`);
      resetForm();
    } else {
      toast.error(result.error ?? "Failed to create user");
    }
  }

  async function handleResetPassword(u: AppUser) {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setBusy(`pwd-${u.username}`);
    const result = await updateUserAction(u.username, { password: newPassword });
    setBusy(null);
    if (result.ok) {
      toast.success(`Password reset for ${u.username}`);
      setResetFor(null);
      setNewPassword("");
    } else {
      toast.error(result.error ?? "Failed to reset password");
    }
  }

  async function handleToggleActive(u: AppUser) {
    setBusy(`act-${u.username}`);
    const result = await updateUserAction(u.username, { is_active: !u.is_active });
    setBusy(null);
    if (result.ok) {
      toast.success(u.is_active ? `${u.username} deactivated` : `${u.username} reactivated`);
    } else {
      toast.error(result.error ?? "Failed to update user");
    }
  }

  async function handleRoleChange(u: AppUser, next: TeamRole) {
    if (next === u.role) return;
    setBusy(`role-${u.username}`);
    const result = await updateUserAction(u.username, { role: next });
    setBusy(null);
    if (result.ok) {
      toast.success(`${u.username} is now ${ROLE_LABELS[next]}`);
    } else {
      toast.error(result.error ?? "Failed to update role");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" /> Team access
          </CardTitle>
          <CardDescription>
            Agency-managed logins. Employees never self-register — create their credentials here
            and share them securely.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setOpen((v) => !v)}>
          <Plus className="h-4 w-4" /> New login
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {open && (
          <div className="space-y-3 rounded-lg border p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tm-user">Username</Label>
                <Input
                  id="tm-user"
                  placeholder="e.g. tanvir"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tm-name">Full name</Label>
                <Input
                  id="tm-name"
                  placeholder="Tanvir Islam"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tm-email">Email (optional)</Label>
                <Input
                  id="tm-email"
                  type="email"
                  placeholder="tanvir@sardaritbd.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tm-password">Password</Label>
                <Input
                  id="tm-password"
                  type="text"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as TeamRole)}>
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Create login
              </Button>
            </div>
          </div>
        )}

        {users.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No logins yet.</p>
        ) : (
          <ul className="space-y-2">
            {users.map((u) => (
              <li key={u.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <UserCog className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {u.name} <span className="text-muted-foreground">@{u.username}</span>
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                          {ROLE_LABELS[u.role]}
                        </Badge>
                        {!u.is_active && (
                          <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">
                            Disabled
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Select
                      value={u.role}
                      onValueChange={(v) => handleRoleChange(u, v as TeamRole)}
                      disabled={busy === `role-${u.username}`}
                    >
                      <SelectTrigger className="h-8 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      onClick={() => {
                        setResetFor(resetFor === u.username ? null : u.username);
                        setNewPassword("");
                      }}
                    >
                      <KeyRound className="h-3.5 w-3.5" /> Reset
                    </Button>
                    <Switch
                      checked={u.is_active}
                      onCheckedChange={() => handleToggleActive(u)}
                      disabled={busy === `act-${u.username}`}
                      aria-label={`Toggle ${u.username} access`}
                    />
                  </div>
                </div>
                {resetFor === u.username && (
                  <div className="mt-3 flex items-center gap-2 border-t pt-3">
                    <Input
                      type="text"
                      placeholder="New password (min 6 chars)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-8 flex-1 text-sm"
                    />
                    <Button
                      size="sm"
                      className="h-8"
                      onClick={() => handleResetPassword(u)}
                      disabled={busy === `pwd-${u.username}`}
                    >
                      {busy === `pwd-${u.username}` && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      )}
                      Save password
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          Passwords are hashed; only agency management can create or reset logins.
        </p>
      </CardContent>
    </Card>
  );
}
