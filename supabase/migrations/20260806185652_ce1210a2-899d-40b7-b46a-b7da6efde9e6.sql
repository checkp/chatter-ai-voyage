ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS valid_chat_mode;
ALTER TABLE public.conversations ADD CONSTRAINT valid_chat_mode
  CHECK (chat_mode = ANY (ARRAY['discussion'::text, 'side-by-side'::text, 'conductor'::text, 'build'::text]));