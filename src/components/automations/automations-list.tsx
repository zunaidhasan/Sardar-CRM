"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Workflow } from "lucide-react";
import { saveAutomationAction, toggleAutomationAction, deleteAutomationAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { KANBAN_STAGES, STAGE_META } from "@/lib/constants";
import type { AutomationRule } from "@/lib/types";

export function AutomationsList({ rules }: { rules: AutomationRule[] }) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) {
      toast.error("Rule name is required");
      return;
    }
    const triggerValue = (form.get("trigger_value") as string) || null;
    const actionType = (form.get("action_type") as string) || "log_activity";
    const projectNameTemplate = (form.get("project_name_template") as string) || "{{opportunity.title}}";
    const subject = (form.get("subject") as string) || "Automation fired";
    const body = (form.get("body") as string) || "";

    setSaving(true);
    const result = await saveAutomationAction({
      name,
      trigger_event: "opportunity.stage_changed",
      trigger_value: triggerValue,
      action_type: actionType,
      action_data:
        actionType === "create_project"
          ? { project_name_template: projectNameTemplate }
          : { subject, body },
      is_active: true,
    });
    setSaving(false);
    if (result.ok) {
      toast.success("Automation rule created");
      setOpen(false);
    } else {
      toast.error(result.error);
    }
  }

  async function handleToggle(rule: AutomationRule, checked: boolean) {
    const result = await toggleAutomationAction(rule.id, checked);
    if (!result.ok) toast.error(result.error);
  }

  async function handleDelete(rule: AutomationRule) {
    if (!window.confirm(`Delete automation "${rule.name}"?`)) return;
    const result = await deleteAutomationAction(rule.id);
    if (!result.ok) toast.error(result.error);
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus /> New automation
        </Button>
      </div>

      {rules.length === 0 ? (
        <EmptyState
          icon={Workflow}
          title="No automation rules"
          description="Automate busywork — e.g. auto-create a project when a deal moves to Active."
        />
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{rule.name}</p>
                    <Badge variant={rule.is_active ? "default" : "secondary"}>
                      {rule.is_active ? "Active" : "Paused"}
                    </Badge>
                  </div>                  <p className="mt-1 text-xs text-muted-foreground">
                    {rule.trigger_event === "opportunity.stage_changed" && (
                      <>When a deal moves to <span className="font-medium text-foreground">
                        {STAGE_META[(rule.trigger_value as keyof typeof STAGE_META) ?? "active"]?.label ?? rule.trigger_value}
                      </span></>
                    )}
                    {rule.trigger_event === "project.created" && <>When a project is created</>}
                    {rule.trigger_event === "project.completed" && <>When a project is completed</>}
                    {rule.trigger_event === "invoice.overdue" && <>When an invoice becomes overdue</>}
                    {rule.trigger_event === "lead.created" && <>When a new lead is added</>}
                    {rule.trigger_event === "lead.replied" && <>When a lead replies</>}
                    {!rule.trigger_event.startsWith("opportunity.") &&
                     !rule.trigger_event.startsWith("project.") &&
                     !rule.trigger_event.startsWith("invoice.") &&
                     !rule.trigger_event.startsWith("lead.") && (
                      <>On {rule.trigger_event}</>
                    )}
                    {" "}→ <span className="font-medium text-foreground">
                      {rule.action_type.replace(/_/g, " ")}
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={(checked) => handleToggle(rule, checked)}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleDelete(rule)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New automation rule</DialogTitle>
            <DialogDescription>Trigger an action when something happens in your pipeline.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Rule name *</Label>
              <Input id="name" name="name" required placeholder="e.g. Deal active -> create project" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Trigger event</Label>
                <Select name="trigger_event" defaultValue="opportunity.stage_changed">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="opportunity.stage_changed">Deal stage changes</SelectItem>
                    <SelectItem value="project.created">Project created</SelectItem>
                    <SelectItem value="project.completed">Project completed</SelectItem>
                    <SelectItem value="invoice.overdue">Invoice overdue</SelectItem>
                    <SelectItem value="lead.created">New lead added</SelectItem>
                    <SelectItem value="lead.replied">Lead replied</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>When value is</Label>
                <Select name="trigger_value" defaultValue="active">
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
                <p className="text-[11px] text-muted-foreground">
                  For stage-change triggers only. Other triggers fire regardless of value.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Action</Label>
              <Select name="action_type" defaultValue="create_project">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="create_project">Create project</SelectItem>
                  <SelectItem value="create_invoice">Create invoice</SelectItem>
                  <SelectItem value="log_activity">Log activity</SelectItem>
                  <SelectItem value="update_lead_score">Update lead score</SelectItem>
                  <SelectItem value="send_notification">Send notification</SelectItem>
                  <SelectItem value="assign_owner">Assign owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project_name_template">Project name template</Label>
              <Input
                id="project_name_template"
                name="project_name_template"
                defaultValue="{{opportunity.title}}"
              />
              <p className="text-xs text-muted-foreground">
                Use {"{{opportunity.title}}"} to reuse the deal title.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Create rule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
