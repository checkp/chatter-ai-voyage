// RoboHeard REST API — key-authenticated wrapper around the MCP tool set.
// Auth: `Authorization: Bearer rh_<key>` OR `x-api-key: rh_<key>`.
// POST /v1/tools/call        { tool, arguments }  → runs one tool
// POST /v1/chat              { platform, prompt, ... } → shortcut for ask_model
// POST /v1/search            { query, ... }             → shortcut for web_search
// POST /v1/conductor         { prompt, ... }            → shortcut for conductor_ask
// GET  /v1/tools             list enabled tools for this user
// GET  /v1/models            list available models
//
// All calls delegate to the deployed `mcp` edge function using the user's
// service-minted session JWT, so RLS, token billing, and chat persistence
// behave identically to the browser and MCP paths.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-api-key, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MCP_URL = `${SUPABASE_URL}/functions/v1/mcp`;

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface ApiCtx {
  userId: string;
  keyId: string;
  admin: ReturnType<typeof createClient>;
}

async function authenticate(req: Request): Promise<ApiCtx | Response> {
  const raw = req.headers.get("x-api-key")
    ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    ?? "";
  const key = raw.trim();
  if (!key.startsWith("rh_")) {
    return jsonResponse({ error: "Missing or malformed API key. Use `Authorization: Bearer rh_...` or `x-api-key`." }, 401);
  }
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const hash = await sha256Hex(key);
  const { data, error } = await admin
    .from("roboheard_api_keys")
    .select("id, user_id, revoked_at")
    .eq("key_hash", hash)
    .maybeSingle();
  if (error || !data || data.revoked_at) {
    return jsonResponse({ error: "Invalid or revoked API key." }, 401);
  }
  // Best-effort last_used timestamp; do not await.
  admin.from("roboheard_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id).then(() => {});
  return { userId: data.user_id as string, keyId: data.id as string, admin };
}

// Mint a short-lived JWT so the MCP function's normal auth path works unchanged.
async function mintSessionToken(ctx: ApiCtx): Promise<string> {
  // Fetch user email for the magic link — required by Supabase admin API.
  const { data: userData, error: userErr } = await ctx.admin.auth.admin.getUserById(ctx.userId);
  if (userErr || !userData.user?.email) throw new Error("Could not resolve user for API key");
  const { data, error } = await ctx.admin.auth.admin.generateLink({
    type: "magiclink",
    email: userData.user.email,
  });
  if (error || !data) throw new Error("Could not mint session");
  // generateLink returns a hashed_token; exchange it for a session.
  const hashedToken = data.properties?.hashed_token;
  if (!hashedToken) throw new Error("No hashed_token returned");
  const client = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });
  const { data: verified, error: vErr } = await client.auth.verifyOtp({ type: "magiclink", token_hash: hashedToken });
  if (vErr || !verified.session) throw new Error("Could not verify session");
  return verified.session.access_token;
}

async function callMcp(jwt: string, method: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? "MCP error");
  return json.result ?? {};
}

async function runTool(jwt: string, tool: string, args: Record<string, unknown>) {
  const result = await callMcp(jwt, "tools/call", { name: tool, arguments: args });
  const isError = (result as { isError?: boolean }).isError;
  const structured = (result as { structuredContent?: unknown }).structuredContent;
  const textContent = (result as { content?: Array<{ text?: string }> }).content?.[0]?.text;
  if (isError) throw new Error(textContent ?? "Tool error");
  return structured ?? textContent ?? result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  // Strip the function-name prefix so we compare on the /v1/... segment.
  const path = url.pathname.replace(/^\/functions\/v1\/api/, "").replace(/^\/api/, "") || "/";

  const auth = await authenticate(req);
  if (auth instanceof Response) return auth;

  // MCP now accepts the raw rh_ token directly and mints an internal session.
  // We just need to know the caller was validated; pass a token MCP will re-validate.
  const jwt = (req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "").trim();

  try {
    if (req.method === "GET" && path === "/v1/tools") {
      const result = await callMcp(jwt, "tools/list", {});
      return jsonResponse(result);
    }
    if (req.method === "GET" && path === "/v1/models") {
      const out = await runTool(jwt, "list_models", {});
      return jsonResponse(out);
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: `Unsupported ${req.method} ${path}` }, 405);
    }

    const body = await req.json().catch(() => ({}));

    if (path === "/v1/tools/call") {
      const { tool, arguments: args } = body as { tool?: string; arguments?: Record<string, unknown> };
      if (!tool) return jsonResponse({ error: "`tool` is required" }, 400);
      const out = await runTool(jwt, tool, args ?? {});
      return jsonResponse({ tool, result: out });
    }
    if (path === "/v1/chat") {
      const out = await runTool(jwt, "ask_model", body as Record<string, unknown>);
      return jsonResponse(out);
    }
    if (path === "/v1/search") {
      const out = await runTool(jwt, "web_search", body as Record<string, unknown>);
      return jsonResponse(out);
    }
    if (path === "/v1/conductor") {
      const out = await runTool(jwt, "conductor_ask", body as Record<string, unknown>);
      return jsonResponse(out);
    }

    return jsonResponse({ error: `Unknown endpoint: ${req.method} ${path}` }, 404);
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
