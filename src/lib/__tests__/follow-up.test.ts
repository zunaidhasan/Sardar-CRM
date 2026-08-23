import { describe, it, expect } from "vitest";
import { FOLLOW_UP_SCHEDULE } from "@/lib/constants";
import {
  paginateLeads,
  filterLeads,
  encodeCursor,
  decodeCursor,
} from "@/lib/pagination";
import { findOverdueLeads } from "@/lib/follow-up-reminders";
import type { Client } from "@/lib/types";

// ---------------------------------------------------------------------------
// Unit Tests: Follow-up Scheduling, Pagination, and Reminders
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

describe("FOLLOW_UP_SCHEDULE", () => {
  it("has 3 steps", () => {
    expect(FOLLOW_UP_SCHEDULE).toHaveLength(3);
  });

  it("has increasing delays", () => {
    const delays = FOLLOW_UP_SCHEDULE.map((s) => s.after);
    expect(delays[0]).toBeLessThan(delays[1]);
    expect(delays[1]).toBeLessThan(delays[2]);
  });
});

describe("cursor encoding/decoding", () => {
  it("round-trips correctly", () => {
    const cursor = encodeCursor("2026-08-24", "lead-123");
    const decoded = decodeCursor(cursor);
    expect(decoded.sortValue).toBe("2026-08-24");
    expect(decoded.id).toBe("lead-123");
  });

  it("returns empty for invalid cursor", () => {
    const decoded = decodeCursor("invalid-base64!!!");
    expect(decoded.sortValue).toBe("");
    expect(decoded.id).toBe("");
  });
});

describe("paginateLeads", () => {
  const leads = [
    makeClient({ id: "1", next_follow_up_date: "2026-08-20" }),
    makeClient({ id: "2", next_follow_up_date: "2026-08-22" }),
    makeClient({ id: "3", next_follow_up_date: "2026-08-24" }),
    makeClient({ id: "4", next_follow_up_date: "2026-08-26" }),
    makeClient({ id: "5", next_follow_up_date: null }),
  ];

  it("returns all leads when pageSize >= total", () => {
    const result = paginateLeads(leads, { pageSize: 10 });
    expect(result.items).toHaveLength(5);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it("returns first page with correct pageSize", () => {
    const result = paginateLeads(leads, { pageSize: 2 });
    expect(result.items).toHaveLength(2);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).not.toBeNull();
  });

  it("sorts by next_follow_up_date ascending", () => {
    const result = paginateLeads(leads, { pageSize: 10 });
    const dates = result.items.map((l) => l.next_follow_up_date);
    // null should be last
    expect(dates[dates.length - 1]).toBeNull();
    expect(dates[0]).toBe("2026-08-20");
  });

  it("paginates correctly with cursor", () => {
    const page1 = paginateLeads(leads, { pageSize: 2 });
    expect(page1.items).toHaveLength(2);

    const page2 = paginateLeads(leads, { pageSize: 2, cursor: page1.nextCursor });
    expect(page2.items).toHaveLength(2);
    expect(page2.items[0].id).not.toBe(page1.items[0].id);
  });
});

describe("filterLeads", () => {
  const leads = [
    makeClient({ id: "1", name: "Alice", country: "United States", industry: "eCommerce", lead_score: "High" }),
    makeClient({ id: "2", name: "Bob", country: "United Kingdom", industry: "Agency", lead_score: "Medium" }),
    makeClient({ id: "3", name: "Charlie", country: "Canada", industry: "SaaS", lead_score: "Low" }),
  ];

  it("filters by search term", () => {
    const result = filterLeads(leads, { search: "alice" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("filters by country", () => {
    const result = filterLeads(leads, { country: "United States" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("filters by industry", () => {
    const result = filterLeads(leads, { industry: "Agency" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("filters by lead score", () => {
    const result = filterLeads(leads, { leadScore: "High" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("returns all when filter is 'all'", () => {
    const result = filterLeads(leads, { country: "all" });
    expect(result).toHaveLength(3);
  });

  it("combines multiple filters", () => {
    const result = filterLeads(leads, { country: "United States", leadScore: "High" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });
});

describe("findOverdueLeads", () => {
  it("finds leads with past follow-up dates", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().slice(0, 10);

    const leads = [
      makeClient({ id: "1", next_follow_up_date: dateStr, outreach_status: "Contacted" }),
      makeClient({ id: "2", next_follow_up_date: null }),
    ];
    const overdue = findOverdueLeads(leads);
    expect(overdue).toHaveLength(1);
    expect(overdue[0].id).toBe("1");
  });

  it("excludes Won and Lost leads", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().slice(0, 10);

    const leads = [
      makeClient({ id: "1", next_follow_up_date: dateStr, outreach_status: "Won" }),
      makeClient({ id: "2", next_follow_up_date: dateStr, outreach_status: "Lost" }),
    ];
    const overdue = findOverdueLeads(leads);
    expect(overdue).toHaveLength(0);
  });

  it("finds today's follow-ups", () => {
    const today = new Date().toISOString().slice(0, 10);
    const leads = [
      makeClient({ id: "1", next_follow_up_date: today, outreach_status: "Contacted" }),
    ];
    const overdue = findOverdueLeads(leads);
    expect(overdue).toHaveLength(1);
    expect(overdue[0].daysOverdue).toBe(0);
  });
});
