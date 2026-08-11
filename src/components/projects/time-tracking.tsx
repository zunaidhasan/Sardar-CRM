"use client";

import * as React from "react";
import { toast } from "sonner";
import { CheckSquare, Clock, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addTimeEntryAction,
  deleteTimeEntryAction,
  updateTimeEntryAction,
} from "@/app/actions";
import { useI18n } from "@/components/i18n-provider";
import { formatDate } from "@/lib/utils";
import type { TimeEntry } from "@/lib/types";

// Local-time YYYY-MM-DD (avoids UTC shifting the date for UTC+ timezones
// like Bangladesh between midnight and 6am).
function localISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayISO(): string {
  return localISO(new Date());
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function TimeTracking({
  projectId,
  entries,
  teamMembers,
}: {
  projectId: string;
  entries: TimeEntry[];
  teamMembers: { name: string }[];
}) {
  const { t } = useI18n();

  const total = entries.reduce((s, e) => s + e.hours, 0);
  const billableHours = entries.filter((e) => e.billable).reduce((s, e) => s + e.hours, 0);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
  const weekHours = entries
    .filter((e) => e.date >= localISO(weekStart))
    .reduce((s, e) => s + e.hours, 0);

  // Add form state
  const [date, setDate] = React.useState(todayISO());
  const [hours, setHours] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [assignee, setAssignee] = React.useState("");
  const [billable, setBillable] = React.useState(true);
  const [adding, setAdding] = React.useState(false);

  // Editing state: id -> draft
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editHours, setEditHours] = React.useState("");
  const [editDesc, setEditDesc] = React.useState("");
  const [editAssignee, setEditAssignee] = React.useState("");
  const [editBillable, setEditBillable] = React.useState(true);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const h = Number(hours);
    if (!Number.isFinite(h) || h <= 0 || h > 24) {
      toast.error(t("Hours must be between 0 and 24"));
      return;
    }
    setAdding(true);
    const result = await addTimeEntryAction(projectId, {
      date,
      hours: h,
      description: description.trim() || null,
      assignee: assignee.trim() || null,
      billable,
    });
    setAdding(false);
    if (result.ok) {
      setHours("");
      setDescription("");
      setAssignee("");
      setBillable(true);
      toast.success(t("Time logged"));
    } else {
      toast.error(result.error);
    }
  }

  function startEdit(e: TimeEntry) {
    setEditingId(e.id);
    setEditHours(String(e.hours));
    setEditDesc(e.description ?? "");
    setEditAssignee(e.assignee ?? "");
    setEditBillable(e.billable);
  }

  async function handleSaveEdit(e: TimeEntry) {
    const h = Number(editHours);
    if (!Number.isFinite(h) || h <= 0 || h > 24) {
      toast.error(t("Hours must be between 0 and 24"));
      return;
    }
    setSavingId(e.id);
    const result = await updateTimeEntryAction(projectId, e.id, {
      hours: h,
      description: editDesc.trim() || null,
      assignee: editAssignee.trim() || null,
      billable: editBillable,
    });
    setSavingId(null);
    if (result.ok) {
      setEditingId(null);
      toast.success(t("Entry updated"));
    } else {
      toast.error(result.error);
    }
  }

  async function handleDelete(e: TimeEntry) {
    if (!window.confirm(t("Delete this time entry?"))) return;
    setDeletingId(e.id);
    const result = await deleteTimeEntryAction(projectId, e.id);
    setDeletingId(null);
    if (!result.ok) toast.error(result.error);
  }

  const memberNames = Array.from(new Set(teamMembers.map((m) => m.name)));

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {t("Time tracking")}
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("Total hours")}:{" "}
            <span className="font-semibold text-foreground">{round2(total)}h</span>
            {" · "}
            {t("Billable")}: <span className="font-medium">{round2(billableHours)}h</span>
            {" · "}
            {t("Non-billable")}: <span className="font-medium">{round2(total - billableHours)}h</span>
            {" · "}
            {t("This week")}:{" "}
            <span suppressHydrationWarning className="font-medium">
              {round2(weekHours)}h
            </span>
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add entry */}
        <form onSubmit={handleAdd} className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-12">
          <div className="sm:col-span-2">
            <Label htmlFor="tt-date" className="text-xs text-muted-foreground">
              {t("Date")}
            </Label>
            {/* suppressHydrationWarning: the default value is "today", derived
                from Date.now() — it can differ if hydration crosses midnight. */}
            <Input
              id="tt-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1"
              suppressHydrationWarning
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="tt-hours" className="text-xs text-muted-foreground">
              {t("Hours")}
            </Label>
            <Input
              id="tt-hours"
              type="number"
              min="0.25"
              max="24"
              step="0.25"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="2.5"
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-3">
            <Label htmlFor="tt-assignee" className="text-xs text-muted-foreground">
              {t("Assignee")}
            </Label>
            <Input
              id="tt-assignee"
              list="tt-member-list"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="—"
              className="mt-1"
            />
            <datalist id="tt-member-list">
              {memberNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>
          <div className="sm:col-span-3">
            <Label htmlFor="tt-desc" className="text-xs text-muted-foreground">
              {t("Description")}
            </Label>
            <Input
              id="tt-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("Task, e.g. Stripe webhooks")}
              className="mt-1"
            />
          </div>
          <div className="flex items-end gap-3 sm:col-span-2">
            <label className="flex items-center gap-1.5 pb-2 text-xs font-medium">
              <Checkbox checked={billable} onCheckedChange={(v) => setBillable(v === true)} />
              {t("Billable")}
            </label>
            <Button type="submit" size="sm" className="ml-auto" disabled={adding || !hours}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {t("Log time")}
            </Button>
          </div>
        </form>

        {/* Entries */}
        {sorted.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("No time logged yet")}</p>
        )}
        <div className="space-y-1.5">
          {sorted.map((e) => {
            const editing = editingId === e.id;
            return (
              <div
                key={e.id}
                className="group flex items-center gap-3 rounded-lg border p-2.5 transition-colors hover:bg-accent/40"
              >
                {!editing ? (
                  <>
                    <div className="flex w-24 shrink-0 flex-col">
                      <span className="text-sm font-semibold">{formatDate(e.date)}</span>
                      <span className="text-xs text-muted-foreground">{round2(e.hours)}h</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e.description || t("Time entry")}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {e.assignee ?? "—"} · {e.billable ? t("Billable") : t("Non-billable")}
                      </p>
                    </div>
                    <button
                      onClick={() => startEdit(e)}
                      className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                      aria-label={t("Edit")}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(e)}
                      disabled={deletingId === e.id}
                      className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 disabled:opacity-40"
                      aria-label={t("Delete")}
                    >
                      {deletingId === e.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </>
                ) : (
                  <div className="flex w-full flex-wrap items-center gap-2">
                    <Input
                      type="number"
                      min="0.25"
                      max="24"
                      step="0.25"
                      value={editHours}
                      onChange={(e) => setEditHours(e.target.value)}
                      className="w-20"
                      aria-label={t("Hours")}
                    />
                    <Input
                      list="tt-member-list"
                      value={editAssignee}
                      onChange={(e) => setEditAssignee(e.target.value)}
                      className="w-32"
                      aria-label={t("Assignee")}
                    />
                    <Input
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="min-w-40 flex-1"
                      aria-label={t("Description")}
                    />
                    <label className="flex items-center gap-1.5 text-xs font-medium">
                      <Checkbox checked={editBillable} onCheckedChange={(v) => setEditBillable(v === true)} />
                      {t("Billable")}
                    </label>
                    <div className="ml-auto flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} aria-label={t("Cancel")}>
                        <X className="h-4 w-4" />
                      </Button>
                      <Button size="sm" onClick={() => handleSaveEdit(e)} disabled={savingId === e.id}>
                        {savingId === e.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckSquare className="h-4 w-4" />
                        )}
                        {t("Save")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
