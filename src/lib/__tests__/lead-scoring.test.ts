import { describe, it, expect } from "vitest";
import { suggestLeadScore, calculateLeadScore } from "@/lib/lead-scoring";
import type { Client } from "@/lib/types";

// ---------------------------------------------------------------------------
// Unit Tests: Lead Scoring Engine
// ---------------------------------------------------------------------------

function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: "test-1",
    user_id: "user-1",
    name: "Test Lead",
    email: null,
    company: null,
    platform: null,
    username: null,
    profile_url: null,
    category: null,
    account_id: null,
    tags: [],
    notes: null,
    lead_score: null,
    country: null,
    industry: null,
    website: null,
    linkedin_url: null,
    main_problem_found: null,
    website_review_notes: null,
    source: null,
    outreach_status: "New",
    email_verified: false,
    last_email_sent_at: null,
    next_follow_up_date: null,
    follow_up_count: 0,
    owner_id: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("lead scoring", () => {
  it("returns Low for an empty lead", () => {
    const lead = makeClient();
    const score = suggestLeadScore(lead);
    expect(score).toBe("Low");
  });

  it("returns High for a fully populated lead with engagement", () => {
    const lead = makeClient({
      email: "test@example.com",
      website: "https://example.com",
      linkedin_url: "https://linkedin.com/in/test",
      email_verified: true,
      main_problem_found: "Slow load time",
      outreach_status: "Replied",
      follow_up_count: 2,
    });
    const score = suggestLeadScore(lead);
    expect(score).toBe("High");
  });

  it("returns Medium for a partially populated lead", () => {
    const lead = makeClient({
      email: "test@example.com",
      website: "https://example.com",
      main_problem_found: "Some issue",
    });
    const score = suggestLeadScore(lead);
    expect(score).toBe("Medium");
  });

  it("calculates numeric score correctly", () => {
    const lead = makeClient({
      email: "test@example.com",
      website: "https://example.com",
    });
    const result = calculateLeadScore(lead);
    expect(result.totalPoints).toBeGreaterThan(0);
    expect(result.maxPoints).toBeGreaterThan(0);
    expect(result.signals.length).toBeGreaterThan(0);
  });

  it("gives points for email", () => {
    const withEmail = makeClient({ email: "test@example.com" });
    const withoutEmail = makeClient();
    const scoreA = calculateLeadScore(withEmail);
    const scoreB = calculateLeadScore(withoutEmail);
    expect(scoreA.totalPoints).toBeGreaterThan(scoreB.totalPoints);
  });

  it("gives points for website", () => {
    const withWebsite = makeClient({ website: "https://example.com" });
    const withoutWebsite = makeClient();
    const scoreA = calculateLeadScore(withWebsite);
    const scoreB = calculateLeadScore(withoutWebsite);
    expect(scoreA.totalPoints).toBeGreaterThan(scoreB.totalPoints);
  });

  it("gives points for verified email", () => {
    const verified = makeClient({ email: "test@example.com", email_verified: true });
    const unverified = makeClient({ email: "test@example.com", email_verified: false });
    const scoreA = calculateLeadScore(verified);
    const scoreB = calculateLeadScore(unverified);
    expect(scoreA.totalPoints).toBeGreaterThan(scoreB.totalPoints);
  });

  it("gives points for problem identified", () => {
    const withProblem = makeClient({ main_problem_found: "Slow site" });
    const withoutProblem = makeClient();
    const scoreA = calculateLeadScore(withProblem);
    const scoreB = calculateLeadScore(withoutProblem);
    expect(scoreA.totalPoints).toBeGreaterThan(scoreB.totalPoints);
  });

  it("gives points for engagement (replied status)", () => {
    const replied = makeClient({ outreach_status: "Replied" });
    const newLead = makeClient({ outreach_status: "New" });
    const scoreA = calculateLeadScore(replied);
    const scoreB = calculateLeadScore(newLead);
    expect(scoreA.totalPoints).toBeGreaterThan(scoreB.totalPoints);
  });

  it("gives points for follow-ups sent", () => {
    const withFollowUps = makeClient({ follow_up_count: 3 });
    const withoutFollowUps = makeClient({ follow_up_count: 0 });
    const scoreA = calculateLeadScore(withFollowUps);
    const scoreB = calculateLeadScore(withoutFollowUps);
    expect(scoreA.totalPoints).toBeGreaterThan(scoreB.totalPoints);
  });
});
