import type { Opportunity } from "@/lib/types";

export interface DealWinScoreInput {
  client_name?: string | null;
  proposal_length?: number;
  response_window_hours?: number;
  historical_win_rate?: number;
}

export interface DealWinScoreResult {
  score: number;
  label: "High" | "Medium" | "Low";
  reasons: string[];
  nextAction: string;
}

export function calculateOpportunityWinScore(
  opportunity: Opportunity,
  context: DealWinScoreInput = {},
): DealWinScoreResult {
  const summary = `${opportunity.title} ${opportunity.notes ?? ""}`.toLowerCase();

  let score = 0;
  const reasons: string[] = [];

  const stageWeights: Record<string, number> = {
    lead: 10,
    proposal: 25,
    negotiation: 40,
    active: 60,
    won: 100,
    lost: 0,
  };
  score += stageWeights[opportunity.stage] ?? 0;
  reasons.push(`Pipeline stage: ${opportunity.stage}`);

  if (opportunity.status === "response" || opportunity.status === "interview" || opportunity.status === "hired") {
    score += 20;
    reasons.push("Client has engaged in a response or interview");
  } else if (opportunity.status === "only_viewed") {
    score += 8;
    reasons.push("Client has only viewed the proposal");
  } else if (opportunity.status === "no_response" || opportunity.status === "rejected") {
    score -= 15;
    reasons.push("Low engagement or no response yet");
  }

  if (opportunity.amount > 0) {
    score += Math.min(12, Math.round(opportunity.amount / 250));
    reasons.push(`Quoted value is ${opportunity.amount} USD`);
  }

  if (opportunity.notes) {
    const positiveSignals = ["reply", "interested", "question", "wants", "pricing", "follow up", "happy", "budget"];
    if (positiveSignals.some((signal) => summary.includes(signal))) {
      score += 10;
      reasons.push("Positive communication signals in notes");
    }
  }

  if (context.client_name) {
    score += 8;
    reasons.push(`Client name is available for personalization`);
  }

  const proposalLength = context.proposal_length ?? Math.max(250, (opportunity.description?.length ?? 0) + 180);
  const proposalFit = Math.min(18, Math.max(0, 18 - Math.abs(proposalLength - 420) / 30));
  score += Math.round(proposalFit);
  reasons.push(`Proposal length fits the likely winning range (${proposalLength} chars)`);

  const responseWindowHours = context.response_window_hours ?? 48;
  if (responseWindowHours <= 24) {
    score += 12;
    reasons.push("Fast reply window improves conversion likelihood");
  } else if (responseWindowHours <= 72) {
    score += 5;
    reasons.push("Moderate response time");
  }

  const historicalWinRate = context.historical_win_rate ?? 58;
  score += Math.min(18, Math.round(historicalWinRate / 4));
  reasons.push(`Historical win rate baseline: ${historicalWinRate}%`);

  if (opportunity.platform === "upwork") {
    score += 5;
    reasons.push("Upwork bid includes a standard platform conversion pattern");
  }

  const cappedScore = Math.max(0, Math.min(100, score));

  let label: DealWinScoreResult["label"];
  if (cappedScore >= 75) label = "High";
  else if (cappedScore >= 45) label = "Medium";
  else label = "Low";

  const nextAction =
    label === "High"
      ? "send a tailored follow-up with pricing confirmation and a clear next milestone."
      : label === "Medium"
        ? "request a quick call, clarify scope, and send a concise proposal recap."
        : "share a short value-focused follow-up and ask one direct qualifying question.";

  return {
    score: cappedScore,
    label,
    reasons: reasons.slice(0, 6),
    nextAction,
  };
}
