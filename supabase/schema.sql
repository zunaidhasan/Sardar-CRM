-- ============================================================================
-- Sardar CRM - Complete Supabase Schema
-- Postgres + Auth + Storage + Realtime
--
-- Run this in the Supabase SQL Editor (or via `supabase db push`).
-- It is idempotent-ish: uses `CREATE OR REPLACE` for functions and
-- `CREATE TABLE IF NOT EXISTS` + `DO` blocks for enums.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. ENUMS
-- Real statuses the user already uses across their sheets.
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.platform AS ENUM ('fiverr', 'upwork', 'direct');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.opportunity_type AS ENUM ('bid', 'pre_sales', 'direct');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Kanban pipeline stages
DO $$ BEGIN
  CREATE TYPE public.opportunity_stage AS ENUM ('lead', 'proposal', 'negotiation', 'active', 'won', 'lost');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Upwork bid statuses (from the user's bid tracking sheet)
DO $$ BEGIN
  CREATE TYPE public.bid_status AS ENUM ('no_response', 'only_viewed', 'response', 'interview', 'hired', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Follow-up / lead-nurture statuses (from the Fiverr nurture sheet)
DO $$ BEGIN
  CREATE TYPE public.followup_status AS ENUM ('pending', 'follow_up', 'accepted', 'complete', 'nra', 'no_response', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Monthly order-tracking statuses (from the order sheets)
DO $$ BEGIN
  CREATE TYPE public.project_status AS ENUM ('wip', 'submitted', 'revision', 'delivered', 'complete', 'cancelled', 'nra', 'client_update');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.invoice_status AS ENUM ('draft', 'pending', 'paid', 'overdue');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.milestone_status AS ENUM ('pending', 'in_progress', 'done');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.activity_type AS ENUM ('note', 'email', 'call', 'meeting', 'follow_up', 'bid', 'proposal_sent', 'status_change', 'invoice', 'import', 'system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.import_entity AS ENUM ('opportunities', 'projects', 'clients');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.lead_score AS ENUM ('High', 'Medium', 'Low');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.outreach_status AS ENUM ('New', 'Contacted', 'Replied', 'Meeting', 'Proposal', 'Won', 'Lost');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.team_member_role AS ENUM ('ceo', 'executive', 'developer', 'designer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 2. EXTENSIONS + HELPERS
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Auto-updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 3. TABLES
-- ---------------------------------------------------------------------------

-- 3.1 profiles -- extends auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      text,                        -- agency-provided login name (username+password auth)
  email         text,                        -- denormalized from auth.users for username login
  full_name     text,
  avatar_url    text,
  role          text NOT NULL DEFAULT 'owner',
  currency      text NOT NULL DEFAULT 'USD',
  default_fee_percent numeric(5,2) NOT NULL DEFAULT 20.00,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Existing installs that ran an older schema.sql without the email column.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Usernames are matched case-insensitively at login, so enforce uniqueness
-- on the lowercased value.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx
  ON public.profiles (lower(username));

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Username login lookup. Login is unauthenticated, so this must be
-- SECURITY DEFINER and executable by the service role. search_path is
-- pinned to block search-path injection on DEFINER functions.
CREATE OR REPLACE FUNCTION public.get_profile_by_username(p_username text)
RETURNS TABLE(profile_id uuid, is_active boolean, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id AS profile_id, p.is_active, p.email
  FROM public.profiles p
  WHERE lower(p.username) = lower(p_username)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_profile_by_username(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_by_username(text) TO service_role;

-- Auto-create a profile row when a new auth user is provisioned so
-- username login and RLS never see a dangling auth.users row.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE
    SET email = COALESCE(EXCLUDED.email, public.profiles.email);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3.2 accounts -- multiple Fiverr/Upwork seller profiles
CREATE TABLE IF NOT EXISTS public.accounts (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,             -- e.g. "JohnDesigns"
  platform      public.platform NOT NULL,
  username      text,
  profile_url   text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform, username)
);

CREATE TRIGGER trg_accounts_updated_at BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3.3 clients
CREATE TABLE IF NOT EXISTS public.clients (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  email         text,
  company       text,
  platform      public.platform,
  username      text,                       -- Fiverr/Upwork username
  profile_url   text,
  category      text,                       -- e.g. "WordPress", "Shopify", "Logo"
  account_id    uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  tags          text[] NOT NULL DEFAULT '{}',
  notes         text,
  -- Outbound lead fields (cold email campaign)
  lead_score          public.lead_score,
  country             text,
  industry            text,
  website             text,
  linkedin_url        text,
  main_problem_found  text,
  website_review_notes text,
  source              text,
  outreach_status     public.outreach_status NOT NULL DEFAULT 'New',
  email_verified      boolean NOT NULL DEFAULT false,
  last_email_sent_at  timestamptz,
  next_follow_up_date date,
  follow_up_count     integer NOT NULL DEFAULT 0,
  owner_id            uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3.4 opportunities -- bids + pre-sales quotes (powers the Kanban)
CREATE TABLE IF NOT EXISTS public.opportunities (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         text NOT NULL,
  description   text,
  client_id     uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  account_id    uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  platform      public.platform NOT NULL DEFAULT 'upwork',
  type          public.opportunity_type NOT NULL DEFAULT 'bid',
  stage         public.opportunity_stage NOT NULL DEFAULT 'lead',
  status        public.bid_status,          -- Upwork bid lifecycle
  follow_up_status public.followup_status DEFAULT 'pending',
  amount        numeric(12,2) DEFAULT 0,    -- quoted value
  currency      text NOT NULL DEFAULT 'USD',
  connects_spent integer NOT NULL DEFAULT 0,
  source_url    text,                       -- bid link / conversation link
  due_date      date,
  next_follow_up date,
  assigned_to   text,                       -- team member / self
  lost_reason   text,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_opportunities_updated_at BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3.5 projects -- maps to the monthly order sheets (the heart of the system)
CREATE TABLE IF NOT EXISTS public.projects (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  client_id     uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  account_id    uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  project_name  text NOT NULL,
  order_date    date,
  assigned_to   text,                       -- "Assign" column
  developer     text,
  website_link  text,
  project_type  text,                       -- "Project Type" column
  delivery_deadline date,
  gross_amount  numeric(12,2) DEFAULT 0,
  fee_percent   numeric(5,2) NOT NULL DEFAULT 20.00,
  fee_amount    numeric(12,2) DEFAULT 0,
  net_amount    numeric(12,2) DEFAULT 0,    -- net after platform fee
  bonus         numeric(12,2) DEFAULT 0,
  status        public.project_status NOT NULL DEFAULT 'wip',
  priority      public.priority NOT NULL DEFAULT 'medium',
  progress      smallint NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3.6 milestones -- interactive task checkboxes on a project
CREATE TABLE IF NOT EXISTS public.milestones (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id    uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title         text NOT NULL,
  description   text,
  order_index   integer NOT NULL DEFAULT 0,
  status        public.milestone_status NOT NULL DEFAULT 'pending',
  due_date      date,
  completed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_milestones_updated_at BEFORE UPDATE ON public.milestones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3.7 activities -- feed / history (also powers "follow-ups")
CREATE TABLE IF NOT EXISTS public.activities (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type   text NOT NULL,              -- 'client' | 'opportunity' | 'project' | 'invoice'
  entity_id     uuid NOT NULL,
  activity_type public.activity_type NOT NULL DEFAULT 'note',
  subject       text,
  body          text,
  metadata      jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 3.8 follow_ups -- dedicated lead-nurture tracker (Fiverr conversation links etc.)
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE CASCADE,
  client_id     uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  platform      public.platform NOT NULL DEFAULT 'fiverr',
  conversation_url text,
  status        public.followup_status NOT NULL DEFAULT 'pending',
  scheduled_at  date,
  last_contact  date,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_follow_ups_updated_at BEFORE UPDATE ON public.follow_ups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3.9 invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  client_id     uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id    uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  issue_date    date NOT NULL DEFAULT CURRENT_DATE,
  due_date      date,
  amount        numeric(12,2) NOT NULL DEFAULT 0,
  currency      text NOT NULL DEFAULT 'USD',
  status        public.invoice_status NOT NULL DEFAULT 'pending',
  paid_at       date,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, invoice_number)
);

CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3.10 invoice_items
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id    uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description   text NOT NULL,
  quantity      numeric(10,2) NOT NULL DEFAULT 1,
  unit_price    numeric(12,2) NOT NULL DEFAULT 0,
  amount        numeric(12,2) NOT NULL DEFAULT 0
);

-- 3.11 attachments (metadata; files live in Supabase Storage bucket 'attachments')
CREATE TABLE IF NOT EXISTS public.attachments (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type   text NOT NULL,              -- 'client' | 'opportunity' | 'project' | 'invoice'
  entity_id     uuid NOT NULL,
  file_name     text NOT NULL,
  file_path     text NOT NULL,              -- storage path: {user_id}/{entity}/{uuid}/{file}
  file_size     bigint NOT NULL DEFAULT 0,
  mime_type     text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 3.12 email_templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  category      text NOT NULL DEFAULT 'follow_up',
  subject       text,
  body          text NOT NULL,
  is_default    boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_email_templates_updated_at BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3.13 automation_rules -- e.g. stage moves to 'active' -> create project + milestones
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  trigger_event text NOT NULL,              -- 'opportunity.stage_changed' | 'project.created' ...
  trigger_value text,                       -- e.g. 'active'
  action_type   text NOT NULL,              -- 'create_project' | 'create_milestones' | 'log_activity' | 'create_invoice'
  action_data   jsonb NOT NULL DEFAULT '{}',
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_automation_rules_updated_at BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3.14 import_runs -- audit trail for CSV/XLSX imports
CREATE TABLE IF NOT EXISTS public.import_runs (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type   public.import_entity NOT NULL,
  file_name     text NOT NULL,
  total_rows    integer NOT NULL DEFAULT 0,
  imported_rows integer NOT NULL DEFAULT 0,
  failed_rows   integer NOT NULL DEFAULT 0,
  log           jsonb NOT NULL DEFAULT '[]',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Team members belong to a workspace (owner = user_id) and carry a role.
CREATE TABLE IF NOT EXISTS public.team_members (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  email         text,
  role          public.team_member_role NOT NULL DEFAULT 'executive',
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 3.15 project_todos -- day-to-day task list per project
CREATE TABLE IF NOT EXISTS public.project_todos (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id    uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title         text NOT NULL,
  description   text,
  status        public.milestone_status NOT NULL DEFAULT 'pending',
  due_date      date,
  assignee      text,
  order_index   integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_project_todos_updated_at BEFORE UPDATE ON public.project_todos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3.16 project_credentials -- client logins / access details for a project
CREATE TABLE IF NOT EXISTS public.project_credentials (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id    uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title         text NOT NULL,             -- e.g. "WordPress Admin", "cPanel", "FTP"
  url           text,
  username      text,
  password      text,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_project_credentials_updated_at BEFORE UPDATE ON public.project_credentials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3.17 project_team_members -- who is attached to a project and in what role
CREATE TABLE IF NOT EXISTS public.project_team_members (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id      uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  team_member_id  uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  name            text NOT NULL,           -- snapshot
  role_label      text NOT NULL,           -- 'General Manager' | 'Project Manager' | 'Developer' | 'Tester' | 'Sales' ...
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_project_team_updated_at BEFORE UPDATE ON public.project_team_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3.18 time_entries -- timesheet rows logged against a project
CREATE TABLE IF NOT EXISTS public.time_entries (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id    uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  date          date NOT NULL DEFAULT CURRENT_DATE,
  hours         numeric(5,2) NOT NULL DEFAULT 0 CHECK (hours > 0 AND hours <= 24),
  description   text,
  assignee      text,
  billable      boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_time_entries_updated_at BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3.19 project_expenses -- cost tracking for true profitability
DO $$ BEGIN
  CREATE TYPE public.expense_category AS ENUM (
    'plugin', 'hosting', 'stock', 'subcontractor', 'design', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.project_expenses (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id    uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  description   text NOT NULL,
  amount        numeric(12,2) NOT NULL DEFAULT 0,
  currency      text NOT NULL DEFAULT 'USD',
  category      public.expense_category NOT NULL DEFAULT 'other',
  vendor        text,
  date          date NOT NULL DEFAULT CURRENT_DATE,
  is_billable   boolean NOT NULL DEFAULT true,
  receipt_url   text,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_project_expenses_updated_at BEFORE UPDATE ON public.project_expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3.20 email sequences
CREATE TABLE IF NOT EXISTS public.email_sequences (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  description   text NOT NULL DEFAULT '',
  is_active     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_email_sequences_updated_at BEFORE UPDATE ON public.email_sequences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.sequence_steps (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id   uuid NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_index   integer NOT NULL DEFAULT 0,
  subject       text NOT NULL DEFAULT '',
  body          text NOT NULL DEFAULT '',
  delay_days    integer NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_sequence_steps_updated_at BEFORE UPDATE ON public.sequence_steps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.sequence_enrollments (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id   uuid NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  lead_id       uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_step  integer NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'exited')),
  enrolled_at   timestamptz NOT NULL DEFAULT now(),
  last_sent_at  timestamptz,
  next_send_at  timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_sequence_enrollments_updated_at BEFORE UPDATE ON public.sequence_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3.21 api_keys
CREATE TABLE IF NOT EXISTS public.api_keys (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  key_hash      text NOT NULL,
  key_prefix    text NOT NULL,
  scopes        text[] NOT NULL DEFAULT '{read,write}',
  is_active     boolean NOT NULL DEFAULT true,
  last_used_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz
);

-- 3.22 notification webhooks (outgoing)
CREATE TABLE IF NOT EXISTS public.notification_webhooks (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  type          text NOT NULL DEFAULT 'custom' CHECK (type IN ('slack', 'whatsapp', 'custom')),
  url           text NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  events        text[] NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_notification_webhooks_updated_at BEFORE UPDATE ON public.notification_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3.23 magic-link client portals
CREATE TABLE IF NOT EXISTS public.client_portals (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id     uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id    uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  token         text NOT NULL UNIQUE,
  is_active     boolean NOT NULL DEFAULT true,
  expires_at    timestamptz,
  last_viewed_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_client_portals_updated_at BEFORE UPDATE ON public.client_portals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.portal_signatures (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id     uuid NOT NULL REFERENCES public.client_portals(id) ON DELETE CASCADE,
  signer_name   text NOT NULL,
  signature_data text NOT NULL,
  signed_at     timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 4. INDEXES
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_user ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_user ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_account ON public.clients(account_id);
CREATE INDEX IF NOT EXISTS idx_clients_outreach ON public.clients(outreach_status, lead_score);
CREATE INDEX IF NOT EXISTS idx_clients_next_followup ON public.clients(next_follow_up_date);
CREATE INDEX IF NOT EXISTS idx_opps_user_stage ON public.opportunities(user_id, stage);
CREATE INDEX IF NOT EXISTS idx_opps_client ON public.opportunities(client_id);
CREATE INDEX IF NOT EXISTS idx_opps_account ON public.opportunities(account_id);
CREATE INDEX IF NOT EXISTS idx_opps_created ON public.opportunities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_user_status ON public.projects(user_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_client ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_account ON public.projects(account_id);
CREATE INDEX IF NOT EXISTS idx_projects_order_date ON public.projects(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_milestones_project ON public.milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_activities_entity ON public.activities(user_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activities_created ON public.activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_followups_user_status ON public.follow_ups(user_id, status);
CREATE INDEX IF NOT EXISTS idx_followups_next ON public.follow_ups(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_invoices_user_status ON public.invoices(user_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_attachments_entity ON public.attachments(user_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_imports_user ON public.import_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_team_user ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_email ON public.team_members(email);
CREATE INDEX IF NOT EXISTS idx_todos_project ON public.project_todos(project_id);
CREATE INDEX IF NOT EXISTS idx_credentials_project ON public.project_credentials(project_id);
CREATE INDEX IF NOT EXISTS idx_project_team_project ON public.project_team_members(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project ON public.time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON public.time_entries(date);
CREATE INDEX IF NOT EXISTS idx_expenses_project ON public.project_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user ON public.project_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_seq ON public.sequence_steps(sequence_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_seq ON public.sequence_enrollments(sequence_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON public.api_keys(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_webhooks_user ON public.notification_webhooks(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_portals_token ON public.client_portals(token);
CREATE INDEX IF NOT EXISTS idx_client_portals_client ON public.client_portals(client_id);

-- ---------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- Every table gets: enable RLS + policies so users only see their own data.
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_runs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_todos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_signatures ENABLE ROW LEVEL SECURITY;

-- profiles: user can manage their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- accounts
CREATE POLICY "accounts_all_own" ON public.accounts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- clients
CREATE POLICY "clients_all_own" ON public.clients
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- opportunities
CREATE POLICY "opps_all_own" ON public.opportunities
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- projects
CREATE POLICY "projects_all_own" ON public.projects
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- milestones
CREATE POLICY "milestones_all_own" ON public.milestones
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- activities
CREATE POLICY "activities_all_own" ON public.activities
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Workspace-wide read for the CEO activity feed: only a trusted workspace
-- owner (profiles.role in ceo/owner) can SELECT activities created by any
-- user whose email matches one of their team members. The "owns team_members
-- rows" signal alone is spoofable (any authenticated user may insert their
-- own team_members row), hence the role check. Writes stay per-owner.
CREATE POLICY "activities_workspace_select" ON public.activities
  FOR SELECT USING (
    user_id = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('ceo', 'owner')
      )
      AND EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.user_id = auth.uid()
      )
      AND user_id IN (
        SELECT u.id FROM auth.users u
        WHERE lower(u.email) IN (
          SELECT lower(tm.email) FROM public.team_members tm
          WHERE tm.user_id = auth.uid() AND tm.email IS NOT NULL
        )
      )
    )
  );

-- follow_ups
CREATE POLICY "followups_all_own" ON public.follow_ups
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- invoices
CREATE POLICY "invoices_all_own" ON public.invoices
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- invoice_items via owning invoice
CREATE POLICY "invoice_items_all_own" ON public.invoice_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_items.invoice_id AND i.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_items.invoice_id AND i.user_id = auth.uid()
    )
  );

-- attachments
CREATE POLICY "attachments_all_own" ON public.attachments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- email_templates
CREATE POLICY "templates_all_own" ON public.email_templates
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- automation_rules
CREATE POLICY "automation_all_own" ON public.automation_rules
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- import_runs
CREATE POLICY "imports_all_own" ON public.import_runs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- team_members: the workspace owner manages all members; every workspace user can read.
CREATE POLICY "team_members_all_own" ON public.team_members
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "team_members_select_workspace" ON public.team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.team_members me
      WHERE me.email = auth.jwt() ->> 'email' AND me.is_active = true
    )
  );

-- project_todos
CREATE POLICY "todos_all_own" ON public.project_todos
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- project_credentials
CREATE POLICY "credentials_all_own" ON public.project_credentials
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- project_team_members
CREATE POLICY "project_team_all_own" ON public.project_team_members
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- time_entries
CREATE POLICY "time_entries_all_own" ON public.time_entries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- project_expenses
CREATE POLICY "expenses_all_own" ON public.project_expenses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- email sequences
CREATE POLICY "sequences_all_own" ON public.email_sequences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sequence_steps_all_own" ON public.sequence_steps
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "enrollments_all_own" ON public.sequence_enrollments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- api_keys
CREATE POLICY "api_keys_all_own" ON public.api_keys
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- notification webhooks
CREATE POLICY "webhooks_all_own" ON public.notification_webhooks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- client portals: owners manage; public lookup is via SECURITY DEFINER RPC
CREATE POLICY "portals_all_own" ON public.client_portals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "portal_signatures_via_owner" ON public.portal_signatures
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.client_portals p
      WHERE p.id = portal_signatures.portal_id AND p.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.client_portals p
      WHERE p.id = portal_signatures.portal_id AND p.user_id = auth.uid()
    )
  );

-- Public magic-link lookup (anon). Token is unguessable (32 bytes).
CREATE OR REPLACE FUNCTION public.get_portal_by_token(p_token text)
RETURNS TABLE (
  portal_id uuid,
  client_id uuid,
  project_id uuid,
  user_id uuid,
  is_active boolean,
  expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, client_id, project_id, user_id, is_active, expires_at
  FROM public.client_portals
  WHERE token = p_token
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_portal_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_portal_by_token(text) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6. SUPABASE STORAGE BUCKET + POLICIES
-- Files are namespaced under {user_id}/ so storage RLS can check ownership.
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "attachments_storage_all_own" ON storage.objects
  FOR ALL USING (
    bucket_id = 'attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  ) WITH CHECK (
    bucket_id = 'attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- 7. REALTIME
-- Kanban drag-and-drop persists via REST, but enabling realtime is useful
-- for live multi-tab / future team sync.
-- ---------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.opportunities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
