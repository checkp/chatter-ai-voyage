
CREATE TABLE public.demo_rate_limits (
  user_id UUID PRIMARY KEY,
  hour_window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  hour_count INT NOT NULL DEFAULT 0,
  day_window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  day_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.demo_rate_limits TO service_role;
ALTER TABLE public.demo_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only" ON public.demo_rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.demo_daily_usage (
  day DATE PRIMARY KEY,
  total_calls INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.demo_daily_usage TO service_role;
ALTER TABLE public.demo_daily_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only daily" ON public.demo_daily_usage FOR ALL TO service_role USING (true) WITH CHECK (true);
