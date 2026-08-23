-- =============================================================================
-- Migration: Outbound Lead Module
-- Date: 2026-08-24
-- Description: Adds outbound lead fields to the clients table for the cold
--              email campaign (US/UK/CA). Includes lead scoring, outreach
--              tracking, follow-up scheduling, and website review fields.
--
-- Run this migration against your production Supabase database:
--   supabase db push
--   or via the Supabase Dashboard SQL Editor
-- =============================================================================

-- 1. Add enum types for lead score and outreach status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_score') THEN
    CREATE TYPE lead_score AS ENUM ('High', 'Medium', 'Low');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'outreach_status') THEN
    CREATE TYPE outreach_status AS ENUM (
      'New', 'Contacted', 'Replied', 'Meeting', 'Proposal', 'Won', 'Lost'
    );
  END IF;
END $$;

-- 2. Extend the clients table with outbound lead columns
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS lead_score lead_score,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS main_problem_found text,
  ADD COLUMN IF NOT EXISTS website_review_notes text,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS outreach_status outreach_status DEFAULT 'New',
  ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_follow_up_date date,
  ADD COLUMN IF NOT EXISTS follow_up_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES profiles(id);

-- 3. Add indexes for filtering and sorting performance
CREATE INDEX IF NOT EXISTS idx_clients_outreach_status
  ON clients (outreach_status);

CREATE INDEX IF NOT EXISTS idx_clients_lead_score
  ON clients (lead_score);

CREATE INDEX IF NOT EXISTS idx_clients_next_follow_up
  ON clients (next_follow_up_date)
  WHERE next_follow_up_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clients_owner
  ON clients (owner_id)
  WHERE owner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clients_source
  ON clients (source);

CREATE INDEX IF NOT EXISTS idx_clients_country
  ON clients (country);

-- 4. Update RLS policies to include owner-based access
-- (Existing policies already scope by user_id; this adds owner access)

-- Drop existing client policies if needed, then recreate with owner support
-- NOTE: Adjust these policies based on your actual RLS setup

-- Allow CEO and executives to see all leads
-- Allow team members to see leads assigned to them
DO $$
BEGIN
  -- Only apply if the policy doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can view their own clients or assigned outbound leads'
    AND tablename = 'clients'
  ) THEN
    -- Drop the old simple policy if it exists
    DROP POLICY IF EXISTS "Users can view own clients" ON clients;

    CREATE POLICY "Users can view own clients or assigned outbound leads"
      ON clients FOR SELECT
      USING (
        user_id = auth.uid()
        OR owner_id = auth.uid()
      );
  END IF;
END $$;

-- 5. Add comment to the table for documentation
COMMENT ON COLUMN clients.lead_score IS 'Lead quality score: High, Medium, or Low';
COMMENT ON COLUMN clients.country IS 'Target country: United States, United Kingdom, or Canada';
COMMENT ON COLUMN clients.industry IS 'Industry vertical (eCommerce, Real Estate, Agency, etc.)';
COMMENT ON COLUMN clients.website IS 'Company website URL';
COMMENT ON COLUMN clients.linkedin_url IS 'LinkedIn profile URL';
COMMENT ON COLUMN clients.main_problem_found IS 'Short summary of the main website problem identified';
COMMENT ON COLUMN clients.website_review_notes IS 'Detailed website review notes and findings';
COMMENT ON COLUMN clients.source IS 'Lead source: Apollo, Manual, Import, LinkedIn, Hunter, etc.';
COMMENT ON COLUMN clients.outreach_status IS 'Current outreach status in the cold email pipeline';
COMMENT ON COLUMN clients.email_verified IS 'Whether the lead email address has been verified';
COMMENT ON COLUMN clients.last_email_sent_at IS 'Timestamp of the last email sent to this lead';
COMMENT ON COLUMN clients.next_follow_up_date IS 'Scheduled date for the next follow-up email';
COMMENT ON COLUMN clients.follow_up_count IS 'Number of follow-up emails sent';
COMMENT ON COLUMN clients.owner_id IS 'Team member assigned to this lead (references profiles.id)';
