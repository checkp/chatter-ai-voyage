
-- First, remove duplicate entries keeping only the most recent one for each user
DELETE FROM public.user_tokens 
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id) id 
    FROM public.user_tokens 
    ORDER BY user_id, created_at DESC NULLS LAST, id
);

-- Now add the unique constraint
ALTER TABLE public.user_tokens ADD CONSTRAINT user_tokens_user_id_unique UNIQUE (user_id);
