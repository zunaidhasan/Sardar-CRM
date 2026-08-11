"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarRange, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/components/i18n-provider";
import { EVENT_KIND_META, inMonth, type CalendarEvent } from "@/lib/calendar";
import { downloadICS } from "@/lib/ics";
import { cn } from "@/lib/utils";

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun (Date.getDay(): 0=Sun)

function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayKey(): string {
  return toKey(new Date());
}

export function CalendarView({ events }: { events: CalendarEvent[] }) {
  const { t, locale } = useI18n();

  const now = new Date();
  const [year, setYear] = React.useState(now.getFullYear());
  const [month, setMonth] = React.useState(now.getMonth());
  const [selected, setSelected] = React.useState<string | null>(todayKey());

  const localeTag = locale === "bn" ? "bn-BD" : "en-US";

  const monthEvents = events.filter((e) => inMonth(e.date, year, month));
  const byDate = new Map<string, CalendarEvent[]>();
  for (const e of monthEvents) {
    const list = byDate.get(e.date) ?? [];
    list.push(e);
    byDate.set(e.date, list);
  }

  const deadlines = monthEvents.filter((e) => e.kind === "deadline").length;
  const followUps = monthEvents.filter((e) => e.kind === "follow_up").length;
  const milestones = monthEvents.filter((e) => e.kind === "milestone").length;
  const invoices = monthEvents.filter((e) => e.kind === "invoice").length;
  const hours = monthEvents
    .filter((e) => e.kind === "time")
    .reduce((s, e) => s + (e.hours ?? 0), 0);

  // Grid: first day of the month aligned to a Monday-starting week.
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Mon=0
  const gridStart = new Date(year, month, 1 - startOffset);
  const cells: Date[] = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  const monthLabel = new Intl.DateTimeFormat(localeTag, { month: "long", year: "numeric" }).format(
    first,
  );
  const weekdayLabels = WEEKDAYS.map((d) =>
    new Intl.DateTimeFormat(localeTag, { weekday: "short" }).format(new Date(2026, 0, 4 + d)),
  );

  const selectedEvents = selected ? (byDate.get(selected) ?? []) : [];

  function go(offset: number) {
    const d = new Date(year, month + offset, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  function handleExport() {
    const fileDate = `${year}-${String(month + 1).padStart(2, "0")}`;
    downloadICS(monthEvents, `sardar-crm-${fileDate}.ics`, `Sardar CRM ${monthLabel}`);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" onClick={() => go(-1)} aria-label={t("Previous")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); setSelected(todayKey()); }}>
            {t("Today")}
          </Button>
          <Button variant="outline" size="icon" onClick={() => go(1)} aria-label={t("Next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="ml-2 text-lg font-semibold tracking-tight">{monthLabel}</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden flex-wrap items-center gap-x-3 gap-y-1 md:flex">
            {(Object.keys(EVENT_KIND_META) as Array<keyof typeof EVENT_KIND_META>).map((k) => (
              <span key={k} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn("h-2 w-2 rounded-full", EVENT_KIND_META[k].dot)} />
                {t(EVENT_KIND_META[k].label)}
              </span>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={monthEvents.length === 0}>
            <Download className="h-4 w-4" />
            {t("Export ICS")}
          </Button>
        </div>
      </div>

      {/* Month stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatChip label={t("Deadlines")} value={String(deadlines)} tone="emerald" />
        <StatChip label={t("Follow-ups")} value={String(followUps)} tone="sky" />
        <StatChip label={t("Milestones")} value={String(milestones)} tone="violet" />
        <StatChip label={t("Invoices")} value={String(invoices)} tone="amber" />
        <StatChip
          label={t("Time logged")}
          value={`${Math.round(hours * 100) / 100}h`}
          tone="slate"
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {/* Grid */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border">
            {weekdayLabels.map((w) => (
              <div
                key={w}
                className="bg-muted/40 px-2 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {w}
              </div>
            ))}
            {cells.map((d) => {
              const key = toKey(d);
              const inView = d.getMonth() === month;
              const isToday = key === todayKey();
              const isSelected = key === selected;
              const dayEvents = byDate.get(key) ?? [];
              return (
                <button
                  key={key}
                  suppressHydrationWarning
                  onClick={() => setSelected(key)}
                  className={cn(
                    "flex min-h-[72px] flex-col items-stretch gap-1 bg-card p-1 text-left transition-colors hover:bg-accent/50 sm:min-h-[92px] sm:p-1.5",
                    !inView && "bg-muted/30 opacity-50",
                    isSelected && "ring-2 ring-inset ring-primary",
                  )}
                >
                  <span className="flex items-center justify-between">
                    {/* suppressHydrationWarning: isToday/todayKey derive from
                        Date.now() and can flip between server and client. */}
                    <span
                      suppressHydrationWarning
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                        isToday && "bg-primary text-primary-foreground",
                        !isToday && "text-muted-foreground",
                      )}
                    >
                      {d.getDate()}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="hidden text-[10px] text-muted-foreground sm:block">
                        {dayEvents.length}
                      </span>
                    )}
                  </span>
                  <span className="flex flex-col gap-0.5 overflow-hidden">
                    {dayEvents.slice(0, 3).map((e) => (
                      <span
                        key={e.id}
                        className={cn(
                          "truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight text-white sm:text-[11px]",
                          EVENT_KIND_META[e.kind].chip,
                        )}
                      >
                        {e.title}
                      </span>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="px-1 text-[10px] font-medium text-muted-foreground">
                        +{dayEvents.length - 3} more
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected day details */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-muted-foreground" />
            {/* suppressHydrationWarning: selected defaults to today, which is
                computed from Date.now() on each render side. */}
            <h3 suppressHydrationWarning className="text-sm font-semibold">
              {selected
                ? new Intl.DateTimeFormat(localeTag, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  }).format(new Date(`${selected}T00:00:00`))
                : "—"}
            </h3>
            <span className="text-xs text-muted-foreground">({selectedEvents.length})</span>
          </div>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("No events on this day")}
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {selectedEvents.map((e) => (
                <li key={e.id}>
                  {e.href ? (
                    <Link
                      href={e.href}
                      className="flex items-start gap-2.5 rounded-lg border p-2.5 transition-colors hover:bg-accent"
                    >
                      <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", EVENT_KIND_META[e.kind].dot)} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{e.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {t(EVENT_KIND_META[e.kind].label)}
                          {e.hours != null ? ` · ${e.hours}h` : ""}
                          {e.subtitle ? ` · ${e.subtitle}` : ""}
                        </span>
                      </span>
                    </Link>
                  ) : (
                    <div className="flex items-start gap-2.5 rounded-lg border p-2.5">
                      <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", EVENT_KIND_META[e.kind].dot)} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{e.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {t(EVENT_KIND_META[e.kind].label)}
                          {e.hours != null ? ` · ${e.hours}h` : ""}
                        </span>
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatChip({
  label,
  value,
  tone,
  className,
}: {
  label: string;
  value: string;
  tone: "emerald" | "sky" | "violet" | "amber" | "slate";
  className?: string;
}) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    sky: "text-sky-600 dark:text-sky-400",
    violet: "text-violet-600 dark:text-violet-400",
    amber: "text-amber-600 dark:text-amber-400",
    slate: "text-slate-600 dark:text-slate-400",
  };
  return (
    <div className={cn("rounded-lg border bg-card p-3", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-lg font-bold", tones[tone])}>{value}</p>
    </div>
  );
}
