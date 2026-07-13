
CREATE TABLE public.user_mcp_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  enabled_tools JSONB NOT NULL DEFAULT '["list_models","ask_model","web_search","conductor_ask","conductor_route","conductor_compare","conductor_debate"]'::jsonb,
  enabled_platforms JSONB NOT NULL DEFAULT '["openai","anthropic","google","grok","deepseek","perplexity","mistral","qwen"]'::jsonb,
  default_conductor_platform TEXT NOT NULL DEFAULT 'openai',
  default_web_search_model TEXT NOT NULL DEFAULT 'sonar-pro',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_mcp_settings TO authenticated;
GRANT ALL ON public.user_mcp_settings TO service_role;

ALTER TABLE public.user_mcp_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own mcp settings" ON public.user_mcp_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_user_mcp_settings_updated
  BEFORE UPDATE ON public.user_mcp_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
