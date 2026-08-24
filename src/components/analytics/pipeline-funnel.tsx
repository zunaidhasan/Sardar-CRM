"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KANBAN_STAGES, STAGE_META } from "@/lib/constants";
import { cn, formatCurrency } from "@/lib/utils";
import type { Opportunity, OpportunityStage } from "@/lib/types";

// ---------------------------------------------------------------------------
// Pipeline Funnel Visualization
//
// Shows a horizontal funnel with conversion rates between stages.
// Each stage is a bar whose width represents the count of deals,
// with arrows showing the conversion percentage between stages.
// ---------------------------------------------------------------------------

interface PipelineFunnelProps {
  opportunities: Opportunity[];
  currency: string;
}

export function PipelineFunnel({ opportunities, currency }: PipelineFunnelProps) {
  // Count deals per stage (excluding won/lost for funnel)
  const funnelStages = KANBAN_STAGES.filter((s) => s !== "won" && s !== "lost");
  const stageCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    const values: Record<string, number> = {};
    for (const stage of funnelStages) {
      const stageOpps = opportunities.filter((o) => o.stage === stage);
      counts[stage] = stageOpps.length;
      values[stage] = stageOpps.reduce((sum, o) => sum + o.amount, 0);
    }
    return { counts, values };
  }, [opportunities, funnelStages]);

  const maxCount = Math.max(...Object.values(stageCounts.counts), 1);

  // Calculate conversion rates between adjacent stages
  const conversions = React.useMemo(() => {
    const rates: Array<{ from: string; to: string; rate: number }> = [];
    for (let i = 0; i < funnelStages.length - 1; i++) {
      const fromCount = stageCounts.counts[funnelStages[i]] ?? 0;
      const toCount = stageCounts.counts[funnelStages[i + 1]] ?? 0;
      const rate = fromCount > 0 ? Math.round((toCount / fromCount) * 100) : 0;
      rates.push({
        from: funnelStages[i],
        to: funnelStages[i + 1],
        rate,
      });
    }
    return rates;
  }, [funnelStages, stageCounts]);

  // Overall funnel metrics
  const totalDeals = opportunities.length;
  const wonCount = opportunities.filter((o) => o.stage === "won").length;
  const lostCount = opportunities.filter((o) => o.stage === "lost").length;
  const decidedCount = wonCount + lostCount;
  const winRate = decidedCount > 0 ? Math.round((wonCount / decidedCount) * 100) : 0;
  const totalValue = opportunities.reduce((s, o) => s + o.amount, 0);
  const wonValue = opportunities
    .filter((o) => o.stage === "won")
    .reduce((s, o) => s + o.amount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pipeline Funnel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{totalDeals}</p>
            <p className="text-xs text-muted-foreground">Total Deals</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">{wonCount}</p>
            <p className="text-xs text-muted-foreground">Won</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-rose-500">{lostCount}</p>
            <p className="text-xs text-muted-foreground">Lost</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{winRate}%</p>
            <p className="text-xs text-muted-foreground">Win Rate</p>
          </div>
        </div>

        {/* Funnel bars */}
        <div className="space-y-2">
          {funnelStages.map((stage) => {
            const count = stageCounts.counts[stage] ?? 0;
            const value = stageCounts.values[stage] ?? 0;
            const meta = STAGE_META[stage];
            const widthPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;

            return (
              <div key={stage} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} />
                    <span className="font-medium">{meta.label}</span>
                    <span className="text-muted-foreground">({count})</span>
                  </div>
                  <span className="text-muted-foreground">{formatCurrency(value, currency)}</span>
                </div>
                <div className="relative h-6 overflow-hidden rounded-md bg-muted/50">
                  <div
                    className={cn("h-full rounded-md transition-all duration-500", meta.color)}
                    style={{ width: `${Math.max(widthPercent, 2)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Conversion arrows */}
        <div className="space-y-1 pt-2 border-t">
          <p className="text-xs font-medium text-muted-foreground mb-2">Conversion Rates</p>
          {conversions.map((conv) => (
            <div key={conv.from} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {STAGE_META[conv.from as OpportunityStage]?.label} →{" "}
                {STAGE_META[conv.to as OpportunityStage]?.label}
              </span>
              <span
                className={cn(
                  "font-medium",
                  conv.rate >= 50
                    ? "text-emerald-600"
                    : conv.rate >= 25
                      ? "text-amber-600"
                      : "text-rose-600"
                )}
              >
                {conv.rate}%
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between text-xs font-medium pt-1 border-t">
            <span className="text-muted-foreground">Overall (Won / Decided)</span>
            <span className="text-primary">{winRate}%</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Total Pipeline Value</span>
            <span>{formatCurrency(totalValue, currency)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Won Value</span>
            <span className="font-medium text-emerald-600">{formatCurrency(wonValue, currency)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
