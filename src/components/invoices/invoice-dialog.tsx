"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createInvoiceAction } from "@/app/actions";
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
import { formatCurrency } from "@/lib/utils";
import type { Client, InvoiceStatus, Project, RecurringFrequency } from "@/lib/types";

export interface InvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  projects: Project[];
  currency: string;
  onCreated?: () => void;
}

export function InvoiceDialog({
  open,
  onOpenChange,
  clients,
  projects,
  currency,
  onCreated,
}: InvoiceDialogProps) {
  const [saving, setSaving] = React.useState(false);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>("");
  const [amount, setAmount] = React.useState(0);
  const [invoiceNumber, setInvoiceNumber] = React.useState("");
  const [isRecurring, setIsRecurring] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const year = new Date().getFullYear();
    // Use a random suffix to avoid collision when multiple invoices
    // are created in quick succession (same millisecond).
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    setInvoiceNumber(`INV-${year}-${rand}`);
  }, [open]);

  function handleProjectChange(projectId: string) {
    setSelectedProjectId(projectId);
    const project = projects.find((p) => p.id === projectId);
    if (project) setAmount(project.net_amount + project.bonus);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const projectId = form.get("project_id") as string;
    const clientId = (form.get("client_id") as string) || null;
    const dueInDays = Number(form.get("due_in_days") ?? 14) || 14;
    const today = new Date();
    const due = new Date(today);
    due.setDate(due.getDate() + dueInDays);

    const payload = {
      invoice_number: invoiceNumber.trim() || `INV-${Date.now()}`,
      client_id: clientId,
      project_id: projectId || null,
      issue_date: today.toISOString().slice(0, 10),
      due_date: due.toISOString().slice(0, 10),
      amount,
      currency,
      status: "pending" as InvoiceStatus,
      paid_at: null,
      notes: (form.get("notes") as string) || null,
    };

    setSaving(true);
    const result = await createInvoiceAction(payload);
    setSaving(false);

    if (result.ok) {
      toast.success("Invoice created");
      onOpenChange(false);
      onCreated?.();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create invoice</DialogTitle>
          <DialogDescription>Generate an invoice from a project or create one manually.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>From project</Label>
              <Select value={selectedProjectId} onValueChange={handleProjectChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional — select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Manual entry</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.project_name} · {formatCurrency(p.net_amount + p.bonus, currency)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice_number">Invoice number</Label>
              <Input
                id="invoice_number"
                name="invoice_number"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>
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
              <Label>Amount ({currency})</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Due in (days)</Label>
              <Input type="number" name="due_in_days" min={1} defaultValue={14} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" placeholder="Payment details, milestones covered..." />
            </div>
          </div>

          {/* Recurring invoice option */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded border-input"
              />
              Make this a recurring invoice
            </label>
            {isRecurring && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select name="recurring_frequency" defaultValue="monthly">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Max runs (optional)</Label>
                  <Input type="number" name="recurring_max_runs" min={1} placeholder="Unlimited" />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || amount <= 0}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Create invoice
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
