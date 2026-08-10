"use client";

import * as React from "react";
import { toast } from "sonner";
import { Calendar, CheckCircle2, Circle, Loader2, Plus, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import {
  addProjectTodoAction,
  deleteProjectTodoAction,
  setProjectTodoStatusAction,
} from "@/app/actions";
import type { MilestoneStatus, ProjectTodo } from "@/lib/types";

export function ProjectTodos({
  projectId,
  todos,
}: {
  projectId: string;
  todos: ProjectTodo[];
}) {
  const [title, setTitle] = React.useState("");
  const [assignee, setAssignee] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [adding, setAdding] = React.useState(false);

  const doneCount = todos.filter((t) => t.status === "done").length;

  async function handleToggle(t: ProjectTodo) {
    const next: MilestoneStatus =
      t.status === "done" ? "pending" : t.status === "in_progress" ? "done" : "in_progress";
    const result = await setProjectTodoStatusAction(projectId, t.id, next);
    if (!result.ok) toast.error(result.error);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setAdding(true);
    const result = await addProjectTodoAction(projectId, {
      title: title.trim(),
      assignee: assignee.trim() || null,
      due_date: dueDate || null,
    });
    setAdding(false);
    if (result.ok) {
      setTitle("");
      setAssignee("");
      setDueDate("");
      toast.success("To-do added");
    } else {
      toast.error(result.error);
    }
  }

  async function handleDelete(t: ProjectTodo) {
    if (!window.confirm(`Delete "${t.title}"?`)) return;
    const result = await deleteProjectTodoAction(projectId, t.id);
    if (!result.ok) toast.error(result.error);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">To-do</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {doneCount} of {todos.length} done
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {todos.length === 0 && (
          <p className="py-3 text-center text-sm text-muted-foreground">
            No to-dos yet — add the next action item.
          </p>
        )}

        <div className="space-y-1">
          {todos.map((t) => {
            const done = t.status === "done";
            return (
              <div
                key={t.id}
                className="group flex items-center gap-3 rounded-lg border p-2.5 transition-colors hover:bg-accent/40"
              >
                <button
                  onClick={() => handleToggle(t)}
                  className="shrink-0"
                  aria-label={
                    done ? "Mark not done" : t.status === "in_progress" ? "Mark done" : "Start task"
                  }
                >
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : t.status === "in_progress" ? (
                    <Circle className="h-5 w-5 text-amber-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      done && "text-muted-foreground line-through",
                    )}
                  >
                    {t.title}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {t.assignee && (
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {t.assignee}
                      </span>
                    )}
                    {t.due_date && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(t.due_date)}
                      </span>
                    )}
                  </div>
                </div>
                {t.status === "in_progress" && (
                  <Badge variant="secondary" className="hidden sm:inline-flex">
                    In progress
                  </Badge>
                )}
                <button
                  onClick={() => handleDelete(t)}
                  className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  aria-label="Delete todo"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleAdd} className="space-y-2 rounded-lg border bg-muted/20 p-2.5">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a to-do, e.g. 'Send client the revision notes'"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="Assignee (optional)"
              className="sm:flex-1"
            />
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="sm:w-40"
              aria-label="Due date"
            />
            <Button type="submit" size="sm" disabled={adding || !title.trim()}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
