
-- First, completely disable RLS temporarily to clear any conflicts
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tokens DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view own tokens" ON public.user_tokens;
DROP POLICY IF EXISTS "Users can update own tokens" ON public.user_tokens;
DROP POLICY IF EXISTS "Users can insert own tokens" ON public.user_tokens;
DROP POLICY IF EXISTS "Enable read access for own tokens" ON public.user_tokens;
DROP POLICY IF EXISTS "Enable insert for own tokens" ON public.user_tokens;
DROP POLICY IF EXISTS "Enable update for own tokens" ON public.user_tokens;

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;

-- Create simple, direct policies for profiles table
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE USING (id = auth.uid());

-- Create simple, direct policies for user_tokens table
CREATE POLICY "user_tokens_select_policy" ON public.user_tokens
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_tokens_insert_policy" ON public.user_tokens
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_tokens_update_policy" ON public.user_tokens
    FOR UPDATE USING (user_id = auth.uid());
