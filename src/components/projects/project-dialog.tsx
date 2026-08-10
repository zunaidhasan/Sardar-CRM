"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createProjectAction } from "@/app/actions";
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
import { PROJECT_STATUSES, PROJECT_STATUS_META, PRIORITY_META } from "@/lib/constants";
import type { Client, Priority, ProjectStatus } from "@/lib/types";

export interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  defaultFeePercent: number;
  onCreated?: () => void;
}

export function ProjectDialog({ open, onOpenChange, clients, defaultFeePercent, onCreated }: ProjectDialogProps) {
  const [saving, setSaving] = React.useState(false);
  const [gross, setGross] = React.useState(0);
  const [feePercent, setFeePercent] = React.useState(defaultFeePercent);

  const feeAmount = Math.round(gross * (feePercent / 100) * 100) / 100;
  const netAmount = Math.round((gross - feeAmount) * 100) / 100;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const projectName = String(form.get("project_name") ?? "").trim();
    if (!projectName) {
      toast.error("Project name is required");
      return;
    }

    const payload = {
      project_name: projectName,
      client_id: (form.get("client_id") as string) || null,
      account_id: null,
      order_date: (form.get("order_date") as string) || new Date().toISOString().slice(0, 10),
      assigned_to: (form.get("assigned_to") as string) || null,
      developer: (form.get("developer") as string) || null,
      website_link: (form.get("website_link") as string) || null,
      project_type: (form.get("project_type") as string) || null,
      delivery_deadline: (form.get("delivery_deadline") as string) || null,
      gross_amount: gross,
      fee_percent: feePercent,
      fee_amount: feeAmount,
      net_amount: netAmount,
      bonus: 0,
      status: (form.get("status") as ProjectStatus) ?? "wip",
      priority: (form.get("priority") as Priority) ?? "medium",
      progress: 0,
      notes: (form.get("notes") as string) || null,
      opportunity_id: null,
    };

    setSaving(true);
    const result = await createProjectAction(payload);
    setSaving(false);

    if (result.ok) {
      toast.success("Project created");
      onOpenChange(false);
      onCreated?.();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New project / order</DialogTitle>
          <DialogDescription>Map a new entry to your monthly order tracking.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project_name">Project name *</Label>
            <Input id="project_name" name="project_name" required placeholder="e.g. Client - landing page" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select name="client_id">
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
              <Label>Status</Label>
              <Select name="status" defaultValue="wip">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PROJECT_STATUS_META[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select name="priority" defaultValue="medium">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORITY_META) as Priority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_META[p].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Project type</Label>
              <Input name="project_type" placeholder="e.g. Shopify, Landing Page" />
            </div>
            <div className="space-y-2">
              <Label>Order date</Label>
              <Input type="date" name="order_date" defaultValue={new Date().toISOString().slice(0, 10)} />
            </div>
            <div className="space-y-2">
              <Label>Delivery deadline</Label>
              <Input type="date" name="delivery_deadline" />
            </div>
            <div className="space-y-2">
              <Label>Assigned to</Label>
              <Input name="assigned_to" placeholder="Your name" />
            </div>
            <div className="space-y-2">
              <Label>Developer</Label>
              <Input name="developer" placeholder="Team member" />
            </div>
            <div className="space-y-2">
              <Label>Website link</Label>
              <Input name="website_link" placeholder="https://..." />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 rounded-lg border bg-muted/40 p-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label>Gross amount ($)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={gross}
                onChange={(e) => setGross(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Fee (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={feePercent}
                onChange={(e) => setFeePercent(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Fee amount</Label>
              <Input value={`$${feeAmount.toFixed(2)}`} readOnly disabled />
            </div>
            <div className="space-y-2">
              <Label>Net after fee</Label>
              <Input value={`$${netAmount.toFixed(2)}`} readOnly disabled />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea name="notes" placeholder="Scope, client notes..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Create project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
