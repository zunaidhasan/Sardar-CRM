export type Platform = "fiverr" | "upwork" | "direct";
export type OpportunityType = "bid" | "pre_sales" | "direct";
export type OpportunityStage = "lead" | "proposal" | "negotiation" | "active" | "won" | "lost";
export type BidStatus = "no_response" | "only_viewed" | "response" | "interview" | "hired" | "rejected";
export type FollowupStatus = "pending" | "follow_up" | "accepted" | "complete" | "nra" | "no_response" | "archived";
export type ProjectStatus = "wip" | "submitted" | "revision" | "delivered" | "complete" | "cancelled" | "nra" | "client_update";
export type InvoiceStatus = "draft" | "pending" | "paid" | "overdue";
export type MilestoneStatus = "pending" | "in_progress" | "done";
export type ActivityType = "note" | "email" | "call" | "meeting" | "follow_up" | "bid" | "proposal_sent" | "status_change" | "invoice" | "import" | "system";
export type Priority = "low" | "medium" | "high" | "urgent";
export type ImportEntity = "opportunities" | "projects" | "clients";
export type EntityType = "client" | "opportunity" | "project" | "invoice" | "import";

// Outbound lead types
export type LeadScore = "High" | "Medium" | "Low";
export type OutreachStatus = "New" | "Contacted" | "Replied" | "Meeting" | "Proposal" | "Won" | "Lost";

// ---------------------------------------------------------------------------
// Row shapes (mirror supabase/schema.sql exactly)
// ---------------------------------------------------------------------------

