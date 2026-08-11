import fs from "fs";
import os from "os";
import path from "path";
import {
  buildDemoData,
  DEMO_DB_VERSION,
  DEMO_PERSONAS,
  DEMO_USER_ID,
  generatedInvoiceItems,
  generatedInvoices,
  generatedMilestones,
  generatedOpportunities,
  generatedProjects,
  generatedTeamMembers,
  seededTeamActivities,
} from "@/lib/db/demo-data";
import { normalizeDate } from "@/lib/import-validation";
import type {
  Account,
  Activity,
  AppUser,
  Attachment,
  AutomationRule,
  Client,
  EmailTemplate,
  FollowUp,
  ImportRun,
  Invoice,
  InvoiceItem,
  Milestone,
  Opportunity,
  Profile,
  Project,
  ProjectCredential,
  ProjectTeamMember,
  ProjectTodo,
  TeamMember,
  TeamRole,
  TimeEntry,
} from "@/lib/types";
import { hashPassword } from "@/lib/password";
import { encryptSecret, isEncryptedSecret, isEncryptionEnabled } from "@/lib/credential-crypto";
import { uid } from "@/lib/utils";

export interface DemoDB {
  demo_version: number;
  profile: Profile;
  users: AppUser[];
  team_members: TeamMember[];
  accounts: Account[];
  clients: Client[];
  opportunities: Opportunity[];
  projects: Project[];
  milestones: Milestone[];
  project_todos: ProjectTodo[];
  project_credentials: ProjectCredential[];
  project_team_members: ProjectTeamMember[];
  time_entries: TimeEntry[];
  activities: Activity[];
  follow_ups: FollowUp[];
  invoices: Invoice[];
  invoice_items: InvoiceItem[];
  attachments: Attachment[];
  email_templates: EmailTemplate[];
  automation_rules: AutomationRule[];
  import_runs: ImportRun[];
}

const DB_PATH =
  process.env.DEMO_DB_PATH || path.join(os.tmpdir(), "sardar-crm-demo-db.json");

let cache: DemoDB | null = null;

