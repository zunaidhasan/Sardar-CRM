"use client";

import * as React from "react";
import { History, User, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AuditEntry } from "@/lib/audit-log";

// ---------------------------------------------------------------------------
// Audit Log Panel
//
// Shows the change history for a specific lead. Displays who changed what,
// when, and the old/new values. Used on the lead detail page.
// ---------------------------------------------------------------------------

function timeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

function getActionColor(action: string): string {
  switch (action) {
    case "created":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400";
    case "status_change":
    case "updated":
      return "bg-sky-100 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400";
    case "email_sent":
      return "bg-violet-100 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400";
    case "follow_up":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400";
    case "deleted":
      return "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-950/30 dark:text-slate-400";
  }
}

export function AuditLogPanel({
  entries,
  maxEntries = 20,
}: {
  entries: AuditEntry[];
  maxEntries?: number;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const displayed = expanded ? entries : entries.slice(0, maxEntries);

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Change History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" />
          Change History
          <Badge variant="outline" className="ml-auto text-xs">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayed.map((entry) => (
            <div
              key={entry.id}
              className="flex gap-3 rounded-lg border p-3 text-sm"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                <User className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{entry.userName}</span>
                  <span className="text-muted-foreground">{entry.action}</span>
                  {entry.field !== "general" && (
                    <Badge
                      variant="outline"
                      className={cn("text-xs", getActionColor(entry.action))}
                    >
                      {entry.field}
                    </Badge>
                  )}
                </div>
                {(entry.oldValue || entry.newValue) && (
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    {entry.oldValue && (
                      <span className="rounded bg-muted px-1.5 py-0.5 line-through">
                        {entry.oldValue}
                      </span>
                    )}
                    {entry.oldValue && entry.newValue && (
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    )}
                    {entry.newValue && (
                      <span className="rounded bg-muted px-1.5 py-0.5 font-medium">
                        {entry.newValue}
                      </span>
                    )}
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {timeAgo(entry.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {entries.length > maxEntries && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="mt-3 text-sm text-primary hover:underline"
          >
            Show all {entries.length} entries
          </button>
        )}
        {expanded && entries.length > maxEntries && (
          <button
            onClick={() => setExpanded(false)}
            className="mt-3 text-sm text-primary hover:underline"
          >
            Show less
          </button>
        )}
      </CardContent>
    </Card>
  );
}
