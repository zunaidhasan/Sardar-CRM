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
} from "@/lib/db/demo-data";
import { normalizeDate } from "@/lib/import-validation";
import type {
  Account,
  Activity,
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
} from "@/lib/types";
import { uid } from "@/lib/utils";

export interface DemoDB {
  demo_version: number;
  profile: Profile;
  team_members: TeamMember[];
  accounts: Account[];
  clients: Client[];
  opportunities: Opportunity[];
  projects: Project[];
  milestones: Milestone[];
  project_todos: ProjectTodo[];
  project_credentials: ProjectCredential[];
  project_team_members: ProjectTeamMember[];
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
          cache = buildDemoData();
          saveDB(cache);
          return cache;
        }
        // Backfill tables added after this demo file was first created so
        // older persisted files keep working without a full reseed. New
        // sections get the built-in demo rows (deterministic IDs referencing
        // seeded projects), not empty arrays, so the UI shows them working.
        const NEW_TABLES = ["project_todos", "project_credentials", "project_team_members"] as const;
        const missingTables = NEW_TABLES.filter(
          (t) => !Array.isArray((parsed as unknown as Record<string, unknown>)[t]),
        );
        if (missingTables.length > 0) {
          const fresh = buildDemoData();
          for (const t of missingTables) {
            (parsed as unknown as Record<string, unknown>)[t] = fresh[t];
          }
          cache = parsed;
          saveDB(cache);
          return parsed;
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
        cache = parsed;
        return parsed;
      }
    }
  } catch {
    // corrupted file -> reseed
  }
  cache = buildDemoData();
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

export function resetDB(): DemoDB {
  cache = buildDemoData();
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

export function demoDbPath(): string {
  return DB_PATH;
}

export { DEMO_USER_ID };

// ---------------------------------------------------------------------------
// Convenience typed getters (used by the data layer)
// ---------------------------------------------------------------------------
export function getAccounts(userId: string): Account[] {
  return loadDB().accounts.filter((a) => a.user_id === userId);
}
export function getTeamMembers(userId: string): TeamMember[] {
  return loadDB().team_members.filter((t) => t.user_id === userId);
}
export function getClients(userId: string): Client[] {
  return loadDB().clients.filter((c) => c.user_id === userId);
}
export function getOpportunities(userId: string): Opportunity[] {
  return loadDB().opportunities.filter((o) => o.user_id === userId);
}
export function getProjects(userId: string): Project[] {
  return loadDB().projects.filter((p) => p.user_id === userId);
}
export function getMilestones(userId: string, projectId?: string): Milestone[] {
  return loadDB().milestones.filter(
    (m) => m.user_id === userId && (!projectId || m.project_id === projectId),
  );
}
export function getProjectTodos(userId: string, projectId?: string): ProjectTodo[] {
  return loadDB().project_todos.filter(
    (t) => t.user_id === userId && (!projectId || t.project_id === projectId),
  );
}
export function getProjectCredentials(userId: string, projectId?: string): ProjectCredential[] {
  return loadDB().project_credentials.filter(
    (c) => c.user_id === userId && (!projectId || c.project_id === projectId),
  );
}
export function getProjectTeamMembers(userId: string, projectId?: string): ProjectTeamMember[] {
  return loadDB().project_team_members.filter(
    (m) => m.user_id === userId && (!projectId || m.project_id === projectId),
  );
}
export function getActivities(userId: string, limit = 100): Activity[] {
  return loadDB()
    .activities.filter((a) => a.user_id === userId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, limit);
}
export function getFollowUps(userId: string): FollowUp[] {
  return loadDB().follow_ups.filter((f) => f.user_id === userId);
}
export function getInvoices(userId: string): Invoice[] {
  return loadDB().invoices.filter((i) => i.user_id === userId);
}
export function getInvoiceItems(_userId: string, invoiceId?: string): InvoiceItem[] {
  return loadDB().invoice_items.filter((it) => !invoiceId || it.invoice_id === invoiceId);
}
export function getTemplates(userId: string): EmailTemplate[] {
  return loadDB().email_templates.filter((t) => t.user_id === userId);
}
export function getAutomations(userId: string): AutomationRule[] {
  return loadDB().automation_rules.filter((a) => a.user_id === userId);
}
export function getImportRuns(userId: string): ImportRun[] {
  return loadDB().import_runs.filter((i) => i.user_id === userId);
}