export function loadDB(): DemoDB {
  if (cache) return cache;
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, "utf-8");
      const parsed = JSON.parse(raw) as DemoDB;
      if (parsed && parsed.profile && Array.isArray(parsed.accounts)) {
        // Migration for older demo files created before team_members existed
        // (or still holding the pre-rebrand "Sardar IT" persona). Regenerate
        // so the CEO/Executive demo data and names stay consistent.
        const isLegacy =
          !Array.isArray(parsed.team_members) ||
          parsed.profile.full_name === "Sardar IT" ||
          parsed.profile.role === "owner" ||
          parsed.opportunities.some((o) => o.assigned_to === "Sardar IT") ||
          parsed.projects.some((p) => p.assigned_to === "Sardar IT");
        if (isLegacy) {
          cache = freshDemoDB();
          saveDB(cache);
          return cache;
        }
        // Backfill tables added after this demo file was first created so
        // older persisted files keep working without a full reseed. New
        // sections get the built-in demo rows (deterministic IDs referencing
        // seeded projects), not empty arrays, so the UI shows them working.
        const NEW_TABLES = ["users", "project_todos", "project_credentials", "project_team_members", "time_entries"] as const;
        const missingTables = NEW_TABLES.filter(
          (t) => !Array.isArray((parsed as unknown as Record<string, unknown>)[t]),
        );
        if (missingTables.length > 0) {
          const fresh = buildDemoData();
          for (const t of missingTables) {
            (parsed as unknown as Record<string, unknown>)[t] = fresh[t];
          }
          // No early return: fall through so the version merge below also
          // runs in the same pass (old files missing new tables AND holding
          // an older demo_version get fully upgraded in one load).
        }
        // Version bump: append generated demo rows (deterministic ids) to
        // older persisted files WITHOUT touching user-created rows, so the
        // per-person milestones (15+ completed, $12k+ revenue, 80%+ win
        // rate) appear even on a DB that predates them.
        if (parsed.demo_version !== DEMO_DB_VERSION) {
          const genProjects = generatedProjects();
          const genOpps = generatedOpportunities();
          const genMilestones = generatedMilestones();
          const genTeam = generatedTeamMembers();
          const genInvoices = generatedInvoices();
          const genItems = generatedInvoiceItems();
          const pIds = new Set(genProjects.map((p) => p.id));
          const oIds = new Set(genOpps.map((o) => o.id));
          const mIds = new Set(genMilestones.map((m) => m.id));
          const tIds = new Set(genTeam.map((t) => t.id));
          const iIds = new Set(genInvoices.map((i) => i.id));
          const itIds = new Set(genItems.map((i) => i.id));
          parsed.projects = [
            ...parsed.projects.filter((p) => !pIds.has(p.id)),
            ...genProjects,
          ];
          parsed.opportunities = [
            ...parsed.opportunities.filter((o) => !oIds.has(o.id)),
            ...genOpps,
          ];
          parsed.milestones = [
            ...(parsed.milestones ?? []).filter((m) => !mIds.has(m.id)),
            ...genMilestones,
          ];
          parsed.project_team_members = [
            ...(parsed.project_team_members ?? []).filter((t) => !tIds.has(t.id)),
            ...genTeam,
          ];
          parsed.invoices = [
            ...(parsed.invoices ?? []).filter((i) => !iIds.has(i.id)),
            ...genInvoices,
          ];
          parsed.invoice_items = [
            ...(parsed.invoice_items ?? []).filter((i) => !itIds.has(i.id)),
            ...genItems,
          ];
          // Merge team-actor activities in the same pass so files needing the
          // version bump don't get them one load late (the standalone
          // appendTeamActivities below covers files already at the version).
          appendTeamActivities(parsed);
          parsed.demo_version = DEMO_DB_VERSION;
          cache = parsed;
          saveDB(cache);
          return parsed;
        }
        // Targeted migration: append any persona roles missing from the
        // persisted team (e.g. developer/designer added later) WITHOUT wiping
        // user-created demo rows.
        const existingRoles = new Set((parsed.team_members ?? []).map((t) => t.role));
        const missingRoles = (Object.keys(DEMO_PERSONAS) as TeamRole[]).filter(
          (r) => !existingRoles.has(r),
        );
        if (missingRoles.length > 0) {
          const added = missingRoles.map((role, i) => ({
            id: `tm-mig-${i + 1}`,
            user_id: parsed.profile.id,
            name: DEMO_PERSONAS[role]!.name,
            email: DEMO_PERSONAS[role]!.email,
            role,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));
          parsed.team_members = [...(parsed.team_members ?? []), ...added];
          cache = parsed;
          saveDB(cache);
          return parsed;
        }
        // Normalize enum-ish string fields that may have been imported with
        // mixed casing (e.g. "Delivered" instead of "delivered") so status
        // badges, filters and kanban grouping match the canonical lowercase
        // enum values. Non-destructive: only fixes known status fields.
        const ENUM_FIELDS: Array<{
          table: "projects" | "opportunities" | "invoices" | "follow_ups" | "milestones";
          field: string;
        }> = [
          { table: "projects", field: "status" },
          { table: "projects", field: "priority" },
          { table: "opportunities", field: "stage" },
          { table: "opportunities", field: "status" },
          { table: "opportunities", field: "follow_up_status" },
          { table: "invoices", field: "status" },
          { table: "follow_ups", field: "status" },
          { table: "milestones", field: "status" },
        ];
        let enumChanged = false;
        for (const { table: t, field } of ENUM_FIELDS) {
          const rows = parsed[t] as unknown as Array<Record<string, unknown>> | undefined;
          if (!Array.isArray(rows)) continue;
          for (const row of rows) {
            const v = row[field];
            if (typeof v === "string" && v !== v.toLowerCase()) {
              row[field] = v.toLowerCase();
              enumChanged = true;
            }
          }
        }
        // Normalize stored date fields (Excel serials / text dates like
        // "9-Mar-26") to canonical YYYY-MM-DD. Unparseable values are dropped
        // to null gracefully instead of rendering as "—". Only date-only
        // fields are touched; timestamps are left alone.
        const DATE_FIELDS: Array<{
          table: "projects" | "opportunities" | "invoices" | "follow_ups";
          field: string;
        }> = [
          { table: "projects", field: "order_date" },
          { table: "projects", field: "delivery_deadline" },
          { table: "opportunities", field: "due_date" },
          { table: "opportunities", field: "next_follow_up" },
          { table: "invoices", field: "issue_date" },
          { table: "invoices", field: "due_date" },
          { table: "invoices", field: "paid_at" },
          { table: "follow_ups", field: "scheduled_at" },
          { table: "follow_ups", field: "last_contact" },
        ];
        let datesChanged = false;
        for (const { table: t, field } of DATE_FIELDS) {
          const rows = parsed[t] as unknown as Array<Record<string, unknown>> | undefined;
          if (!Array.isArray(rows)) continue;
          for (const row of rows) {
            const v = row[field];
            if (v == null) continue;
            // Skip anything already in canonical form: pure "YYYY-MM-DD"
            // dates AND full ISO timestamps ("2026-05-08T10:30:00Z") — the
            // latter must never be truncated to date-only here.
            if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}([T ]|$)/.test(v)) continue;
            const res = normalizeDate(v);
            row[field] = res.error ? null : res.value;
            datesChanged = true;
          }
        }
        if (enumChanged || datesChanged) {
          cache = parsed;
          saveDB(cache);
          return parsed;
        }
        // Targeted migration: append seeded team-actor activities so the CEO
        // activity feed shows work by other team members even on demo files
        // created before they existed. Idempotent: only adds missing ids.
        if (appendTeamActivities(parsed)) {
          cache = parsed;
          saveDB(cache);
          return parsed;
        }
        // Encrypt any legacy plaintext credential passwords (rows saved
        // before encryption existed) so the demo file never holds client
        // logins in clear. Only runs when encryption is active — in demo
        // mode without a key this is a no-op that never triggers a rewrite.
        if (encryptCredentialPasswords(parsed)) {
          cache = parsed;
          saveDB(cache);
          return parsed;
        }
        // Persist backfilled tables even when no other migration fired.
        cache = parsed;
        saveDB(cache);
        return parsed;
      }
    }
  } catch {
    // corrupted file -> reseed
  }
  cache = freshDemoDB();
  saveDB(cache);
  return cache;
}

