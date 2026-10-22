CREATE TABLE public.automation_state (
  job text PRIMARY KEY,
  status text NOT NULL DEFAULT 'idle',
  pause_reason text,
  lease_expires_at timestamp with time zone,
  last_run_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.automation_state TO authenticated;
GRANT ALL ON public.automation_state TO service_role;
ALTER TABLE public.automation_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users can read automation state"
  ON public.automation_state FOR SELECT TO authenticated USING (true);

CREATE TABLE public.model_update_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ran_at timestamp with time zone NOT NULL DEFAULT now(),
  added jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated jsonb NOT NULL DEFAULT '[]'::jsonb,
  retired jsonb NOT NULL DEFAULT '[]'::jsonb,
  copy_hints jsonb NOT NULL DEFAULT '[]'::jsonb,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.model_update_reports TO authenticated;
GRANT ALL ON public.model_update_reports TO service_role;
ALTER TABLE public.model_update_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users can read model update reports"
  ON public.model_update_reports FOR SELECT TO authenticated USING (true);