export interface Profile {
  id: string;
  username?: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  currency: string;
  default_fee_percent: number;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  platform: Platform;
  username: string | null;
  profile_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type TeamRole = "ceo" | "executive" | "developer" | "designer";

// Login identity for username/password auth. In demo mode these live in the
// file-backed store (password is a scrypt hash); with Supabase they mirror
// auth.users + profiles (username column). Agency management provisions them;
// there is NO public self-registration.
export interface AppUser {
  id: string;
  username: string;
  password_hash: string | null; // scrypt "salt:hash" (demo only; null for Supabase users)
  name: string;
  email: string | null;
  role: TeamRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  role: TeamRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  company: string | null;
  platform: Platform | null;
  username: string | null;
  profile_url: string | null;
  category: string | null;
  account_id: string | null;
  tags: string[];
  notes: string | null;
  // Outbound lead fields
  lead_score: LeadScore | null;
  country: string | null;
  industry: string | null;
  website: string | null;
  linkedin_url: string | null;
  main_problem_found: string | null;
  website_review_notes: string | null;
  source: string | null;
  outreach_status: OutreachStatus;
  email_verified: boolean;
  last_email_sent_at: string | null;
  next_follow_up_date: string | null;
  follow_up_count: number;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Opportunity {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  client_id: string | null;
  account_id: string | null;
  platform: Platform;
  type: OpportunityType;
  stage: OpportunityStage;
  status: BidStatus | null;
  follow_up_status: FollowupStatus;
  amount: number;
  currency: string;
  connects_spent: number;
  source_url: string | null;
  due_date: string | null;
  next_follow_up: string | null;
  assigned_to: string | null;
  lost_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  opportunity_id: string | null;
  client_id: string | null;
  account_id: string | null;
  project_name: string;
  order_date: string | null;
  assigned_to: string | null;
  developer: string | null;
  website_link: string | null;
  project_type: string | null;
  delivery_deadline: string | null;
  gross_amount: number;
  fee_percent: number;
  fee_amount: number;
  net_amount: number;
  bonus: number;
  status: ProjectStatus;
  priority: Priority;
  progress: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  description: string | null;
  order_index: number;
  status: MilestoneStatus;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Granular per-project to-do items (unlike milestones these carry an
// assignee + due date and are quick day-to-day tasks).
export interface ProjectTodo {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: MilestoneStatus;
  due_date: string | null;
  assignee: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

// Client login / access details for a project (WP admin, cPanel, FTP, ...).
// Passwords are encrypted at rest (AES-256-GCM via CREDENTIALS_ENCRYPTION_KEY)
// and masked in the UI until revealed.
export interface ProjectCredential {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  url: string | null;
  username: string | null;
  password: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// One logged timesheet row against a project (date, hours, task). Drives
// the per-project time tracking UI and the Calendar page's time entries.
export interface TimeEntry {
  id: string;
  user_id: string;
  project_id: string;
  date: string; // YYYY-MM-DD
  hours: number; // 0.25 .. 24
  description: string | null;
  assignee: string | null;
  billable: boolean;
  created_at: string;
  updated_at: string;
}

// A person attached to a project (General Manager, Project Manager,
// Developer, Tester, Sales, ...). Links to team_members when available;
// name + role_label are snapshotted so the roster survives member edits.
export interface ProjectTeamMember {
  id: string;
  user_id: string;
  project_id: string;
  team_member_id: string | null;
  name: string;
  role_label: string;
  created_at: string;
  updated_at: string;
}

// Passwords NEVER ship to the client: the UI only learns whether one exists
// and fetches the value on demand via a server action when revealed.
export type ProjectCredentialView = Omit<ProjectCredential, "password"> & {
  has_password: boolean;
};

export interface Activity {
  id: string;
  user_id: string;
  entity_type: EntityType;
  entity_id: string;
  activity_type: ActivityType;
  subject: string | null;
  body: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Activity plus an optional resolved actor display name, used by team-wide
// feeds (e.g. the CEO dashboard) where the row's author may not be the viewer.
export type ActivityWithActor = Activity & { actor_name?: string | null };

export interface FollowUp {
  id: string;
  user_id: string;
  opportunity_id: string | null;
  client_id: string | null;
  platform: Platform;
  conversation_url: string | null;
  status: FollowupStatus;
  scheduled_at: string | null;
  last_contact: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  invoice_number: string;
  client_id: string | null;
  project_id: string | null;
  issue_date: string;
  due_date: string | null;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface Attachment {
  id: string;
  user_id: string;
  entity_type: EntityType;
  entity_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  created_at: string;
}

export interface EmailTemplate {
  id: string;
  user_id: string;
  name: string;
  category: string;
  subject: string | null;
  body: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutomationRule {
  id: string;
  user_id: string;
  name: string;
  trigger_event: string;
  trigger_value: string | null;
  action_type: string;
  action_data: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ImportRun {
  id: string;
  user_id: string;
  entity_type: ImportEntity;
  file_name: string;
  total_rows: number;
  imported_rows: number;
  failed_rows: number;
  log: Array<{ row: number; error: string }>;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Joined / view models used by the UI
// ---------------------------------------------------------------------------

export interface OpportunityWithRelations extends Opportunity {
  client?: Client | null;
  account?: Account | null;
}

export interface ProjectWithRelations extends Project {
  client?: Client | null;
  account?: Account | null;
  opportunity?: Opportunity | null;
  milestones?: Milestone[];
  invoice?: Invoice | null;
}

export interface ClientWithRelations extends Client {
  opportunities?: Opportunity[];
  projects?: Project[];
  activities?: Activity[];
  attachments?: Attachment[];
  follow_ups?: FollowUp[];
}

export interface InvoiceWithRelations extends Invoice {
  client?: Client | null;
  project?: Project | null;
  items?: InvoiceItem[];
}

export type AutomationWithRelations = AutomationRule;

// ---------------------------------------------------------------------------
// Recurring Invoices
// ---------------------------------------------------------------------------

export type RecurringFrequency = "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";

export interface RecurringInvoice {
  id: string;
  user_id: string;
  client_id: string | null;
  project_id: string | null;
  name: string;
  amount: number;
  currency: string;
  frequency: RecurringFrequency;
  description: string | null;
  is_active: boolean;
  next_run_date: string;
  last_run_date: string | null;
  total_runs: number;
  max_runs: number | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Email Sequences (persisted in Supabase)
// ---------------------------------------------------------------------------

export interface EmailSequenceRow {
  id: string;
  user_id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SequenceStepRow {
  id: string;
  sequence_id: string;
  user_id: string;
  order_index: number;
  subject: string;
  body: string;
  delay_days: number;
  status: "active" | "paused" | "completed";
  created_at: string;
  updated_at: string;
}

export interface SequenceEnrollmentRow {
  id: string;
  sequence_id: string;
  lead_id: string;
  user_id: string;
  current_step: number;
  status: "active" | "paused" | "completed" | "exited";
  enrolled_at: string;
  last_sent_at: string | null;
  next_send_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Project Expenses (cost tracking)
// ---------------------------------------------------------------------------

export type ExpenseCategory = "plugin" | "hosting" | "subcontractor" | "design" | "stock" | "other";

export interface ProjectExpense {
  id: string;
  user_id: string;
  project_id: string;
  description: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  vendor: string | null;
  date: string; // YYYY-MM-DD
  is_billable: boolean;
  receipt_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Notification Webhooks (Slack / WhatsApp / Custom)
// ---------------------------------------------------------------------------

export type WebhookEventType = "lead.created" | "deal.won" | "invoice.paid" | "project.created" | "invoice.overdue";

export interface WebhookConfig {
  id: string;
  user_id: string;
  name: string;
  type: "slack" | "whatsapp" | "custom";
  url: string;
  is_active: boolean;
  events: WebhookEventType[];
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// API Keys
// ---------------------------------------------------------------------------

export interface ApiKeyRow {
  id: string;
  user_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
}