export function saveDB(db: DemoDB): void {
  try {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
  } catch {
    // demo persistence is best-effort
  }
}

// Merge the seeded team-actor activities (metadata.actor) into a persisted
// demo file so older DBs show the workspace feed. Returns true when any row
// was added; existing rows (user-created or already seeded) are untouched.
function appendTeamActivities(db: DemoDB): boolean {
  const seeded = seededTeamActivities();
  const existing = new Set(db.activities.map((a) => a.id));
  const missing = seeded.filter((a) => !existing.has(a.id));
  if (missing.length === 0) return false;
  db.activities = [...db.activities, ...missing];
  return true;
}

// Encrypt any plaintext credential passwords in a demo DB so the file never
// holds client logins in clear. Returns true when something changed. No-op
// when encryption is not active (demo mode without a key).
function encryptCredentialPasswords(db: DemoDB): boolean {
  if (!isEncryptionEnabled()) return false;
  let changed = false;
  for (const c of db.project_credentials) {
    if (c.password && !isEncryptedSecret(c.password)) {
      c.password = encryptSecret(c.password);
      changed = true;
    }
  }
  return changed;
}

function freshDemoDB(): DemoDB {
  const db = buildDemoData();
  encryptCredentialPasswords(db);
  return db;
}

export function resetDB(): DemoDB {
  cache = freshDemoDB();
  saveDB(cache);
  return cache;
}

