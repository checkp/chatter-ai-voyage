CREATE TABLE public.user_capability_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL,
  think boolean NOT NULL DEFAULT false,
  search boolean NOT NULL DEFAULT false,
  deep_research boolean NOT NULL DEFAULT false,
  code_exec boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_capability_defaults TO authenticated;
GRANT ALL ON public.user_capability_defaults TO service_role;

ALTER TABLE public.user_capability_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own capability defaults"
  ON public.user_capability_defaults FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own capability defaults"
  ON public.user_capability_defaults FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own capability defaults"
  ON public.user_capability_defaults FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own capability defaults"
  ON public.user_capability_defaults FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER tg_user_capability_defaults_updated_at
  BEFORE UPDATE ON public.user_capability_defaults
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
