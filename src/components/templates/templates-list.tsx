"use client";

import * as React from "react";
import { toast } from "sonner";
import { Copy, Pencil, Plus, Trash2, Loader2 } from "lucide-react";
import { saveTemplateAction, deleteTemplateAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { Mail } from "lucide-react";
import type { EmailTemplate } from "@/lib/types";

const VARIABLES = [
  "{{client_name}}",
  "{{project_name}}",
  "{{your_name}}",
  "{{website_link}}",
  "{{invoice_number}}",
  "{{amount}}",
  "{{due_date}}",
];

const CATEGORIES = ["follow_up", "nurture", "delivery", "billing", "other"] as const;

export function TemplatesList({ templates }: { templates: EmailTemplate[] }) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<EmailTemplate | null>(null);
  const [saving, setSaving] = React.useState(false);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(t: EmailTemplate) {
    setEditing(t);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const body = String(form.get("body") ?? "").trim();
    if (!name || !body) {
      toast.error("Name and body are required");
      return;
    }
    setSaving(true);
    const result = await saveTemplateAction({
      name,
      category: (form.get("category") as string) || "follow_up",
      subject: (form.get("subject") as string) || null,
      body,
      is_default: false,
    });
    setSaving(false);
    if (result.ok) {
      toast.success(editing ? "Template updated" : "Template created");
      setDialogOpen(false);
    } else {
      toast.error(result.error);
    }
  }

  async function handleDelete(t: EmailTemplate) {
    if (!window.confirm(`Delete template "${t.name}"?`)) return;
    const result = await deleteTemplateAction(t.id);
    if (result.ok) toast.success("Template deleted");
    else toast.error(result.error);
  }

  async function copyBody(body: string) {
    await navigator.clipboard.writeText(body);
    toast.success("Copied to clipboard");
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={openNew}>
          <Plus /> New template
        </Button>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No email templates"
          description="Create reusable follow-up, nurture and delivery templates."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id} className="flex flex-col">
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold">{t.name}</p>
                    {t.is_default && <Badge variant="secondary">Default</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs capitalize text-muted-foreground">{t.category}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(t)}>
                    <Pencil />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    onClick={() => handleDelete(t)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-2">
                {t.subject && <p className="text-xs font-medium text-muted-foreground">Subject: {t.subject}</p>}
                <p className="line-clamp-4 flex-1 whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                  {t.body}
                </p>
                <Button size="sm" variant="outline" onClick={() => copyBody(t.body)}>
                  <Copy /> Copy body
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit template" : "New template"}</DialogTitle>
            <DialogDescription>Use variables like {"{{client_name}}"} to personalize.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" name="name" required defaultValue={editing?.name ?? ""} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select name="category" defaultValue={editing?.category ?? "follow_up"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" name="subject" defaultValue={editing?.subject ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Body *</Label>
              <Textarea id="body" name="body" rows={8} required defaultValue={editing?.body ?? ""} />
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Available variables:</p>
              <div className="flex flex-wrap gap-1.5">
                {VARIABLES.map((v) => (
                  <Badge key={v} variant="outline" className="font-mono text-[10px]">
                    {v}
                  </Badge>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Save changes" : "Create template"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
