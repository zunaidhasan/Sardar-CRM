"use client";

import * as React from "react";
import { Clock, Eye, Mail, MousePointerClick, Send, StickyNote, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { timeAgo } from "@/lib/utils";
import { ACTIVITY_TYPE_LABELS } from "@/lib/constants";
import type { Activity } from "@/lib/types";

// ---------------------------------------------------------------------------
// Compact activity timeline for a single lead.
// Shows the last 3 activities inline, with a popover to see more.
// ---------------------------------------------------------------------------

const ACTIVITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  note: StickyNote,
  email: Mail,
  call: Clock,
  meeting: Clock,
  follow_up: Send,
  status_change: ArrowRightLeft,
  system: Clock,
};

export function LeadActivityTimeline({
  activities,
  opens = 0,
  clicks = 0,
}: {
  activities: Activity[];
  opens?: number;
  clicks?: number;
}) {
  const last3 = activities.slice(0, 3);
  const remaining = activities.slice(3);

  if (activities.length === 0 && opens === 0 && clicks === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {/* Inline activity dots */}
      <div className="flex items-center gap-1">
        {last3.map((a) => {
          const Icon = ACTIVITY_ICONS[a.activity_type] ?? Clock;
          return (
            <div
              key={a.id}
              className="group relative"
              title={`${ACTIVITY_TYPE_LABELS[a.activity_type] ?? a.activity_type}: ${a.subject ?? ""}`}
            >
              <Icon className="h-3 w-3 text-muted-foreground/60" />
            </div>
          );
        })}
      </div>

      {/* Open/Click badges */}
      {(opens > 0 || clicks > 0) && (
        <div className="flex items-center gap-1">
          {opens > 0 && (
            <span className="flex items-center gap-0.5 rounded bg-emerald-100 px-1 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <Eye className="h-2.5 w-2.5" />
              {opens}
            </span>
          )}
          {clicks > 0 && (
            <span className="flex items-center gap-0.5 rounded bg-blue-100 px-1 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <MousePointerClick className="h-2.5 w-2.5" />
              {clicks}
            </span>
          )}
        </div>
      )}

      {/* Full timeline popover */}
      {remaining.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-muted-foreground">
              +{remaining.length} more
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Activity History</p>
              {activities.map((a) => {
                const Icon = ACTIVITY_ICONS[a.activity_type] ?? Clock;
                return (
                  <div key={a.id} className="flex items-start gap-2 text-xs">
                    <Icon className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{a.subject ?? "Activity"}</p>
                      {a.body && (
                        <p className="truncate text-muted-foreground">{a.body}</p>
                      )}
                    </div>
                    <span suppressHydrationWarning className="shrink-0 text-muted-foreground/60">
                      {timeAgo(a.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
