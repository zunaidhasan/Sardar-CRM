import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// REST API: /api/v1/leads
//
// GET  — List outbound leads (with pagination, filtering)
// POST — Create a new outbound lead
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

async function authenticateUser(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const admin = getSupabaseAdmin();
    if (!admin) return null;
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("username", token)
      .maybeSingle();
    return data?.id ?? null;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const userId = await authenticateUser(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
  const cursor = searchParams.get("cursor");
  const country = searchParams.get("country");
  const industry = searchParams.get("industry");
  const leadScore = searchParams.get("lead_score");
  const outreachStatus = searchParams.get("outreach_status");
  const source = searchParams.get("source");
  const search = searchParams.get("search");

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  let query = admin
    .from("clients")
    .select("*")
    .eq("user_id", userId)
    .not("outreach_status", "is", null)
    .order("next_follow_up_date", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true })
    .limit(limit + 1);

  if (country) query = query.eq("country", country);
  if (industry) query = query.eq("industry", industry);
  if (leadScore) query = query.eq("lead_score", leadScore);
  if (outreachStatus) query = query.eq("outreach_status", outreachStatus);
  if (source) query = query.eq("source", source);
  if (search) {
    query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%,email.ilike.%${search}%`);
  }

  if (cursor) {
    try {
      const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString());
      query = query.or(
        `next_follow_up_date.gt.${decoded.sortValue},and(next_follow_up_date.eq.${decoded.sortValue},id.gt.${decoded.id})`
      );
    } catch {
      // Invalid cursor, start from beginning
    }
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const leads = data ?? [];
  const hasMore = leads.length > limit;
  const items = hasMore ? leads.slice(0, limit) : leads;
  const lastItem = items[items.length - 1];

  const nextCursor = hasMore && lastItem
    ? Buffer.from(JSON.stringify({
        sortValue: lastItem.next_follow_up_date ?? "9999-12-31",
        id: lastItem.id,
      })).toString("base64url")
    : null;

  return NextResponse.json({
    data: items,
    pagination: {
      nextCursor,
      hasMore,
      totalCount: leads.length,
    },
  });
}

export async function POST(request: NextRequest) {
  const userId = await authenticateUser(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = (body.name as string)?.trim();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const leadData = {
    user_id: userId,
    name,
    email: (body.email as string) || null,
    company: (body.company as string) || null,
    country: (body.country as string) || null,
    industry: (body.industry as string) || null,
    lead_score: (body.lead_score as string) || null,
    source: (body.source as string) || null,
    website: (body.website as string) || null,
    linkedin_url: (body.linkedin_url as string) || null,
    outreach_status: (body.outreach_status as string) || "New",
    email_verified: false,
    follow_up_count: 0,
    tags: [],
  };

  const { data, error } = await admin
    .from("clients")
    .insert(leadData)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
