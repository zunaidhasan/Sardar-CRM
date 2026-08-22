import * as demo from "@/lib/db/demo-store";
import { isDemoMode } from "@/lib/utils";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Activity } from "@/lib/types";

// ---------------------------------------------------------------------------
// Email open / click tracking.
//
// Open tracking: a 1x1 transparent pixel is appended to outgoing HTML.
//   GET /api/track/open?id=<tracking_id> → logs the open event.
//
// Click tracking: all links in the email body are rewritten to go through
//   GET /api/track/click?id=<tracking_id>&url=<original_url> → logs click, redirects.
//
// In demo mode, events are stored in the in-memory DB.
// In Supabase mode, events go to the activities table.
// ---------------------------------------------------------------------------

export interface EmailTrackingEvent {
  id: string;
  user_id: string;
  lead_id: string;
  template_id: string | null;
  event_type: "open" | "click";
  metadata: {
    subject?: string;
    link_url?: string;
    user_agent?: string;
  };
  created_at: string;
}

/**
 * Generate a tracking ID for an email send.
 */
export function generateTrackingId(): string {
  return `et-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create the tracking pixel HTML tag.
 */
export function trackingPixel(trackingId: string, baseUrl: string): string {
  return `<img src="${baseUrl}/api/track/open?id=${trackingId}" width="1" height="1" style="display:none" alt="" />`;
}

/**
 * Wrap links in the email body for click tracking.
 */
export function wrapLinksForTracking(html: string, trackingId: string, baseUrl: string): string {
  return html.replace(
    /href="(https?:\/\/[^"]+)"/g,
    (match, url) => `href="${baseUrl}/api/track/click?id=${trackingId}&url=${encodeURIComponent(url)}"`,
  );
}

/**
 * Record an email tracking event (open or click).
 */
export async function recordTrackingEvent(params: {
  trackingId: string;
  eventType: "open" | "click";
  linkUrl?: string;
  userAgent?: string;
}): Promise<void> {
  const { trackingId, eventType, linkUrl, userAgent } = params;

  if (isDemoMode()) {
    // In demo mode, store in activities table with metadata
    const db2 = demo.loadDB();
    // Find the activity that matches this tracking ID
    const activity = db2.activities.find(
      (a: Activity) => a.metadata && (a.metadata as Record<string, unknown>).tracking_id === trackingId,
    );
    if (activity) {
      const meta = (activity.metadata ?? {}) as Record<string, unknown>;
      if (eventType === "open") {
        meta.open_count = ((meta.open_count as number) ?? 0) + 1;
        meta.last_opened_at = new Date().toISOString();
      } else if (eventType === "click") {
        meta.click_count = ((meta.click_count as number) ?? 0) + 1;
        meta.last_clicked_at = new Date().toISOString();
        if (linkUrl) {
          meta.clicked_urls = [...((meta.clicked_urls as string[]) ?? []), linkUrl];
        }
      }
      activity.metadata = meta;
      demo.saveDB(db2);
    }
    return;
  }

  // Supabase: store in activities table
  const client = await createServerSupabase();
  if (!client) return;

  // Find the activity with this tracking ID in metadata
  const { data: activities } = await client
    .from("activities")
    .select("id, metadata")
    .contains("metadata", { tracking_id: trackingId })
    .limit(1);

  if (activities && activities.length > 0) {
    const activity = activities[0];
    const meta = (activity.metadata ?? {}) as Record<string, unknown>;
    if (eventType === "open") {
      meta.open_count = ((meta.open_count as number) ?? 0) + 1;
      meta.last_opened_at = new Date().toISOString();
    } else if (eventType === "click") {
      meta.click_count = ((meta.click_count as number) ?? 0) + 1;
      meta.last_clicked_at = new Date().toISOString();
      if (linkUrl) {
        meta.clicked_urls = [...((meta.clicked_urls as string[]) ?? []), linkUrl];
      }
    }
    await client.from("activities").update({ metadata: meta }).eq("id", activity.id);
  }
}

/**
 * Get tracking stats for a lead.
 */
export async function getLeadTrackingStats(
  userId: string,
  leadId: string,
): Promise<{ opens: number; clicks: number; lastOpened: string | null; lastClicked: string | null }> {
  if (isDemoMode()) {
    const db2 = demo.loadDB();
    const activities = db2.activities.filter(
      (a: Activity) =>
        a.user_id === userId &&
        a.entity_type === "client" &&
        a.entity_id === leadId &&
        a.activity_type === "email",
    );

    let opens = 0;
    let clicks = 0;
    let lastOpened: string | null = null;
    let lastClicked: string | null = null;

    for (const a of activities) {
      const meta = (a.metadata ?? {}) as Record<string, unknown>;
      opens += (meta.open_count as number) ?? 0;
      clicks += (meta.click_count as number) ?? 0;
      const lo = meta.last_opened_at as string | undefined;
      const lc = meta.last_clicked_at as string | undefined;
      if (lo && (!lastOpened || lo > lastOpened)) lastOpened = lo;
      if (lc && (!lastClicked || lc > lastClicked)) lastClicked = lc;
    }

    return { opens, clicks, lastOpened, lastClicked };
  }

  // Supabase
  const client = await createServerSupabase();
  if (!client) return { opens: 0, clicks: 0, lastOpened: null, lastClicked: null };

  const { data } = await client
    .from("activities")
    .select("metadata")
    .eq("user_id", userId)
    .eq("entity_type", "client")
    .eq("entity_id", leadId)
    .eq("activity_type", "email");

  let opens = 0;
  let clicks = 0;
  let lastOpened: string | null = null;
  let lastClicked: string | null = null;

  for (const row of data ?? []) {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    opens += (meta.open_count as number) ?? 0;
    clicks += (meta.click_count as number) ?? 0;
    const lo = meta.last_opened_at as string | undefined;
    const lc = meta.last_clicked_at as string | undefined;
    if (lo && (!lastOpened || lo > lastOpened)) lastOpened = lo;
    if (lc && (!lastClicked || lc > lastClicked)) lastClicked = lc;
  }

  return { opens, clicks, lastOpened, lastClicked };
}
