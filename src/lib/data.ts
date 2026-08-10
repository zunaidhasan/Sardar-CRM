import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import * as demo from "@/lib/db/demo-store";
import { DEMO_PERSONAS } from "@/lib/db/demo-data";
import { isDemoMode } from "@/lib/utils";
import { isTeamRole } from "@/lib/demo-role";
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
  ProjectTeamMember,
  ProjectTodo,
  TeamMember,
  TeamRole,
} from "@/lib/types";

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
  teamMembers: TeamMember[];
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (isDemoMode()) {
    const db = demo.loadDB();
    const role = await getDemoRole();
    // Pick the team member matching the previewed role; fall back to the
    // built-in persona so every role switcher option has a stable identity.
    const matched = db.team_members.find((t) => t.role === role && t.is_active);
    const persona = matched
      ? { name: matched.name, email: matched.email ?? null, role: matched.role }
      : {
          name: DEMO_PERSONAS[role]?.name ?? null,
          email: DEMO_PERSONAS[role]?.email ?? null,
          role,
        };
    return {
      id: db.profile.id,
      email: persona.email ?? "demo@sardaritbd.com",
      name: persona.name ?? db.profile.full_name,
      // Sync the profile with the previewed persona so UI that reads
      // profile.full_name / profile.role (e.g. Settings) never shows a
      // different person than the one selected in the role switcher.
      profile: {
        ...db.profile,
        full_name: persona.name ?? db.profile.full_name,
        role: persona.role,
      },
      isDemo: true,
      role: persona.role,
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
  const teamMembers = (team ?? []) as TeamMember[];
  const me = teamMembers.find(
    (t) => t.email?.toLowerCase() === user.email?.toLowerCase() && t.is_active,
  );
  return {
    id: user.id,
    email: user.email ?? null,
    name: user.user_metadata?.full_name ?? null,
    profile: (profile as Profile) ?? null,
    isDemo: false,
    role: me?.role ?? "ceo",
    teamMembers,
  };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

// ---------------------------------------------------------------------------
// Demo persona (role switcher)
// In demo mode the signed-in workspace owner can preview the app as a
// specific team member role (CEO vs Executive) via a cookie.
// ---------------------------------------------------------------------------
export async function getDemoRole(): Promise<TeamRole> {
  if (!isDemoMode()) return "ceo";
  try {
    const { cookies } = await import("next/headers");
    const store = await cookies();
    const value = store.get("sardar_demo_role")?.value;
    if (isTeamRole(value)) return value;
  } catch {
    // cookies() unavailable (e.g. client context) -> default
  }
  return "ceo";
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
export type ClientInput = Omit<Client, "id" | "user_id" | "created_at" | "updated_at">;

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
  const row = { ...input, user_id: userId, tags: input.tags ?? [] };
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
  team: ProjectTeamMember[];
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
      team: demo.getProjectTeamMembers(userId, id),
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
  const [todos, credentials, team] = await Promise.all([
    fetchProjectTodos(userId, id),
    fetchProjectCredentials(userId, id),
    fetchProjectTeam(userId, id),
  ]);
  return {
    ...project,
    milestones: (project as ProjectWithWorkspace).milestones ?? [],
    todos,
    credentials,
    team,
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
    password: input.password ?? null,
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
  if (isDemoMode()) {
    return demo.loadDB().project_credentials.find((c) => c.id === id && c.user_id === userId)?.password ?? null;
  }
  const client = await sb();
  if (!client) return null;
  const { data } = await client
    .from("project_credentials")
    .select("password")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  return (data?.password as string | null | undefined) ?? null;
}

export async function updateProjectCredential(
  userId: string,
  id: string,
  patch: Partial<ProjectCredential>,
): Promise<ProjectCredential | null> {
  if (isDemoMode()) {
    demo.updateById("project_credentials", id, patch);
    return demo.loadDB().project_credentials.find((c) => c.id === id) ?? null;
  }
  const client = await sb();
  if (!client) return null;
  const { data, error } = await client
    .from("project_credentials")
    .update(patch)
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
