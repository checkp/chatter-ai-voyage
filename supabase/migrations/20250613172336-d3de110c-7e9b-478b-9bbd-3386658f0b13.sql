
-- Fix infinite recursion in profiles table RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create simple, non-recursive policies
CREATE POLICY "Enable read access for own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Enable insert for own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Also ensure user_tokens table has proper RLS
ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;

-- Drop and recreate user_tokens policies to be safe
DROP POLICY IF EXISTS "Users can view own tokens" ON public.user_tokens;
DROP POLICY IF EXISTS "Users can update own tokens" ON public.user_tokens;
DROP POLICY IF EXISTS "Users can insert own tokens" ON public.user_tokens;

CREATE POLICY "Enable read access for own tokens" ON public.user_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for own tokens" ON public.user_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for own tokens" ON public.user_tokens
    FOR UPDATE USING (auth.uid() = user_id);
