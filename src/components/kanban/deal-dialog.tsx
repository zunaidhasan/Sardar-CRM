"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createOpportunityAction, updateOpportunityAction } from "@/app/actions";
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
import { KANBAN_STAGES, STAGE_META, PLATFORM_META } from "@/lib/constants";
import type { Client, Opportunity, OpportunityStage, Platform } from "@/lib/types";

export type DealDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  opportunity?: Opportunity | null;
  defaultStage?: OpportunityStage;
};

export function DealDialog({ open, onOpenChange, clients, opportunity, defaultStage = "lead" }: DealDialogProps) {
  const [saving, setSaving] = React.useState(false);
  const isEdit = Boolean(opportunity);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    if (!title) {
      toast.error("Title is required");
      return;
    }
    const platform = (form.get("platform") as Platform) ?? "upwork";
    const payload = {
      title,
      description: (form.get("description") as string) || null,
      client_id: (form.get("client_id") as string) || null,
      account_id: null,
      due_date: null,
      platform,
      type: (form.get("type") as "bid" | "pre_sales") ?? "bid",
      stage: (form.get("stage") as OpportunityStage) ?? defaultStage,
      status: (form.get("status") as Opportunity["status"]) || null,
      amount: Number(form.get("amount") ?? 0) || 0,
      currency: "USD",
      connects_spent: Number(form.get("connects_spent") ?? 0) || 0,
      source_url: (form.get("source_url") as string) || null,
      next_follow_up: (form.get("next_follow_up") as string) || null,
      assigned_to: (form.get("assigned_to") as string) || null,
      notes: (form.get("notes") as string) || null,
      lost_reason: null,
    };

    setSaving(true);
    const result = isEdit && opportunity
      ? await updateOpportunityAction(opportunity.id, payload)
      : await createOpportunityAction(payload);
    setSaving(false);

    if (result.ok) {
      toast.success(isEdit ? "Deal updated" : "Deal added to pipeline");
      onOpenChange(false);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit deal" : "Add a deal"}</DialogTitle>
          <DialogDescription>
            Track an Upwork bid or a Fiverr pre-sales quote in your pipeline.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Deal title *</Label>
            <Input
              id="title"
              name="title"
              required
              defaultValue={opportunity?.title ?? ""}
              placeholder="e.g. Landing page for new SaaS launch"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select name="client_id" defaultValue={opportunity?.client_id ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No client</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select name="platform" defaultValue={opportunity?.platform ?? "upwork"}>
                <SelectTrigger>
                  <SelectValue />
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
              <Label>Type</Label>
              <Select name="type" defaultValue={opportunity?.type ?? "bid"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bid">Upwork bid</SelectItem>
                  <SelectItem value="pre_sales">Fiverr pre-sales</SelectItem>
                  <SelectItem value="direct">Direct</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Stage</Label>
              <Select name="stage" defaultValue={opportunity?.stage ?? defaultStage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KANBAN_STAGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STAGE_META[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quoted amount ($)</Label>
              <Input
                type="number"
                name="amount"
                min={0}
                step="0.01"
                defaultValue={opportunity?.amount ?? 0}
              />
            </div>
            <div className="space-y-2">
              <Label>Connects spent</Label>
              <Input
                type="number"
                name="connects_spent"
                min={0}
                defaultValue={opportunity?.connects_spent ?? 0}
              />
            </div>
            <div className="space-y-2">
              <Label>Bid status</Label>
              <Select
                name="status"
                defaultValue={opportunity?.status ?? ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  <SelectItem value="no_response">No Response</SelectItem>
                  <SelectItem value="only_viewed">Only Viewed</SelectItem>
                  <SelectItem value="response">Response</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="hired">Hired</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Next follow-up</Label>
              <Input type="date" name="next_follow_up" defaultValue={opportunity?.next_follow_up ?? ""} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Source / job link</Label>
            <Input
              name="source_url"
              defaultValue={opportunity?.source_url ?? ""}
              placeholder="https://www.upwork.com/jobs/~..."
            />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              name="notes"
              defaultValue={opportunity?.notes ?? ""}
              placeholder="Any context worth remembering..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save changes" : "Add deal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
