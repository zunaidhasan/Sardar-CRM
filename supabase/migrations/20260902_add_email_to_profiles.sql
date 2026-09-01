-- =============================================================================
-- Migration: Add email column to profiles + fix auth user
-- Date: 2026-09-02
-- Description: The login flow needs to resolve username -> email, but
--   1) profiles had no email column
--   2) getUserById fails on raw-SQL-created auth users
-- Solution: store email in profiles and use a direct SQL function for login.
-- =============================================================================

-- 1. Add email column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text;

-- Backfill email from auth.users (safe: uses a direct SQL join, no API needed)
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL AND u.email IS NOT NULL;

-- 2. Replace the login lookup with a stable SQL function that bypasses
--    both RLS and the fragile auth.admin.getUserById API.
CREATE OR REPLACE FUNCTION public.get_profile_by_username(p_username text)
RETURNS TABLE (
  profile_id uuid,
  is_active boolean,
  email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT p.id, p.is_active, p.email
  FROM public.profiles p
  WHERE lower(p.username) = lower(p_username)
  LIMIT 1;
$$;
