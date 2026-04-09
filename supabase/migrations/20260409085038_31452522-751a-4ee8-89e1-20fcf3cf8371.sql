
-- Fix 1: Tighten profiles INSERT policy - strictly enforce is_admin = false (no NULL bypass)
DROP POLICY IF EXISTS "profiles_insert_own_non_admin" ON public.profiles;
CREATE POLICY "profiles_insert_own_non_admin"
ON public.profiles
FOR INSERT
TO public
WITH CHECK (id = auth.uid() AND is_admin = false);

-- Fix 2: Tighten profiles UPDATE policy - non-admins cannot change is_admin at all
DROP POLICY IF EXISTS "profiles_update_own_non_admin" ON public.profiles;
CREATE POLICY "profiles_update_own_non_admin"
ON public.profiles
FOR UPDATE
TO public
USING (id = auth.uid() OR is_current_user_admin())
WITH CHECK (
  CASE 
    WHEN is_current_user_admin() THEN true
    ELSE (id = auth.uid() AND is_admin = false)
  END
);

-- Fix 3: Restrict token_packages SELECT to authenticated users only
DROP POLICY IF EXISTS "Anyone can view active token packages" ON public.token_packages;
CREATE POLICY "Authenticated users can view active token packages"
ON public.token_packages
FOR SELECT
TO authenticated
USING (is_active = true);
