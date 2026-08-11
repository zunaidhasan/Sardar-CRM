"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  Plus,
  Trash2,
  User,
  Users,
  Globe,
  FolderKanban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ProjectStatusBadge } from "@/components/status-badges";
import { ProjectTodos } from "@/components/projects/project-todos";
import { ProjectCredentials } from "@/components/projects/project-credentials";
import { ProjectTeam } from "@/components/projects/project-team";
import { TimeTracking } from "@/components/projects/time-tracking";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROJECT_STATUSES, PROJECT_STATUS_META, MILESTONE_STATUS_META } from "@/lib/constants";
import { countdownLabel, cn, formatCurrency, formatDate } from "@/lib/utils";
import {
  toggleMilestoneAction,
  addMilestoneAction,
  deleteMilestoneAction,
  setProjectStatusAction,
  deleteProjectAction,
  updateProjectNotesAction,
} from "@/app/actions";
import type {
  Milestone,
  Project,
  ProjectCredentialView,
  ProjectStatus,
  ProjectTeamMember,
  ProjectTodo,
  TeamMember,
  TimeEntry,
} from "@/lib/types";

export interface ProjectDetailData extends Project {
  milestones: Milestone[];
  todos: ProjectTodo[];
  credentials: ProjectCredentialView[];
  team: ProjectTeamMember[];
  time_entries: TimeEntry[];
  client_name?: string | null;
  account_name?: string | null;
}

