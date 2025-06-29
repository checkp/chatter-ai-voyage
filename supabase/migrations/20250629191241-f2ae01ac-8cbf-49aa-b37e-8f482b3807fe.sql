
-- Create a security definer function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update profiles table policies to allow admin access
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT USING (
        id = auth.uid() OR public.is_current_user_admin()
    );

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE USING (
        id = auth.uid() OR public.is_current_user_admin()
    );

-- Update user_tokens table policies to allow admin access
DROP POLICY IF EXISTS "user_tokens_select_policy" ON public.user_tokens;
CREATE POLICY "user_tokens_select_policy" ON public.user_tokens
    FOR SELECT USING (
        user_id = auth.uid() OR public.is_current_user_admin()
    );

-- Update token_transactions table policies to allow admin access
DROP POLICY IF EXISTS "token_transactions_select_policy" ON public.token_transactions;
CREATE POLICY "token_transactions_select_policy" ON public.token_transactions
    FOR SELECT USING (
        user_id = auth.uid() OR public.is_current_user_admin()
    );

-- Also add admin policies for other tables that might be needed
-- Update user_agent_settings policies
DROP POLICY IF EXISTS "user_agent_settings_select_policy" ON public.user_agent_settings;
CREATE POLICY "user_agent_settings_select_policy" ON public.user_agent_settings
    FOR SELECT USING (
        user_id = auth.uid() OR public.is_current_user_admin()
    );
