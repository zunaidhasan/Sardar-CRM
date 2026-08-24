"use client";

import * as React from "react";
import { Bell, Check, CheckCircle2, Clock, Mail, Rocket, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Client } from "@/lib/types";

// ---------------------------------------------------------------------------
// In-App Notification Center
//
// Shows persistent notifications for:
//   - Overdue follow-ups
//   - Due-today follow-ups
//   - System events (imports completed, etc.)
//
// Replaces the unreliable browser Notification API with a reliable
// in-app bell icon + dropdown panel.
// ---------------------------------------------------------------------------

export interface AppNotification {
  id: string;
  type: "follow_up_overdue" | "follow_up_today" | "system" | "email_sent";
  title: string;
  message: string;
  href?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationCenterProps {
  overdueLeads: Client[];
  dueTodayLeads: Client[];
}

export function NotificationCenter({
  overdueLeads,
  dueTodayLeads,
}: NotificationCenterProps) {
  const [open, setOpen] = React.useState(false);
  const [dismissed, setDismissed] = React.useState<Set<string>>(new Set());

  // Build notifications from lead data
  const notifications: AppNotification[] = React.useMemo(() => {
    const items: AppNotification[] = [];

    for (const lead of overdueLeads) {
      if (dismissed.has(`overdue-${lead.id}`)) continue;
      items.push({
        id: `overdue-${lead.id}`,
        type: "follow_up_overdue",
        title: `Follow-up overdue: ${lead.name}`,
        message: `${lead.company ?? "Unknown company"} — was due ${lead.next_follow_up_date}`,
        href: `/clients/${lead.id}`,
        read: false,
        createdAt: lead.next_follow_up_date ?? new Date().toISOString(),
      });
    }

    for (const lead of dueTodayLeads) {
      if (dismissed.has(`today-${lead.id}`)) continue;
      items.push({
        id: `today-${lead.id}`,
        type: "follow_up_today",
        title: `Follow-up today: ${lead.name}`,
        message: `${lead.company ?? "Unknown company"} — scheduled for today`,
        href: `/clients/${lead.id}`,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    return items;
  }, [overdueLeads, dueTodayLeads, dismissed]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  function handleDismiss(id: string) {
    setDismissed((prev) => new Set(prev).add(id));
  }

  function handleDismissAll() {
    const allIds = new Set(notifications.map((n) => n.id));
    setDismissed(allIds);
  }

  return (
    <div className="relative">
      {/* Bell button */}
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        onClick={() => setOpen(!open)}
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown panel */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border bg-background shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Notifications</h3>
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleDismissAll}
                >
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Dismiss all
                </Button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  <Bell className="mx-auto mb-2 h-6 w-6 opacity-40" />
                  All caught up!
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-start gap-3 border-b px-4 py-3 transition-colors hover:bg-muted/30",
                      n.read && "opacity-60"
                    )}
                  >
                    <div className="mt-0.5">
                      {n.type === "follow_up_overdue" ? (
                        <Clock className="h-4 w-4 text-rose-500" />
                      ) : n.type === "follow_up_today" ? (
                        <Mail className="h-4 w-4 text-amber-500" />
                      ) : (
                        <Rocket className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
                    </div>
                    <button
                      onClick={() => handleDismiss(n.id)}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                      aria-label="Dismiss"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t px-4 py-2 text-center">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  setOpen(false);
                }}
              >
                View all leads →
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
