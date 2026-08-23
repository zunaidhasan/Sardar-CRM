// ---------------------------------------------------------------------------
// Audit Log
//
// Tracks who changed what on each lead, when, and what the previous value
// was. Uses in-memory storage for demo mode and Supabase for production.
// ---------------------------------------------------------------------------

import type { Client, OutreachStatus, LeadScore } from "@/lib/types";

export interface AuditEntry {
  id: string;
  userId: string;
  userName: string;
  entityType: "client";
  entityId: string;
  entityName: string;
  action: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// In-memory store for demo mode
const auditStore: AuditEntry[] = [];

let auditIdCounter = 10000;

function generateId(): string {
  return `audit-${++auditIdCounter}`;
}

/**
 * Record an audit log entry.
 */
export function recordAuditEntry(entry: Omit<AuditEntry, "id" | "timestamp">): AuditEntry {
  const fullEntry: AuditEntry = {
    ...entry,
    id: generateId(),
    timestamp: new Date().toISOString(),
  };
  auditStore.unshift(fullEntry);
  // Keep last 1000 entries in memory
  if (auditStore.length > 1000) {
    auditStore.splice(1000);
  }
  return fullEntry;
}

/**
 * Get audit log entries for a specific entity.
 */
export function getAuditLog(entityId: string, limit = 50): AuditEntry[] {
  return auditStore
    .filter((e) => e.entityId === entityId)
    .slice(0, limit);
}

/**
 * Get all audit log entries, optionally filtered.
 */
export function getAllAuditLog(options?: {
  entityType?: string;
  userId?: string;
  limit?: number;
}): AuditEntry[] {
  let entries = [...auditStore];
  if (options?.entityType) {
    entries = entries.filter((e) => e.entityType === options.entityType);
  }
  if (options?.userId) {
    entries = entries.filter((e) => e.userId === options.userId);
  }
  return entries.slice(0, options?.limit ?? 100);
}

/**
 * Detect changes between two client states and record audit entries.
 */
export function auditClientChanges(
  userId: string,
  userName: string,
  oldClient: Client,
  newClient: Client,
): AuditEntry[] {
  const entries: AuditEntry[] = [];
  const fieldsToTrack: Array<{ key: keyof Client; label: string }> = [
    { key: "outreach_status", label: "Outreach Status" },
    { key: "lead_score", label: "Lead Score" },
    { key: "owner_id", label: "Owner" },
    { key: "next_follow_up_date", label: "Next Follow-up" },
    { key: "follow_up_count", label: "Follow-up Count" },
    { key: "email_verified", label: "Email Verified" },
    { key: "main_problem_found", label: "Main Problem" },
    { key: "website_review_notes", label: "Website Review Notes" },
    { key: "country", label: "Country" },
    { key: "industry", label: "Industry" },
    { key: "source", label: "Source" },
    { key: "website", label: "Website" },
    { key: "linkedin_url", label: "LinkedIn URL" },
    { key: "last_email_sent_at", label: "Last Email Sent" },
  ];

  for (const { key, label } of fieldsToTrack) {
    const oldVal = oldClient[key];
    const newVal = newClient[key];
    const oldStr = String(oldVal ?? "");
    const newStr = String(newVal ?? "");

    if (oldStr !== newStr) {
      entries.push(
        recordAuditEntry({
          userId,
          userName,
          entityType: "client",
          entityId: oldClient.id,
          entityName: oldClient.name,
          action: "updated",
          field: label,
          oldValue: oldStr || null,
          newValue: newStr || null,
        })
      );
    }
  }

  return entries;
}

/**
 * Record a specific action on a client (for actions not covered by field diffs).
 */
export function auditClientAction(
  userId: string,
  userName: string,
  client: Client,
  action: string,
  details?: Record<string, unknown>,
): AuditEntry {
  return recordAuditEntry({
    userId,
    userName,
    entityType: "client",
    entityId: client.id,
    entityName: client.name,
    action,
    field: "general",
    oldValue: null,
    newValue: null,
    metadata: details,
  });
}
