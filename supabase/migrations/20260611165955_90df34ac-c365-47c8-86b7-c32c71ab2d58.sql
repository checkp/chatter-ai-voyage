CREATE OR REPLACE FUNCTION public.deduct_user_tokens(p_user_id uuid, p_tokens integer)
RETURNS TABLE(new_balance integer, new_total_consumed integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.user_tokens
     SET balance = balance - p_tokens,
         total_consumed = COALESCE(total_consumed, 0) + p_tokens,
         updated_at = now()
   WHERE user_id = p_user_id
     AND balance >= p_tokens
  RETURNING balance, total_consumed;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.deduct_user_tokens(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.deduct_user_tokens(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.deduct_user_tokens(uuid, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_user_tokens(uuid, integer) TO service_role;