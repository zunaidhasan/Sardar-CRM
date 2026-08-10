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
  full_name     text,
  avatar_url    text,
  role          text NOT NULL DEFAULT 'owner',
  currency      text NOT NULL DEFAULT 'USD',
  default_fee_percent numeric(5,2) NOT NULL DEFAULT 20.00,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

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

-- ---------------------------------------------------------------------------
-- 4. INDEXES
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_user ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_user ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_account ON public.clients(account_id);
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
