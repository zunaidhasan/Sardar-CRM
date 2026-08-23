// ---------------------------------------------------------------------------
// Cursor-based Pagination
//
// Provides cursor-based pagination for the outbound leads table.
// Uses a simple cursor encoding (base64 of sort field + ID) that works
// with both demo mode and Supabase.
// ---------------------------------------------------------------------------

import type { Client, OutreachStatus, LeadScore } from "@/lib/types";

export interface PaginationCursor {
  /** The sort value of the last item */
  sortValue: string;
  /** The ID of the last item (tiebreaker) */
  id: string;
}

export interface PaginationParams {
  cursor?: string | null;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  totalCount: number;
  hasMore: boolean;
}

/**
 * Encode a cursor from a sort value and ID.
 */
export function encodeCursor(sortValue: string, id: string): string {
  return Buffer.from(JSON.stringify({ sortValue, id })).toString("base64url");
}

/**
 * Decode a cursor string.
 */
export function decodeCursor(cursor: string): PaginationCursor {
  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString());
  } catch {
    return { sortValue: "", id: "" };
  }
}

/**
 * Paginate an array of leads using cursor-based pagination.
 * Sorts by next_follow_up_date (ascending, nulls last) then by id.
 */
export function paginateLeads(
  leads: Client[],
  params: PaginationParams = {},
): PaginatedResult<Client> {
  const pageSize = params.pageSize ?? 50;
  const cursor = params.cursor ? decodeCursor(params.cursor) : null;

  // Sort leads: next_follow_up_date ascending (nulls last), then by id
  const sorted = [...leads].sort((a, b) => {
    const dateA = a.next_follow_up_date ?? "9999-12-31";
    const dateB = b.next_follow_up_date ?? "9999-12-31";
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return a.id.localeCompare(b.id);
  });

  // Find starting position from cursor
  let startIndex = 0;
  if (cursor) {
    startIndex = sorted.findIndex(
      (lead) =>
        lead.next_follow_up_date === cursor.sortValue &&
        lead.id === cursor.id
    );
    if (startIndex >= 0) {
      startIndex += 1; // Start after the cursor item
    } else {
      // Fallback: binary search for approximate position
      startIndex = sorted.findIndex((lead) => {
        const date = lead.next_follow_up_date ?? "9999-12-31";
        return date > cursor.sortValue || 
          (date === cursor.sortValue && lead.id > cursor.id);
      });
      if (startIndex < 0) startIndex = sorted.length;
    }
  }

  const items = sorted.slice(startIndex, startIndex + pageSize);
  const hasMore = startIndex + pageSize < sorted.length;
  const nextCursor = hasMore && items.length > 0
    ? encodeCursor(
        items[items.length - 1].next_follow_up_date ?? "9999-12-31",
        items[items.length - 1].id,
      )
    : null;

  return {
    items,
    nextCursor,
    totalCount: sorted.length,
    hasMore,
  };
}

/**
 * Filter leads before pagination.
 */
export function filterLeads(
  leads: Client[],
  filters: {
    search?: string;
    country?: string;
    industry?: string;
    leadScore?: string;
    outreachStatus?: string;
    source?: string;
    ownerId?: string;
    tag?: string;
  },
): Client[] {
  let filtered = [...leads];

  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.company?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q)
    );
  }

  if (filters.country && filters.country !== "all") {
    filtered = filtered.filter((l) => l.country === filters.country);
  }

  if (filters.industry && filters.industry !== "all") {
    filtered = filtered.filter((l) => l.industry === filters.industry);
  }

  if (filters.leadScore && filters.leadScore !== "all") {
    filtered = filtered.filter((l) => l.lead_score === filters.leadScore);
  }

  if (filters.outreachStatus && filters.outreachStatus !== "all") {
    filtered = filtered.filter((l) => l.outreach_status === filters.outreachStatus);
  }

  if (filters.source && filters.source !== "all") {
    filtered = filtered.filter((l) => l.source === filters.source);
  }

  if (filters.ownerId && filters.ownerId !== "all") {
    if (filters.ownerId === "unassigned") {
      filtered = filtered.filter((l) => !l.owner_id);
    } else {
      filtered = filtered.filter((l) => l.owner_id === filters.ownerId);
    }
  }

  if (filters.tag && filters.tag !== "all") {
    filtered = filtered.filter((l) => l.tags?.includes(filters.tag!));
  }

  return filtered;
}
