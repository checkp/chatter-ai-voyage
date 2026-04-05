
-- Fix search_path on existing public functions
ALTER FUNCTION public.is_current_user_admin() SET search_path = public;
ALTER FUNCTION public.add_daily_tokens() SET search_path = public;
