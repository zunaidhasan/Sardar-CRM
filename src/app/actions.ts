"use server";

import { revalidatePath } from "next/cache";
import * as data from "@/lib/data";
import type { OpportunityInput, ProjectInput } from "@/lib/data";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import type {
  Account,
  AutomationRule,
  ActivityType,
  Client,
  EmailTemplate,
  EntityType,
  Invoice,
  LeadScore,
  Milestone,
  MilestoneStatus,
  Opportunity,
  OpportunityStage,
  OutreachStatus,
  Profile,
  Project,
  ProjectCredential,
  ProjectTeamMember,
  ProjectTodo,
  TeamRole,
  TimeEntry,
  ApiKeyRow,
} from "@/lib/types";
import { resetDemo, demoDbPath } from "@/lib/db/demo-store";
import * as apiKeysModule from "@/lib/api-keys";
import { generateProposal, type ProposalTone } from "@/lib/proposal";
import {
  checkRateLimit,
  clearFailures,
  recordFailure,
  checkOutboundRateLimit,
  recordOutboundAction,
  MAX_IP_FAILURES,
  MAX_USERNAME_FAILURES,
} from "@/lib/rate-limit";

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

export async function reorderMilestonesAction(
  projectId: string,
  milestoneIds: string[],
): Promise<ActionResult> {
  try {
    const user = await data.requireUser();
    // Update order_index for each milestone based on the new order
    for (let i = 0; i < milestoneIds.length; i++) {
      await data.updateMilestone(user.id, milestoneIds[i], { order_index: i });
    }
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to reorder milestones" };
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
// Time tracking (timesheet rows per project)
// ---------------------------------------------------------------------------
export async function addTimeEntryAction(
  projectId: string,
  input: {
    date: string;
    hours: number;
    description?: string | null;
    assignee?: string | null;
    billable?: boolean;
  },
): Promise<ActionResult<TimeEntry>> {
  try {
    const user = await data.requireUser();
    const hours = Number(input.hours);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
      return { ok: false, error: "Hours must be between 0 and 24" };
    }
    if (!input.date) return { ok: false, error: "A date is required" };
    const entry = await data.createTimeEntry(user.id, projectId, {
      ...input,
      hours: Math.round(hours * 100) / 100,
    });
    if (!entry) return { ok: false, error: "Failed to log time" };
    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/projects");
    revalidatePath("/calendar");
    return { ok: true, data: entry };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to log time" };
  }
}

export async function updateTimeEntryAction(
  projectId: string,
  id: string,
  patch: Partial<Pick<TimeEntry, "date" | "hours" | "description" | "assignee" | "billable">>,
): Promise<ActionResult> {
  try {
    const user = await data.requireUser();
    if (patch.hours !== undefined) {
      const hours = Number(patch.hours);
      if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
        return { ok: false, error: "Hours must be between 0 and 24" };
      }
      patch.hours = Math.round(hours * 100) / 100;
    }
    await data.updateTimeEntry(user.id, id, patch as Partial<TimeEntry>);
    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/projects");
    revalidatePath("/calendar");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update time entry" };
  }
}

