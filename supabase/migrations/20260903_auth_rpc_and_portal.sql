-- =============================================================================
-- Migration: Auth RPC hardening + client portal + webhooks
-- Date: 2026-09-03
-- Description:
--   1. Recreate get_profile_by_username with pinned search_path + GRANT
--   2. Auto-create profiles on auth.users insert
--   3. Client portal tables (magic-link)
--   4. Notification webhooks table (was localStorage-only)
-- =============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL AND u.email IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_profile_by_username(p_username text)
RETURNS TABLE (
  profile_id uuid,
  is_active boolean,
  email text
)
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

-- Webhooks
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

DROP TRIGGER IF EXISTS trg_notification_webhooks_updated_at ON public.notification_webhooks;
CREATE TRIGGER trg_notification_webhooks_updated_at BEFORE UPDATE ON public.notification_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_webhooks_user ON public.notification_webhooks(user_id);

ALTER TABLE public.notification_webhooks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "webhooks_all_own" ON public.notification_webhooks;
CREATE POLICY "webhooks_all_own" ON public.notification_webhooks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Client portals
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

DROP TRIGGER IF EXISTS trg_client_portals_updated_at ON public.client_portals;
CREATE TRIGGER trg_client_portals_updated_at BEFORE UPDATE ON public.client_portals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_portals_token ON public.client_portals(token);
CREATE INDEX IF NOT EXISTS idx_client_portals_client ON public.client_portals(client_id);

ALTER TABLE public.client_portals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "portals_all_own" ON public.client_portals;
CREATE POLICY "portals_all_own" ON public.client_portals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.portal_signatures (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_id     uuid NOT NULL REFERENCES public.client_portals(id) ON DELETE CASCADE,
  signer_name   text NOT NULL,
  signature_data text NOT NULL,
  signed_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_signatures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "portal_signatures_via_owner" ON public.portal_signatures;
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
