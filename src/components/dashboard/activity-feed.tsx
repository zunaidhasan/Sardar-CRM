"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRightLeft,
  CalendarClock,
  CalendarDays,
  Gavel,
  Mail,
  Phone,
  Receipt,
  Send,
  Sparkles,
  StickyNote,
  Upload,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ACTIVITY_TYPE_LABELS } from "@/lib/constants";
import { cn, initials, timeAgo } from "@/lib/utils";
import { startOfDay, startOfMonth, startOfWeek } from "date-fns";
import type { ActivityType } from "@/lib/types";
import type { ActivityFeedItem } from "@/lib/activity-feed";

// Icon + tinted chip per activity type, so the feed is scannable at a glance.
const ACTIVITY_ICONS: Record<
  ActivityType,
  { icon: React.ComponentType<{ className?: string }>; chip: string }
> = {
  note: { icon: StickyNote, chip: "bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400" },
  email: { icon: Mail, chip: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400" },
  call: { icon: Phone, chip: "bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400" },
  meeting: { icon: CalendarDays, chip: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400" },
  follow_up: { icon: CalendarClock, chip: "bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400" },
  bid: { icon: Gavel, chip: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" },
  proposal_sent: { icon: Send, chip: "bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-400" },
  status_change: { icon: ArrowRightLeft, chip: "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400" },
  invoice: { icon: Receipt, chip: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400" },
  import: { icon: Upload, chip: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
  system: { icon: Sparkles, chip: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
};

// Deterministic tint for team-member initials avatars (they have no photos).
const AVATAR_TINTS = [
  "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
] as const;

function avatarTint(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_TINTS[h % AVATAR_TINTS.length]!;
}

// Area filter chips: "All" plus the three focus areas. Invoices/imports only
// show under All (the chip value doubles as the entity_type filter).
type FeedFilter = "all" | "opportunity" | "project" | "client";

const FILTER_CHIPS: Array<{ value: FeedFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "opportunity", label: "Deals" },
  { value: "project", label: "Projects" },
  { value: "client", label: "Clients" },
];

// Date-range filter chips. "all" = no date constraint (default).
type FeedRange = "all" | "today" | "week" | "month";

const RANGE_CHIPS: Array<{ value: FeedRange; label: string }> = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

// Sentence tail for empty states, e.g. "No deal activity this week."
const RANGE_SUFFIX: Record<FeedRange, string> = {
  all: "yet.",
  today: "today.",
  week: "this week.",
  month: "this month.",
};

// Noun for empty-state messages: "No {label} {suffix}".
const EMPTY_LABEL: Record<FeedFilter, string> = {
  all: "activity",
  opportunity: "deal activity",
  project: "project activity",
  client: "client activity",
};  // Start-of-period cutoff for each range (weeks start Monday). Null = no filter.
  // The default range is "all" (returns null), so no Date.now() runs during the
  // initial render — the time-based cutoffs are only computed after the user
  // picks a range, post-hydration. That keeps server/client HTML identical.
  function rangeCutoff(range: FeedRange): Date | null {
  switch (range) {
    case "today":
      return startOfDay(new Date());
    case "week":
      return startOfWeek(new Date(), { weekStartsOn: 1 });
    case "month":
      return startOfMonth(new Date());
    default:
      return null;
  }
}

// Shared pill button for both chip rows.
function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function ActivityFeed({
  items,
  avatarUrl,
  userName,
  limit = 8,
}: {
  items: ActivityFeedItem[];
  avatarUrl?: string | null;
  userName?: string | null;
  limit?: number;
}) {
  const [filter, setFilter] = React.useState<FeedFilter>("all");
  const [range, setRange] = React.useState<FeedRange>("all");

  // Date range applies first; area chip counts reflect the selected period so
  // the numbers always match what the chips can show.
  const cutoff = rangeCutoff(range);
  const ranged = cutoff
    ? items.filter((i) => new Date(i.createdAt).getTime() >= cutoff.getTime())
    : items;
  const counts: Record<FeedFilter, number> = {
    all: ranged.length,
    opportunity: ranged.filter((i) => i.entityType === "opportunity").length,
    project: ranged.filter((i) => i.entityType === "project").length,
    client: ranged.filter((i) => i.entityType === "client").length,
  };
  const visible =
    filter === "all" ? ranged : ranged.filter((i) => i.entityType === filter);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>Latest client &amp; project actions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <>
            {/* Area filter chips with live counts */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {FILTER_CHIPS.map((c) => (
                  <Chip key={c.value} active={filter === c.value} onClick={() => setFilter(c.value)}>
                    {c.label}
                    <span
                      className={cn(
                        "tabular-nums",
                        filter === c.value
                          ? "text-primary-foreground/75"
                          : "text-muted-foreground/70",
                      )}
                    >
                      {counts[c.value]}
                    </span>
                  </Chip>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">
                  Period
                </span>
                {RANGE_CHIPS.map((c) => (
                  <Chip key={c.value} active={range === c.value} onClick={() => setRange(c.value)}>
                    {c.label}
                  </Chip>
                ))}
              </div>
            </div>

            {visible.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No {EMPTY_LABEL[filter]} {RANGE_SUFFIX[range]}
              </p>
            ) : (
              <div className="space-y-1">
                {visible.slice(0, limit).map((a) => {
              const meta = ACTIVITY_ICONS[a.activityType] ?? ACTIVITY_ICONS.system;
              const Icon = meta.icon;
              const rowClass =
                "flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-accent/60";
              // The viewer's own actions keep their photo avatar; team members'
              // actions get a deterministic-tinted initials avatar instead.
              const isViewer =
                !a.actorName ||
                a.actorName.toLowerCase() === (userName ?? "").trim().toLowerCase();
              const actorName = isViewer ? null : a.actorName;
              const content = (
                <>
                  {isViewer ? (
                    <Avatar className="mt-0.5 h-7 w-7 shrink-0">
                      {avatarUrl && <AvatarImage src={avatarUrl} alt={userName ?? "User"} />}
                      <AvatarFallback className="text-[10px]">
                        {initials(userName)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <Avatar
                      className="mt-0.5 h-7 w-7 shrink-0"
                      title={`${actorName} · ${ACTIVITY_TYPE_LABELS[a.activityType] ?? a.activityType}`}
                    >
                      <AvatarFallback
                        className={cn("text-[10px]", avatarTint(actorName ?? ""))}
                      >
                        {initials(actorName)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${meta.chip}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.subject ?? "Activity"}</p>
                    {a.body && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {a.body}
                      </p>
                    )}
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      {actorName && (
                        <>
                          <span className="shrink-0 font-medium text-foreground/70">
                            {actorName}
                          </span>
                          <span className="shrink-0 text-muted-foreground/40">·</span>
                        </>
                      )}
                      <span className="shrink-0">
                        {ACTIVITY_TYPE_LABELS[a.activityType] ?? a.activityType}
                      </span>
                      {a.entityLabel && (
                        <>
                          <span className="shrink-0 text-muted-foreground/40">·</span>
                          <span className="truncate font-medium text-foreground/70">
                            {a.entityLabel}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  {/* suppressHydrationWarning: timeAgo recomputes on the client
                      (a few seconds later) and can legitimately differ from the
                      server's string — e.g. "2 minutes ago" -> "3 minutes ago". */}
                  <span suppressHydrationWarning className="shrink-0 text-xs text-muted-foreground">
                    {timeAgo(a.createdAt)}
                  </span>
                </>
              );
                  return a.href ? (
                    <Link key={a.id} href={a.href} className={rowClass}>
                      {content}
                    </Link>
                  ) : (
                    <div key={a.id} className={rowClass}>
                      {content}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
