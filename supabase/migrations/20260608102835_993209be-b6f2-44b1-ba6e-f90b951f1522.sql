
INSERT INTO public.model_pricing (platform, model_id, cost_tier, api_cost_per_1k_tokens, tokens_per_message, created_at, updated_at) VALUES
('qwen', 'qwen-max',    'high',   0.010,  16, now(), now()),
('qwen', 'qwen-plus',   'medium', 0.002,  8,  now(), now()),
('qwen', 'qwen-turbo',  'low',    0.0006, 5,  now(), now()),
('qwen', 'qwen3-max',   'high',   0.012,  18, now(), now())
ON CONFLICT DO NOTHING;