export function ProjectDetail({
  project,
  currency,
  teamMembers,
}: {
  project: ProjectDetailData;
  currency: string;
  teamMembers: TeamMember[];
}) {
  const [status, setStatus] = React.useState<ProjectStatus>(project.status);
  const [newMilestone, setNewMilestone] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [editingNotes, setEditingNotes] = React.useState(false);
  const [notesDraft, setNotesDraft] = React.useState(project.notes ?? "");
  const [savingNotes, setSavingNotes] = React.useState(false);

  const doneCount = project.milestones.filter((m) => m.status === "done").length;
  const cd = countdownLabel(project.delivery_deadline);

  async function handleToggle(m: Milestone) {
    const next = m.status === "done" ? "in_progress" : "done";
    const result = await toggleMilestoneAction(project.id, m.id, next);
    if (!result.ok) toast.error(result.error);
  }

  async function handleAddMilestone(e: React.FormEvent) {
    e.preventDefault();
    if (!newMilestone.trim()) return;
    setAdding(true);
    const result = await addMilestoneAction(project.id, newMilestone.trim());
    setAdding(false);
    if (result.ok) {
      setNewMilestone("");
      toast.success("Milestone added");
    } else {
      toast.error(result.error);
    }
  }

  async function handleRemoveMilestone(m: Milestone) {
    if (!window.confirm(`Delete milestone "${m.title}"?`)) return;
    const result = await deleteMilestoneAction(project.id, m.id);
    if (!result.ok) toast.error(result.error);
  }

  async function handleStatusChange(value: string) {
    setStatus(value as ProjectStatus);
    const result = await setProjectStatusAction(project.id, value as ProjectStatus);
    if (!result.ok) {
      setStatus(project.status);
      toast.error(result.error);
    } else {
      toast.success(`Status updated`);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${project.project_name}"? This cannot be undone.`)) return;
    setDeleting(true);
    const result = await deleteProjectAction(project.id);
    setDeleting(false);
    if (result.ok) {
      window.location.href = "/projects";
    } else {
      toast.error(result.error);
    }
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    const result = await updateProjectNotesAction(project.id, notesDraft);
    setSavingNotes(false);
    if (result.ok) {
      setEditingNotes(false);
      toast.success("Notes saved");
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/projects">
            <ArrowLeft />
          </Link>
        </Button>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{project.project_name}</h1>
            <ProjectStatusBadge status={status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {project.client_name ?? "No client"} {project.account_name ? `· ${project.account_name}` : ""}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="text-destructive"
          >
            <Trash2 /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Milestones */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Milestones</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {doneCount} of {project.milestones.length} done
                </p>
              </div>
              <span className="text-sm font-semibold">{project.progress}%</span>
            </CardHeader>
            <CardContent>
              <Progress value={project.progress} className="mb-5" />

              <div className="space-y-1">
                {project.milestones.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No milestones yet — break the work down.
                  </p>
                )}
                {project.milestones
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((m) => {
                    const done = m.status === "done";
                    return (
                      <div
                        key={m.id}
                        className="group flex items-center gap-3 rounded-lg border p-2.5 transition-colors hover:bg-accent/40"
                      >
                        <button
                          onClick={() => handleToggle(m)}
                          className="shrink-0"
                          aria-label={done ? "Mark incomplete" : "Mark complete"}
                        >
                          {done ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          ) : m.status === "in_progress" ? (
                            <Circle className="h-5 w-5 text-amber-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-sm font-medium", done && "text-muted-foreground line-through")}>
                            {m.title}
                          </p>
                          {m.due_date && (
                            <p className="text-xs text-muted-foreground">{formatDate(m.due_date)}</p>
                          )}
                        </div>
                        <span className="hidden text-xs text-muted-foreground sm:block">
                          {(MILESTONE_STATUS_META[m.status] ?? { label: "Unknown" }).label}
                        </span>
                        <button
                          onClick={() => handleRemoveMilestone(m)}
                          className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                          aria-label="Delete milestone"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
              </div>

              <form onSubmit={handleAddMilestone} className="mt-4 flex gap-2">
                <Input
                  value={newMilestone}
                  onChange={(e) => setNewMilestone(e.target.value)}
                  placeholder="Add a milestone, e.g. 'Initial wireframes'"
                />
                <Button type="submit" size="sm" disabled={adding || !newMilestone.trim()}>
                  {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* To-do list */}
          <ProjectTodos projectId={project.id} todos={project.todos} />

          {/* Time tracking */}
          <TimeTracking
            projectId={project.id}
            entries={project.time_entries}
            teamMembers={teamMembers}
          />

          {/* Notes (editable) */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Notes</CardTitle>
              {!editingNotes ? (
                <Button variant="outline" size="sm" onClick={() => setEditingNotes(true)}>
                  Edit
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingNotes(false);
                      setNotesDraft(project.notes ?? "");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveNotes} disabled={savingNotes}>
                    {savingNotes && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {editingNotes ? (
                <Textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="Project notes, decisions, client preferences…"
                  rows={5}
                  autoFocus
                />
              ) : (
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {project.notes || "No notes for this project — click Edit to add some."}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {/* Team roster */}
          <ProjectTeam projectId={project.id} team={project.team} teamMembers={teamMembers} />

          {/* Credentials vault */}
          <ProjectCredentials projectId={project.id} credentials={project.credentials} />

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PROJECT_STATUS_META[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Financials */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Financials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <FinRow label="Gross amount" value={formatCurrency(project.gross_amount, currency)} />
              <FinRow label={`Platform fee (${project.fee_percent}%)`} value={`-${formatCurrency(project.fee_amount, currency)}`} />
              <FinRow label="Bonus" value={formatCurrency(project.bonus, currency)} />
              <div className="border-t pt-2">
                <FinRow label="Net after fees" value={formatCurrency(project.net_amount + project.bonus, currency)} strong />
              </div>
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <DetailRow icon={Calendar} label="Order date" value={formatDate(project.order_date)} />
              <DetailRow
                icon={Calendar}
                label="Deadline"
                value={`${formatDate(project.delivery_deadline)} · ${cd.label}`}
                urgent={cd.urgent}
              />
              <DetailRow icon={User} label="Assigned" value={project.assigned_to ?? "—"} />
              <DetailRow icon={Users} label="Developer" value={project.developer ?? "—"} />
              <DetailRow
                icon={Clock}
                label="Hours"
                value={`${project.time_entries.reduce((s, e) => s + e.hours, 0)}h tracked`}
              />
              <DetailRow icon={FolderKanban} label="Type" value={project.project_type ?? "—"} />
              <DetailRow
                icon={Globe}
                label="Website"
                value={project.website_link ? project.website_link : "—"}
                link={project.website_link ?? undefined}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function FinRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium", strong && "text-base font-semibold")}>{value}</span>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  link,
  urgent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  link?: string;
  urgent?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="min-w-0 flex-1 truncate text-primary hover:underline"
        >
          {value}
        </a>
      ) : (
        // suppressHydrationWarning: some values (deadline countdown) derive
        // from Date.now() and can change between server render and hydration.
        <span
          suppressHydrationWarning
          className={cn("min-w-0 flex-1 truncate", urgent && "font-medium text-rose-500")}
        >
          {value}
        </span>
      )}
    </div>
  );
}
