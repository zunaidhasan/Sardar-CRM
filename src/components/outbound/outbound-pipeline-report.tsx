"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { OUTREACH_STATUS_LIST, OUTREACH_STATUS_META } from "@/lib/constants";
import type { Client, OutreachStatus } from "@/lib/types";

// ---------------------------------------------------------------------------
// Outbound Pipeline Report
//
// Shows a conversion funnel from New → Contacted → Replied → Meeting →
// Proposal → Won/Lost, with counts, percentages, and visual bars.
// ---------------------------------------------------------------------------

const FUNNEL_ORDER: OutreachStatus[] = ["New", "Contacted", "Replied", "Meeting", "Proposal", "Won"];
const FUNNEL_COLORS: Record<OutreachStatus, string> = {
  New:       "bg-slate-400",
  Contacted: "bg-sky-400",
  Replied:   "bg-blue-400",
  Meeting:   "bg-violet-400",
  Proposal:  "bg-indigo-400",
  Won:       "bg-emerald-400",
  Lost:      "bg-rose-400",
};

export function OutboundPipelineReport({ leads }: { leads: Client[] }) {
  const total = leads.length;
  const lost = leads.filter((l) => l.outreach_status === "Lost").length;

  // Count per status
  const counts: Record<OutreachStatus, number> = {
    New: 0, Contacted: 0, Replied: 0, Meeting: 0, Proposal: 0, Won: 0, Lost: 0,
  };
  for (const lead of leads) {
    counts[lead.outreach_status] = (counts[lead.outreach_status] ?? 0) + 1;
  }

  // Conversion rates (each step / previous step)
  const maxCount = Math.max(...FUNNEL_ORDER.map((s) => counts[s]), 1);

  // Overall conversion: New → Won
  const wonCount = counts.Won;

  // Reply rate: Contacted → Replied
  const contactedCount = counts.Contacted + counts.Replied + counts.Meeting + counts.Proposal + counts.Won;
  const repliedCount = counts.Replied + counts.Meeting + counts.Proposal + counts.Won;
  const replyRate = contactedCount > 0 ? Math.round((repliedCount / contactedCount) * 100) : 0;

  // Meeting rate: Replied → Meeting+
  const meetingPlus = counts.Meeting + counts.Proposal + counts.Won;
  const meetingRate = repliedCount > 0 ? Math.round((meetingPlus / repliedCount) * 100) : 0;

  // Win rate: Proposal → Won
  const proposalPlus = counts.Proposal + counts.Won;
  const winRate = proposalPlus > 0 ? Math.round((wonCount / proposalPlus) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-xs text-muted-foreground">Total leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-sky-600">{replyRate}%</p>
            <p className="text-xs text-muted-foreground">Reply rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-violet-600">{meetingRate}%</p>
            <p className="text-xs text-muted-foreground">Meeting rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-emerald-600">{winRate}%</p>
            <p className="text-xs text-muted-foreground">Win rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Funnel visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {FUNNEL_ORDER.map((status, i) => {
            const count = counts[status];
            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
            const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
            const meta = OUTREACH_STATUS_META[status];

            // Conversion from previous step
            const prevCount = i === 0 ? total : counts[FUNNEL_ORDER[i - 1]];
            const stepConversion = prevCount > 0 ? Math.round((count / prevCount) * 100) : 0;

            return (
              <div key={status} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn("border text-[10px]", meta.badge)}>
                      {meta.label}
                    </Badge>
                    <span className="font-medium">{count}</span>
                    <span className="text-muted-foreground">({percentage}%)</span>
                  </div>
                  {i > 0 && (
                    <span className="text-muted-foreground">
                      {stepConversion}% from {OUTREACH_STATUS_META[FUNNEL_ORDER[i - 1]].label}
                    </span>
                  )}
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-muted/50">
                  <div
                    className={cn("h-full rounded-full transition-all", FUNNEL_COLORS[status])}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}

          {/* Lost column */}
          {lost > 0 && (
            <div className="space-y-1 border-t pt-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border text-[10px] bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800">
                    Lost
                  </Badge>
                  <span className="font-medium">{lost}</span>
                  <span className="text-muted-foreground">({total > 0 ? Math.round((lost / total) * 100) : 0}%)</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status breakdown table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Count</th>
                <th className="pb-2 text-right">% of Total</th>
                <th className="pb-2 text-right">% of Pipeline</th>
              </tr>
            </thead>
            <tbody>
              {OUTREACH_STATUS_LIST.map((status) => {
                const count = counts[status];
                const ofTotal = total > 0 ? Math.round((count / total) * 100) : 0;
                const pipelineOnly = total - lost;
                const ofPipeline = pipelineOnly > 0 ? Math.round((count / pipelineOnly) * 100) : 0;
                const meta = OUTREACH_STATUS_META[status];

                return (
                  <tr key={status} className="border-b last:border-b-0">
                    <td className="py-2">
                      <Badge variant="outline" className={cn("border text-xs", meta.badge)}>
                        {meta.label}
                      </Badge>
                    </td>
                    <td className="py-2 text-right font-medium">{count}</td>
                    <td className="py-2 text-right text-muted-foreground">{ofTotal}%</td>
                    <td className="py-2 text-right text-muted-foreground">{ofPipeline}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
