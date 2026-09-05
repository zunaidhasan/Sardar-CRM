import { describe, it, expect } from "vitest";
import { analyzeBidToWin } from "@/lib/deal-scoring";
import type { Opportunity } from "@/lib/types";

function opp(overrides: Partial<Opportunity>): Opportunity {
  return {
    id: "1",
    user_id: "u",
    title: "Title",
    description: null,
    client_id: null,
    account_id: null,
    platform: "upwork",
    type: "bid",
    stage: "lead",
    status: null,
    follow_up_status: "pending",
    amount: 1000,
    currency: "USD",
    connects_spent: 0,
    source_url: null,
    due_date: null,
    next_follow_up: null,
    assigned_to: null,
    lost_reason: null,
    notes: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("analyzeBidToWin", () => {
  it("returns empty insights when there are no decided deals", () => {
    const result = analyzeBidToWin([opp({ stage: "lead" })]);
    expect(result.wonCount).toBe(0);
    expect(result.lostCount).toBe(0);
    expect(result.insights.length).toBe(0);
  });

  it("compares won vs lost proposals and returns actionable insights", () => {
    const result = analyzeBidToWin([
      opp({
        id: "w1",
        stage: "won",
        title: "Sarah WordPress rebuild",
        notes: "Hi Sarah, here is a short plan with a portfolio link: https://sardaritbd.com",
        amount: 800,
      }),
      opp({
        id: "w2",
        stage: "won",
        title: "Tom store",
        notes: "Hi Tom — portfolio https://sardaritbd.com",
        amount: 900,
      }),
      opp({
        id: "l1",
        stage: "lost",
        title: "A very long generic proposal without naming the client at all",
        notes: "We are the best agency in the world and here is a huge wall of text about our process.",
        amount: 2000,
        lost_reason: "too expensive",
      }),
    ]);

    expect(result.wonCount).toBe(2);
    expect(result.lostCount).toBe(1);
    expect(result.insights.length).toBeGreaterThan(0);
    expect(result.insights.join(" ")).toMatch(/winning|won|shorter|name|portfolio/i);
  });
});
