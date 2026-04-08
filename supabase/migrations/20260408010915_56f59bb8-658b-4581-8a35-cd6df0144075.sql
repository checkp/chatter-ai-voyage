
-- Remove user-facing INSERT policy on user_tokens
-- Token rows are already auto-created by handle_new_user_setup trigger on signup
DROP POLICY IF EXISTS "user_tokens_insert_policy" ON public.user_tokens;

-- Harden is_current_user_admin: only authenticated users should call it
REVOKE EXECUTE ON FUNCTION public.is_current_user_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;
