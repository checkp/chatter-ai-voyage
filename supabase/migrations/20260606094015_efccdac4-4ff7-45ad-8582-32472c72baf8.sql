
-- 1. Tighten profiles UPDATE policy so no UPDATE path can change is_admin
DROP POLICY IF EXISTS profiles_update_own_non_admin ON public.profiles;

CREATE POLICY profiles_update_own_non_admin
ON public.profiles
FOR UPDATE
USING ((id = auth.uid()) OR public.is_current_user_admin())
WITH CHECK (
  CASE
    WHEN public.is_current_user_admin() THEN (is_admin = (SELECT p.is_admin FROM public.profiles p WHERE p.id = profiles.id))
    ELSE ((id = auth.uid()) AND (is_admin = false))
  END
);

-- 2. Provide a safe admin-only RPC for promoting/demoting users
CREATE OR REPLACE FUNCTION public.set_user_admin(target_user_id uuid, make_admin boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.profiles
  SET is_admin = make_admin,
      updated_at = now()
  WHERE id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_admin(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_admin(uuid, boolean) TO authenticated;

-- 3. Lock down SECURITY DEFINER helpers
-- add_daily_tokens is intended for scheduled/admin use only
REVOKE ALL ON FUNCTION public.add_daily_tokens() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_daily_tokens() TO service_role;

-- handle_new_user_setup is a trigger; no client should call it directly
REVOKE ALL ON FUNCTION public.handle_new_user_setup() FROM PUBLIC, anon, authenticated;

-- is_current_user_admin must remain callable so RLS policies that reference it work
REVOKE ALL ON FUNCTION public.is_current_user_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated, service_role;
