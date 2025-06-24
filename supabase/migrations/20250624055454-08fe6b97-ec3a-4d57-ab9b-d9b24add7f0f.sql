
-- Update the constraint to include the new conductor mode
ALTER TABLE public.conversations 
DROP CONSTRAINT IF EXISTS valid_chat_mode;

ALTER TABLE public.conversations 
ADD CONSTRAINT valid_chat_mode 
CHECK (chat_mode IN ('discussion', 'side-by-side', 'conductor'));
