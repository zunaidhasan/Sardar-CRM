"use server";

import { revalidatePath } from "next/cache";
import * as data from "@/lib/data";
import type { OpportunityInput, ProjectInput } from "@/lib/data";
import type {
  Account,
  AutomationRule,
  ActivityType,
  Client,
  EmailTemplate,
  EntityType,
  Invoice,
  Milestone,
  MilestoneStatus,
  Opportunity,
  OpportunityStage,
  Project,
  ProjectCredential,
  ProjectTeamMember,
  ProjectTodo,
  TeamRole,
} from "@/lib/types";
import { resetDemo, demoDbPath } from "@/lib/db/demo-store";
import { generateProposal, type ProposalTone } from "@/lib/proposal";

type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Opportunities / Kanban
// ---------------------------------------------------------------------------
export async function createOpportunityAction(
  input: OpportunityInput,
): Promise<ActionResult<Opportunity>> {
  try {
    const user = await data.requireUser();
    const opp = await data.createOpportunity(user.id, input);
    if (!opp) return { ok: false, error: "Failed to create opportunity" };
    revalidatePath("/pipeline");
    revalidatePath("/dashboard");
    return { ok: true, data: opp };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create opportunity" };
  }
}

export async function moveOpportunityAction(
  id: string,
  stage: OpportunityStage,
): Promise<ActionResult<{ createdProjectId?: string }>> {
  try {
    const user = await data.requireUser();
    const result = await data.moveOpportunity(user.id, id, stage);
    if (!result.ok) return { ok: false, error: "Opportunity not found" };
    revalidatePath("/pipeline");
    revalidatePath("/dashboard");
    revalidatePath("/projects");
    return { ok: true, data: { createdProjectId: result.createdProjectId } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to move opportunity" };
  }
}

export async function updateOpportunityAction(
  id: string,
  patch: Partial<Opportunity>,
): Promise<ActionResult<Opportunity>> {
  try {
    const user = await data.requireUser();
    const opp = await data.updateOpportunity(user.id, id, patch);
    if (!opp) return { ok: false, error: "Opportunity not found" };
    revalidatePath("/pipeline");
    revalidatePath("/dashboard");
    return { ok: true, data: opp };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update opportunity" };
  }
}

export async function deleteOpportunityAction(id: string): Promise<ActionResult> {
  try {
    const user = await data.requireUser();
    await data.deleteOpportunity(user.id, id);
    revalidatePath("/pipeline");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete opportunity" };
  }
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------
export async function createClientAction(
  input: Omit<Client, "id" | "user_id" | "created_at" | "updated_at">,
): Promise<ActionResult<Client>> {
  try {
    const user = await data.requireUser();
    const client = await data.createClient(user.id, input);
    if (!client) return { ok: false, error: "Failed to create client" };
    revalidatePath("/clients");
    return { ok: true, data: client };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create client" };
  }
}

export async function updateClientAction(
  id: string,
  patch: Partial<Client>,
): Promise<ActionResult<Client>> {
  try {
    const user = await data.requireUser();
    const client = await data.updateClient(user.id, id, patch);
    if (!client) return { ok: false, error: "Client not found" };
    revalidatePath("/clients");
    revalidatePath(`/clients/${id}`);
    return { ok: true, data: client };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update client" };
  }
}

export async function deleteClientAction(id: string): Promise<ActionResult> {
  try {
    const user = await data.requireUser();
    await data.deleteClient(user.id, id);
    revalidatePath("/clients");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete client" };
  }
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------
export async function createProjectAction(
  input: Partial<ProjectInput>,
): Promise<ActionResult<Project>> {
  try {
    const user = await data.requireUser();
    const project = await data.createProject(user.id, input);
    if (!project) return { ok: false, error: "Failed to create project" };
    revalidatePath("/projects");
    revalidatePath("/dashboard");
    return { ok: true, data: project };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create project" };
  }
}

export async function updateProjectAction(
  id: string,
  patch: Partial<Project>,
): Promise<ActionResult<Project>> {
  try {
    const user = await data.requireUser();
    const project = await data.updateProject(user.id, id, patch);
    if (!project) return { ok: false, error: "Project not found" };
    revalidatePath("/projects");
    revalidatePath(`/projects/${id}`);
    revalidatePath("/dashboard");
    return { ok: true, data: project };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update project" };
  }
}

export async function deleteProjectAction(id: string): Promise<ActionResult> {
  try {
    const user = await data.requireUser();
    await data.deleteProject(user.id, id);
    revalidatePath("/projects");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete project" };
  }
}

export async function setProjectStatusAction(
  id: string,
  status: Project["status"],
): Promise<ActionResult> {
  try {
    const user = await data.requireUser();
    const project = await data.setProjectStatus(user.id, id, status);
    if (!project) return { ok: false, error: "Project not found" };
    revalidatePath(`/projects/${id}`);
    revalidatePath("/projects");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update status" };
  }
}

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------
export async function addMilestoneAction(
  projectId: string,
  title: string,
): Promise<ActionResult<Milestone>> {
  try {
    const user = await data.requireUser();
    const milestone = await data.createMilestone(user.id, projectId, { title });
    if (!milestone) return { ok: false, error: "Failed to create milestone" };
    revalidatePath(`/projects/${projectId}`);
    return { ok: true, data: milestone };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create milestone" };
  }
}

export async function toggleMilestoneAction(
  projectId: string,
  id: string,
  status: Milestone["status"],
): Promise<ActionResult> {
  try {
    const user = await data.requireUser();
    const patch: Partial<Milestone> = { status };
    if (status === "done") patch.completed_at = new Date().toISOString();
    else patch.completed_at = null;
    await data.updateMilestone(user.id, id, patch);
    const project = await data.fetchProject(user.id, projectId);
    if (project) {
      const total = project.milestones.length;
      const done = project.milestones.filter((m) => m.status === "done").length;
      const progress = total ? Math.round((done / total) * 100) : project.progress;
      await data.updateProject(user.id, projectId, { progress });
    }
    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/projects");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update milestone" };
  }
}

export async function deleteMilestoneAction(projectId: string, id: string): Promise<ActionResult> {
  try {
    const user = await data.requireUser();
    await data.deleteMilestone(user.id, id);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete milestone" };
  }
}

export async function updateProjectNotesAction(
  id: string,
  notes: string,
): Promise<ActionResult> {
  try {
    const user = await data.requireUser();
    await data.updateProject(user.id, id, { notes: notes.trim() ? notes : null });
    revalidatePath(`/projects/${id}`);
    revalidatePath("/projects");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save notes" };
  }
}

// ---------------------------------------------------------------------------
// Project to-dos
// ---------------------------------------------------------------------------
export async function addProjectTodoAction(
  projectId: string,
  input: { title: string; due_date?: string | null; assignee?: string | null },
): Promise<ActionResult<ProjectTodo>> {
  try {
    const user = await data.requireUser();
    const todo = await data.createProjectTodo(user.id, projectId, input);
    if (!todo) return { ok: false, error: "Failed to create todo" };
    revalidatePath(`/projects/${projectId}`);
    return { ok: true, data: todo };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create todo" };
  }
}

export async function setProjectTodoStatusAction(
  projectId: string,
  id: string,
  status: MilestoneStatus,
): Promise<ActionResult> {
  try {
    const user = await data.requireUser();
    await data.updateProjectTodo(user.id, id, { status });
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update todo" };
  }
}

export async function deleteProjectTodoAction(projectId: string, id: string): Promise<ActionResult> {
  try {
    const user = await data.requireUser();
    await data.deleteProjectTodo(user.id, id);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete todo" };
  }
}

// ---------------------------------------------------------------------------
// Project credentials (client logins / access details)
// ---------------------------------------------------------------------------
export async function addProjectCredentialAction(
  projectId: string,
  input: {
    title: string;
    url?: string | null;
    username?: string | null;
    password?: string | null;
    notes?: string | null;
  },
): Promise<ActionResult<ProjectCredential>> {
  try {
    const user = await data.requireUser();
    const credential = await data.createProjectCredential(user.id, projectId, input);
    if (!credential) return { ok: false, error: "Failed to create credential" };
    revalidatePath(`/projects/${projectId}`);
    return { ok: true, data: credential };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create credential" };
  }
}

// Called only when the user clicks the eye icon — the password is never
// serialized into the client payload.
export async function revealProjectCredentialPasswordAction(
  projectId: string,
  id: string,
): Promise<ActionResult<string>> {
  try {
    const user = await data.requireUser();
    const password = await data.getProjectCredentialPassword(user.id, id);
    if (password == null) return { ok: false, error: "No password saved for this login" };
    return { ok: true, data: password };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to load password" };
  }
}

export async function updateProjectCredentialAction(
  projectId: string,
  id: string,
  patch: Partial<ProjectCredential>,
): Promise<ActionResult> {
  try {
    const user = await data.requireUser();
    await data.updateProjectCredential(user.id, id, patch);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update credential" };
  }
}

export async function deleteProjectCredentialAction(
  projectId: string,
  id: string,
): Promise<ActionResult> {
  try {
    const user = await data.requireUser();
    await data.deleteProjectCredential(user.id, id);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete credential" };
  }
}

// ---------------------------------------------------------------------------
// Project team roster
// ---------------------------------------------------------------------------
export async function addProjectTeamMemberAction(
  projectId: string,
  input: { team_member_id?: string | null; name: string; role_label: string },
): Promise<ActionResult<ProjectTeamMember>> {
  try {
    const user = await data.requireUser();
    const member = await data.addProjectTeamMember(user.id, projectId, input);
    if (!member) return { ok: false, error: "Failed to add team member" };
    revalidatePath(`/projects/${projectId}`);
    return { ok: true, data: member };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to add team member" };
  }
}

export async function removeProjectTeamMemberAction(
  projectId: string,
  id: string,
): Promise<ActionResult> {
  try {
    const user = await data.requireUser();
    await data.removeProjectTeamMember(user.id, id);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to remove team member" };
  }
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------
export async function createInvoiceAction(
  input: Omit<Invoice, "id" | "user_id" | "created_at" | "updated_at">,
): Promise<ActionResult<Invoice>> {
  try {
    const user = await data.requireUser();
    const invoice = await data.createInvoice(user.id, input);
    if (!invoice) return { ok: false, error: "Failed to create invoice" };
    revalidatePath("/invoices");
    return { ok: true, data: invoice };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create invoice" };
  }
}

export async function updateInvoiceAction(
  id: string,
  patch: Partial<Invoice>,
): Promise<ActionResult<Invoice>> {
  try {
    const user = await data.requireUser();
    const invoice = await data.updateInvoice(user.id, id, patch);
    if (!invoice) return { ok: false, error: "Invoice not found" };
    revalidatePath("/invoices");
    revalidatePath("/dashboard");
    return { ok: true, data: invoice };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update invoice" };
  }
}

export async function deleteInvoiceAction(id: string): Promise<ActionResult> {
  try {
    const user = await data.requireUser();
    await data.deleteInvoice(user.id, id);
    revalidatePath("/invoices");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete invoice" };
  }
}

// ---------------------------------------------------------------------------
// Email templates
// ---------------------------------------------------------------------------
export async function saveTemplateAction(
  input: Omit<EmailTemplate, "id" | "user_id" | "created_at" | "updated_at">,
): Promise<ActionResult<EmailTemplate>> {
  try {
    const user = await data.requireUser();
    const template = await data.saveTemplate(user.id, input);
    if (!template) return { ok: false, error: "Failed to save template" };
    revalidatePath("/templates");
    return { ok: true, data: template };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save template" };
  }
}

export async function deleteTemplateAction(id: string): Promise<ActionResult> {
  try {
    const user = await data.requireUser();
    await data.deleteTemplate(user.id, id);
    revalidatePath("/templates");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete template" };
  }
}

// ---------------------------------------------------------------------------
// Automation rules
// ---------------------------------------------------------------------------
export async function saveAutomationAction(
  input: Omit<AutomationRule, "id" | "user_id" | "created_at" | "updated_at">,
): Promise<ActionResult<AutomationRule>> {
  try {
    const user = await data.requireUser();
    const rule = await data.saveAutomation(user.id, input);
    if (!rule) return { ok: false, error: "Failed to save automation" };
    revalidatePath("/automations");
    return { ok: true, data: rule };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save automation" };
  }
}

export async function toggleAutomationAction(id: string, isActive: boolean): Promise<ActionResult> {
  try {
    const user = await data.requireUser();
    await data.updateAutomation(user.id, id, { is_active: isActive });
    revalidatePath("/automations");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update automation" };
  }
}

export async function deleteAutomationAction(id: string): Promise<ActionResult> {
  try {
    const user = await data.requireUser();
    await data.deleteAutomation(user.id, id);
    revalidatePath("/automations");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete automation" };
  }
}

// ---------------------------------------------------------------------------
// Follow-ups
// ---------------------------------------------------------------------------
export async function updateFollowUpAction(
  id: string,
  patch: { status?: string; scheduled_at?: string | null },
): Promise<ActionResult> {
  try {
    const user = await data.requireUser();
    await data.updateFollowUp(user.id, id, patch as never);
    revalidatePath("/dashboard");
    revalidatePath("/clients");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update follow-up" };
  }
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------
export async function importRowsAction(
  entityType: "projects" | "opportunities" | "clients",
  file_name: string,
  rows: Array<Record<string, unknown>>,
): Promise<
  ActionResult<{ imported: number; failed: number; errors?: Array<{ row: number; error: string }> }>
> {
  try {
    const user = await data.requireUser();
    if (!rows.length) return { ok: false, error: "No rows to import" };
    const { run } = await data.runImport(user.id, entityType, file_name, rows);
    revalidatePath("/import");
    revalidatePath("/projects");
    revalidatePath("/pipeline");
    revalidatePath("/clients");
    return {
      ok: true,
      data: {
        imported: run.imported_rows,
        failed: run.failed_rows,
        errors: run.log.slice(0, 3),
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Import failed" };
  }
}

// ---------------------------------------------------------------------------
// AI Proposal
// ---------------------------------------------------------------------------
export async function generateProposalAction(input: {
  platform: string;
  jobDescription: string;
  clientName?: string;
  projectName?: string;
  tone?: string;
  budget?: string;
  timeline?: string;
  extraNotes?: string;
}): Promise<ActionResult<string>> {
  try {
    const user = await data.requireUser();
    const proposal = await generateProposal({
      ...input,
      tone: input.tone as ProposalTone | undefined,
      yourName: user.name ?? "Sardar IT",
    });
    return { ok: true, data: proposal };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Proposal generation failed" };
  }
}

// ---------------------------------------------------------------------------
// Demo utilities
// ---------------------------------------------------------------------------
export async function resetDemoDataAction(): Promise<ActionResult> {
  resetDemo();
  revalidatePath("/", "layout");
  return { ok: true, data: { dbPath: demoDbPath() } };
}

export async function createAccountAction(
  input: Pick<Account, "name" | "platform" | "username" | "profile_url">,
): Promise<ActionResult<Account>> {
  try {
    const user = await data.requireUser();
    const account = await data.createAccount(user.id, input);
    if (!account) return { ok: false, error: "Failed to create account" };
    revalidatePath("/settings");
    return { ok: true, data: account };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create account" };
  }
}

// ---------------------------------------------------------------------------
// Auth (username + password; no public self-registration)
// ---------------------------------------------------------------------------
export async function loginAction(
  username: string,
  password: string,
): Promise<ActionResult> {
  try {
    const result = await data.loginWithUsername(username, password);
    if (!result.ok) return { ok: false, error: result.error ?? "Login failed" };
    if (data.isDemoModeSafe()) {
      const { cookies } = await import("next/headers");
      const store = await cookies();
      // Start every session on the user's own role: clear any preview persona
      // cookie left behind by a previous login.
      store.delete("sardar_demo_role");
      store.set(data.DEMO_SESSION_COOKIE, username.trim(), {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Login failed" };
  }
}

export async function signOutAction(): Promise<ActionResult> {
  try {
    if (data.isDemoModeSafe()) {
      const { cookies } = await import("next/headers");
      const store = await cookies();
      store.delete(data.DEMO_SESSION_COOKIE);
      // A leftover demo preview persona must never bleed into the next user's
      // session.
      store.delete("sardar_demo_role");
      return { ok: true };
    }
    const { createServerSupabase } = await import("@/lib/supabase/server");
    const client = await createServerSupabase();
    if (client) {
      const { error } = await client.auth.signOut();
      if (error) return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch {
    return { ok: true };
  }
}

// ---------------------------------------------------------------------------
// Agency user provisioning (CEO only — employees never self-register)
// ---------------------------------------------------------------------------
export async function createUserAction(input: {
  username: string;
  password: string;
  name: string;
  email?: string;
  role: string;
}): Promise<ActionResult<{ id: string; username: string }>> {
  try {
    const actor = await data.requireUser();
    const user = await data.createUserAccount(actor, {
      username: input.username,
      password: input.password,
      name: input.name,
      email: input.email,
      role: input.role as never,
    });
    revalidatePath("/settings");
    return { ok: true, data: { id: user.id, username: user.username } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create user" };
  }
}

export async function updateUserAction(
  username: string,
  patch: { password?: string; is_active?: boolean; role?: string },
): Promise<ActionResult> {
  try {
    const actor = await data.requireUser();
    await data.updateUserAccount(actor, username, {
      password: patch.password,
      is_active: patch.is_active,
      role: patch.role as TeamRole | undefined,
    });
    revalidatePath("/settings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update user" };
  }
}

export async function logActivityAction(input: {
  entityType: EntityType;
  entityId: string;
  activityType: ActivityType;
  subject: string;
  body?: string;
}): Promise<ActionResult> {
  try {
    const user = await data.requireUser();
    await data.logActivity(
      user.id,
      input.entityType,
      input.entityId,
      input.activityType,
      input.subject,
      input.body,
    );
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to log activity" };
  }
}

export async function registerAttachmentAction(input: {
  entityType: EntityType;
  entityId: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
}): Promise<ActionResult> {
  try {
    const user = await data.requireUser();
    await data.registerAttachment(user.id, input.entityType, input.entityId, input);
    revalidatePath("/clients");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save attachment" };
  }
}
