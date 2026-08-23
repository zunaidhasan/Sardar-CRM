"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { OUTREACH_STATUS_LIST, OUTREACH_STATUS_META, LEAD_SCORE_META, COUNTRY_LIST } from "@/lib/constants";
import type { Activity, Client, OutreachStatus } from "@/lib/types";

// ---------------------------------------------------------------------------
// Outbound Analytics Dashboard
//
// Pure CSS charts (no external charting library) showing:
// - Pipeline conversion funnel
// - Score distribution
// - Source breakdown
// - Industry breakdown
// - Country distribution
// - Email performance (opens/clicks)
// - Activity timeline (leads created over time)
// ---------------------------------------------------------------------------

function BarChart({
  data,
  maxValue,
  color = "bg-primary",
}: {
  data: Array<{ label: string; value: number; color?: string }>;
  maxValue?: number;
  color?: string;
}) {
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="w-24 shrink-0 truncate text-xs text-muted-foreground">
            {item.label}
          </span>
          <div className="flex-1">
            <div className="h-5 w-full overflow-hidden rounded bg-muted/50">
              <div
                className={cn("h-full rounded transition-all", item.color ?? color)}
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
          </div>
          <span className="w-8 text-right text-xs font-medium tabular-nums">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function DonutStat({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-20 w-20">
        <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/50" />
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={color}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold">{pct}%</span>
        </div>
      </div>
      <span className="text-xs font-medium">{label}</span>
      <span className="text-[10px] text-muted-foreground">{value} of {total}</span>
    </div>
  );
}

export function OutboundAnalytics({
  leads,
  emailActivities = [],
}: {
  leads: Client[];
  emailActivities?: Activity[];
}) {
  const total = leads.length;

  // Status counts
  const statusCounts: Record<OutreachStatus, number> = {
    New: 0, Contacted: 0, Replied: 0, Meeting: 0, Proposal: 0, Won: 0, Lost: 0,
  };
  for (const lead of leads) {
    statusCounts[lead.outreach_status] = (statusCounts[lead.outreach_status] ?? 0) + 1;
  }

  // Score counts
  const scoreCounts = { High: 0, Medium: 0, Low: 0 };
  for (const lead of leads) {
    if (lead.lead_score) scoreCounts[lead.lead_score]++;
  }

  // Source breakdown
  const sourceCounts: Record<string, number> = {};
  for (const lead of leads) {
    const src = lead.source || "Unknown";
    sourceCounts[src] = (sourceCounts[src] ?? 0) + 1;
  }
  const sourceData = Object.entries(sourceCounts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  // Industry breakdown
  const industryCounts: Record<string, number> = {};
  for (const lead of leads) {
    const ind = lead.industry || "Unknown";
    industryCounts[ind] = (industryCounts[ind] ?? 0) + 1;
  }
  const industryData = Object.entries(industryCounts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  // Country distribution
  const countryCounts: Record<string, number> = {};
  for (const lead of leads) {
    const c = lead.country || "Unknown";
    countryCounts[c] = (countryCounts[c] ?? 0) + 1;
  }
  const countryData = Object.entries(countryCounts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  // Email performance
  let totalOpens = 0;
  let totalClicks = 0;
  for (const a of emailActivities) {
    const meta = (a.metadata ?? {}) as Record<string, unknown>;
    totalOpens += (meta.open_count as number) ?? 0;
    totalClicks += (meta.click_count as number) ?? 0;
  }
  const emailsSent = emailActivities.length;
  const openRate = emailsSent > 0 ? Math.round((totalOpens / emailsSent) * 100) : 0;
  const clickRate = emailsSent > 0 ? Math.round((totalClicks / emailsSent) * 100) : 0;

  // Conversion rates
  const contacted = statusCounts.Contacted + statusCounts.Replied + statusCounts.Meeting + statusCounts.Proposal + statusCounts.Won;
  const replied = statusCounts.Replied + statusCounts.Meeting + statusCounts.Proposal + statusCounts.Won;
  const meetingPlus = statusCounts.Meeting + statusCounts.Proposal + statusCounts.Won;
  const proposalPlus = statusCounts.Proposal + statusCounts.Won;

  const replyRate = contacted > 0 ? Math.round((replied / contacted) * 100) : 0;
  const meetingRate = replied > 0 ? Math.round((meetingPlus / replied) * 100) : 0;
  const winRate = proposalPlus > 0 ? Math.round((statusCounts.Won / proposalPlus) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-3xl font-bold">{total}</p>
            <p className="text-xs text-muted-foreground">Total leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-3xl font-bold text-emerald-600">{statusCounts.Won}</p>
            <p className="text-xs text-muted-foreground">Won leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-3xl font-bold text-sky-600">{replyRate}%</p>
            <p className="text-xs text-muted-foreground">Reply rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-3xl font-bold text-violet-600">{winRate}%</p>
            <p className="text-xs text-muted-foreground">Win rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Conversion funnel + Email performance */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-around gap-2">
              <DonutStat label="New" value={statusCounts.New} total={total} color="text-slate-500" />
              <DonutStat label="Contacted" value={contacted} total={total} color="text-sky-500" />
              <DonutStat label="Replied" value={replied} total={total} color="text-blue-500" />
              <DonutStat label="Meeting" value={meetingPlus} total={total} color="text-violet-500" />
              <DonutStat label="Won" value={statusCounts.Won} total={total} color="text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Email Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{emailsSent}</p>
                <p className="text-xs text-muted-foreground">Emails sent</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{openRate}%</p>
                <p className="text-xs text-muted-foreground">Open rate</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{clickRate}%</p>
                <p className="text-xs text-muted-foreground">Click rate</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Total opens</span>
                <span className="font-medium">{totalOpens}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Total clicks</span>
                <span className="font-medium">{totalClicks}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Source Attribution + Industry breakdowns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Source Attribution</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                  <th className="pb-2">Source</th>
                  <th className="pb-2 text-right">Leads</th>
                  <th className="pb-2 text-right">Contacted</th>
                  <th className="pb-2 text-right">Replied</th>
                  <th className="pb-2 text-right">Won</th>
                  <th className="pb-2 text-right">Win Rate</th>
                </tr>
              </thead>
              <tbody>
                {sourceData.map(({ label }) => {
                  const srcLeads = leads.filter((l) => (l.source || "Unknown") === label);
                  const srcContacted = srcLeads.filter((l) => l.outreach_status !== "New").length;
                  const srcReplied = srcLeads.filter((l) => ["Replied", "Meeting", "Proposal", "Won"].includes(l.outreach_status)).length;
                  const srcWon = srcLeads.filter((l) => l.outreach_status === "Won").length;
                  const srcWinRate = srcContacted > 0 ? Math.round((srcWon / srcContacted) * 100) : 0;
                  return (
                    <tr key={label} className="border-b last:border-b-0">
                      <td className="py-2 font-medium">{label}</td>
                      <td className="py-2 text-right">{srcLeads.length}</td>
                      <td className="py-2 text-right">{srcContacted}</td>
                      <td className="py-2 text-right">{srcReplied}</td>
                      <td className="py-2 text-right text-emerald-600 font-medium">{srcWon}</td>
                      <td className="py-2 text-right">
                        <span className={cn("font-medium", srcWinRate >= 50 ? "text-emerald-600" : srcWinRate >= 25 ? "text-amber-600" : "text-muted-foreground")}>
                          {srcWinRate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads by Industry</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={industryData}
              color="bg-violet-500"
            />
          </CardContent>
        </Card>
      </div>

      {/* Country + Score distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads by Country</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={countryData}
              color="bg-emerald-500"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-around gap-4">
              {(["High", "Medium", "Low"] as const).map((score) => {
                const meta = LEAD_SCORE_META[score];
                const count = scoreCounts[score];
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={score} className="flex flex-col items-center gap-2">
                    <div className="relative h-24 w-24">
                      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/50" />
                        <circle
                          cx="40"
                          cy="40"
                          r="36"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="6"
                          strokeDasharray={2 * Math.PI * 36}
                          strokeDashoffset={2 * Math.PI * 36 - (pct / 100) * 2 * Math.PI * 36}
                          strokeLinecap="round"
                          className={meta.dot.replace("bg-", "text-")}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold">{count}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("border text-xs", meta.badge)}>
                      {score}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status breakdown table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detailed Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Count</th>
                <th className="pb-2 text-right">% of Total</th>
                <th className="pb-2 text-right">Avg. Score</th>
              </tr>
            </thead>
            <tbody>
              {OUTREACH_STATUS_LIST.map((status) => {
                const count = statusCounts[status];
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                const meta = OUTREACH_STATUS_META[status];
                const statusLeads = leads.filter((l) => l.outreach_status === status);
                const avgScore = statusLeads.length > 0
                  ? statusLeads.filter((l) => l.lead_score).length / statusLeads.length
                  : 0;

                return (
                  <tr key={status} className="border-b last:border-b-0">
                    <td className="py-2">
                      <Badge variant="outline" className={cn("border text-xs", meta.badge)}>
                        {meta.label}
                      </Badge>
                    </td>
                    <td className="py-2 text-right font-medium">{count}</td>
                    <td className="py-2 text-right text-muted-foreground">{pct}%</td>
                    <td className="py-2 text-right text-muted-foreground">
                      {avgScore > 0 ? `${Math.round(avgScore * 100)}%` : "—"}
                    </td>
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
