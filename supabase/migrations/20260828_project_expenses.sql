-- =============================================================================
-- Migration: Project Expenses (Cost Tracking)
-- Date: 2026-08-28
-- Description: Adds the project_expenses table that the app's cost tracking
--              feature requires. This table was missing from the original schema.
-- =============================================================================

-- 1. Expense categories enum (matches the app's ExpenseCategory type)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_category') THEN
    CREATE TYPE public.expense_category AS ENUM (
      'plugin', 'hosting', 'stock', 'subcontractor', 'design', 'other'
    );
  END IF;
END $$;

-- 2. Table
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

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_project ON public.project_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user ON public.project_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.project_expenses(date);

-- 4. RLS
ALTER TABLE public.project_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses_all_own" ON public.project_expenses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
