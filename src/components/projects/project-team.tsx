"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Plus, UserPlus, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addProjectTeamMemberAction, removeProjectTeamMemberAction } from "@/app/actions";
import type { ProjectTeamMember, TeamMember } from "@/lib/types";

const ROLE_SUGGESTIONS = [
  "General Manager",
  "Project Manager",
  "Developer",
  "Tester",
  "Sales",
  "Designer",
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function ProjectTeam({
  projectId,
  team,
  teamMembers,
}: {
  projectId: string;
  team: ProjectTeamMember[];
  teamMembers: TeamMember[];
}) {
  const [adding, setAdding] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string>("custom");
  const [customName, setCustomName] = React.useState("");
  const [roleLabel, setRoleLabel] = React.useState("");

  const selected = teamMembers.find((m) => m.id === selectedId);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = selectedId === "custom" ? customName.trim() : selected?.name ?? "";
    if (!name || !roleLabel.trim()) return;
    setSaving(true);
    const result = await addProjectTeamMemberAction(projectId, {
      team_member_id: selectedId === "custom" ? null : selectedId,
      name,
      role_label: roleLabel.trim(),
    });
    setSaving(false);
    if (result.ok) {
      setSelectedId("custom");
      setCustomName("");
      setRoleLabel("");
      setAdding(false);
      toast.success("Team member added");
    } else {
      toast.error(result.error);
    }
  }

  async function handleRemove(m: ProjectTeamMember) {
    if (!window.confirm(`Remove ${m.name} from this project?`)) return;
    const result = await removeProjectTeamMemberAction(projectId, m.id);
    if (!result.ok) toast.error(result.error);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-muted-foreground" /> Team
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {team.length} {team.length === 1 ? "person" : "people"} on this project
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setAdding((v) => !v)} aria-expanded={adding}>
          <UserPlus className="h-4 w-4" /> Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {adding && (
          <form onSubmit={handleAdd} className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Pick a team member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom entry…</SelectItem>
                {teamMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedId === "custom" && (
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Name (e.g. a freelance tester)"
                autoFocus
              />
            )}
            <Input
              value={roleLabel}
              onChange={(e) => setRoleLabel(e.target.value)}
              placeholder="Role, e.g. 'Project Manager'"
              list="project-role-suggestions"
            />
            <datalist id="project-role-suggestions">
              {ROLE_SUGGESTIONS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={
                  saving ||
                  !roleLabel.trim() ||
                  (selectedId === "custom" ? !customName.trim() : !selected)
                }
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add
              </Button>
            </div>
          </form>
        )}

        {team.length === 0 && !adding && (
          <p className="py-3 text-center text-sm text-muted-foreground">
            No team attached yet — add the GM, PM, developer, tester…
          </p>
        )}

        <div className="space-y-1">
          {team.map((m) => (
            <div
              key={m.id}
              className="group flex items-center gap-3 rounded-lg border p-2.5 transition-colors hover:bg-accent/40"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {initials(m.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.name}</p>
                <p className="truncate text-xs text-muted-foreground">{m.role_label}</p>
              </div>
              <button
                onClick={() => handleRemove(m)}
                className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-all hover:bg-accent hover:text-destructive group-hover:opacity-100"
                aria-label={`Remove ${m.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
