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
import { PLATFORM_META, COUNTRY_LIST, INDUSTRY_LIST, LEAD_SOURCE_LIST } from "@/lib/constants";
import { checkForDuplicates, type DuplicateCheckResult } from "@/lib/duplicate-detection";
import type { Client, LeadScore, Platform } from "@/lib/types";

export interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onSaved?: (client: Client) => void;
  /** All existing clients for duplicate detection */
  existingClients?: Client[];
}

export function ClientDialog({ open, onOpenChange, client, onSaved, existingClients = [] }: ClientDialogProps) {
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

    // Duplicate detection
    if (!isEdit && existingClients.length > 0) {
      const email = (form.get("email") as string) || null;
      const company = (form.get("company") as string) || null;
      const dup = checkForDuplicates(existingClients, email, company);
      if (dup.isDuplicate) {
        const confirmed = window.confirm(
          `${dup.message}\n\nContinue adding as a duplicate?`
        );
        if (!confirmed) return;
      }
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
      // Outbound fields
      lead_score: (form.get("lead_score") as LeadScore) || null,
      country: (form.get("country") as string) || null,
      industry: (form.get("industry") as string) || null,
      website: (form.get("website") as string) || null,
      linkedin_url: (form.get("linkedin_url") as string) || null,
      main_problem_found: null,
      website_review_notes: null,
      source: (form.get("source") as string) || null,
      outreach_status: client?.outreach_status ?? "New",
      email_verified: client?.email_verified ?? false,
      last_email_sent_at: client?.last_email_sent_at ?? null,
      next_follow_up_date: client?.next_follow_up_date ?? null,
      follow_up_count: client?.follow_up_count ?? 0,
      owner_id: client?.owner_id ?? null,
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
          <DialogTitle>{isEdit ? "Edit client" : "Add client"}</DialogTitle>            <DialogDescription>Store contact details for a client or outbound lead.</DialogDescription>
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

          {/* Outbound lead fields */}
          <div className="border-t pt-4">
            <p className="mb-3 text-sm font-medium text-muted-foreground">Outbound Lead Details</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Lead Score</Label>
                <Select name="lead_score" defaultValue={client?.lead_score ?? ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select score" />
                  </SelectTrigger>
                  <SelectContent>
                    {(["High", "Medium", "Low"] as LeadScore[]).map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Select name="country" defaultValue={client?.country ?? ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_LIST.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Select name="industry" defaultValue={client?.industry ?? ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRY_LIST.map((i) => (
                      <SelectItem key={i} value={i}>{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Select name="source" defaultValue={client?.source ?? ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCE_LIST.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" name="website" defaultValue={client?.website ?? ""} placeholder="https://company.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                <Input id="linkedin_url" name="linkedin_url" defaultValue={client?.linkedin_url ?? ""} placeholder="https://linkedin.com/in/..." />
              </div>
            </div>
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
