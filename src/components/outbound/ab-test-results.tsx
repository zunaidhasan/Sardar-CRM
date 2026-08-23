"use client";

import * as React from "react";
import { FlaskConical, TrendingUp, Trophy, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  calculateABTestResults,
  getBestTemplate,
  isStatisticallySignificant,
  type ABTestResult,
} from "@/lib/ab-test";
import type { Client, EmailTemplate } from "@/lib/types";

// ---------------------------------------------------------------------------
// A/B Test Results
//
// Displays template performance comparison with reply rates, meeting rates,
// and win rates. Highlights the best performing template and shows
// statistical significance indicators.
// ---------------------------------------------------------------------------

function MetricBar({
  label,
  value,
  max,
  color = "bg-primary",
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function ABTestResults({
  leads,
  templates,
}: {
  leads: Client[];
  templates: EmailTemplate[];
}) {
  const results = React.useMemo(
    () => calculateABTestResults(leads, templates),
    [leads, templates]
  );

  const best = getBestTemplate(results);
  const maxSent = Math.max(...results.map((r) => r.totalSent), 1);

  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FlaskConical className="mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">No templates to compare</p>
          <p className="text-xs text-muted-foreground">
            Create at least 2 email templates to start A/B testing
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="h-4 w-4" />
            A/B Test Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{results.reduce((s, r) => s + r.totalSent, 0)}</p>
              <p className="text-xs text-muted-foreground">Total emails sent</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">
                {results.reduce((s, r) => s + r.replies, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Total replies</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-violet-600">
                {results.reduce((s, r) => s + r.wins, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Total wins</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-template results */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {results.map((result) => {
          const isBest = best?.templateId === result.templateId;
          return (
            <Card
              key={result.templateId}
              className={cn(
                "transition-colors",
                isBest && "border-emerald-300 dark:border-emerald-700"
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{result.templateName}</CardTitle>
                  {isBest && (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                      <Trophy className="mr-1 h-3 w-3" />
                      Best
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="text-lg font-bold">{result.replyRate}%</p>
                    <p className="text-muted-foreground">Reply rate</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{result.meetingRate}%</p>
                    <p className="text-muted-foreground">Meeting rate</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{result.winRate}%</p>
                    <p className="text-muted-foreground">Win rate</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <MetricBar
                    label="Sent"
                    value={result.totalSent}
                    max={maxSent}
                    color="bg-sky-500"
                  />
                  <MetricBar
                    label="Replies"
                    value={result.replies}
                    max={maxSent}
                    color="bg-emerald-500"
                  />
                  <MetricBar
                    label="Meetings"
                    value={result.meetings}
                    max={maxSent}
                    color="bg-violet-500"
                  />
                  <MetricBar
                    label="Wins"
                    value={result.wins}
                    max={maxSent}
                    color="bg-amber-500"
                  />
                </div>

                <p className="text-[10px] text-muted-foreground">
                  {result.uniqueRecipients} unique recipients
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Statistical significance note */}
      {results.length >= 2 && (
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> Statistical significance requires at least 10 emails per variant.
              Results with fewer sends are preliminary. Add more leads to your sequences for more
              reliable data.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
