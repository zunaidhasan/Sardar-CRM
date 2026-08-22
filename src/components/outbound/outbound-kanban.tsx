"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Calendar,
  Globe,
  GripVertical,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LEAD_SCORE_META,
  OUTREACH_STATUS_LIST,
  OUTREACH_STATUS_META,
} from "@/lib/constants";
import { updateOutreachStatusAction } from "@/app/actions";
import type { Client, OutreachStatus, TeamMember } from "@/lib/types";

// ---------------------------------------------------------------------------
// Outbound Kanban Board
//
// Displays leads in columns by outreach status. Supports native HTML5
// drag-and-drop (no external library) for moving leads between columns.
// ---------------------------------------------------------------------------

const COLUMN_COLORS: Record<OutreachStatus, { bg: string; border: string; header: string }> = {
  New:       { bg: "bg-slate-50 dark:bg-slate-950",    border: "border-slate-200 dark:border-slate-800", header: "bg-slate-100 dark:bg-slate-900" },
  Contacted: { bg: "bg-sky-50 dark:bg-sky-950",        border: "border-sky-200 dark:border-sky-800",   header: "bg-sky-100 dark:bg-sky-900" },
  Replied:   { bg: "bg-blue-50 dark:bg-blue-950",      border: "border-blue-200 dark:border-blue-800", header: "bg-blue-100 dark:bg-blue-900" },
  Meeting:   { bg: "bg-violet-50 dark:bg-violet-950",  border: "border-violet-200 dark:border-violet-800", header: "bg-violet-100 dark:bg-violet-900" },
  Proposal:  { bg: "bg-indigo-50 dark:bg-indigo-950",  border: "border-indigo-200 dark:border-indigo-800", header: "bg-indigo-100 dark:bg-indigo-900" },
  Won:       { bg: "bg-emerald-50 dark:bg-emerald-950", border: "border-emerald-200 dark:border-emerald-800", header: "bg-emerald-100 dark:bg-emerald-900" },
  Lost:      { bg: "bg-rose-50 dark:bg-rose-950",      border: "border-rose-200 dark:border-rose-800", header: "bg-rose-100 dark:bg-rose-900" },
};

function LeadCard({ lead, teamMembers }: { lead: Client; teamMembers?: TeamMember[] }) {
  const owner = teamMembers?.find((m) => m.id === lead.owner_id);
  const isOverdue = lead.next_follow_up_date && new Date(lead.next_follow_up_date) < new Date();

  return (
    <Link
      href={`/clients/${lead.id}`}
      className={cn(
        "group block rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md",
        "cursor-grab active:cursor-grabbing",
      )}
      draggable="true"
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", lead.id);
        e.dataTransfer.effectAllowed = "move";
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold group-hover:text-primary">
            {lead.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {lead.company || "—"}
          </p>
        </div>
        {lead.lead_score && (
          <Badge
            variant="outline"
            className={cn("shrink-0 border text-[10px]", LEAD_SCORE_META[lead.lead_score].badge)}
          >
            {lead.lead_score}
          </Badge>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        {lead.country && (
          <span className="flex items-center gap-0.5">
            <Globe className="h-2.5 w-2.5" />
            {lead.country}
          </span>
        )}
        {lead.industry && (
          <span className="rounded bg-muted px-1 py-0.5">{lead.industry}</span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px]">
        {lead.next_follow_up_date ? (
          <span
            className={cn(
              "flex items-center gap-0.5",
              isOverdue ? "font-medium text-rose-500" : "text-muted-foreground",
            )}
          >
            <Calendar className="h-2.5 w-2.5" />
            {lead.next_follow_up_date}
          </span>
        ) : (
          <span className="text-muted-foreground/50">No follow-up</span>
        )}
        {owner && (
          <span className="flex items-center gap-0.5 text-muted-foreground">
            <User className="h-2.5 w-2.5" />
            {owner.name.split(" ")[0]}
          </span>
        )}
      </div>

      {lead.main_problem_found && (
        <p className="mt-1.5 line-clamp-1 text-[10px] text-muted-foreground italic">
          &ldquo;{lead.main_problem_found}&rdquo;
        </p>
      )}
    </Link>
  );
}

export function OutboundKanban({
  leads,
  teamMembers = [],
}: {
  leads: Client[];
  teamMembers?: TeamMember[];
}) {
  const router = useRouter();
  const [dragOverColumn, setDragOverColumn] = React.useState<string | null>(null);

  // Group leads by status
  const columns = React.useMemo(() => {
    const grouped: Record<OutreachStatus, Client[]> = {
      New: [], Contacted: [], Replied: [], Meeting: [], Proposal: [], Won: [], Lost: [],
    };
    for (const lead of leads) {
      const status = lead.outreach_status || "New";
      if (grouped[status]) {
        grouped[status].push(lead);
      }
    }
    return grouped;
  }, [leads]);

  async function handleDrop(e: React.DragEvent, targetStatus: OutreachStatus) {
    e.preventDefault();
    setDragOverColumn(null);
    const leadId = e.dataTransfer.getData("text/plain");
    if (!leadId) return;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.outreach_status === targetStatus) return;

    const result = await updateOutreachStatusAction(leadId, targetStatus);
    if (result.ok) {
      toast.success(`${lead.name} moved to ${targetStatus}`);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  function handleDragOver(e: React.DragEvent, status: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(status);
  }

  function handleDragLeave() {
    setDragOverColumn(null);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {OUTREACH_STATUS_LIST.map((status) => {
        const columnLeads = columns[status];
        const meta = OUTREACH_STATUS_META[status];
        const colors = COLUMN_COLORS[status];
        const isOver = dragOverColumn === status;

        return (
          <div
            key={status}
            className={cn(
              "flex min-w-[260px] flex-1 flex-col rounded-xl border transition-colors",
              colors.border,
              isOver && "ring-2 ring-primary/50",
            )}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            {/* Column header */}
            <div className={cn("flex items-center justify-between rounded-t-xl px-3 py-2.5", colors.header)}>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn("border text-xs", meta.badge)}>
                  {meta.label}
                </Badge>
                <span className="text-xs font-medium text-muted-foreground">
                  {columnLeads.length}
                </span>
              </div>
            </div>

            {/* Column body */}
            <div
              className={cn(
                "flex flex-1 flex-col gap-2 p-2 min-h-[200px] rounded-b-xl",
                colors.bg,
                isOver && "bg-primary/5",
              )}
            >
              {columnLeads.length === 0 ? (
                <div className="flex flex-1 items-center justify-center py-8 text-xs text-muted-foreground/50">
                  Drop leads here
                </div>
              ) : (
                columnLeads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} teamMembers={teamMembers} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
