import { describe, it, expect } from "vitest";
import { calculateOpportunityWinScore } from "@/lib/deal-scoring";
import type { Opportunity } from "@/lib/types";

function makeOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: "opp-1",
    user_id: "user-1",
    title: "Landing page redesign",
    description: "Need a conversion-focused redesign",
    client_id: "client-1",
    account_id: "account-1",
    platform: "upwork",
    type: "bid",
    stage: "negotiation",
    status: "response",
    follow_up_status: "pending",
    amount: 1800,
    currency: "USD",
    connects_spent: 4,
    source_url: "https://www.upwork.com/jobs/~123",
    due_date: null,
    next_follow_up: null,
    assigned_to: "Mamunur",
    lost_reason: null,
    notes: "Client asked for 2 revisions and has replied quickly.",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    ...overrides,
  };
}

describe("deal win scoring", () => {
  it("returns a high score for an active, responsive negotiation", () => {
    const result = calculateOpportunityWinScore(
      makeOpportunity({
        stage: "negotiation",
        status: "response",
        source_url: "https://www.upwork.com/jobs/~123",
        notes: "Client replied and wants pricing options.",
      }),
      { client_name: "Sarah Mitchell" },
    );

    expect(result.score).toBeGreaterThan(70);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.nextAction).toContain("send");
  });

  it("returns a lower score for a cold lead with no engagement", () => {
    const result = calculateOpportunityWinScore(
      makeOpportunity({
        stage: "lead",
        status: "no_response",
        source_url: null,
        notes: "No direct contact yet.",
      }),
      { client_name: null },
    );

    expect(result.score).toBeLessThan(60);
    expect(result.label).toMatch(/Low|Medium/);
  });
});
