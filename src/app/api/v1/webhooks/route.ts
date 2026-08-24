import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateApiKey } from "@/lib/api-keys";

// ---------------------------------------------------------------------------
// Webhook Receiver: /api/v1/webhooks
//
// POST — Receive webhook events from external services (Zapier, n8n, etc.)
//
// Supports:
//   - lead.created  — Add a new lead from an external source
//   - lead.updated  — Update an existing lead
//   - import.csv    — Bulk import leads from CSV data
//
// Authentication (two methods supported):
//   1. API Key: Authorization: Bearer sb_live_...
//   2. Legacy:  X-Webhook-Secret header (deprecated, prefer API keys)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSupabaseAdmin(): any {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Authenticate the webhook request.
 * Returns the userId if valid, or null.
 */
async function verifyWebhookAuth(request: NextRequest): Promise<string | null> {
  // Method 1: API Key (preferred)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const validated = await validateApiKey(token);
    if (validated && (validated.scopes.includes("write") || validated.scopes.includes("admin"))) {
      return validated.userId;
    }
  }

  // Method 2: Legacy webhook secret (deprecated)
  const secret = process.env.WEBHOOK_SECRET;
  if (secret) {
    const provided = request.headers.get("x-webhook-secret");
    if (provided === secret) {
      // Legacy mode: extract user_id from the payload body (read below)
      return null; // Will be read from payload
    }
  }

  return null;
}

interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
  user_id?: string;
}

async function handleLeadCreated(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  payload: WebhookPayload,
): Promise<NextResponse> {
  const data = payload.data;
  const userId = payload.user_id;

  if (!userId) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }

  const name = (data.name as string)?.trim();
  if (!name) {
    return NextResponse.json({ error: "name is required in data" }, { status: 400 });
  }

  const leadData = {
    user_id: userId,
    name,
    email: (data.email as string) || null,
    company: (data.company as string) || null,
    country: (data.country as string) || null,
    industry: (data.industry as string) || null,
    lead_score: (data.lead_score as string) || null,
    source: (data.source as string) || "Webhook",
    website: (data.website as string) || null,
    linkedin_url: (data.linkedin_url as string) || null,
    outreach_status: (data.outreach_status as string) || "New",
    email_verified: false,
    follow_up_count: 0,
    tags: (data.tags as string[]) ?? ["webhook"],
  };

  const { data: created, error } = await admin
    .from("clients")
    .insert(leadData)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: created }, { status: 201 });
}

async function handleLeadUpdated(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  payload: WebhookPayload,
): Promise<NextResponse> {
  const data = payload.data;
  const userId = payload.user_id;
  const leadId = data.id as string;

  if (!userId || !leadId) {
    return NextResponse.json({ error: "user_id and data.id are required" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  const fields = [
    "name", "email", "company", "country", "industry", "lead_score",
    "source", "website", "linkedin_url", "outreach_status", "email_verified",
    "main_problem_found", "website_review_notes", "next_follow_up_date",
    "follow_up_count", "owner_id", "tags",
  ];

  for (const field of fields) {
    if (field in data) {
      patch[field] = data[field];
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  patch.updated_at = new Date().toISOString();

  const { data: updated, error } = await admin
    .from("clients")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", leadId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: updated });
}

async function handleBulkImport(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  payload: WebhookPayload,
): Promise<NextResponse> {
  const data = payload.data;
  const userId = payload.user_id;
  const leads = data.leads as Array<Record<string, unknown>>;

  if (!userId) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }

  if (!Array.isArray(leads) || leads.length === 0) {
    return NextResponse.json({ error: "data.leads must be a non-empty array" }, { status: 400 });
  }

  const rows = leads.map((lead) => ({
    user_id: userId,
    name: String(lead.name ?? "Unknown"),
    email: (lead.email as string) || null,
    company: (lead.company as string) || null,
    country: (lead.country as string) || null,
    industry: (lead.industry as string) || null,
    lead_score: (lead.lead_score as string) || null,
    source: (lead.source as string) || "Webhook Import",
    website: (lead.website as string) || null,
    linkedin_url: (lead.linkedin_url as string) || null,
    outreach_status: "New",
    email_verified: false,
    follow_up_count: 0,
    tags: ["webhook-import"],
  }));

  const { data: created, error } = await admin
    .from("clients")
    .insert(rows)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    imported: created?.length ?? 0,
    total: leads.length,
  });
}

export async function POST(request: NextRequest) {
  // Authenticate: try API key first, fall back to legacy webhook secret
  const authUserId = await verifyWebhookAuth(request);

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  let payload: WebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload.event) {
    return NextResponse.json({ error: "event is required" }, { status: 400 });
  }

  // Resolve user: API key provides userId directly; legacy mode uses payload.user_id
  const userId = authUserId ?? (payload.user_id as string | undefined);
  if (!userId) {
    return NextResponse.json({ error: "user_id is required (or use an API key)" }, { status: 401 });
  }
  // Ensure the payload carries the resolved userId for handlers
  payload.user_id = userId;

  switch (payload.event) {
    case "lead.created":
      return handleLeadCreated(admin, payload);
    case "lead.updated":
      return handleLeadUpdated(admin, payload);
    case "import.csv":
      return handleBulkImport(admin, payload);
    default:
      return NextResponse.json(
        { error: `Unknown event: ${payload.event}` },
        { status: 400 },
      );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    events: ["lead.created", "lead.updated", "import.csv"],
    docs: "POST with Authorization: Bearer sb_live_... header and JSON body: { event, data, user_id? }",
  });
}
