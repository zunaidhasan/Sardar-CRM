"use client";

import * as React from "react";
import { BarChart3, LayoutGrid, Table } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OutboundLeadsList } from "@/components/outbound/outbound-leads-list";
import { OutboundKanban } from "@/components/outbound/outbound-kanban";
import { OutboundPipelineReport } from "@/components/outbound/outbound-pipeline-report";
import type { Client, TeamMember } from "@/lib/types";

type ViewMode = "table" | "kanban" | "report";

export function OutboundViewToggle({
  leads,
  userName,
  teamMembers = [],
  activitiesByClient,
}: {
  leads: Client[];
  userName?: string | null;
  teamMembers?: TeamMember[];
  activitiesByClient?: Map<string, any[]>; // eslint-disable-line @typescript-eslint/no-explicit-any
}) {
  const [view, setView] = React.useState<ViewMode>("table");

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5 self-end">
        <Button
          variant={view === "table" ? "default" : "ghost"}
          size="sm"
          className="h-8 px-3"
          onClick={() => setView("table")}
        >
          <Table className="h-3.5 w-3.5" />
          Table
        </Button>
        <Button
          variant={view === "kanban" ? "default" : "ghost"}
          size="sm"
          className="h-8 px-3"
          onClick={() => setView("kanban")}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Kanban
        </Button>
        <Button
          variant={view === "report" ? "default" : "ghost"}
          size="sm"
          className="h-8 px-3"
          onClick={() => setView("report")}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Report
        </Button>
      </div>

      {view === "table" && (
        <OutboundLeadsList leads={leads} userName={userName} teamMembers={teamMembers} activitiesByClient={activitiesByClient} />
      )}
      {view === "kanban" && (
        <OutboundKanban leads={leads} teamMembers={teamMembers} />
      )}
      {view === "report" && (
        <OutboundPipelineReport leads={leads} />
      )}
    </div>
  );
}
