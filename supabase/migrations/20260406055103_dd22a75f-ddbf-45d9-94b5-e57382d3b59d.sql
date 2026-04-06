-- Fix 1: Drop public (anon) SELECT policy on model_pricing, keep authenticated-only
DROP POLICY IF EXISTS "Everyone can read model pricing" ON public.model_pricing;

-- Fix 2: Drop user UPDATE policies on user_tokens to prevent self-grant
DROP POLICY IF EXISTS "Users can update their own tokens" ON public.user_tokens;
DROP POLICY IF EXISTS "user_tokens_update_policy" ON public.user_tokens;