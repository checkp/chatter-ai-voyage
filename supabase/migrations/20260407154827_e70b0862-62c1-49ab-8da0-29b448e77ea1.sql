
-- =============================================
-- 1. CLEAN UP DUPLICATE RLS POLICIES
-- =============================================

-- user_api_keys: Keep one policy per operation
DROP POLICY IF EXISTS "Users can create their own api keys" ON public.user_api_keys;
DROP POLICY IF EXISTS "Users can insert their own API keys" ON public.user_api_keys;
DROP POLICY IF EXISTS "Users can delete their own API keys" ON public.user_api_keys;
DROP POLICY IF EXISTS "Users can delete their own api keys" ON public.user_api_keys;
DROP POLICY IF EXISTS "Users can update their own API keys" ON public.user_api_keys;
DROP POLICY IF EXISTS "Users can update their own api keys" ON public.user_api_keys;
DROP POLICY IF EXISTS "Users can view their own API keys" ON public.user_api_keys;
DROP POLICY IF EXISTS "Users can view their own api keys" ON public.user_api_keys;

-- conversations: Keep one policy per operation
DROP POLICY IF EXISTS "Users can create their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can insert their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;

-- messages: Keep one policy per operation
DROP POLICY IF EXISTS "Users can create messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages to their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON public.messages;

-- user_agent_settings: Keep one per operation, prefer the one with admin check for SELECT
DROP POLICY IF EXISTS "Users can create their own agent settings" ON public.user_agent_settings;
DROP POLICY IF EXISTS "Users can insert their own agent settings" ON public.user_agent_settings;
DROP POLICY IF EXISTS "Users can update their own agent settings" ON public.user_agent_settings;
DROP POLICY IF EXISTS "Users can view own agent settings" ON public.user_agent_settings;
DROP POLICY IF EXISTS "Users can view their own agent settings" ON public.user_agent_settings;

-- token_transactions: Keep token_transactions_select_policy (has admin check), drop duplicates
DROP POLICY IF EXISTS "Users can view own token transactions" ON public.token_transactions;
DROP POLICY IF EXISTS "Users can view their own token transactions" ON public.token_transactions;
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.token_transactions;

-- token_packages: Keep "Anyone can view active token packages", drop duplicates
DROP POLICY IF EXISTS "Everyone can read active packages" ON public.token_packages;
DROP POLICY IF EXISTS "Everyone can view token packages" ON public.token_packages;

-- user_tokens: Keep user_tokens_select_policy (has admin check), drop duplicate
DROP POLICY IF EXISTS "Users can view their own tokens" ON public.user_tokens;

-- profiles: Keep profiles_select_policy (has admin check), drop duplicate
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- =============================================
-- 2. ADD STORAGE UPDATE POLICY FOR GENERATED-IMAGES
-- =============================================
CREATE POLICY "Users can update their own generated images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'generated-images' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'generated-images' AND (auth.uid())::text = (storage.foldername(name))[1]);
