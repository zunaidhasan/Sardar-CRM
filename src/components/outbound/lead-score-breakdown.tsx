"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { calculateLeadScore } from "@/lib/lead-scoring";
import { LEAD_SCORE_META } from "@/lib/constants";
import { autoScoreLeadAction } from "@/app/actions";
import type { Client } from "@/lib/types";

export function LeadScoreBreakdown({
  lead,
  onScored,
}: {
  lead: Client;
  onScored?: (score: string) => void;
}) {
  const [scoring, setScoring] = React.useState(false);
  const result = calculateLeadScore(lead);
  const percentage = Math.round((result.totalPoints / result.maxPoints) * 100);

  async function handleAutoScore() {
    setScoring(true);
    const res = await autoScoreLeadAction(lead.id);
    setScoring(false);
    if (res.ok) {
      toast.success(`Score set to ${res.data?.score}`);
      onScored?.(res.data?.score ?? "");
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Score Breakdown</span>
        </div>
        <Button size="sm" variant="outline" onClick={handleAutoScore} disabled={scoring}>
          {scoring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Auto-score
        </Button>
      </div>

      {/* Score display */}
      <div className="flex items-center gap-3">
        <Badge variant="outline" className={cn("border", LEAD_SCORE_META[result.score].badge)}>
          {result.score}
        </Badge>
        <Progress value={percentage} className="h-2 flex-1" />
        <span className="text-xs font-medium text-muted-foreground">{percentage}%</span>
      </div>

      {/* Signal breakdown */}
      <div className="space-y-1.5">
        {result.signals.map((signal) => (
          <div key={signal.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className={cn("h-1.5 w-1.5 rounded-full", signal.met ? "bg-emerald-500" : "bg-muted")} />
              <span className={cn(signal.met ? "text-foreground" : "text-muted-foreground")}>
                {signal.description}
              </span>
            </div>
            <span className={cn("font-mono", signal.met ? "text-emerald-600" : "text-muted-foreground/50")}>
              {signal.points}/{signal.maxPoints}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
