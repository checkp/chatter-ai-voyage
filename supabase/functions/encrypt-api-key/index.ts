
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user?.id) throw new Error("User not authenticated");

    const { platform, api_key } = await req.json();
    
    if (!platform || !api_key) {
      throw new Error("Platform and API key are required");
    }

    // Simple encryption using Web Crypto API (in production, use a more robust solution)
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(Deno.env.get("API_KEY_ENCRYPTION_SECRET") || "default-secret-key-32-chars-long"),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"]
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      encoder.encode(api_key)
    );

    // Combine salt + iv + encrypted data and encode as base64
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);
    
    const encryptedKey = btoa(String.fromCharCode(...combined));

    // Store or update the encrypted API key
    const { error } = await supabaseClient
      .from('user_api_keys')
      .upsert({
        user_id: user.id,
        platform: platform,
        encrypted_key: encryptedKey,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,platform'
      });

    if (error) {
      throw new Error('Failed to store API key: ' + error.message);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('API key encryption error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
