UPDATE public.user_mcp_settings
SET enabled_tools = (
  SELECT jsonb_agg(DISTINCT t)
  FROM jsonb_array_elements_text(COALESCE(enabled_tools, '[]'::jsonb) || '["hub_register","hub_sync","hub_send","hub_messages","hub_presence","hub_ask","hub_job"]'::jsonb) AS t
)
WHERE NOT (enabled_tools @> '["hub_register","hub_sync","hub_send","hub_messages","hub_presence","hub_ask","hub_job"]'::jsonb);