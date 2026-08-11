-- Add current (2026) models
INSERT INTO public.model_pricing (platform, model_id, cost_tier, tokens_per_message) VALUES
  -- OpenAI
  ('openai','gpt-5.6-sol','high',22),
  ('openai','gpt-5.6-terra','medium',10),
  ('openai','gpt-5.6-luna','low',5),
  ('openai','o3-deep-research','high',30),
  -- Anthropic
  ('anthropic','claude-fable-5','high',28),
  ('anthropic','claude-opus-5','high',20),
  ('anthropic','claude-sonnet-5','medium',12),
  -- Google
  ('google','gemini-3.6-flash','medium',7),
  ('google','gemini-3.5-flash','medium',8),
  ('google','gemini-3.5-flash-lite','low',4),
  ('google','gemini-3.1-flash-lite','low',4),
  -- xAI
  ('grok','grok-4.5','high',18),
  ('grok','grok-4.3','medium',10),
  ('grok','grok-4.20-0309-reasoning','medium',12),
  ('grok','grok-code-fast-1','low',5),
  -- DeepSeek
  ('deepseek','deepseek-v4-pro','medium',8),
  -- Mistral
  ('mistral','mistral-medium-3.5','medium',10),
  ('mistral','mistral-small-4','low',5),
  ('mistral','mistral-large-3','medium',12),
  -- Perplexity
  ('perplexity','sonar','low',5),
  ('perplexity','sonar-pro','medium',10),
  ('perplexity','sonar-reasoning-pro','high',16),
  ('perplexity','sonar-deep-research','high',30),
  -- Qwen
  ('qwen','qwen3.8-max','high',16),
  ('qwen','qwen3.6-plus','medium',8),
  ('qwen','qwen-turbo','low',4),
  ('qwen','qwen3-vl-plus','medium',9)
ON CONFLICT DO NOTHING;

-- Retire models providers no longer serve
DELETE FROM public.model_pricing WHERE (platform, model_id) IN (
  ('anthropic','claude-3-5-haiku-20241022'),
  ('anthropic','claude-3-5-sonnet-20241022'),
  ('anthropic','claude-3-opus-20240229'),
  ('anthropic','claude-haiku-4-20250514'),
  ('google','gemini-1.5-flash'),
  ('google','gemini-1.5-pro'),
  ('google','gemini-2.0-flash-exp'),
  ('grok','grok-2-1212'),
  ('grok','grok-2-mini'),
  ('grok','grok-2-vision-1212'),
  ('grok','grok-3-fast'),
  ('grok','grok-3-mini-fast'),
  ('mistral','mistral-large-latest'),
  ('mistral','mistral-medium-latest'),
  ('mistral','mistral-small-latest')
);