// ---------------------------------------------------------------------------
// Generic table helpers
// ---------------------------------------------------------------------------
type TableName = Exclude<keyof DemoDB, "profile">;

function table(name: TableName): { rows: Array<Record<string, unknown>>; db: DemoDB } {
  const db = loadDB();
  return { rows: db[name] as unknown as Array<Record<string, unknown>>, db };
}

function commit(db: DemoDB): void {
  cache = db;
  saveDB(db);
}

export function insert<T extends object>(name: TableName, row: T & { id?: string }): T {
  const { rows, db } = table(name);
  const withId = { ...row, id: row.id ?? uid() };
  rows.push(withId);
  commit(db);
  return withId as T;
}

export function updateById(
  name: TableName,
  id: string,
  patch: Record<string, unknown>,
): boolean {
  const { rows, db } = table(name);
  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  rows[idx] = { ...rows[idx], ...patch, updated_at: new Date().toISOString() };
  commit(db);
  return true;
}

export function removeById(name: TableName, id: string): boolean {
  const { rows, db } = table(name);
  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  rows.splice(idx, 1);
  commit(db);
  return true;
}

export function resetDemo(): void {
  resetDB();
}

// Update the workspace profile (name, avatar, currency, default fee).
export function updateProfile(patch: Partial<Profile>): Profile {
  const db = loadDB();
  db.profile = { ...db.profile, ...patch, updated_at: new Date().toISOString() };
  commit(db);
  return db.profile;
}

export function demoDbPath(): string {
  return DB_PATH;
}

export { DEMO_USER_ID };

// ---------------------------------------------------------------------------
// Convenience typed getters (used by the data layer)
//
// Account-scoped demo data: every login is its own account. The CEO (and any
// unknown/workspace id) sees the whole workspace; every other login only sees
// rows they own — projects/opportunities assigned to their persona (or created
// by them), plus the clients, invoices, milestones, time entries, follow-ups
// and activities attached to those. This mirrors the Supabase RLS model so
// switching accounts actually switches the data.
// ---------------------------------------------------------------------------

/**
 * Resolve the active persona for a session user id. Returns null when the
 * user should see the whole workspace (CEO, or an id not in the logins table
 * — e.g. the legacy workspace owner id).
 */
export function personaRoleForSession(userId: string): TeamRole | null {
  const user = loadDB().users.find((u) => u.id === userId);
  if (!user || user.role === "ceo") return null;
  return user.role;
}

function personaName(role: TeamRole): string {
  return DEMO_PERSONAS[role]?.name ?? "";
}

/** Project ids a non-CEO login owns (assigned to their persona or created by them). */
function ownedProjectIds(userId: string): Set<string> {
  const role = personaRoleForSession(userId);
  if (!role) return new Set();
  const name = personaName(role);
  return new Set(
    loadDB()
      .projects.filter((p) => p.assigned_to === name || p.user_id === userId)
      .map((p) => p.id),
  );
}

function ownedOpportunityIds(userId: string): Set<string> {
  const role = personaRoleForSession(userId);
  if (!role) return new Set();
  const name = personaName(role);
  return new Set(
    loadDB()
      .opportunities.filter((o) => o.assigned_to === name || o.user_id === userId)
      .map((o) => o.id),
  );
}

/** Client ids attached to the user's own projects/opportunities, or created by them. */
function ownedClientIds(userId: string): Set<string> {
  const role = personaRoleForSession(userId);
  if (!role) return new Set();
  const db = loadDB();
  const pIds = ownedProjectIds(userId);
  const oIds = ownedOpportunityIds(userId);
  return new Set(
    db.clients
      .filter(
        (c) =>
          c.user_id === userId ||
          db.projects.some((p) => pIds.has(p.id) && p.client_id === c.id) ||
          db.opportunities.some((o) => oIds.has(o.id) && o.client_id === c.id),
      )
      .map((c) => c.id),
  );
}

