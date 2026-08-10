"use client";

import * as React from "react";
import { toast } from "sonner";
import { Globe, Loader2, Plus } from "lucide-react";
import { createAccountAction } from "@/app/actions";
import type { Account, Platform } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PLATFORM_META } from "@/lib/constants";

export function AccountManager({ accounts }: { accounts: Account[] }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [platform, setPlatform] = React.useState<Platform>("fiverr");
  const [username, setUsername] = React.useState("");
  const [profileUrl, setProfileUrl] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function handleAdd() {
    if (!name.trim()) return;
    setSaving(true);
    const result = await createAccountAction({
      name: name.trim(),
      platform,
      username: username.trim() || null,
      profile_url: profileUrl.trim() || null,
    });
    setSaving(false);
    if (result.ok) {
      toast.success("Seller account added");
      setOpen(false);
      setName("");
      setUsername("");
      setProfileUrl("");
    } else {
      toast.error(result.error ?? "Failed to add account");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Seller accounts</CardTitle>
        <CardDescription>Your Fiverr / Upwork profiles used across deals and projects.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {accounts.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No accounts yet.</p>
        ) : (
          <ul className="space-y-2">
            {accounts.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.name}</p>
                    {a.username && (
                      <p className="truncate text-xs text-muted-foreground">@{a.username}</p>
                    )}
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize">
                  {PLATFORM_META[a.platform].label}
                </span>
              </li>
            ))}
          </ul>
        )}

        {open ? (
          <div className="space-y-3 rounded-lg border p-3">
            <div className="space-y-2">
              <Label htmlFor="acct-name">Name</Label>
              <Input
                id="acct-name"
                placeholder="e.g. Jordan's Fiverr"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fiverr">Fiverr</SelectItem>
                    <SelectItem value="upwork">Upwork</SelectItem>
                    <SelectItem value="direct">Direct</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="acct-user">Username</Label>
                <Input
                  id="acct-user"
                  placeholder="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="acct-url">Profile URL</Label>
              <Input
                id="acct-url"
                placeholder="https://..."
                value={profileUrl}
                onChange={(e) => setProfileUrl(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAdd} disabled={saving || !name.trim()}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Add
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Add seller account
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
