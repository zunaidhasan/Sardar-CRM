"use client";

import * as React from "react";
import { BarChart3, FlaskConical, LayoutGrid, ListOrdered, Table } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OutboundLeadsList } from "@/components/outbound/outbound-leads-list";
import { OutboundKanban } from "@/components/outbound/outbound-kanban";
import { OutboundPipelineReport } from "@/components/outbound/outbound-pipeline-report";
import { SequenceBuilder } from "@/components/outbound/sequence-builder";
import { ABTestResults } from "@/components/outbound/ab-test-results";
import type { Client, EmailTemplate, TeamMember } from "@/lib/types";

type ViewMode = "table" | "kanban" | "report" | "sequences" | "abtest";

export function OutboundViewToggle({
  leads,
  userName,
  teamMembers = [],
  activitiesByClient,
  templates = [],
}: {
  leads: Client[];
  userName?: string | null;
  teamMembers?: TeamMember[];
  activitiesByClient?: Map<string, any[]>; // eslint-disable-line @typescript-eslint/no-explicit-any
  templates?: EmailTemplate[];
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
        <Button
          variant={view === "sequences" ? "default" : "ghost"}
          size="sm"
          className="h-8 px-3"
          onClick={() => setView("sequences")}
        >
          <ListOrdered className="h-3.5 w-3.5" />
          Sequences
        </Button>
        <Button
          variant={view === "abtest" ? "default" : "ghost"}
          size="sm"
          className="h-8 px-3"
          onClick={() => setView("abtest")}
        >
          <FlaskConical className="h-3.5 w-3.5" />
          A/B Test
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
      {view === "sequences" && (
        <SequenceBuilder />
      )}
      {view === "abtest" && (
        <ABTestResults leads={leads} templates={templates} />
      )}
    </div>
  );
}
