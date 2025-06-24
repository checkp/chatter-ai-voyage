
-- Add conductor_platform field to conversations table
ALTER TABLE public.conversations 
ADD COLUMN conductor_platform text;
