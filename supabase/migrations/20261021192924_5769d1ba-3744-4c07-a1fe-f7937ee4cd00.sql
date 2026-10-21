INSERT INTO public.model_pricing (platform, model_id, cost_tier, tokens_per_message, api_cost_per_1k_tokens)
SELECT * FROM (VALUES
  ('openai',    'gpt-6-astra',        'high',   30, 0.010000),
  ('openai',    'gpt-6.1-sol',        'medium', 14, 0.002000),
  ('openai',    'gpt-6-luna',         'low',     4, 0.000100),
  ('anthropic', 'claude-fable-5-1',   'high',   30, 0.010000),
  ('anthropic', 'claude-opus-5-5',    'high',   22, 0.004000),
  ('anthropic', 'claude-sonnet-5-5',  'medium', 12, 0.002000),
  ('anthropic', 'claude-haiku-5-5',   'low',     6, 0.000100),
  ('google',    'gemini-4-argon',     'high',   16, 0.002000),
  ('google',    'gemini-3.8-flash',   'medium',  8, 0.000750),
  ('grok',      'grok-4.7',           'high',   18, 0.002000),
  ('grok',      'grok-4.6',           'high',   18, 0.002000),
  ('grok',      'grok-build-0.1',     'low',     5, 0.001000),
  ('deepseek',  'deepseek-flash',     'low',     5, 0.000280),
  ('mistral',   'mistral-large-4',    'medium', 12, 0.000680),
  ('qwen',      'qwen3.7-plus',       'medium', 10, 0.000800),
  ('qwen',      'qwen3.8-flash',      'low',     5, 0.000300)
) AS v(platform, model_id, cost_tier, tokens_per_message, api_cost_per_1k_tokens)
WHERE NOT EXISTS (
  SELECT 1 FROM public.model_pricing mp
  WHERE mp.platform = v.platform AND mp.model_id = v.model_id
);

-- Retired at the provider: grok-code-fast-1 (xAI, May 2026) and the
-- deepseek-chat / deepseek-reasoner aliases (DeepSeek, July 2026).
DELETE FROM public.model_pricing
WHERE (platform = 'grok' AND model_id = 'grok-code-fast-1')
   OR (platform = 'deepseek' AND model_id IN ('deepseek-chat', 'deepseek-reasoner'));