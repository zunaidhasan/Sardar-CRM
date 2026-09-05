"use client";

import { Lightbulb } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { analyzeBidToWin } from "@/lib/deal-scoring";
import type { Opportunity } from "@/lib/types";

export function BidToWinAnalyzer({ opportunities }: { opportunities: Opportunity[] }) {
  const result = analyzeBidToWin(opportunities);
  if (result.insights.length === 0) return null;

  return (
    <Card className="mb-4 border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-4 w-4 text-primary" />
          Bid-to-Win Analyzer
        </CardTitle>
        <CardDescription>
          {result.wonCount} won vs {result.lostCount} lost. Apply these patterns to the next bid.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5 text-sm">
          {result.insights.map((insight) => (
            <li key={insight} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
