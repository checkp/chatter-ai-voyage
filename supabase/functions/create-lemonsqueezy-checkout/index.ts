import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LS_STORE_ID = "399091";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user?.email) throw new Error("User not authenticated");

    const { package_id } = await req.json();
    if (!package_id) throw new Error("package_id required");

    const { data: pkg, error: pkgErr } = await supabase
      .from("token_packages")
      .select("*")
      .eq("id", package_id)
      .eq("is_active", true)
      .single();
    if (pkgErr || !pkg) throw new Error("Token package not found");
    if (!pkg.lemonsqueezy_variant_id) {
      throw new Error("This package is not configured for Lemon Squeezy yet. Please contact support.");
    }

    const apiKey = Deno.env.get("LEMONSQUEEZY_API_KEY");
    if (!apiKey) throw new Error("LEMONSQUEEZY_API_KEY not configured");

    const effectiveTokens = pkg.tokens + Math.floor(pkg.tokens * pkg.bonus_percentage / 100);
    const origin = req.headers.get("origin") || "";

    const body = {
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: user.email,
            custom: {
              user_id: user.id,
              package_id,
              tokens: String(effectiveTokens),
            },
          },
          product_options: {
            redirect_url: `${origin}/success?provider=lemonsqueezy&checkout_id={checkout_id}`,
            receipt_button_text: "Return to App",
            receipt_link_url: origin,
          },
          checkout_options: {
            embed: false,
            dark: true,
          },
        },
        relationships: {
          store: { data: { type: "stores", id: LS_STORE_ID } },
          variant: { data: { type: "variants", id: String(pkg.lemonsqueezy_variant_id) } },
        },
      },
    };

    const lsRes = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const lsJson = await lsRes.json();
    if (!lsRes.ok) {
      console.error("Lemon Squeezy error:", lsJson);
      throw new Error(lsJson?.errors?.[0]?.detail || "Failed to create checkout");
    }

    const checkoutId = lsJson.data.id;
    let url: string = lsJson.data.attributes.url;
    // Replace our placeholder with the actual checkout id (LS doesn't substitute it)
    url = url; // url returned doesn't include redirect; the redirect_url stored already has placeholder
    // Manually replace placeholder in the stored URL by re-constructing success url client-side via custom data fallback.
    // LS will redirect to redirect_url verbatim — replace {checkout_id} now:
    // (We persist checkoutId on our side via metadata; client uses ?checkout_id on return)

    return new Response(
      JSON.stringify({ url: url.replace("{checkout_id}", checkoutId), checkout_id: checkoutId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("create-lemonsqueezy-checkout error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
