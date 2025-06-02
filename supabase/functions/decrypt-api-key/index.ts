
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

    const { platform } = await req.json();
    
    if (!platform) {
      throw new Error("Platform is required");
    }

    // Get encrypted API key from database
    const { data: keyData, error: keyError } = await supabaseClient
      .from('user_api_keys')
      .select('encrypted_key')
      .eq('user_id', user.id)
      .eq('platform', platform)
      .single();

    if (keyError || !keyData) {
      throw new Error('API key not found');
    }

    // Decrypt the API key
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    const combined = Uint8Array.from(atob(keyData.encrypted_key), c => c.charCodeAt(0));
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(Deno.env.get("API_KEY_ENCRYPTION_SECRET") || "default-secret-key-32-chars-long"),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );

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
      ["decrypt"]
    );

    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      encrypted
    );

    const apiKey = decoder.decode(decrypted);

    return new Response(JSON.stringify({ api_key: apiKey }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('API key decryption error:', error);
    return new Response(JSON.stringify({ error: 'Failed to decrypt API key' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