export async function deleteTimeEntryAction(projectId: string, id: string): Promise<ActionResult> {
  try {
    const user = await data.requireUser();
    await data.deleteTimeEntry(user.id, id);
    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/projects");
    revalidatePath("/calendar");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete time entry" };
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
// Project Expenses (cost tracking)
// ---------------------------------------------------------------------------
export async function addProjectExpenseAction(
  projectId: string,
  input: {
    description: string;
    amount: number;
    currency: string;
    category: string;
    vendor?: string | null;
    date: string;
    is_billable?: boolean;
    notes?: string | null;
  },
): Promise<ActionResult> {
  try {
    const user = await data.requireUser();
    const expense = await data.createProjectExpense(user.id, {
      project_id: projectId,
      description: input.description,
      amount: input.amount,
      currency: input.currency,
      category: input.category as never,
      vendor: input.vendor ?? null,
      date: input.date,
      is_billable: input.is_billable ?? true,
      receipt_url: null,
      notes: input.notes ?? null,
    });
    if (!expense) return { ok: false, error: "Failed to add expense" };
    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/projects");
    return { ok: true, data: expense };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to add expense" };
  }
}

export async function updateProjectExpenseAction(
  projectId: string,
  id: string,
  patch: Partial<import("@/lib/types").ProjectExpense>,
): Promise<ActionResult> {
  try {
    const user = await data.requireUser();
    await data.updateProjectExpense(user.id, id, patch);
    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/projects");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update expense" };
  }
}

export async function deleteProjectExpenseAction(
  projectId: string,
  id: string,
): Promise<ActionResult> {
  try {
    const user = await data.requireUser();
    await data.deleteProjectExpense(user.id, id);
    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/projects");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete expense" };
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
// API Keys
// ---------------------------------------------------------------------------

export async function listApiKeysAction(): Promise<ActionResult<ApiKeyRow[]>> {
  try {
    const user = await data.requireUser();
    const keys = await apiKeysModule.listApiKeys(user.id);
    return { ok: true, data: keys };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to list API keys" };
  }
}

export async function createApiKeyAction(
  name: string,
  scopes: string[] = ["read", "write"],
): Promise<ActionResult<{ rawKey: string; id: string }>> {
  try {
    const user = await data.requireUser();
    const result = await apiKeysModule.createApiKey(user.id, name, scopes);
    revalidatePath("/settings");
    return { ok: true, data: { rawKey: result.rawKey, id: result.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create API key" };
  }
}

export async function revokeApiKeyAction(keyId: string): Promise<ActionResult> {
  try {
    const user = await data.requireUser();
    const ok = await apiKeysModule.revokeApiKey(user.id, keyId);
    if (!ok) return { ok: false, error: "Failed to revoke key" };
    revalidatePath("/settings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to revoke API key" };
  }
}

// ---------------------------------------------------------------------------
// External Integration Testing
// ---------------------------------------------------------------------------

export async function testEnrichmentAction(
  provider: string,
): Promise<ActionResult> {
  try {
    await data.requireUser();
    if (provider === "Apollo") {
      const key = process.env.APOLLO_API_KEY;
      if (!key) return { ok: false, error: "APOLLO_API_KEY not set in environment" };
      // Lightweight test: try to reach the API
      const res = await fetch("https://api.apollo.io/v1/people/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: key, email: "test@example.com" }),
      });
      if (res.ok || res.status === 404) {
        return { ok: true };
      }
      return { ok: false, error: `Apollo API returned ${res.status}` };
    }
    if (provider === "Hunter") {
      const key = process.env.HUNTER_API_KEY;
      if (!key) return { ok: false, error: "HUNTER_API_KEY not set in environment" };
      const res = await fetch(`https://api.hunter.io/v2/account?api_key=${key}`);
      if (res.ok) {
        const data = await res.json();
        const remaining = data.data?.quota?.requests ?? "?";
        return { ok: true };
      }
      return { ok: false, error: `Hunter API returned ${res.status}` };
    }
    return { ok: false, error: `Unknown provider: ${provider}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Test failed" };
  }
}

export async function testWebhookAction(url: string): Promise<ActionResult> {
  try {
    await data.requireUser();
    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) return { ok: true };
    return { ok: false, error: `Endpoint returned ${res.status}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Webhook unreachable" };
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
    // Never count empty submissions toward the rate limit.
    if (!username.trim() || !password) {
      return { ok: false, error: "Username and password are required" };
    }
    // Brute-force protection: a sliding window of failed attempts per
    // IP+username and per IP (see src/lib/rate-limit.ts).
    const { headers } = await import("next/headers");
    const headerStore = await headers();
    // Trusted proxies append the real client IP to X-Forwarded-For, so the
    // rightmost entry is the least spoofable when deployed behind one. In
    // dev (no proxy) it falls back to x-real-ip / "unknown".
    const xff = headerStore.get("x-forwarded-for");
    const forwarded = xff
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .at(-1);
    const ip = forwarded || headerStore.get("x-real-ip") || "unknown";
    const usernameKey = `login:${ip}:${username.trim().toLowerCase()}`;
    const ipKey = `ip:${ip}`;

    const perUser = checkRateLimit(usernameKey, MAX_USERNAME_FAILURES);
    if (!perUser.allowed) {
      return {
        ok: false,
        error: `Too many failed attempts for this account. Try again in ${Math.max(1, Math.ceil(perUser.retryAfterSec / 60))} min.`,
      };
    }
    const perIp = checkRateLimit(ipKey, MAX_IP_FAILURES);
    if (!perIp.allowed) {
      return {
        ok: false,
        error: "Too many failed attempts from this address. Try again later.",
      };
    }

    const result = await data.loginWithUsername(username, password);
    if (!result.ok) {
      recordFailure(usernameKey);
      recordFailure(ipKey);
      return { ok: false, error: result.error ?? "Login failed" };
    }
    // A legitimate owner getting back in resets their per-account streak.
    clearFailures(usernameKey);

    if (data.isDemoModeSafe()) {
      const { cookies } = await import("next/headers");
      const store = await cookies();
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
// Profile (name, avatar, currency, default fee)
// ---------------------------------------------------------------------------
export async function updateProfileAction(patch: {
  full_name?: string | null;
  currency?: string | null;
  default_fee_percent?: number | null;
  avatar_url?: string | null;
}): Promise<ActionResult<Profile>> {
  try {
    const user = await data.requireUser();
    const clean: Partial<Profile> = {};

    if (patch.full_name !== undefined) {
      const name = (patch.full_name ?? "").trim();
      if (name.length > 60) return { ok: false, error: "Name must be 60 characters or fewer" };
      clean.full_name = name || null;
    }
    if (patch.currency !== undefined) {
      const currency = (patch.currency ?? "USD").toUpperCase();
      if (!(currency in CURRENCY_SYMBOL)) {
        return { ok: false, error: `Unsupported currency "${currency}"` };
      }
      clean.currency = currency;
    }
    if (patch.default_fee_percent !== undefined) {
      const fee = patch.default_fee_percent ?? 20;
      if (!Number.isFinite(fee) || fee < 0 || fee > 100) {
        return { ok: false, error: "Default fee must be between 0 and 100" };
      }
      clean.default_fee_percent = fee;
    }
    if (patch.avatar_url !== undefined) {
      const avatar = patch.avatar_url;
      if (avatar !== null) {
        // Avatars are client-resized JPEG data URLs; accept only that exact
        // form (defense in depth against arbitrary data:image/* blobs).
        if (!avatar.startsWith("data:image/jpeg;base64,")) {
          return { ok: false, error: "Invalid image data" };
        }
        if (avatar.length > 1_500_000) {
          return { ok: false, error: "Image is too large — please use a smaller photo" };
        }
      }
      clean.avatar_url = avatar;
    }

    const profile = await data.updateProfile(user.id, clean);
    if (!profile) return { ok: false, error: "Failed to update profile" };
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { ok: true, data: profile };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update profile" };
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

// ---------------------------------------------------------------------------
// Outbound Leads
// ---------------------------------------------------------------------------
export async function updateOutreachStatusAction(
  id: string,
  status: Client["outreach_status"],
): Promise<ActionResult<Client>> {
  try {
    const user = await data.requireUser();
    // Rate limit: 30 status changes per 5 min per user
    const rl = checkOutboundRateLimit(user.id, "outbound:status_change");
    if (!rl.allowed) {
      return { ok: false, error: `Rate limited. Try again in ${rl.retryAfterSec}s` };
    }
    recordOutboundAction(user.id, "outbound:status_change");
    const result = await data.updateOutreachStatus(user.id, id, status);
    if (!result) return { ok: false, error: "Client not found" };
    revalidatePath("/outbound");
    revalidatePath(`/clients/${id}`);
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    return { ok: true, data: result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update status" };
  }
}

export async function markFollowUpSentAction(id: string): Promise<ActionResult<Client>> {
  try {
    const user = await data.requireUser();
    const result = await data.markFollowUpSent(user.id, id);
    if (!result) return { ok: false, error: "Client not found" };
    revalidatePath("/outbound");
    revalidatePath(`/clients/${id}`);
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    return { ok: true, data: result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to mark follow-up" };
  }
}

export async function updateLeadScoreAction(
  id: string,
  score: Client["lead_score"],
): Promise<ActionResult<Client>> {
  try {
    const user = await data.requireUser();
    const result = await data.updateLeadScore(user.id, id, score);
    if (!result) return { ok: false, error: "Client not found" };
    revalidatePath("/outbound");
    revalidatePath(`/clients/${id}`);
    return { ok: true, data: result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update score" };
  }
}

export async function updateNextFollowUpAction(
  id: string,
  date: string | null,
): Promise<ActionResult<Client>> {
  try {
    const user = await data.requireUser();
    const result = await data.updateNextFollowUp(user.id, id, date);
    if (!result) return { ok: false, error: "Client not found" };
    revalidatePath("/outbound");
    revalidatePath(`/clients/${id}`);
    revalidatePath("/calendar");
    return { ok: true, data: result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update follow-up date" };
  }
}

export async function saveWebsiteReviewAction(
  id: string,
  mainProblem: string | null,
  reviewNotes: string | null,
): Promise<ActionResult<Client>> {
  try {
    const user = await data.requireUser();
    const result = await data.saveWebsiteReview(user.id, id, mainProblem, reviewNotes);
    if (!result) return { ok: false, error: "Client not found" };
    revalidatePath("/outbound");
    revalidatePath(`/clients/${id}`);
    return { ok: true, data: result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save review" };
  }
}

// ---------------------------------------------------------------------------
// Lead Enrichment (Apollo / Hunter)
// ---------------------------------------------------------------------------

export async function enrichLeadAction(
  clientId: string,
): Promise<ActionResult<{ enrichment: import("@/lib/lead-enrichment").EnrichmentResult; patch: Record<string, unknown> }>> {
  try {
    const user = await data.requireUser();
    const client = await data.fetchClient(user.id, clientId);
    if (!client) return { ok: false, error: "Client not found" };

    const { enrichLead, applyEnrichment } = await import("@/lib/lead-enrichment");
    const enrichment = await enrichLead({
      email: client.email,
      website: client.website,
      company: client.company,
    });

    if (enrichment.error && !enrichment.company) {
      return { ok: false, error: enrichment.error };
    }

    const patch = applyEnrichment(client, enrichment);
    if (Object.keys(patch).length > 0) {
      await data.updateClient(user.id, clientId, patch as Partial<Client>);
    }

    revalidatePath("/outbound");
    revalidatePath(`/clients/${clientId}`);
    return { ok: true, data: { enrichment, patch } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Enrichment failed" };
  }
}

export async function bulkEnrichLeadsAction(
  ids: string[],
): Promise<ActionResult<{ enriched: number; errors: string[] }>> {
  try {
    const user = await data.requireUser();
    const { enrichLead, applyEnrichment } = await import("@/lib/lead-enrichment");

    let enriched = 0;
    const errors: string[] = [];

    for (const id of ids) {
      try {
        const client = await data.fetchClient(user.id, id);
        if (!client) { errors.push(`${id}: not found`); continue; }

        const result = await enrichLead({
          email: client.email,
          website: client.website,
          company: client.company,
        });

        if (result.error && !result.company) {
          errors.push(`${client.name}: ${result.error}`);
          continue;
        }

        const patch = applyEnrichment(client, result);
        if (Object.keys(patch).length > 0) {
          await data.updateClient(user.id, id, patch as Partial<Client>);
          enriched++;
        }
      } catch (err) {
        errors.push(`${id}: ${err instanceof Error ? err.message : "unknown"}`);
      }
    }

    revalidatePath("/outbound");
    return { ok: true, data: { enriched, errors } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Bulk enrichment failed" };
  }
}

// ---------------------------------------------------------------------------
// Bulk actions for outbound leads
// ---------------------------------------------------------------------------
export async function bulkUpdateOutreachStatusAction(
  ids: string[],
  status: Client["outreach_status"],
): Promise<ActionResult<{ updated: number }>> {
  try {
    const user = await data.requireUser();
    // Rate limit: 5 bulk operations per 5 min per user
    const rl = checkOutboundRateLimit(user.id, "outbound:bulk_action");
    if (!rl.allowed) {
      return { ok: false, error: `Rate limited. Try again in ${rl.retryAfterSec}s` };
    }
    recordOutboundAction(user.id, "outbound:bulk_action");
    let updated = 0;
    for (const id of ids) {
      const result = await data.updateOutreachStatus(user.id, id, status);
      if (result) updated++;
    }
    revalidatePath("/outbound");
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    return { ok: true, data: { updated } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Bulk update failed" };
  }
}

export async function bulkUpdateLeadScoreAction(
  ids: string[],
  score: Client["lead_score"],
): Promise<ActionResult<{ updated: number }>> {
  try {
    const user = await data.requireUser();
    let updated = 0;
    for (const id of ids) {
      const result = await data.updateLeadScore(user.id, id, score);
      if (result) updated++;
    }
    revalidatePath("/outbound");
    return { ok: true, data: { updated } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Bulk update failed" };
  }
}

export async function bulkUpdateOwnerAction(
  ids: string[],
  ownerId: string | null,
): Promise<ActionResult<{ updated: number }>> {
  try {
    const user = await data.requireUser();
    let updated = 0;
    for (const id of ids) {
      const result = await data.updateClient(user.id, id, { owner_id: ownerId });
      if (result) updated++;
    }
    revalidatePath("/outbound");
    return { ok: true, data: { updated } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Bulk update failed" };
  }
}

export async function bulkUpdateFollowUpDateAction(
  ids: string[],
  date: string | null,
): Promise<ActionResult<{ updated: number }>> {
  try {
    const user = await data.requireUser();
    let updated = 0;
    for (const id of ids) {
      const result = await data.updateNextFollowUp(user.id, id, date);
      if (result) updated++;
    }
    revalidatePath("/outbound");
    revalidatePath("/calendar");
    return { ok: true, data: { updated } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Bulk update failed" };
  }
}

// ---------------------------------------------------------------------------
// Owner assignment (single lead)
// ---------------------------------------------------------------------------
export async function assignLeadOwnerAction(
  id: string,
  ownerId: string | null,
): Promise<ActionResult<Client>> {
  try {
    const user = await data.requireUser();
    const result = await data.updateClient(user.id, id, { owner_id: ownerId });
    if (!result) return { ok: false, error: "Client not found" };
    revalidatePath("/outbound");
    revalidatePath(`/clients/${id}`);
    return { ok: true, data: result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to assign owner" };
  }
}

// ---------------------------------------------------------------------------
// Send outreach email
// ---------------------------------------------------------------------------
export async function sendOutreachEmailAction(
  leadId: string,
  templateId: string,
): Promise<ActionResult<{ renderedSubject: string; renderedBody: string }>> {
  try {
    const user = await data.requireUser();
    // Rate limit: 10 emails per 5 min per user
    const rl = checkOutboundRateLimit(user.id, "outbound:send_email");
    if (!rl.allowed) {
      return { ok: false, error: `Email rate limited. Try again in ${rl.retryAfterSec}s` };
    }
    recordOutboundAction(user.id, "outbound:send_email");
    const [clients, templates] = await Promise.all([
      data.fetchClients(user.id),
      data.fetchTemplates(user.id),
    ]);
    const lead = clients.find((c) => c.id === leadId);
    const template = templates.find((t) => t.id === templateId);
    if (!lead) return { ok: false, error: "Lead not found" };
    if (!template) return { ok: false, error: "Template not found" };

    const { sendTemplateToLead } = await import("@/lib/email");
    const result = await sendTemplateToLead({
      lead,
      template,
      senderName: user.name ?? user.profile?.full_name ?? "Sardar IT",
    });

    if (!result.ok) return { ok: false, error: result.error ?? "Failed to send" };

    // Log the email activity with tracking metadata
    const activity = await data.logActivity(
      user.id, "client", leadId, "email",
      `Email sent: ${result.renderedSubject}`,
      `Template: ${template.name}`,
    );
    // Store tracking ID in activity metadata for open/click tracking
    if (activity && "metadata" in activity) {
      const meta = activity.metadata as Record<string, unknown>;
      meta.tracking_id = result.trackingId;
      meta.template_id = templateId;
      meta.subject = result.renderedSubject;
    }

    // Update last_email_sent_at
    await data.updateClient(user.id, leadId, {
      last_email_sent_at: new Date().toISOString(),
    });

    revalidatePath("/outbound");
    revalidatePath(`/clients/${leadId}`);
    revalidatePath("/dashboard");
    return { ok: true, data: { renderedSubject: result.renderedSubject, renderedBody: result.renderedBody } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to send email" };
  }
}

// ---------------------------------------------------------------------------
// Auto lead scoring
// ---------------------------------------------------------------------------
export async function autoScoreLeadAction(
  id: string,
): Promise<ActionResult<{ score: Client["lead_score"] }>> {
  try {
    const user = await data.requireUser();
    const { suggestLeadScore } = await import("@/lib/lead-scoring");
    const clients = await data.fetchClients(user.id);
    const lead = clients.find((c) => c.id === id);
    if (!lead) return { ok: false, error: "Lead not found" };

    const score = suggestLeadScore(lead);
    const result = await data.updateLeadScore(user.id, id, score);
    if (!result) return { ok: false, error: "Failed to update score" };

    revalidatePath("/outbound");
    revalidatePath(`/clients/${id}`);
    return { ok: true, data: { score } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to auto-score" };
  }
}

export async function bulkAutoScoreAction(
  ids: string[],
): Promise<ActionResult<{ updated: number; scores: Record<string, Client["lead_score"]> }>> {
  try {
    const user = await data.requireUser();
    const { suggestLeadScore } = await import("@/lib/lead-scoring");
    const clients = await data.fetchClients(user.id);
    const scores: Record<string, Client["lead_score"]> = {};
    let updated = 0;

    for (const id of ids) {
      const lead = clients.find((c) => c.id === id);
      if (!lead) continue;
      const score = suggestLeadScore(lead);
      const result = await data.updateLeadScore(user.id, id, score);
      if (result) {
        updated++;
        scores[id] = score;
      }
    }

    revalidatePath("/outbound");
    return { ok: true, data: { updated, scores } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Bulk auto-score failed" };
  }
}
