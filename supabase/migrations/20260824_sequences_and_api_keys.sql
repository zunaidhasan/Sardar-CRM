-- =============================================================================
-- Migration: Email Sequences & API Keys
-- Date: 2026-08-24
-- Description:
--   1. email_sequences / sequence_steps / sequence_enrollments — replaces
--      the in-memory email sequence store so sequences persist across restarts.
--   2. api_keys — proper API key authentication for the REST API and webhooks,
--      replacing the username-as-bearer-token pattern.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. EMAIL SEQUENCES
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.email_sequences (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  description   text NOT NULL DEFAULT '',
  is_active     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_email_sequences_updated_at
  BEFORE UPDATE ON public.email_sequences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sequences_all_own" ON public.email_sequences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 2. SEQUENCE STEPS
-- ---------------------------------------------------------------------------

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

CREATE TRIGGER trg_sequence_steps_updated_at
  BEFORE UPDATE ON public.sequence_steps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_sequence_steps_seq ON public.sequence_steps(sequence_id);

ALTER TABLE public.sequence_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sequence_steps_all_own" ON public.sequence_steps
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. SEQUENCE ENROLLMENTS
-- ---------------------------------------------------------------------------

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

CREATE TRIGGER trg_sequence_enrollments_updated_at
  BEFORE UPDATE ON public.sequence_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_enrollments_seq ON public.sequence_enrollments(sequence_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_lead ON public.sequence_enrollments(lead_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_due ON public.sequence_enrollments(next_send_at)
  WHERE status = 'active' AND next_send_at IS NOT NULL;

ALTER TABLE public.sequence_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enrollments_all_own" ON public.sequence_enrollments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4. API KEYS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.api_keys (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,                    -- human-readable label e.g. "Apollo Integration"
  key_hash      text NOT NULL,                    -- SHA-256 hash of the raw key
  key_prefix    text NOT NULL,                    -- first 8 chars for display: "sb_xxxx..."
  scopes        text[] NOT NULL DEFAULT '{read,write}',  -- permission scopes
  is_active     boolean NOT NULL DEFAULT true,
  last_used_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON public.api_keys(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_keys_all_own" ON public.api_keys
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
