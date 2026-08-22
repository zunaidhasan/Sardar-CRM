import type { Client, LeadScore } from "@/lib/types";

// ---------------------------------------------------------------------------
// Automatic lead scoring engine.
//
// Evaluates leads against a set of weighted signals and produces a score
// (High / Medium / Low). Scoring is deterministic and transparent — each
// signal contributes a numeric value, and thresholds determine the tier.
// ---------------------------------------------------------------------------

export interface ScoringSignal {
  name: string;
  description: string;
  weight: number;
  evaluate: (lead: Client) => number; // returns 0..1
}

export interface ScoringResult {
  score: LeadScore;
  totalPoints: number;
  maxPoints: number;
  signals: Array<{
    name: string;
    description: string;
    points: number;
    maxPoints: number;
    met: boolean;
  }>;
}

// ---------------------------------------------------------------------------
// Default scoring signals
// ---------------------------------------------------------------------------

const SIGNALS: ScoringSignal[] = [
  {
    name: "Has website",
    description: "Lead has a website URL",
    weight: 15,
    evaluate: (lead) => (lead.website ? 1 : 0),
  },
  {
    name: "Has email",
    description: "Lead has an email address",
    weight: 15,
    evaluate: (lead) => (lead.email ? 1 : 0),
  },
  {
    name: "Email verified",
    description: "Email address has been verified",
    weight: 10,
    evaluate: (lead) => (lead.email_verified ? 1 : 0),
  },
  {
    name: "Has LinkedIn",
    description: "Lead has a LinkedIn profile URL",
    weight: 10,
    evaluate: (lead) => (lead.linkedin_url ? 1 : 0),
  },
  {
    name: "Problem identified",
    description: "A website problem has been documented",
    weight: 20,
    evaluate: (lead) => (lead.main_problem_found ? 1 : 0),
  },
  {
    name: "Engaged (replied)",
    description: "Lead has replied or further in the pipeline",
    weight: 20,
    evaluate: (lead) => {
      const engagedStatuses = ["Replied", "Meeting", "Proposal", "Won"];
      return engagedStatuses.includes(lead.outreach_status) ? 1 : 0;
    },
  },
  {
    name: "Follow-ups sent",
    description: "At least one follow-up has been sent",
    weight: 10,
    evaluate: (lead) => ((lead.follow_up_count ?? 0) > 0 ? 1 : 0),
  },
];

// Score thresholds
const HIGH_THRESHOLD = 70;   // 70%+ → High
const MEDIUM_THRESHOLD = 40; // 40%+ → Medium, below → Low

/**
 * Calculate a lead score based on available signals.
 */
export function calculateLeadScore(lead: Client): ScoringResult {
  const signalResults = SIGNALS.map((signal) => {
    const value = signal.evaluate(lead);
    const points = Math.round(value * signal.weight);
    return {
      name: signal.name,
      description: signal.description,
      points,
      maxPoints: signal.weight,
      met: value > 0,
    };
  });

  const totalPoints = signalResults.reduce((sum, s) => sum + s.points, 0);
  const maxPoints = SIGNALS.reduce((sum, s) => sum + s.weight, 0);
  const percentage = (totalPoints / maxPoints) * 100;

  let score: LeadScore;
  if (percentage >= HIGH_THRESHOLD) {
    score = "High";
  } else if (percentage >= MEDIUM_THRESHOLD) {
    score = "Medium";
  } else {
    score = "Low";
  }

  return {
    score,
    totalPoints,
    maxPoints,
    signals: signalResults,
  };
}

/**
 * Auto-score a lead and return the suggested score.
 * This can be called when a lead is created or updated.
 */
export function suggestLeadScore(lead: Client): LeadScore {
  return calculateLeadScore(lead).score;
}
