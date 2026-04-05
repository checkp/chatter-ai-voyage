UPDATE user_agent_settings SET model = 'claude-sonnet-4-20250514' WHERE platform = 'anthropic' AND model IN ('claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229');

UPDATE user_agent_settings SET model = 'gemini-2.0-flash' WHERE platform = 'google' AND model IN ('gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp');