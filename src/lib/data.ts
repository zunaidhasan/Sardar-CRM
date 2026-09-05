import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import * as demo from "@/lib/db/demo-store";
import { isDemoMode } from "@/lib/utils";
import {
  IMPORT_ENUMS,
  normalizeDate,
  normalizeEnum,
  normalizeNumber,
  normalizePercent,
} from "@/lib/import-validation";
import type {
  Account,
  Activity,
  ActivityType,
  ActivityWithActor,
  AppUser,
  Attachment,
  AutomationRule,
  BidStatus,
  Client,
  EmailTemplate,
  EntityType,
  FollowUp,
  ImportEntity,
  ImportRun,
  Invoice,
  InvoiceItem,
  Milestone,
  MilestoneStatus,
  Opportunity,
  OpportunityStage,
  OpportunityType,
  Platform,
  Profile,
  Project,
  ProjectCredential,
  ProjectStatus,
  ProjectExpense,
  ProjectTeamMember,
  ProjectTodo,
  TeamMember,
  TeamRole,
  TimeEntry,
  ClientPortal,
  PortalSignature,
  WebhookConfig,
} from "@/lib/types";
import { verifyPassword } from "@/lib/password";
import { createPortalToken, isPortalTokenValid } from "@/lib/portal";
import { decryptSecret, encryptSecret } from "@/lib/credential-crypto";
import { activityActorName } from "@/lib/activity-feed";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

// ===========================================================================
// Data access layer.
// Every function takes an explicit userId. In demo mode it talks to the
// file-backed local store; otherwise it talks to Supabase (RLS enforces that
// a user can only ever touch their own rows).
// ===========================================================================

type S = SupabaseClient | null;

async function sb(): Promise<S> {
  if (isDemoMode()) return null;
  return createServerSupabase();
}

const TEAM_ROLES: TeamRole[] = ["ceo", "executive", "developer", "designer"];

/**
 * Validate password strength. Enforces:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * Throws with a user-friendly message if validation fails.
 */
function validatePasswordStrength(password: string): void {
  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    throw new Error("Password must contain at least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    throw new Error("Password must contain at least one number");
  }
}

