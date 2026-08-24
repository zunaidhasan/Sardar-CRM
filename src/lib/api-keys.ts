// ---------------------------------------------------------------------------
// API Key Management
//
// Generates cryptographically random API keys, hashes them for storage,
// and validates incoming requests against the stored hashes.
//
// Key format: sb_live_<40 random chars>
//   - "sb_" prefix identifies the CRM
//   - "live_" vs "test_" distinguishes environments
//   - 40 chars of entropy (base62)
// ---------------------------------------------------------------------------

import { createHash, randomBytes } from "node:crypto";
import { isDemoMode } from "@/lib/utils";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import type { ApiKeyRow } from "@/lib/types";

const KEY_PREFIX = "sb_live_";
const ENTROPY_BYTES = 30; // 30 bytes → 40 base64 chars

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseAdmin(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** SHA-256 hash of the raw key, used for lookup. */
export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

/** First 8 chars of the raw key for display (e.g. "sb_live_xK9..."). */
export function keyPrefix(rawKey: string): string {
  return rawKey.slice(0, 12) + "...";
}

// ---------------------------------------------------------------------------
// Generate
// ---------------------------------------------------------------------------

export interface GeneratedKey {
  /** The raw key — shown once, never stored. */
  rawKey: string;
  /** The display prefix stored in the DB. */
  keyPrefix: string;
  /** The SHA-256 hash stored in the DB. */
  keyHash: string;
}

export function generateApiKey(): GeneratedKey {
  const entropy = randomBytes(ENTROPY_BYTES).toString("base64url").slice(0, 40);
  const rawKey = `${KEY_PREFIX}${entropy}`;
  return {
    rawKey,
    keyPrefix: rawKey.slice(0, 12) + "...",
    keyHash: hashApiKey(rawKey),
  };
}

// ---------------------------------------------------------------------------
// Validate (used by API routes)
// ---------------------------------------------------------------------------

export interface ValidatedKey {
  userId: string;
  keyId: string;
  name: string;
  scopes: string[];
}

/**
 * Validate an incoming API key. Returns the associated user if valid,
 * or null if the key is invalid / expired / inactive.
 */
export async function validateApiKey(rawKey: string): Promise<ValidatedKey | null> {
  if (!rawKey || !rawKey.startsWith(KEY_PREFIX)) return null;

  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const keyHash = hashApiKey(rawKey);

  const { data } = await admin
    .from("api_keys")
    .select("id, user_id, name, scopes, is_active, expires_at")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (!data || !data.is_active) return null;

  // Check expiry
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;

  // Update last_used_at (fire and forget)
  admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return {
    userId: data.user_id,
    keyId: data.id,
    name: data.name,
    scopes: data.scopes ?? ["read", "write"],
  };
}

// ---------------------------------------------------------------------------
// CRUD (used by Settings UI)
// ---------------------------------------------------------------------------

export async function listApiKeys(userId: string): Promise<ApiKeyRow[]> {
  if (isDemoMode()) return [];

  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data } = await admin
    .from("api_keys")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (data ?? []) as ApiKeyRow[];
}

export async function createApiKey(
  userId: string,
  name: string,
  scopes: string[] = ["read", "write"],
): Promise<GeneratedKey & { id: string }> {
  const generated = generateApiKey();

  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Database not configured");

  const { data, error } = await admin
    .from("api_keys")
    .insert({
      user_id: userId,
      name,
      key_hash: generated.keyHash,
      key_prefix: generated.keyPrefix,
      scopes,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  return { ...generated, id: data.id };
}

export async function revokeApiKey(
  userId: string,
  keyId: string,
): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const { error } = await admin
    .from("api_keys")
    .delete()
    .eq("id", keyId)
    .eq("user_id", userId);

  return !error;
}
