"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Bell,
  Plus,
  Trash2,
  Webhook,
  MessageSquare,
  Send,
  TestTube,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/components/i18n-provider";
import {
  createWebhookAction,
  deleteWebhookAction,
  updateWebhookAction,
} from "@/app/actions";
import type { WebhookConfig, WebhookEventType } from "@/lib/types";

const EVENT_OPTIONS: { value: WebhookEventType; label: string }[] = [
  { value: "lead.created", label: "New Lead Added" },
  { value: "deal.won", label: "Deal Won" },
  { value: "invoice.paid", label: "Invoice Paid" },
  { value: "invoice.overdue", label: "Invoice Overdue" },
  { value: "project.created", label: "Project Created" },
];

const TYPE_META: Record<string, { label: string; icon: typeof Webhook; color: string }> = {
  slack: { label: "Slack", icon: MessageSquare, color: "bg-[#4A154B] text-white" },
  whatsapp: { label: "WhatsApp", icon: Send, color: "bg-[#25D366] text-white" },
  custom: { label: "Custom HTTP", icon: Webhook, color: "bg-slate-600 text-white" },
};

interface NotificationWebhooksProps {
  webhooks: WebhookConfig[];
  isDemo: boolean;
}

export function NotificationWebhooks({ webhooks, isDemo }: NotificationWebhooksProps) {
  const { t } = useI18n();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [testingId, setTestingId] = React.useState<string | null>(null);

  // Form state
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<"slack" | "whatsapp" | "custom">("slack");
  const [url, setUrl] = React.useState("");
  const [events, setEvents] = React.useState<WebhookEventType[]>(["deal.won"]);

  function resetForm() {
    setName("");
    setType("slack");
    setUrl("");
    setEvents(["deal.won"]);
  }

  function toggleEvent(event: WebhookEventType) {
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  }

  async function handleAdd() {
    if (!name.trim() || !url.trim()) {
      toast.error("Name and URL are required");
      return;
    }
    if (events.length === 0) {
      toast.error("Select at least one event");
      return;
    }
    setSaving(true);
    try {
      const result = await createWebhookAction({
        name: name.trim(),
        type,
        url: url.trim(),
        events,
      });
      if (!result.ok) throw new Error(result.error);
      toast.success("Webhook added");
      resetForm();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add webhook");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest(webhook: WebhookConfig) {
    setTestingId(webhook.id);
    try {
      const testPayload = {
        event: "lead.created" as WebhookEventType,
        timestamp: new Date().toISOString(),
        data: {
          name: "Test Lead",
          company: "Test Company",
          source: "Sardar CRM Test",
        },
      };

      let body: string;
      if (webhook.type === "slack") {
        body = JSON.stringify({
          blocks: [
            {
              type: "header",
              text: { type: "plain_text", text: "🧪 Test Notification", emoji: true },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "This is a test notification from Sardar CRM. If you see this, your webhook is working!",
              },
            },
          ],
        });
      } else {
        body = JSON.stringify(testPayload);
      }

      const res = await fetch(webhook.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(10_000),
      });

      if (res.ok) {
        toast.success("Test notification sent!");
      } else {
        toast.error(`HTTP ${res.status}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test failed");
    } finally {
      setTestingId(null);
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteWebhookAction(id);
    if (result.ok) toast.success("Webhook removed");
    else toast.error(result.error);
  }

  async function handleToggle(webhook: WebhookConfig) {
    const result = await updateWebhookAction(webhook.id, { is_active: !webhook.is_active });
    if (!result.ok) toast.error(result.error);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Notification Webhooks</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Get notified on Slack, WhatsApp, or custom endpoints when key events happen
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" disabled={isDemo}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Notification Webhook</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., #sales-alerts"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slack">Slack</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="custom">Custom HTTP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  {type === "slack"
                    ? "Slack Webhook URL"
                    : type === "whatsapp"
                      ? "WhatsApp API URL"
                      : "Endpoint URL"}
                </Label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={
                    type === "slack"
                      ? "https://hooks.slack.com/services/..."
                      : type === "whatsapp"
                        ? "https://graph.facebook.com/..."
                        : "https://your-api.com/webhooks"
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Events to notify</Label>
                <div className="grid grid-cols-1 gap-2">
                  {EVENT_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-center gap-2 rounded-lg border p-2 cursor-pointer hover:bg-accent"
                    >
                      <Checkbox
                        checked={events.includes(opt.value)}
                        onCheckedChange={() => toggleEvent(opt.value)}
                      />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAdd} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Add Webhook
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {webhooks.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Bell className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              No webhooks configured. Add one to get notified about key CRM events.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Supports Slack, WhatsApp (Meta API), and custom HTTP endpoints.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {webhooks.map((wh) => {
              const meta = TYPE_META[wh.type] ?? TYPE_META.custom;
              const Icon = meta.icon;
              return (
                <div
                  key={wh.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{wh.name}</p>
                      <Badge variant={wh.is_active ? "default" : "secondary"} className="text-[10px]">
                        {wh.is_active ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {wh.events.map((e) => EVENT_OPTIONS.find((o) => o.value === e)?.label).join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7"
                      onClick={() => handleTest(wh)}
                      disabled={testingId === wh.id}
                    >
                      {testingId === wh.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <TestTube className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Switch
                      checked={wh.is_active}
                      onCheckedChange={() => handleToggle(wh)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-destructive"
                      onClick={() => handleDelete(wh.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {isDemo && (
          <p className="mt-3 text-xs text-muted-foreground">
            Webhooks are stored locally in demo mode. Connect Supabase for persistent storage.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
