
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.roboheard_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX roboheard_api_keys_user_id_idx ON public.roboheard_api_keys(user_id);
CREATE INDEX roboheard_api_keys_hash_idx ON public.roboheard_api_keys(key_hash) WHERE revoked_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.roboheard_api_keys TO authenticated;
GRANT ALL ON public.roboheard_api_keys TO service_role;

ALTER TABLE public.roboheard_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own api keys" ON public.roboheard_api_keys
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own api keys" ON public.roboheard_api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own api keys" ON public.roboheard_api_keys
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own api keys" ON public.roboheard_api_keys
  FOR DELETE USING (auth.uid() = user_id);