/** Invoice ids attached to the user's own projects, or created by them. */
function ownedInvoiceIds(userId: string): Set<string> {
  const role = personaRoleForSession(userId);
  if (!role) return new Set();
  const pIds = ownedProjectIds(userId);
  return new Set(
    loadDB()
      .invoices.filter((i) => i.user_id === userId || (i.project_id != null && pIds.has(i.project_id)))
      .map((i) => i.id),
  );
}

export function getAccounts(_userId: string): Account[] {
  // Seller accounts are workspace-level resources shared by every login.
  return loadDB().accounts;
}
export function getTeamMembers(_userId: string): TeamMember[] {
  // The workspace roster is shared; the CEO dashboard derives team
  // performance from it.
  return loadDB().team_members;
}

// ---------------------------------------------------------------------------
// Users (username + password logins provisioned by the agency)
// ---------------------------------------------------------------------------
export function getUsers(): AppUser[] {
  return loadDB().users;
}

export function findUserByUsername(username: string): AppUser | undefined {
  return loadDB().users.find(
    (u) => u.username.toLowerCase() === username.trim().toLowerCase(),
  );
}

export function createDemoUser(input: {
  username: string;
  password: string;
  name: string;
  email?: string | null;
  role: TeamRole;
}): AppUser {
  const now = new Date().toISOString();
  return insert("users", {
    username: input.username.trim().toLowerCase(),
    password_hash: hashPassword(input.password),
    name: input.name.trim(),
    email: input.email || null,
    role: input.role,
    is_active: true,
    created_at: now,
    updated_at: now,
  } as unknown as AppUser);
}