function isTeamRole(value: string | undefined | null): value is TeamRole {
  return !!value && (TEAM_ROLES as string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export interface CurrentUser {
  id: string;
  email: string | null;
  name: string | null;
  profile: Profile | null;
  isDemo: boolean;
  role: TeamRole;
  // The signed-in user's real role (kept for authorization checks).
  realRole: TeamRole;
  teamMembers: TeamMember[];
}

// Demo-mode session cookie: stores the logged-in username.
export const DEMO_SESSION_COOKIE = "sardar_session";

// Safe alias for server actions (avoids importing utils directly there).
export function isDemoModeSafe(): boolean {
  return isDemoMode();
}

export async function getDemoSessionUser(): Promise<AppUser | null> {
  try {
    const { cookies } = await import("next/headers");
    const store = await cookies();
    const username = store.get(DEMO_SESSION_COOKIE)?.value;
    if (!username) return null;
    const user = demo.findUserByUsername(username);
    return user && user.is_active ? user : null;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (isDemoMode()) {
    const db = demo.loadDB();
    // Real login: the session cookie names the user. No cookie -> not logged in.
    // Identity and data scope follow the logged-in account — the demo store
    // resolves every getter from this id, so each login sees only its own
    // account's data (the CEO sees the company-wide workspace).
    const sessionUser = await getDemoSessionUser();
    if (!sessionUser) return null;
    return {
      id: sessionUser.id,
      email: sessionUser.email ?? "demo@sardaritbd.com",
      name: sessionUser.name,
      profile: {
        ...db.profile,
        full_name: sessionUser.name,
        role: sessionUser.role,
      },
      isDemo: true,
      role: sessionUser.role,
      realRole: sessionUser.role,
      teamMembers: db.team_members,
    };
  }
  const client = await sb();
  if (!client) return null;
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;
  const { data: profile } = await client
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  const { data: team } = await client
    .from("team_members")
    .select("*")
    .eq("user_id", user.id);
  // Deactivated employees are logged out immediately (agency-managed auth).
  if (profile && (profile as Profile).is_active === false) return null;
  const teamMembers = (team ?? []) as TeamMember[];
  const me = teamMembers.find(
    (t) => t.email?.toLowerCase() === user.email?.toLowerCase() && t.is_active,
  );
  // Prefer the agency-assigned profiles.role (set by Settings -> Team access);
  // fall back to the team_members join for legacy rows, then "ceo".
  const profileRole = (profile as Profile | null)?.role;
  const role: TeamRole = isTeamRole(profileRole)
    ? profileRole
    : (me?.role ?? "ceo");
  return {
    id: user.id,
    email: user.email ?? null,
    name:
      (profile as Profile | null)?.full_name ??
      user.user_metadata?.full_name ??
      null,
    profile: (profile as Profile) ?? null,
    isDemo: false,
    role,
    realRole: role,
    teamMembers,
  };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

// ---------------------------------------------------------------------------
// Profile (name, avatar, currency, default fee) — edited from Settings.
// ---------------------------------------------------------------------------
export async function updateProfile(
  userId: string,
  patch: Partial<Profile>,
): Promise<Profile | null> {
  if (isDemoMode()) {
    // Demo logins share the workspace profile; also write the display name
    // through to the session user's login row so the sidebar/dashboards (which
    // read sessionUser.name) reflect the edit.
    const sessionUser = await getDemoSessionUser();
    if (patch.full_name && sessionUser) {
      demo.updateDemoUser(sessionUser.username, { name: patch.full_name });
    }
    return demo.updateProfile(patch);
  }
  const client = await sb();
  if (!client) return null;
  const { data, error } = await client
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Profile;
}

// ---------------------------------------------------------------------------
// Username + password auth (no public self-registration; agency provisions)
// ---------------------------------------------------------------------------
export async function loginWithUsername(
  username: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const name = username.trim();
  if (!name || !password) return { ok: false, error: "Username and password are required" };
  if (isDemoMode()) {
    const user = demo.findUserByUsername(name);
    if (!user || !user.is_active) return { ok: false, error: "Unknown username" };
    if (!user.password_hash || !verifyPassword(password, user.password_hash)) {
      return { ok: false, error: "Incorrect password" };
    }
    return { ok: true };
  }
  // Resolve username -> auth email. Login is unauthenticated, so the lookup
  // must use the service-role admin client (profiles RLS would block it).
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured" };
  }
  const admin = createSupabaseAdmin(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: profile, error: profileErr } = await admin
    .rpc("get_profile_by_username", { p_username: name })
    .maybeSingle<{ profile_id: string; is_active: boolean; email: string | null }>();
  if (profileErr) {
    const msg = profileErr.message ?? "";
    if (/could not find the function|schema cache|does not exist/i.test(msg)) {
      return {
        ok: false,
        error:
          "Login RPC missing. Run supabase/schema.sql (or migrations/20260903_auth_rpc_and_portal.sql) in the SQL Editor, then redeploy.",
      };
    }
    return { ok: false, error: `Profile lookup failed: ${msg}` };
  }
  if (!profile) return { ok: false, error: "Unknown username" };
  const email = profile.email;
  if (!email) return { ok: false, error: "No email found for this account" };
  if (profile.is_active === false) {
    return { ok: false, error: "This account has been deactivated by agency management" };
  }
  const client = await sb();
  if (!client) return { ok: false, error: "Authentication is not configured" };
  const { error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    return {
      ok: false,
      error: error.message === "Invalid login credentials" ? "Incorrect password" : error.message,
    };
  }
  return { ok: true };
}

// Agency-only user management. `actor` must be the workspace owner/CEO.
// Uses the real session role so a non-CEO login can never escalate into
// account provisioning.
export async function requireAgency(user: CurrentUser): Promise<void> {
  if ((user.realRole ?? user.role) !== "ceo") {
    throw new Error("Only agency management can provision user accounts");
  }
}

export async function fetchUsers(): Promise<AppUser[]> {
  if (isDemoMode()) return demo.getUsers();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return [];
  const admin = createSupabaseAdmin(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const [authRes, profilesRes] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from("profiles").select("id, username, role, full_name, is_active, created_at, updated_at"),
  ]);
  const profiles = (profilesRes.data ?? []) as Array<Record<string, unknown>>;
  const byId = new Map(profiles.map((p) => [String(p.id), p]));
  return (authRes.data?.users ?? [])
    .map((u) => {
      const p = byId.get(u.id) as Record<string, unknown> | undefined;
      return {
        id: u.id,
        username: String(p?.username ?? u.email?.split("@")[0] ?? u.id),
        password_hash: null,
        name: String(p?.full_name ?? u.user_metadata?.full_name ?? p?.username ?? u.email ?? u.id),
        email: u.email ?? null,
        role: (p?.role as TeamRole) ?? "executive",
        is_active: !(u as { banned_at?: unknown }).banned_at && p?.is_active !== false,
        created_at: u.created_at ?? "",
        updated_at: p?.updated_at ? String(p.updated_at) : u.created_at ?? "",
      };
    })
    .sort((a, b) => a.username.localeCompare(b.username));
}

export async function createUserAccount(
  actor: CurrentUser,
  input: { username: string; password: string; name: string; email?: string; role: TeamRole },
): Promise<AppUser> {
  await requireAgency(actor);
  const username = input.username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    throw new Error("Username must be 3-32 chars: letters, numbers, dots, dashes, underscores");
  }
  validatePasswordStrength(input.password);
  if (isDemoMode()) {
    if (demo.findUserByUsername(username)) throw new Error("Username already exists");
    return demo.createDemoUser({
      username,
      password: input.password,
      name: input.name.trim(),
      email: input.email || null,
      role: input.role,
    });
  }
  // Supabase: create the auth user (service role) then the profile row.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  const admin = createSupabaseAdmin(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: created, error } = await admin.auth.admin.createUser({
    email: input.email?.trim() || `${username}@sardarcrm.internal`,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.name.trim(), username },
  });
  if (error) throw new Error(error.message);
  if (!created?.user) throw new Error("Failed to create user");
  const emailAddr = input.email?.trim() || `${username}@sardarcrm.internal`;
  const { error: profileError } = await admin.from("profiles").upsert({
    id: created.user.id,
    username,
    email: emailAddr,
    full_name: input.name.trim(),
    role: input.role,
    currency: "USD",
    default_fee_percent: 20,
    is_active: true,
  }, { onConflict: "id" });
  if (profileError) throw new Error(profileError.message);
  return {
    id: created.user.id,
    username,
    password_hash: null,
    name: input.name.trim(),
    email: input.email?.trim() || null,
    role: input.role,
    is_active: true,
    created_at: created.user.created_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function updateUserAccount(
  actor: CurrentUser,
  username: string,
  patch: { password?: string; is_active?: boolean; role?: TeamRole },
): Promise<AppUser | null> {
  await requireAgency(actor);
  if (patch.password) validatePasswordStrength(patch.password);
  const demotesCeo = patch.is_active === false || (!!patch.role && patch.role !== "ceo");
  if (isDemoMode()) {
    if (demotesCeo) {
      const target = demo.findUserByUsername(username);
      if (target?.role === "ceo" && target.is_active) {
        const activeCeos = demo.getUsers().filter((u) => u.role === "ceo" && u.is_active);
        if (activeCeos.length <= 1) {
          throw new Error("Cannot deactivate or demote the last CEO");
        }
      }
    }
    return demo.updateDemoUser(username, patch);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  const admin = createSupabaseAdmin(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: target } = await admin
    .from("profiles")
    .select("id, email, role, is_active")
    .eq("username", username)
    .maybeSingle();
  if (!target) return null;
  if (demotesCeo && target.role === "ceo" && target.is_active !== false) {
    const { data: ceos } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "ceo")
      .eq("is_active", true);
    if ((ceos?.length ?? 0) <= 1) {
      throw new Error("Cannot deactivate or demote the last CEO");
    }
  }
  if (patch.password) {
    const { error } = await admin.auth.admin.updateUserById(target.id as string, {
      password: patch.password,
    });
    if (error) throw new Error(error.message);
  }
  const profilePatch: Record<string, unknown> = {};
  if (patch.role) profilePatch.role = patch.role;
  if (patch.is_active !== undefined) profilePatch.is_active = patch.is_active;
  if (Object.keys(profilePatch).length) {
    const { error } = await admin.from("profiles").update(profilePatch).eq("id", target.id);
    if (error) throw new Error(error.message);
  }
  return {
    id: String(target.id),
    username,
    password_hash: null,
    name: username,
    email: (target.email as string | null) ?? null,
    role: patch.role ?? "executive",
    is_active: patch.is_active ?? true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Team members
// ---------------------------------------------------------------------------
export async function fetchTeamMembers(userId: string): Promise<TeamMember[]> {
  if (isDemoMode()) return demo.getTeamMembers(userId);
  const client = await sb();
  if (!client) return [];
  const { data } = await client.from("team_members").select("*").eq("user_id", userId);
  return (data ?? []) as TeamMember[];
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------
export async function fetchAccounts(userId: string): Promise<Account[]> {
  if (isDemoMode()) return demo.getAccounts(userId);
  const client = await sb();
  if (!client) return [];
  const { data } = await client.from("accounts").select("*").eq("user_id", userId);
  return (data ?? []) as Account[];
}

export async function createAccount(
  userId: string,
  input: Pick<Account, "name" | "platform" | "username" | "profile_url">,
): Promise<Account | null> {
  const row = { user_id: userId, is_active: true, ...input };
  if (isDemoMode()) {
    return demo.insert("accounts", row as unknown as Account);
  }
  const client = await sb();
  if (!client) return null;
  const { data, error } = await client.from("accounts").insert(row).select().single();
  if (error) throw new Error(error.message);
  return data as Account;
}

// ---------------------------------------------------------------------------
// Opportunities (Kanban)
// ---------------------------------------------------------------------------
export type OpportunityInput = Omit<
  Opportunity,
  "id" | "user_id" | "created_at" | "updated_at" | "follow_up_status"
>;

export async function fetchOpportunities(userId: string): Promise<Opportunity[]> {
  if (isDemoMode()) return demo.getOpportunities(userId);
  const client = await sb();
  if (!client) return [];
  const { data } = await client
    .from("opportunities")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  return (data ?? []) as Opportunity[];
}

export async function fetchOpportunity(
  userId: string,
  id: string,
): Promise<Opportunity | null> {
  if (isDemoMode()) {
    return demo.getOpportunities(userId).find((o) => o.id === id) ?? null;
  }
  const client = await sb();
  if (!client) return null;
  const { data } = await client
    .from("opportunities")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  return (data as Opportunity) ?? null;
}

export async function createOpportunity(
  userId: string,
  input: OpportunityInput,
): Promise<Opportunity | null> {
  const row = { ...input, user_id: userId, follow_up_status: "pending" as const };
  if (isDemoMode()) {
    const opp = demo.insert("opportunities", row as unknown as Opportunity);
    demo.insert("activities", {
      user_id: userId,
      entity_type: "opportunity",
      entity_id: opp.id,
      activity_type: "system",
      subject: `Opportunity created: ${opp.title}`,
      body: "Added to pipeline.",
      metadata: {},
      created_at: new Date().toISOString(),
    } as unknown as Activity);
    return opp;
  }
  const client = await sb();
  if (!client) return null;
  const { data, error } = await client.from("opportunities").insert(row).select().single();
  if (error) throw new Error(error.message);
  return data as Opportunity;
}

export async function updateOpportunity(
  userId: string,
  id: string,
  patch: Partial<Opportunity>,
): Promise<Opportunity | null> {
  if (isDemoMode()) {
    demo.updateById("opportunities", id, patch);
    return demo.getOpportunities(userId).find((o) => o.id === id) ?? null;
  }
  const client = await sb();
  if (!client) return null;
  const { data, error } = await client
    .from("opportunities")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Opportunity;
}

/**
 * Move a deal between kanban stages. Persists the change and fires any
 * automation rules configured for the new stage (e.g. -> creates a project).
 */
export async function moveOpportunity(
  userId: string,
  id: string,
  stage: OpportunityStage,
): Promise<{ ok: boolean; createdProjectId?: string }> {
  const opp = await fetchOpportunity(userId, id);
  if (!opp) return { ok: false };
  const next = await updateOpportunity(userId, id, { stage });
  let createdProjectId: string | undefined;
  if (next) {
    await logActivity(userId, "opportunity", id, "status_change", `Deal moved to ${stage}`, opp.title);
    createdProjectId = await runStageAutomations(userId, next, stage);
    if (stage === "won") {
      try {
        const hooks = await fetchNotificationWebhooks(userId);
        const { fireEventWebhooks } = await import("@/lib/notification-webhooks");
        await fireEventWebhooks(hooks, "deal.won", {
          title: next.title,
          amount: next.amount,
          currency: next.currency,
        });
      } catch {
        // webhook failures must never block the stage move
      }
    }
  }
  return { ok: Boolean(next), createdProjectId };
}

async function runStageAutomations(
  userId: string,
  opp: Opportunity,
  stage: OpportunityStage,
): Promise<string | undefined> {
  const rules = await fetchAutomations(userId);
  const active = rules.filter(
    (r) => r.is_active && r.trigger_event === "opportunity.stage_changed" && r.trigger_value === stage,
  );
  let createdProjectId: string | undefined;
  const hasCreateProject = active.some((r) => r.action_type === "create_project");
  if (stage === "won" && !hasCreateProject) {
    const existing = (await fetchProjects(userId)).find((p) => p.opportunity_id === opp.id);
    if (!existing) {
      const project = await createProject(userId, {
        opportunity_id: opp.id,
        client_id: opp.client_id,
        account_id: opp.account_id,
        project_name: opp.title,
        gross_amount: opp.amount,
        fee_percent: 20,
        fee_amount: Math.round(opp.amount * 0.2 * 100) / 100,
        net_amount: Math.round(opp.amount * 0.8 * 100) / 100,
        bonus: 0,
        status: "wip",
        priority: "medium",
        progress: 0,
        order_date: new Date().toISOString().slice(0, 10),
        notes: "Auto-created when the deal moved to Won.",
      });
      createdProjectId = project?.id;
      if (project) {
        await logActivity(
          userId,
          "project",
          project.id,
          "system",
          "Won-deal onboarding",
          "Project created automatically from the won opportunity.",
        );
      }
    }
  }
  for (const rule of active) {
    if (rule.action_type === "create_project") {
      const name =
        String(rule.action_data.project_name_template ?? "{{opportunity.title}}").replace(
          "{{opportunity.title}}",
          opp.title,
        ) || opp.title;
      const project = await createProject(userId, {
        opportunity_id: opp.id,
        client_id: opp.client_id,
        account_id: opp.account_id,
        project_name: name,
        gross_amount: opp.amount,
        fee_percent: 20,
        fee_amount: Math.round(opp.amount * 0.2 * 100) / 100,
        net_amount: Math.round(opp.amount * 0.8 * 100) / 100,
        bonus: 0,
        status: "wip",
        priority: "medium",
        progress: 0,
        order_date: new Date().toISOString().slice(0, 10),
      });
      createdProjectId = project?.id ?? createdProjectId;
    } else if (rule.action_type === "log_activity") {
      await logActivity(
        userId,
        "opportunity",
        opp.id,
        "system",
        String(rule.action_data.subject ?? "Automation"),
        String(rule.action_data.body ?? ""),
      );
    }
  }
  return createdProjectId;
}

export async function deleteOpportunity(userId: string, id: string): Promise<boolean> {
  if (isDemoMode()) return demo.removeById("opportunities", id);
  const client = await sb();
  if (!client) return false;
  const { error } = await client
    .from("opportunities")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  return !error;
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------
export type ClientInput = {
  name: string;
  email?: string | null;
  company?: string | null;
  platform?: Platform | null;
  username?: string | null;
  profile_url?: string | null;
  category?: string | null;
  account_id?: string | null;
  tags?: string[];
  notes?: string | null;
  lead_score?: Client["lead_score"];
  country?: string | null;
  industry?: string | null;
  website?: string | null;
  linkedin_url?: string | null;
  main_problem_found?: string | null;
  website_review_notes?: string | null;
  source?: string | null;
  outreach_status?: Client["outreach_status"];
  email_verified?: boolean;
  last_email_sent_at?: string | null;
  next_follow_up_date?: string | null;
  follow_up_count?: number;
  owner_id?: string | null;
};

// Outbound-specific update patch
export type OutboundLeadPatch = Partial<Pick<Client,
  | "lead_score"
  | "country"
  | "industry"
  | "website"
  | "linkedin_url"
  | "main_problem_found"
  | "website_review_notes"
  | "source"
  | "outreach_status"
  | "email_verified"
  | "last_email_sent_at"
  | "next_follow_up_date"
  | "follow_up_count"
  | "owner_id"
>>;

export async function fetchClients(userId: string): Promise<Client[]> {
  if (isDemoMode()) return demo.getClients(userId);
  const client = await sb();
  if (!client) return [];
  const { data } = await client
    .from("clients")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Client[];
}

export async function fetchClient(userId: string, id: string): Promise<Client | null> {
  if (isDemoMode()) return demo.getClients(userId).find((c) => c.id === id) ?? null;
  const client = await sb();
  if (!client) return null;
  const { data } = await client
    .from("clients")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  return (data as Client) ?? null;
}

export async function fetchClientWithRelations(
  userId: string,
  id: string,
): Promise<Client & { opportunities: Opportunity[]; projects: Project[]; activities: Activity[]; follow_ups: FollowUp[] } | null> {
  const clientRow = await fetchClient(userId, id);
  if (!clientRow) return null;
  const [opportunities, projects, activities, follow_ups] = await Promise.all([
    fetchOpportunities(userId),
    fetchProjects(userId),
    fetchActivities(userId),
    fetchFollowUps(userId),
  ]);
  return {
    ...clientRow,
    opportunities: opportunities.filter((o) => o.client_id === id),
    projects: projects.filter((p) => p.client_id === id),
    activities: activities.filter(
      (a) => a.entity_type === "client" && a.entity_id === id,
    ),
    follow_ups: follow_ups.filter((f) => f.client_id === id),
  };
}

export async function createClient(userId: string, input: ClientInput): Promise<Client | null> {
  const row = {
    ...input,
    user_id: userId,
    tags: input.tags ?? [],
    lead_score: input.lead_score ?? null,
    country: input.country ?? null,
    industry: input.industry ?? null,
    website: input.website ?? null,
    linkedin_url: input.linkedin_url ?? null,
    main_problem_found: input.main_problem_found ?? null,
    website_review_notes: input.website_review_notes ?? null,
    source: input.source ?? null,
    outreach_status: input.outreach_status ?? "New",
    email_verified: input.email_verified ?? false,
    last_email_sent_at: input.last_email_sent_at ?? null,
    next_follow_up_date: input.next_follow_up_date ?? null,
    follow_up_count: input.follow_up_count ?? 0,
    owner_id: input.owner_id ?? null,
  };
  if (isDemoMode()) {
    return demo.insert("clients", row as unknown as Client);
  }
  const client = await sb();
  if (!client) return null;
  const { data, error } = await client.from("clients").insert(row).select().single();
  if (error) throw new Error(error.message);
  return data as Client;
}

export async function updateClient(
  userId: string,
  id: string,
  patch: Partial<Client>,
): Promise<Client | null> {
  if (isDemoMode()) {
    demo.updateById("clients", id, patch);
    return demo.getClients(userId).find((c) => c.id === id) ?? null;
  }
  const client = await sb();
  if (!client) return null;
  const { data, error } = await client
    .from("clients")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Client;
}

export async function deleteClient(userId: string, id: string): Promise<boolean> {
  if (isDemoMode()) return demo.removeById("clients", id);
  const client = await sb();
  if (!client) return false;
  const { error } = await client.from("clients").delete().eq("user_id", userId).eq("id", id);
  return !error;
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------
export type ProjectInput = Omit<Project, "id" | "user_id" | "created_at" | "updated_at">;

export async function fetchProjects(userId: string): Promise<Project[]> {
  if (isDemoMode()) return demo.getProjects(userId);
  const client = await sb();
  if (!client) return [];
  const { data } = await client
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("order_date", { ascending: false });
  return (data ?? []) as Project[];
}

export interface ProjectWithWorkspace extends Project {
  milestones: Milestone[];
  todos: ProjectTodo[];
  credentials: ProjectCredential[];
  expenses: ProjectExpense[];
  team: ProjectTeamMember[];
  time_entries: TimeEntry[];
}

export async function fetchProject(
  userId: string,
  id: string,
): Promise<ProjectWithWorkspace | null> {
  if (isDemoMode()) {
    const p = demo.getProjects(userId).find((x) => x.id === id);
    if (!p) return null;
    return {
      ...p,
      milestones: demo.getMilestones(userId, id),
      todos: demo.getProjectTodos(userId, id),
      credentials: demo.getProjectCredentials(userId, id),
      expenses: demo.getProjectExpenses(userId, id),
      team: demo.getProjectTeamMembers(userId, id),
      time_entries: demo.getTimeEntries(userId, id),
    };
  }
  const client = await sb();
  if (!client) return null;
  const { data } = await client
    .from("projects")
    .select("*, milestones:milestones(*)")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const project = data as unknown as Project;
  const [todos, credentials, team, time_entries, expenses] = await Promise.all([
    fetchProjectTodos(userId, id),
    fetchProjectCredentials(userId, id),
    fetchProjectTeam(userId, id),
    fetchProjectTimeEntries(userId, id),
    fetchProjectExpenses(userId, id),
  ]);
  return {
    ...project,
    milestones: (project as ProjectWithWorkspace).milestones ?? [],
    todos,
    credentials,
    expenses,
    team,
    time_entries,
  };
}

export async function createProject(
  userId: string,
  input: Partial<ProjectInput>,
): Promise<Project | null> {
  const row: ProjectInput = {
    opportunity_id: input.opportunity_id ?? null,
    client_id: input.client_id ?? null,
    account_id: input.account_id ?? null,
    project_name: input.project_name ?? "Untitled project",
    order_date: input.order_date ?? new Date().toISOString().slice(0, 10),
    assigned_to: input.assigned_to ?? null,
    developer: input.developer ?? null,
    website_link: input.website_link ?? null,
    project_type: input.project_type ?? null,
    delivery_deadline: input.delivery_deadline ?? null,
    gross_amount: input.gross_amount ?? 0,
    fee_percent: input.fee_percent ?? 20,
    fee_amount: input.fee_amount ?? 0,
    net_amount: input.net_amount ?? 0,
    bonus: input.bonus ?? 0,
    status: input.status ?? "wip",
    priority: input.priority ?? "medium",
    progress: input.progress ?? 0,
    notes: input.notes ?? null,
  };
  if (isDemoMode()) {
    const project = demo.insert("projects", { ...row, user_id: userId } as unknown as Project);
    demo.insert("activities", {
      user_id: userId,
      entity_type: "project",
      entity_id: project.id,
      activity_type: "system",
      subject: `Project created: ${project.project_name}`,
      body: "Added to order tracking.",
      metadata: {},
      created_at: new Date().toISOString(),
    } as unknown as Activity);
    return project;
  }
  const client = await sb();
  if (!client) return null;
  const { data, error } = await client
    .from("projects")
    .insert({ ...row, user_id: userId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Project;
}

export async function updateProject(
  userId: string,
  id: string,
  patch: Partial<Project>,
): Promise<Project | null> {
  if (isDemoMode()) {
    demo.updateById("projects", id, patch);
    return demo.getProjects(userId).find((p) => p.id === id) ?? null;
  }
  const client = await sb();
  if (!client) return null;
  const { data, error } = await client
    .from("projects")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Project;
}

export async function deleteProject(userId: string, id: string): Promise<boolean> {
  if (isDemoMode()) {
    for (const m of demo.getMilestones(userId, id)) demo.removeById("milestones", m.id);
    return demo.removeById("projects", id);
  }
  const client = await sb();
  if (!client) return false;
  const { error } = await client.from("projects").delete().eq("user_id", userId).eq("id", id);
  return !error;
}

export async function setProjectStatus(
  userId: string,
  id: string,
  status: ProjectStatus,
): Promise<Project | null> {
  const project = await updateProject(userId, id, { status });
  if (project) {
    await logActivity(
      userId,
      "project",
      id,
      "status_change",
      `Project status changed`,
      `Moved to ${status}`,
    );
  }
  return project;
}

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------
export async function createMilestone(
  userId: string,
  projectId: string,
  input: { title: string; due_date?: string | null },
): Promise<Milestone | null> {
  const project = await fetchProject(userId, projectId);
  const orderIndex = project?.milestones.length ?? 0;
  const row = {
    user_id: userId,
    project_id: projectId,
    title: input.title,
    due_date: input.due_date ?? null,
    description: null,
    order_index: orderIndex,
    status: "pending" as MilestoneStatus,
    completed_at: null,
  };
  if (isDemoMode()) {
    return demo.insert("milestones", row as unknown as Milestone);
  }
  const client = await sb();
  if (!client) return null;
  const { data, error } = await client.from("milestones").insert(row).select().single();
  if (error) throw new Error(error.message);
  return data as Milestone;
}

export async function updateMilestone(
  userId: string,
  id: string,
  patch: Partial<Milestone>,
): Promise<Milestone | null> {
  if (isDemoMode()) {
    demo.updateById("milestones", id, patch);
    return demo.loadDB().milestones.find((m) => m.id === id) ?? null;
  }
  const client = await sb();
  if (!client) return null;
  const { data, error } = await client
    .from("milestones")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Milestone;
}

export async function deleteMilestone(userId: string, id: string): Promise<boolean> {
  if (isDemoMode()) return demo.removeById("milestones", id);
  const client = await sb();
  if (!client) return false;
  const { error } = await client.from("milestones").delete().eq("user_id", userId).eq("id", id);
  return !error;
}

// Every milestone for the user (used by the Calendar page to render milestone
// due dates). Demo getter already supports an undefined projectId.
export async function fetchMilestones(userId: string): Promise<Milestone[]> {
  if (isDemoMode()) return demo.getMilestones(userId);
  const client = await sb();
  if (!client) return [];
  const { data } = await client
    .from("milestones")
    .select("*")
    .eq("user_id", userId);
  return (data ?? []) as Milestone[];
}

// ---------------------------------------------------------------------------
// Project to-dos
// ---------------------------------------------------------------------------
export async function fetchProjectTodos(userId: string, projectId: string): Promise<ProjectTodo[]> {
  if (isDemoMode()) return demo.getProjectTodos(userId, projectId);
  const client = await sb();
  if (!client) return [];
  const { data } = await client
    .from("project_todos")
    .select("*")
    .eq("project_id", projectId)
    .order("order_index", { ascending: true });
  return (data ?? []) as ProjectTodo[];
}

export async function createProjectTodo(
  userId: string,
  projectId: string,
  input: {
    title: string;
    due_date?: string | null;
    assignee?: string | null;
    description?: string | null;
  },
): Promise<ProjectTodo | null> {
  const project = await fetchProject(userId, projectId);
  const orderIndex = project?.todos.length ?? 0;
  const row = {
    user_id: userId,
    project_id: projectId,
    title: input.title,
    description: input.description ?? null,
    status: "pending" as MilestoneStatus,
    due_date: input.due_date ?? null,
    assignee: input.assignee ?? null,
    order_index: orderIndex,
  };
  if (isDemoMode()) {
    return demo.insert("project_todos", row as unknown as ProjectTodo);
  }
  const client = await sb();
  if (!client) return null;
  const { data, error } = await client.from("project_todos").insert(row).select().single();
  if (error) throw new Error(error.message);
  return data as ProjectTodo;
}

export async function updateProjectTodo(
  userId: string,
  id: string,
  patch: Partial<ProjectTodo>,
): Promise<ProjectTodo | null> {
  if (isDemoMode()) {
    demo.updateById("project_todos", id, patch);
    return demo.loadDB().project_todos.find((t) => t.id === id) ?? null;
  }
  const client = await sb();
  if (!client) return null;
  const { data, error } = await client
    .from("project_todos")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as ProjectTodo;
}

export async function deleteProjectTodo(userId: string, id: string): Promise<boolean> {
  if (isDemoMode()) return demo.removeById("project_todos", id);
  const client = await sb();
  if (!client) return false;
  const { error } = await client
    .from("project_todos")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  return !error;
}

// ---------------------------------------------------------------------------
// Time tracking (timesheet rows per project)
// ---------------------------------------------------------------------------
export interface TimeEntryInput {
  date: string; // YYYY-MM-DD
  hours: number;
  description?: string | null;
  assignee?: string | null;
  billable?: boolean;
}

// All time entries for the user — used by the Calendar page and the projects
// list (per-project hour totals), newest first.
export async function fetchTimeEntries(userId: string): Promise<TimeEntry[]> {
  if (isDemoMode()) return demo.getTimeEntries(userId);
  const client = await sb();
  if (!client) return [];
  const { data } = await client
    .from("time_entries")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  return (data ?? []) as TimeEntry[];
}

export async function fetchProjectTimeEntries(
  userId: string,
  projectId: string,
): Promise<TimeEntry[]> {
  if (isDemoMode()) return demo.getTimeEntries(userId, projectId);
  const client = await sb();
  if (!client) return [];
  const { data } = await client
    .from("time_entries")
    .select("*")
    .eq("project_id", projectId)
    .order("date", { ascending: false });
  return (data ?? []) as TimeEntry[];
}

export async function createTimeEntry(
  userId: string,
  projectId: string,
  input: TimeEntryInput,
): Promise<TimeEntry | null> {
  const row = {
    user_id: userId,
    project_id: projectId,
    date: input.date,
    hours: input.hours,
    description: input.description ?? null,
    assignee: input.assignee ?? null,
    billable: input.billable ?? true,
  };
  if (isDemoMode()) {
    return demo.insert("time_entries", row as unknown as TimeEntry);
  }
  const client = await sb();
  if (!client) return null;
  const { data, error } = await client.from("time_entries").insert(row).select().single();
  if (error) throw new Error(error.message);
  return data as TimeEntry;
}

export async function updateTimeEntry(
  userId: string,
  id: string,
  patch: Partial<TimeEntry>,
): Promise<TimeEntry | null> {
  if (isDemoMode()) {
    demo.updateById("time_entries", id, patch);
    return demo.loadDB().time_entries.find((t) => t.id === id) ?? null;
  }
  const client = await sb();
  if (!client) return null;
  const { data, error } = await client
    .from("time_entries")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as TimeEntry;
}

export async function deleteTimeEntry(userId: string, id: string): Promise<boolean> {
  if (isDemoMode()) return demo.removeById("time_entries", id);
  const client = await sb();
  if (!client) return false;
  const { error } = await client
    .from("time_entries")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  return !error;
}

// ---------------------------------------------------------------------------
// Project credentials (client logins / access details)
// ---------------------------------------------------------------------------
export async function fetchProjectCredentials(
  userId: string,
  projectId: string,
): Promise<ProjectCredential[]> {
  if (isDemoMode()) return demo.getProjectCredentials(userId, projectId);
  const client = await sb();
  if (!client) return [];
  const { data } = await client
    .from("project_credentials")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  return (data ?? []) as ProjectCredential[];
}

export async function createProjectCredential(
  userId: string,
  projectId: string,
  input: {
    title: string;
    url?: string | null;
    username?: string | null;
    password?: string | null;
    notes?: string | null;
  },
): Promise<ProjectCredential | null> {
  const row = {
    user_id: userId,
    project_id: projectId,
    title: input.title,
    url: input.url ?? null,
    username: input.username ?? null,
    // Encrypt client logins before they touch the database.
    password: input.password ? encryptSecret(input.password) : null,
    notes: input.notes ?? null,
  };
  if (isDemoMode()) {
    return demo.insert("project_credentials", row as unknown as ProjectCredential);
  }
  const client = await sb();
  if (!client) return null;
  const { data, error } = await client.from("project_credentials").insert(row).select().single();
  if (error) throw new Error(error.message);
  return data as ProjectCredential;
}

// Fetch just the password for one credential. Used by the reveal-on-demand
// server action so plaintext passwords never reach the client payload.
export async function getProjectCredentialPassword(
  userId: string,
  id: string,
): Promise<string | null> {
  let stored: string | null | undefined;
  if (isDemoMode()) {
    const db = demo.loadDB();
    const cred = db.project_credentials.find((c) => c.id === id);
    if (!cred) return null;
    // Only reveal when the caller owns the credential's project (seeded rows
    // carry the workspace owner id, so check ownership via the scoped list).
    if (cred.user_id !== userId && !demo.getProjects(userId).some((p) => p.id === cred.project_id)) {
      return null;
    }
    stored = cred.password ?? null;
  } else {
    const client = await sb();
    if (!client) return null;
    const { data } = await client
      .from("project_credentials")
      .select("password")
      .eq("user_id", userId)
      .eq("id", id)
      .maybeSingle();
    stored = (data?.password as string | null | undefined) ?? null;
  }
  if (stored == null) return null;
  // Decrypt on reveal; legacy plaintext rows pass through unchanged.
  return decryptSecret(stored);
}

export async function updateProjectCredential(
  userId: string,
  id: string,
  patch: Partial<ProjectCredential>,
): Promise<ProjectCredential | null> {
  // Never mutate the caller's patch: clone it and encrypt any password field.
  const safePatch =
    patch.password === undefined
      ? patch
      : { ...patch, password: patch.password ? encryptSecret(patch.password) : null };
  if (isDemoMode()) {
    demo.updateById("project_credentials", id, safePatch);
    return demo.loadDB().project_credentials.find((c) => c.id === id) ?? null;
  }
  const client = await sb();
  if (!client) return null;
  const { data, error } = await client
    .from("project_credentials")
    .update(safePatch)
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as ProjectCredential;
}

export async function deleteProjectCredential(userId: string, id: string): Promise<boolean> {
  if (isDemoMode()) return demo.removeById("project_credentials", id);
  const client = await sb();
  if (!client) return false;
  const { error } = await client
    .from("project_credentials")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  return !error;
}

// ---------------------------------------------------------------------------
// Project team roster
// ---------------------------------------------------------------------------
export async function fetchProjectTeam(
  userId: string,
  projectId: string,
): Promise<ProjectTeamMember[]> {
  if (isDemoMode()) return demo.getProjectTeamMembers(userId, projectId);
  const client = await sb();
  if (!client) return [];
  const { data } = await client
    .from("project_team_members")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  return (data ?? []) as ProjectTeamMember[];
}

export async function addProjectTeamMember(
  userId: string,
  projectId: string,
  input: { team_member_id?: string | null; name: string; role_label: string },
): Promise<ProjectTeamMember | null> {
  const row = {
    user_id: userId,
    project_id: projectId,
    team_member_id: input.team_member_id ?? null,
    name: input.name,
    role_label: input.role_label,
  };
  if (isDemoMode()) {
    return demo.insert("project_team_members", row as unknown as ProjectTeamMember);
  }
  const client = await sb();
  if (!client) return null;
  const { data, error } = await client.from("project_team_members").insert(row).select().single();
  if (error) throw new Error(error.message);
  return data as ProjectTeamMember;
}

export async function removeProjectTeamMember(userId: string, id: string): Promise<boolean> {
  if (isDemoMode()) return demo.removeById("project_team_members", id);
  const client = await sb();
  if (!client) return false;
  const { error } = await client
    .from("project_team_members")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  return !error;
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------
export type InvoiceInput = Omit<Invoice, "id" | "user_id" | "created_at" | "updated_at">;

export async function fetchInvoices(userId: string): Promise<Invoice[]> {
  if (isDemoMode()) return demo.getInvoices(userId);
  const client = await sb();
  if (!client) return [];
  const { data } = await client
    .from("invoices")
    .select("*")
    .eq("user_id", userId)
    .order("issue_date", { ascending: false });
  return (data ?? []) as Invoice[];
}

export async function fetchInvoiceItems(
  userId: string,
  invoiceId: string,
): Promise<InvoiceItem[]> {
  if (isDemoMode()) return demo.getInvoiceItems(userId, invoiceId);
  const client = await sb();
  if (!client) return [];
  const { data } = await client
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", invoiceId);
  return (data ?? []) as InvoiceItem[];
}

export async function createInvoice(userId: string, input: InvoiceInput): Promise<Invoice | null> {
  const row = { ...input, user_id: userId };
  if (isDemoMode()) {
    const invoice = demo.insert("invoices", row as unknown as Invoice);
    demo.insert("activities", {
      user_id: userId,
      entity_type: "invoice",
      entity_id: invoice.id,
      activity_type: "invoice",
      subject: `Invoice created: ${invoice.invoice_number}`,
      body: `Amount ${invoice.amount}`,
      metadata: {},
      created_at: new Date().toISOString(),
    } as unknown as Activity);
    return invoice;
  }
  const client = await sb();
  if (!client) return null;
  const { data, error } = await client.from("invoices").insert(row).select().single();
  if (error) throw new Error(error.message);
  return data as Invoice;
}

export async function updateInvoice(
  userId: string,
  id: string,
  patch: Partial<Invoice>,
): Promise<Invoice | null> {
  if (isDemoMode()) {
    demo.updateById("invoices", id, patch);
    return demo.getInvoices(userId).find((i) => i.id === id) ?? null;
  }
  const client = await sb();
  if (!client) return null;
  const { data, error } = await client
    .from("invoices")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Invoice;
}

export async function deleteInvoice(userId: string, id: string): Promise<boolean> {
  if (isDemoMode()) return demo.removeById("invoices", id);
  const client = await sb();
  if (!client) return false;
  const { error } = await client.from("invoices").delete().eq("user_id", userId).eq("id", id);
  return !error;
}

// ---------------------------------------------------------------------------
// Project Expenses (cost tracking for accurate profit calculation)
// ---------------------------------------------------------------------------
export type ProjectExpenseInput = Omit<ProjectExpense, "id" | "user_id" | "created_at" | "updated_at">;

export async function fetchProjectExpenses(userId: string, projectId: string): Promise<ProjectExpense[]> {
  if (isDemoMode()) return demo.getProjectExpenses(userId, projectId);
  const client = await sb();
  if (!client) return [];
  const { data } = await client
    .from("project_expenses")
    .select("*")
    .eq("project_id", projectId)
    .order("date", { ascending: false });
  return (data ?? []) as ProjectExpense[];
}

export async function fetchAllExpenses(userId: string): Promise<ProjectExpense[]> {
  if (isDemoMode()) return demo.getAllExpenses(userId);
  const client = await sb();
  if (!client) return [];
  const { data } = await client
    .from("project_expenses")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  return (data ?? []) as ProjectExpense[];
}

export async function createProjectExpense(userId: string, input: ProjectExpenseInput): Promise<ProjectExpense | null> {
  const row = { ...input, user_id: userId };
  if (isDemoMode()) {
    return demo.insert("project_expenses", row as unknown as ProjectExpense);
  }
  const client = await sb();
  if (!client) return null;
  const { data, error } = await client.from("project_expenses").insert(row).select().single();
  if (error) throw new Error(error.message);
  return data as ProjectExpense;
}

export async function updateProjectExpense(userId: string, id: string, patch: Partial<ProjectExpense>): Promise<ProjectExpense | null> {
  if (isDemoMode()) {
    demo.updateById("project_expenses", id, patch);
    return demo.loadDB().project_expenses.find((e) => e.id === id) ?? null;
  }
  const client = await sb();
  if (!client) return null;
  const { data, error } = await client
    .from("project_expenses")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as ProjectExpense;
}

export async function deleteProjectExpense(userId: string, id: string): Promise<boolean> {
  if (isDemoMode()) return demo.removeById("project_expenses", id);
  const client = await sb();
  if (!client) return false;
  const { error } = await client.from("project_expenses").delete().eq("user_id", userId).eq("id", id);
  return !error;
}

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------
export async function fetchActivities(userId: string, limit = 50): Promise<Activity[]> {
  if (isDemoMode()) return demo.getActivities(userId, limit);
  const client = await sb();
  if (!client) return [];
  const { data } = await client
    .from("activities")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Activity[];
}

/**
 * Workspace-wide activity feed (used by the CEO dashboard). Includes the
 * viewer's own actions plus those of their team members.
 *
 * Demo mode: every row belongs to the single workspace owner, so this returns
 * all activities with the actor name read from metadata (seeded team rows).
 *
 * Supabase: RLS (activities_workspace_select) scopes the read to the viewer +
 * their team; actor names are resolved from the team roster via the service
 * role (team member email -> auth user id -> roster name). Falls back to a
 * null actor (or metadata.actor) when the key is unavailable, so the feed
 * never breaks.
 */
export async function fetchTeamActivities(
  userId: string,
  limit = 50,
): Promise<ActivityWithActor[]> {
  if (isDemoMode()) {
    return demo.getActivities(userId, limit).map((a) => ({
      ...a,
      actor_name: activityActorName(a),
    }));
  }
  const client = await sb();
  if (!client) return [];
  const [activitiesRes, teamRes] = await Promise.all([
    client
      .from("activities")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit),
    client
      .from("team_members")
      .select("name, email")
      .eq("user_id", userId)
      .eq("is_active", true),
  ]);
  const rows = (activitiesRes.data ?? []) as Activity[];
  const team = (teamRes.data ?? []) as Array<{ name: string; email: string | null }>;
  const fallback = (): ActivityWithActor[] =>
    rows.map((a) => ({ ...a, actor_name: activityActorName(a) }));
  const emails = team
    .map((t) => t.email?.toLowerCase())
    .filter((e): e is string => Boolean(e));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (rows.length === 0 || emails.length === 0 || !url || !serviceKey) return fallback();
  try {
    const admin = createSupabaseAdmin(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: authUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const emailToUid = new Map<string, string>();
    for (const u of authUsers?.users ?? []) {
      if (u.email) emailToUid.set(u.email.toLowerCase(), u.id);
    }
    const uidToName = new Map<string, string>();
    for (const t of team) {
      const uid = t.email ? emailToUid.get(t.email.toLowerCase()) : undefined;
      if (uid) uidToName.set(uid, t.name);
    }
    return rows.map((a) => ({
      ...a,
      actor_name: uidToName.get(a.user_id) ?? activityActorName(a),
    }));
  } catch {
    return fallback();
  }
}

export async function logActivity(
  userId: string,
  entityType: EntityType,
  entityId: string,
  activityType: ActivityType,
  subject: string,
  body?: string,
): Promise<Activity | null> {
  const row = {
    user_id: userId,
    entity_type: entityType,
    entity_id: entityId,
    activity_type: activityType,
    subject,
    body: body ?? null,
    metadata: {},
  };
  if (isDemoMode()) {
    return demo.insert("activities", { ...row, created_at: new Date().toISOString() } as unknown as Activity);
  }
  const client = await sb();
  if (!client) return null;
  const { data, error } = await client.from("activities").insert(row).select().single();
  if (error) throw new Error(error.message);
  return data as Activity;
}

// ---------------------------------------------------------------------------
// Follow-ups
// ---------------------------------------------------------------------------
export async function fetchFollowUps(userId: string): Promise<FollowUp[]> {
  if (isDemoMode()) return demo.getFollowUps(userId);
  const client = await sb();
  if (!client) return [];
  const { data } = await client
    .from("follow_ups")
    .select("*")
    .eq("user_id", userId)
    .order("scheduled_at", { ascending: true });
  return (data ?? []) as FollowUp[];
}

export async function updateFollowUp(
  userId: string,
  id: string,
  patch: Partial<FollowUp>,
): Promise<FollowUp | null> {
  if (isDemoMode()) {
    demo.updateById("follow_ups", id, patch);
    return demo.getFollowUps(userId).find((f) => f.id === id) ?? null;
  }
  const client = await sb();
  if (!client) return null;
  const { data, error } = await client
    .from("follow_ups")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as FollowUp;
}

// ---------------------------------------------------------------------------
// Email templates
// ---------------------------------------------------------------------------
export async function fetchTemplates(userId: string): Promise<EmailTemplate[]> {
  if (isDemoMode()) return demo.getTemplates(userId);
  const client = await sb();
  if (!client) return [];
  const { data } = await client
    .from("email_templates")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as EmailTemplate[];
}

export async function saveTemplate(
  userId: string,
  input: Omit<EmailTemplate, "id" | "user_id" | "created_at" | "updated_at">,
): Promise<EmailTemplate | null> {
  if (isDemoMode()) {
    return demo.insert("email_templates", { ...input, user_id: userId } as unknown as EmailTemplate);
  }
  const client = await sb();
  if (!client) return null;
  const { data, error } = await client.from("email_templates").insert({ ...input, user_id: userId }).select().single();
  if (error) throw new Error(error.message);
  return data as EmailTemplate;
}

export async function updateTemplate(
  userId: string,
  id: string,
  patch: Partial<EmailTemplate>,
): Promise<EmailTemplate | null> {
  if (isDemoMode()) {
    demo.updateById("email_templates", id, patch);
    return demo.getTemplates(userId).find((t) => t.id === id) ?? null;
  }
  const client = await sb();
  if (!client) return null;
  const { data, error } = await client.from("email_templates").update(patch).eq("user_id", userId).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data as EmailTemplate;
}

export async function deleteTemplate(userId: string, id: string): Promise<boolean> {
  if (isDemoMode()) return demo.removeById("email_templates", id);
  const client = await sb();
  if (!client) return false;
  const { error } = await client.from("email_templates").delete().eq("user_id", userId).eq("id", id);
  return !error;
}

// ---------------------------------------------------------------------------
// Automation rules
// ---------------------------------------------------------------------------
export async function fetchAutomations(userId: string): Promise<AutomationRule[]> {
  if (isDemoMode()) return demo.getAutomations(userId);
  const client = await sb();
  if (!client) return [];
  const { data } = await client
    .from("automation_rules")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as AutomationRule[];
}

export async function saveAutomation(
  userId: string,
  input: Omit<AutomationRule, "id" | "user_id" | "created_at" | "updated_at">,
): Promise<AutomationRule | null> {
  if (isDemoMode()) {
    return demo.insert("automation_rules", { ...input, user_id: userId } as unknown as AutomationRule);
  }
  const client = await sb();
  if (!client) return null;
  const { data, error } = await client.from("automation_rules").insert({ ...input, user_id: userId }).select().single();
  if (error) throw new Error(error.message);
  return data as AutomationRule;
}

export async function updateAutomation(
  userId: string,
  id: string,
  patch: Partial<AutomationRule>,
): Promise<AutomationRule | null> {
  if (isDemoMode()) {
    demo.updateById("automation_rules", id, patch);
    return demo.getAutomations(userId).find((a) => a.id === id) ?? null;
  }
  const client = await sb();
  if (!client) return null;
  const { data, error } = await client.from("automation_rules").update(patch).eq("user_id", userId).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data as AutomationRule;
}

export async function deleteAutomation(userId: string, id: string): Promise<boolean> {
  if (isDemoMode()) return demo.removeById("automation_rules", id);
  const client = await sb();
  if (!client) return false;
  const { error } = await client.from("automation_rules").delete().eq("user_id", userId).eq("id", id);
  return !error;
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------
export interface ImportResult {
  run: ImportRun;
}

export async function runImport(
  userId: string,
  entityType: ImportEntity,
  file_name: string,
  rows: Array<Record<string, unknown>>,
): Promise<ImportResult> {
  const failures: Array<{ row: number; error: string }> = [];
  let imported = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    try {
      if (entityType === "projects") {
        // Validate enum columns BEFORE any side effects so a bad row can
        // never create an orphan client or record with an invalid status.
        const statusRes = normalizeEnum(
          row.status,
          IMPORT_ENUMS.projectStatus,
          "wip" as ProjectStatus,
        );
        if (statusRes.error) throw new Error(`status: ${statusRes.error}`);
        const priorityRes = normalizeEnum(
          row.priority,
          IMPORT_ENUMS.priority,
          "medium" as Project["priority"],
        );
        if (priorityRes.error) throw new Error(`priority: ${priorityRes.error}`);
        const orderDateRes = normalizeDate(row.order_date);
        if (orderDateRes.error) throw new Error(`order_date: ${orderDateRes.error}`);
        const deadlineRes = normalizeDate(row.delivery_deadline);
        if (deadlineRes.error) throw new Error(`delivery_deadline: ${deadlineRes.error}`);
        const grossRes = normalizeNumber(row.gross_amount, 0, { nonNegative: true });
        if (grossRes.error) throw new Error(`gross_amount: ${grossRes.error}`);

        let clientId: string | null = null;
        if (row.client_name) {
          const name = String(row.client_name).trim();
          const existing = (await fetchClients(userId)).find(
            (c) => c.name.toLowerCase() === name.toLowerCase(),
          );
          if (existing) {
            clientId = existing.id;
          } else {
            const created = await createClient(userId, {
              name,
              email: null,
              company: null,
              platform: null,
              username: null,
              profile_url: null,
              category: row.client_category ? String(row.client_category) : null,
              account_id: null,
              tags: [],
              notes: null,
            });
            clientId = created?.id ?? null;
          }
        }
        const feePercentRes = normalizePercent(row.fee_percent, 20);
        if (feePercentRes.error) throw new Error(`fee_percent: ${feePercentRes.error}`);
        const progressRes = normalizePercent(row.progress, 0);
        if (progressRes.error) throw new Error(`progress: ${progressRes.error}`);
        const gross = grossRes.value;
        const feePercent = feePercentRes.value;
        const progress = progressRes.value;
        await createProject(userId, {
          project_name: String(row.project_name ?? row.title ?? "Untitled"),
          client_id: clientId,
          account_id: null,
          order_date: orderDateRes.value ?? undefined,
          assigned_to: row.assigned_to ? String(row.assigned_to) : undefined,
          developer: row.developer ? String(row.developer) : undefined,
          website_link: row.website_link ? String(row.website_link) : undefined,
          project_type: row.project_type ? String(row.project_type) : undefined,
          delivery_deadline: deadlineRes.value,
          gross_amount: gross,
          fee_percent: feePercent,
          fee_amount: Math.round(gross * (feePercent / 100) * 100) / 100,
          net_amount: Math.round(gross * (1 - feePercent / 100) * 100) / 100,
          bonus: Number(row.bonus ?? 0) || 0,
          status: statusRes.value,
          priority: priorityRes.value,
          progress,
          notes: row.notes ? String(row.notes) : undefined,
        });
      } else if (entityType === "opportunities") {
        const o = row as Partial<OpportunityInput>;
        if (!o.title) throw new Error("Missing title");
        // Validate enum columns BEFORE any side effects.
        const platformRes = normalizeEnum(
          row.platform,
          IMPORT_ENUMS.platform,
          "upwork" as Platform,
        );
        if (platformRes.error) throw new Error(`platform: ${platformRes.error}`);
        const typeRes = normalizeEnum(
          row.type,
          IMPORT_ENUMS.opportunityType,
          "bid" as OpportunityType,
        );
        if (typeRes.error) throw new Error(`type: ${typeRes.error}`);
        const stageRes = normalizeEnum(
          row.stage,
          IMPORT_ENUMS.stage,
          "lead" as OpportunityStage,
        );
        if (stageRes.error) throw new Error(`stage: ${stageRes.error}`);
        const statusRes = normalizeEnum<BidStatus | null>(
          row.status,
          IMPORT_ENUMS.bidStatus,
          null,
        );
        if (statusRes.error) throw new Error(`status: ${statusRes.error}`);
        const dueDateRes = normalizeDate(row.due_date);
        if (dueDateRes.error) throw new Error(`due_date: ${dueDateRes.error}`);
        const nextFollowUpRes = normalizeDate(row.next_follow_up);
        if (nextFollowUpRes.error) throw new Error(`next_follow_up: ${nextFollowUpRes.error}`);
        const amountRes = normalizeNumber(o.amount, 0, { nonNegative: true });
        if (amountRes.error) throw new Error(`amount: ${amountRes.error}`);
        const connectsRes = normalizeNumber(o.connects_spent, 0, { nonNegative: true });
        if (connectsRes.error) throw new Error(`connects_spent: ${connectsRes.error}`);

        let clientId: string | null = null;
        if (row.client_name) {
          const name = String(row.client_name).trim();
          const existing = (await fetchClients(userId)).find(
            (c) => c.name.toLowerCase() === name.toLowerCase(),
          );
          if (existing) {
            clientId = existing.id;
          } else {
            const created = await createClient(userId, {
              name,
              email: null,
              company: null,
              platform: platformRes.value,
              username: null,
              profile_url: null,
              category: row.client_category ? String(row.client_category) : null,
              account_id: null,
              tags: [],
              notes: null,
            });
            clientId = created?.id ?? null;
          }
        }
        await createOpportunity(userId, {
          title: String(o.title),
          description: o.description ? String(o.description) : null,
          client_id: clientId,
          account_id: null,
          platform: platformRes.value,
          type: typeRes.value,
          stage: stageRes.value,
          status: statusRes.value,
          amount: amountRes.value,
          currency: String(o.currency ?? "USD"),
          connects_spent: connectsRes.value,
          source_url: o.source_url ? String(o.source_url) : null,
          due_date: dueDateRes.value,
          next_follow_up: nextFollowUpRes.value,
          assigned_to: o.assigned_to ? String(o.assigned_to) : null,
          lost_reason: null,
          notes: o.notes ? String(o.notes) : null,
        });
      } else if (entityType === "clients") {
        if (!row.name) throw new Error("Missing name");
        const platformRes = normalizeEnum<Platform | null>(
          row.platform,
          IMPORT_ENUMS.platform,
          null,
        );
        if (platformRes.error) throw new Error(`platform: ${platformRes.error}`);
        // Validate outbound fields if present
        const leadScoreRes = normalizeEnum(row.lead_score, IMPORT_ENUMS.leadScore, null);
        if (leadScoreRes.error) throw new Error(`lead_score: ${leadScoreRes.error}`);
        const outreachStatusRes = normalizeEnum(row.outreach_status, IMPORT_ENUMS.outreachStatus, "New");
        if (outreachStatusRes.error) throw new Error(`outreach_status: ${outreachStatusRes.error}`);
        const countryRes = normalizeEnum(row.country, IMPORT_ENUMS.country, null);
        if (countryRes.error) throw new Error(`country: ${countryRes.error}`);
        const industryRes = normalizeEnum(row.industry, IMPORT_ENUMS.industry, null);
        if (industryRes.error) throw new Error(`industry: ${industryRes.error}`);
        const sourceRes = normalizeEnum(row.source, IMPORT_ENUMS.leadSource, null);
        if (sourceRes.error) throw new Error(`source: ${sourceRes.error}`);
        const nextFollowUpRes = normalizeDate(row.next_follow_up_date);
        if (nextFollowUpRes.error) throw new Error(`next_follow_up_date: ${nextFollowUpRes.error}`);
        await createClient(userId, {
          name: String(row.name),
          email: row.email ? String(row.email) : null,
          company: row.company ? String(row.company) : null,
          platform: platformRes.value,
          username: row.username ? String(row.username) : null,
          profile_url: row.profile_url ? String(row.profile_url) : null,
          category: row.category ? String(row.category) : null,
          account_id: null,
          tags: [],
          notes: row.notes ? String(row.notes) : null,
          // Outbound fields
          lead_score: (leadScoreRes.value as Client["lead_score"]),
          country: countryRes.value as string | null,
          industry: industryRes.value as string | null,
          website: row.website ? String(row.website) : null,
          linkedin_url: row.linkedin_url ? String(row.linkedin_url) : null,
          main_problem_found: row.main_problem_found ? String(row.main_problem_found) : null,
          website_review_notes: row.website_review_notes ? String(row.website_review_notes) : null,
          source: sourceRes.value as string | null,
          outreach_status: outreachStatusRes.value as Client["outreach_status"],
          email_verified: row.email_verified === true || row.email_verified === "true",
          last_email_sent_at: null,
          next_follow_up_date: nextFollowUpRes.value,
          follow_up_count: Number(row.follow_up_count) || 0,
          owner_id: null,
        });
      }
      imported++;
    } catch (e) {
      failures.push({ row: i + 1, error: e instanceof Error ? e.message : "Unknown error" });
    }
  }

  if (isDemoMode()) {
    const run = demo.insert("import_runs", {
      user_id: userId,
      entity_type: entityType,
      file_name,
      total_rows: rows.length,
      imported_rows: imported,
      failed_rows: failures.length,
      log: failures,
      created_at: new Date().toISOString(),
    } as unknown as ImportRun);
    demo.insert("activities", {
      user_id: userId,
      entity_type: "import",
      entity_id: run.id,
      activity_type: "import",
      subject: `Imported ${file_name}`,
      body: `${imported} of ${rows.length} rows imported.`,
      metadata: {},
      created_at: new Date().toISOString(),
    } as unknown as Activity);
    return { run };
  }

  const client = await sb();
  if (!client) return { run: { id: "", user_id: userId, entity_type: entityType, file_name, total_rows: rows.length, imported_rows: imported, failed_rows: failures.length, log: failures, created_at: new Date().toISOString() } };
  const { data, error } = await client
    .from("import_runs")
    .insert({
      user_id: userId,
      entity_type: entityType,
      file_name,
      total_rows: rows.length,
      imported_rows: imported,
      failed_rows: failures.length,
      log: failures,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { run: data as ImportRun };
}

export async function fetchImportRuns(userId: string): Promise<ImportRun[]> {
  if (isDemoMode()) return demo.getImportRuns(userId);
  const client = await sb();
  if (!client) return [];
  const { data } = await client
    .from("import_runs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as ImportRun[];
}

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------
export async function listAttachments(userId: string): Promise<Attachment[]> {
  if (isDemoMode()) return demo.loadDB().attachments.filter((a) => a.user_id === userId);
  const client = await sb();
  if (!client) return [];
  const { data } = await client.from("attachments").select("*").eq("user_id", userId);
  return (data ?? []) as Attachment[];
}

export async function fetchAttachmentsForEntity(
  userId: string,
  entityType: EntityType,
  entityId: string,
): Promise<Attachment[]> {
  const all = await listAttachments(userId);
  return all.filter((a) => a.entity_type === entityType && a.entity_id === entityId);
}

export async function registerAttachment(
  userId: string,
  entityType: EntityType,
  entityId: string,
  meta: Pick<Attachment, "file_name" | "file_path" | "file_size" | "mime_type">,
): Promise<Attachment | null> {
  if (isDemoMode()) {
    return demo.insert("attachments", { ...meta, user_id: userId, entity_type: entityType, entity_id: entityId, created_at: new Date().toISOString() } as unknown as Attachment);
  }
  const client = await sb();
  if (!client) return null;
  const { data, error } = await client
    .from("attachments")
    .insert({ user_id: userId, entity_type: entityType, entity_id: entityId, ...meta })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Attachment;
}

// ---------------------------------------------------------------------------
// Outbound Leads (cold email campaign)
// ---------------------------------------------------------------------------
export async function fetchOutboundLeads(userId: string): Promise<Client[]> {
  if (isDemoMode()) return demo.getOutboundLeads(userId);
  const client = await sb();
  if (!client) return [];
  const { data } = await client
    .from("clients")
    .select("*")
    .eq("user_id", userId)
    .not("outreach_status", "is", null)
    .order("next_follow_up_date", { ascending: true, nullsFirst: false });
  return (data ?? []) as Client[];
}

export async function updateOutreachStatus(
  userId: string,
  id: string,
  status: Client["outreach_status"],
): Promise<Client | null> {
  const patch: Partial<Client> = { outreach_status: status };
  // Auto-schedule next follow-up when marking as Contacted
  if (status === "Contacted") {
    const now = new Date();
    now.setDate(now.getDate() + 3);
    patch.next_follow_up_date = now.toISOString().slice(0, 10);
  }
  const result = await updateClient(userId, id, patch);
  if (result) {
    await logActivity(
      userId, "client", id, "status_change",
      `Outreach status changed to ${status}`,
    );
  }
  return result;
}

export async function markFollowUpSent(
  userId: string,
  id: string,
): Promise<Client | null> {
  const clients = await fetchClients(userId);
  const client = clients.find((c) => c.id === id);
  if (!client) return null;
  const count = (client.follow_up_count ?? 0) + 1;
  const now = new Date();
  let nextDate: string | null = null;
  // Schedule next follow-up based on count
  if (count === 1) {
    now.setDate(now.getDate() + 7);
    nextDate = now.toISOString().slice(0, 10);
  } else if (count === 2) {
    now.setDate(now.getDate() + 13);
    nextDate = now.toISOString().slice(0, 10);
  }
  // After 3 follow-ups, no more automatic scheduling (break-up sent)
  const patch: Partial<Client> = {
    follow_up_count: count,
    last_email_sent_at: new Date().toISOString(),
    next_follow_up_date: nextDate,
  };
  const result = await updateClient(userId, id, patch);
  if (result) {
    await logActivity(
      userId, "client", id, "follow_up",
      `Follow-up #${count} sent`,
      nextDate ? `Next follow-up scheduled: ${nextDate}` : "Break-up sequence complete",
    );
  }
  return result;
}

export async function updateLeadScore(
  userId: string,
  id: string,
  score: Client["lead_score"],
): Promise<Client | null> {
  return updateClient(userId, id, { lead_score: score });
}

export async function updateNextFollowUp(
  userId: string,
  id: string,
  date: string | null,
): Promise<Client | null> {
  return updateClient(userId, id, { next_follow_up_date: date });
}

export async function saveWebsiteReview(
  userId: string,
  id: string,
  mainProblem: string | null,
  reviewNotes: string | null,
): Promise<Client | null> {
  const result = await updateClient(userId, id, {
    main_problem_found: mainProblem,
    website_review_notes: reviewNotes,
  });
  if (result) {
    await logActivity(
      userId, "client", id, "note",
      "Website review updated",
      mainProblem ? `Main problem: ${mainProblem}` : undefined,
    );
  }
  return result;
}

export async function fetchClientsForOwner(userId: string): Promise<Client[]> {
  if (isDemoMode()) return demo.getClients(userId);
  const client = await sb();
  if (!client) return [];
  const { data } = await client
    .from("clients")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Client[];
}

// ---------------------------------------------------------------------------
// Notification webhooks
// ---------------------------------------------------------------------------
export async function fetchNotificationWebhooks(userId: string): Promise<WebhookConfig[]> {
  if (isDemoMode()) return demo.getNotificationWebhooks(userId);
  const client = await sb();
  if (!client) return [];
  const { data } = await client
    .from("notification_webhooks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as WebhookConfig[];
}

export async function createNotificationWebhook(
  userId: string,
  input: Omit<WebhookConfig, "id" | "user_id" | "created_at" | "updated_at">,
): Promise<WebhookConfig | null> {
  const row = { ...input, user_id: userId };
  if (isDemoMode()) {
    return demo.insert("notification_webhooks", row as unknown as WebhookConfig);
  }
  const client = await sb();
  if (!client) return null;
  const { data, error } = await client.from("notification_webhooks").insert(row).select().single();
  if (error) throw new Error(error.message);
  return data as WebhookConfig;
}

export async function updateNotificationWebhook(
  userId: string,
  id: string,
  patch: Partial<WebhookConfig>,
): Promise<WebhookConfig | null> {
  if (isDemoMode()) {
    demo.updateById("notification_webhooks", id, patch);
    return demo.getNotificationWebhooks(userId).find((w) => w.id === id) ?? null;
  }
  const client = await sb();
  if (!client) return null;
  const { data, error } = await client
    .from("notification_webhooks")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as WebhookConfig;
}

export async function deleteNotificationWebhook(userId: string, id: string): Promise<boolean> {
  if (isDemoMode()) return demo.removeById("notification_webhooks", id);
  const client = await sb();
  if (!client) return false;
  const { error } = await client
    .from("notification_webhooks")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  return !error;
}

// ---------------------------------------------------------------------------
// Client portals (magic-link)
// ---------------------------------------------------------------------------
export async function fetchClientPortals(userId: string): Promise<ClientPortal[]> {
  if (isDemoMode()) return demo.getClientPortals(userId);
  const client = await sb();
  if (!client) return [];
  const { data } = await client
    .from("client_portals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as ClientPortal[];
}

export async function createClientPortal(
  userId: string,
  input: { client_id: string; project_id?: string | null },
): Promise<ClientPortal | null> {
  const row = {
    user_id: userId,
    client_id: input.client_id,
    project_id: input.project_id ?? null,
    token: createPortalToken(),
    is_active: true,
    expires_at: null as string | null,
    last_viewed_at: null as string | null,
  };
  if (isDemoMode()) {
    return demo.insert("client_portals", row as unknown as ClientPortal);
  }
  const client = await sb();
  if (!client) return null;
  const { data, error } = await client.from("client_portals").insert(row).select().single();
  if (error) throw new Error(error.message);
  return data as ClientPortal;
}

export async function revokeClientPortal(userId: string, id: string): Promise<boolean> {
  if (isDemoMode()) {
    demo.updateById("client_portals", id, { is_active: false });
    return true;
  }
  const client = await sb();
  if (!client) return false;
  const { error } = await client
    .from("client_portals")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("id", id);
  return !error;
}

export async function fetchPortalByToken(token: string): Promise<ClientPortal | null> {
  if (!token) return null;
  if (isDemoMode()) {
    const portal = demo.getClientPortalByToken(token);
    if (!portal || !isPortalTokenValid(portal)) return null;
    return portal;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const { createClient } = await import("@supabase/supabase-js");
  const anon = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await anon
    .rpc("get_portal_by_token", { p_token: token })
    .maybeSingle<{
      portal_id: string;
      client_id: string;
      project_id: string | null;
      user_id: string;
      is_active: boolean;
      expires_at: string | null;
    }>();
  if (error || !data) return null;
  const portal: ClientPortal = {
    id: data.portal_id,
    user_id: data.user_id,
    client_id: data.client_id,
    project_id: data.project_id,
    token,
    is_active: data.is_active,
    expires_at: data.expires_at,
    last_viewed_at: null,
    created_at: "",
    updated_at: "",
  };
  if (!isPortalTokenValid(portal)) return null;
  return portal;
}

export async function addPortalSignature(
  portalId: string,
  signerName: string,
  signatureData: string,
): Promise<PortalSignature | null> {
  const row = {
    portal_id: portalId,
    signer_name: signerName,
    signature_data: signatureData,
  };
  if (isDemoMode()) {
    return demo.insert("portal_signatures", row as unknown as PortalSignature);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  const admin = createSupabaseAdmin(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin.from("portal_signatures").insert(row).select().single();
  if (error) throw new Error(error.message);
  return data as PortalSignature;
}

export async function fetchPortalSignatures(portalId: string): Promise<PortalSignature[]> {
  if (isDemoMode()) return demo.getPortalSignatures(portalId);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return [];
  const admin = createSupabaseAdmin(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data } = await admin
    .from("portal_signatures")
    .select("*")
    .eq("portal_id", portalId)
    .order("signed_at", { ascending: false });
  return (data ?? []) as PortalSignature[];
}
