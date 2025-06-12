
-- First, update any existing invalid chat_mode values to 'discussion'
UPDATE public.conversations 
SET chat_mode = 'discussion' 
WHERE chat_mode NOT IN ('discussion', 'side-by-side', 'discussion-side-by-side');

-- Add isolated_mode column to conversations table
ALTER TABLE public.conversations 
ADD COLUMN isolated_mode boolean DEFAULT false;

-- Update the constraint to include the new discussion-side-by-side mode
ALTER TABLE public.conversations 
DROP CONSTRAINT IF EXISTS valid_chat_mode;

ALTER TABLE public.conversations 
ADD CONSTRAINT valid_chat_mode 
CHECK (chat_mode IN ('discussion', 'side-by-side', 'discussion-side-by-side'));
