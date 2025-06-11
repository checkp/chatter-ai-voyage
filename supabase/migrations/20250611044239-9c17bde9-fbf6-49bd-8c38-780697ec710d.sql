
-- Add chat_mode column to conversations table
ALTER TABLE public.conversations 
ADD COLUMN chat_mode text DEFAULT 'discussion';

-- Add constraint to validate chat mode values
ALTER TABLE public.conversations 
ADD CONSTRAINT valid_chat_mode 
CHECK (chat_mode IN ('discussion', 'isolated', 'side-by-side'));

-- Update existing conversations to have the default mode
UPDATE public.conversations 
SET chat_mode = 'discussion' 
WHERE chat_mode IS NULL;

-- Make the column non-nullable now that all rows have values
ALTER TABLE public.conversations 
ALTER COLUMN chat_mode SET NOT NULL;
