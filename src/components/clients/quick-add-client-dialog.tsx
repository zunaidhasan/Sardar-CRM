"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClientAction } from "@/app/actions";
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
import { checkForDuplicates } from "@/lib/duplicate-detection";
import type { Client, Platform } from "@/lib/types";

interface QuickAddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingClients?: Client[];
  onSaved?: (client: Client) => void;
}

/**
 * Simplified client add dialog — only the essential fields.
 * Used on the Clients list page for quick entry.
 */
export function QuickAddClientDialog({
  open,
  onOpenChange,
  existingClients = [],
  onSaved,
}: QuickAddClientDialogProps) {
  const [saving, setSaving] = React.useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) {
      toast.error("Client name is required");
      return;
    }

    // Duplicate detection
    if (existingClients.length > 0) {
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
      profile_url: null,
      category: (form.get("category") as string) || null,
      account_id: null,
      tags: [],
      notes: (form.get("notes") as string) || null,
      lead_score: null,
      country: null,
      industry: null,
      website: null,
      linkedin_url: null,
      main_problem_found: null,
      website_review_notes: null,
      source: null,
      outreach_status: "New" as const,
      email_verified: false,
      last_email_sent_at: null,
      next_follow_up_date: null,
      follow_up_count: 0,
      owner_id: null,
    };

    setSaving(true);
    const result = await createClientAction(payload);
    setSaving(false);

    if (result.ok && result.data) {
      toast.success("Client added");
      onOpenChange(false);
      onSaved?.(result.data);
    } else {
      toast.error(result.ok ? "Something went wrong" : result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add client</DialogTitle>
          <DialogDescription>
            Quick add a new client. You can enrich lead details later from the client profile.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="qac-name">Name *</Label>
              <Input id="qac-name" name="name" required placeholder="Client name" autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qac-email">Email</Label>
              <Input id="qac-email" name="email" type="email" placeholder="client@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qac-company">Company</Label>
              <Input id="qac-company" name="company" placeholder="Acme Corp" />
            </div>
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select name="platform">
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PLATFORM_META).map(([key, meta]) => (
                    <SelectItem key={key} value={key}>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qac-username">Platform username</Label>
              <Input id="qac-username" name="username" placeholder="e.g. brightpath" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qac-category">Category</Label>
              <Input id="qac-category" name="category" placeholder="e.g. WordPress, Shopify" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="qac-notes">Notes</Label>
            <Textarea id="qac-notes" name="notes" rows={2} placeholder="Preferences, warnings..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Add client
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
