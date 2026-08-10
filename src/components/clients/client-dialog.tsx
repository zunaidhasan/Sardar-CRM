"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClientAction, updateClientAction } from "@/app/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PLATFORM_META } from "@/lib/constants";
import type { Client, Platform } from "@/lib/types";

export interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onSaved?: (client: Client) => void;
}

export function ClientDialog({ open, onOpenChange, client, onSaved }: ClientDialogProps) {
  const [saving, setSaving] = React.useState(false);
  const isEdit = Boolean(client);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) {
      toast.error("Client name is required");
      return;
    }

    const payload = {
      name,
      email: (form.get("email") as string) || null,
      company: (form.get("company") as string) || null,
      platform: (form.get("platform") as Platform) || null,
      username: (form.get("username") as string) || null,
      profile_url: (form.get("profile_url") as string) || null,
      category: (form.get("category") as string) || null,
      account_id: null,
      tags: [],
      notes: (form.get("notes") as string) || null,
    };

    setSaving(true);
    const result = isEdit && client
      ? await updateClientAction(client.id, payload)
      : await createClientAction(payload);
    setSaving(false);

    if (result.ok && result.data) {
      toast.success(isEdit ? "Client updated" : "Client added");
      onOpenChange(false);
      onSaved?.(result.data);
    } else {
      toast.error(result.ok ? "Something went wrong" : result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit client" : "Add client"}</DialogTitle>
          <DialogDescription>Store contact details for a Fiverr or Upwork client.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" required defaultValue={client?.name ?? ""} placeholder="Client name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={client?.email ?? ""} placeholder="client@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input id="company" name="company" defaultValue={client?.company ?? ""} />
            </div>
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select name="platform" defaultValue={client?.platform ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unknown</SelectItem>
                  {Object.entries(PLATFORM_META).map(([key, meta]) => (
                    <SelectItem key={key} value={key}>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Platform username</Label>
              <Input id="username" name="username" defaultValue={client?.username ?? ""} placeholder="e.g. brightpath" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" name="category" defaultValue={client?.category ?? ""} placeholder="e.g. WordPress, Shopify" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile_url">Profile URL</Label>
            <Input id="profile_url" name="profile_url" defaultValue={client?.profile_url ?? ""} placeholder="https://www.fiverr.com/..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={client?.notes ?? ""} placeholder="Preferences, warnings, reminders..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save changes" : "Add client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
