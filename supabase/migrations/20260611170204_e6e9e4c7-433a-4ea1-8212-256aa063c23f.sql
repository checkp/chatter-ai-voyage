-- Lock down SECURITY DEFINER functions: only service_role / triggers need them.
REVOKE EXECUTE ON FUNCTION public.set_user_admin(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_admin(uuid, boolean) TO service_role;

REVOKE EXECUTE ON FUNCTION public.add_daily_tokens() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_daily_tokens() TO service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user_setup() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user_setup() TO service_role;

REVOKE EXECUTE ON FUNCTION public.match_user_context(uuid, vector, integer, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_user_context(uuid, vector, integer, uuid) TO service_role;

-- is_current_user_admin is used inside RLS expressions and must remain callable
-- by signed-in users, but anonymous users should never call it.
REVOKE EXECUTE ON FUNCTION public.is_current_user_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated, service_role;

-- Revoke SELECT on user-owned tables from anon. RLS already blocks anon reads,
-- but stripping SELECT also hides these tables from the public GraphQL schema.
REVOKE SELECT ON public.conversations         FROM anon;
REVOKE SELECT ON public.messages              FROM anon;
REVOKE SELECT ON public.message_embeddings    FROM anon;
REVOKE SELECT ON public.generated_images      FROM anon;
REVOKE SELECT ON public.user_tokens           FROM anon;
REVOKE SELECT ON public.token_transactions    FROM anon;
REVOKE SELECT ON public.user_agent_settings   FROM anon;
REVOKE SELECT ON public.user_api_keys         FROM anon;
REVOKE SELECT ON public.user_memory           FROM anon;
REVOKE SELECT ON public.profiles              FROM anon;
REVOKE SELECT ON public.demo_rate_limits      FROM anon;
REVOKE SELECT ON public.demo_daily_usage      FROM anon;