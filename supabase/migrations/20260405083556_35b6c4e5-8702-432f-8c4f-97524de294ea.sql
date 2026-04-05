
-- ============================================================
-- FIX 1: Prevent users from self-granting admin via profiles
-- ============================================================

-- Drop existing INSERT policies that don't restrict is_admin
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Recreate INSERT policy: users can insert their own profile but is_admin must be false
CREATE POLICY "profiles_insert_own_non_admin"
ON public.profiles FOR INSERT
TO public
WITH CHECK (id = auth.uid() AND (is_admin = false OR is_admin IS NULL));

-- Drop existing UPDATE policies that allow is_admin changes
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Recreate UPDATE policy: users can update own profile but cannot change is_admin to true
CREATE POLICY "profiles_update_own_non_admin"
ON public.profiles FOR UPDATE
TO public
USING (id = auth.uid() OR is_current_user_admin())
WITH CHECK (
  (id = auth.uid() AND is_admin = (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()))
  OR is_current_user_admin()
);

-- ============================================================
-- FIX 2: Lock down token_transactions INSERT to service role only
-- ============================================================

-- Drop permissive INSERT policies on token_transactions
DROP POLICY IF EXISTS "Users can create own token transactions" ON public.token_transactions;
DROP POLICY IF EXISTS "Users can create their own token transactions" ON public.token_transactions;

-- No new INSERT policy for authenticated users - only service_role can insert

-- ============================================================
-- FIX 3: Make generated-images storage bucket private
-- ============================================================

-- Update storage bucket to private
UPDATE storage.buckets SET public = false WHERE id = 'generated-images';

-- Drop existing overly permissive storage SELECT policy
DROP POLICY IF EXISTS "Users can view generated images" ON storage.objects;

-- Create owner-scoped SELECT policy
CREATE POLICY "Users can view own generated images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'generated-images' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- Ensure INSERT policy is owner-scoped too
DROP POLICY IF EXISTS "Users can upload generated images" ON storage.objects;
CREATE POLICY "Users can upload own generated images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'generated-images' AND (auth.uid())::text = (storage.foldername(name))[1]);
