ALTER TABLE public.user_agent_settings ADD COLUMN IF NOT EXISTS custom_instructions TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_system_prompt TEXT;