export function updateDemoUser(
  username: string,
  patch: { password?: string; is_active?: boolean; role?: TeamRole; name?: string },
): AppUser | null {
  const db = loadDB();
  const user = findUserByUsername(username);
  if (!user) return null;
  const next: Record<string, unknown> = { ...user, updated_at: new Date().toISOString() };
  if (patch.password) next.password_hash = hashPassword(patch.password);
  if (patch.is_active !== undefined) next.is_active = patch.is_active;
  if (patch.role) next.role = patch.role;
  if (patch.name) next.name = patch.name;
  const idx = db.users.findIndex((u) => u.id === user.id);
  db.users[idx] = next as unknown as AppUser;
  commit(db);
  return db.users[idx]!;
}
export function getClients(userId: string): Client[] {
  const db = loadDB();
  if (!personaRoleForSession(userId)) return db.clients;
  const ids = ownedClientIds(userId);
  return db.clients.filter((c) => ids.has(c.id));
}
export function getOpportunities(userId: string): Opportunity[] {
  const db = loadDB();
  const role = personaRoleForSession(userId);
  if (!role) return db.opportunities;
  const name = personaName(role);
  return db.opportunities.filter((o) => o.assigned_to === name || o.user_id === userId);
}
export function getProjects(userId: string): Project[] {
  const db = loadDB();
  const role = personaRoleForSession(userId);
  if (!role) return db.projects;
  const name = personaName(role);
  return db.projects.filter((p) => p.assigned_to === name || p.user_id === userId);
}
export function getMilestones(userId: string, projectId?: string): Milestone[] {
  const db = loadDB();
  let rows = db.milestones.filter((m) => !projectId || m.project_id === projectId);
  const role = personaRoleForSession(userId);
  if (role) {
    const pIds = ownedProjectIds(userId);
    rows = rows.filter((m) => m.user_id === userId || pIds.has(m.project_id));
  }
  return rows;
}
export function getProjectTodos(userId: string, projectId?: string): ProjectTodo[] {
  const db = loadDB();
  let rows = db.project_todos.filter((t) => !projectId || t.project_id === projectId);
  const role = personaRoleForSession(userId);
  if (role) {
    const pIds = ownedProjectIds(userId);
    rows = rows.filter((t) => t.user_id === userId || pIds.has(t.project_id));
  }
  return rows;
}
export function getProjectCredentials(userId: string, projectId?: string): ProjectCredential[] {
  const db = loadDB();
  let rows = db.project_credentials.filter((c) => !projectId || c.project_id === projectId);
  const role = personaRoleForSession(userId);
  if (role) {
    const pIds = ownedProjectIds(userId);
    rows = rows.filter((c) => c.user_id === userId || pIds.has(c.project_id));
  }
  return rows;
}
export function getProjectTeamMembers(userId: string, projectId?: string): ProjectTeamMember[] {
  const db = loadDB();
  let rows = db.project_team_members.filter((m) => !projectId || m.project_id === projectId);
  const role = personaRoleForSession(userId);
  if (role) {
    const pIds = ownedProjectIds(userId);
    rows = rows.filter((m) => m.user_id === userId || pIds.has(m.project_id));
  }
  return rows;
}
export function getTimeEntries(userId: string, projectId?: string): TimeEntry[] {
  const db = loadDB();
  let rows = db.time_entries.filter((t) => !projectId || t.project_id === projectId);
  const role = personaRoleForSession(userId);
  if (role) {
    const pIds = ownedProjectIds(userId);
    rows = rows.filter((t) => t.user_id === userId || pIds.has(t.project_id));
  }
  return rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
export function getActivities(userId: string, limit = 100): Activity[] {
  const db = loadDB();
  let rows = db.activities;
  const role = personaRoleForSession(userId);
  if (role) {
    const pIds = ownedProjectIds(userId);
    const oIds = ownedOpportunityIds(userId);
    const cIds = ownedClientIds(userId);
    const iIds = ownedInvoiceIds(userId);
    rows = rows.filter(
      (a) =>
        a.user_id === userId ||
        a.entity_type === "import" ||
        (a.entity_type === "project" && pIds.has(a.entity_id)) ||
        (a.entity_type === "opportunity" && oIds.has(a.entity_id)) ||
        (a.entity_type === "client" && cIds.has(a.entity_id)) ||
        (a.entity_type === "invoice" && iIds.has(a.entity_id)),
    );
  }
  return rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, limit);
}
export function getFollowUps(userId: string): FollowUp[] {
  const db = loadDB();
  if (!personaRoleForSession(userId)) return db.follow_ups;
  const oIds = ownedOpportunityIds(userId);
  return db.follow_ups.filter(
    (f) => f.user_id === userId || (f.opportunity_id != null && oIds.has(f.opportunity_id)),
  );
}
export function getInvoices(userId: string): Invoice[] {
  const db = loadDB();
  if (!personaRoleForSession(userId)) return db.invoices;
  const pIds = ownedProjectIds(userId);
  return db.invoices.filter(
    (i) => i.user_id === userId || (i.project_id != null && pIds.has(i.project_id)),
  );
}
export function getInvoiceItems(userId: string, invoiceId?: string): InvoiceItem[] {
  const db = loadDB();
  let rows = db.invoice_items.filter((it) => !invoiceId || it.invoice_id === invoiceId);
  const role = personaRoleForSession(userId);
  if (role) {
    const iIds = ownedInvoiceIds(userId);
    rows = rows.filter((it) => iIds.has(it.invoice_id));
  }
  return rows;
}
export function getTemplates(_userId: string): EmailTemplate[] {
  // Email templates are workspace-level resources shared by every login.
  return loadDB().email_templates;
}
export function getAutomations(_userId: string): AutomationRule[] {
  // Automation rules are workspace-level resources shared by every login.
  return loadDB().automation_rules;
}
export function getImportRuns(_userId: string): ImportRun[] {
  // Import audit history is workspace-level.
  return loadDB().import_runs;
}
