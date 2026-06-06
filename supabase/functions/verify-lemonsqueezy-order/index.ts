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
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user?.id || !user.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { package_id } = await req.json();
    if (!package_id || typeof package_id !== "string") {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LEMONSQUEEZY_API_KEY");
    if (!apiKey) throw new Error("LEMONSQUEEZY_API_KEY not configured");

    // Idempotency: only credit once per (user_id, package_id, ls_order_id)
    const { data: pkg } = await supabase
      .from("token_packages")
      .select("tokens, bonus_percentage, name, price_cents")
      .eq("id", package_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!pkg) {
      return new Response(JSON.stringify({ error: "Package not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokensToAdd = pkg.tokens + Math.floor(pkg.tokens * pkg.bonus_percentage / 100);

    // Fetch up to 25 most-recent orders for this user's email
    const ordersRes = await fetch(
      `https://api.lemonsqueezy.com/v1/orders?filter[store_id]=${LS_STORE_ID}&filter[user_email]=${encodeURIComponent(user.email)}&page[size]=25&sort=-createdAt`,
      { headers: { Accept: "application/vnd.api+json", Authorization: `Bearer ${apiKey}` } }
    );
    const ordersJson = await ordersRes.json();
    if (!ordersRes.ok) {
      console.error("LS orders fetch error:", ordersJson);
      return new Response(JSON.stringify({ error: "Verification failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find newest paid order whose custom data matches this user + package
    const matchedOrder = (ordersJson.data || []).find((o: any) => {
      const status = o?.attributes?.status;
      if (status !== "paid") return false;
      const c = o?.attributes?.first_order_item?.checkout_data?.custom
        || o?.attributes?.checkout_data?.custom
        || {};
      return c.user_id === user.id && c.package_id === package_id;
    });

    if (!matchedOrder) {
      return new Response(JSON.stringify({ error: "Order not found yet — please refresh in a moment." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lsOrderId = matchedOrder.id;

    // Idempotency check by LS order id
    const { data: existing } = await supabase
      .from("token_transactions")
      .select("id, amount")
      .eq("user_id", user.id)
      .contains("metadata", { ls_order_id: lsOrderId })
      .maybeSingle();

    if (existing) {
      const { data: t } = await supabase
        .from("user_tokens").select("balance").eq("user_id", user.id).single();
      return new Response(JSON.stringify({
        success: true, tokensAdded: existing.amount, newBalance: t?.balance, alreadyProcessed: true
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: tokenData, error: tErr } = await supabase
      .from("user_tokens").select("balance, total_purchased").eq("user_id", user.id).single();
    if (tErr) throw new Error("Unable to fetch token balance");

    const newBalance = (tokenData?.balance || 0) + tokensToAdd;
    const newTotalPurchased = (tokenData?.total_purchased || 0) + tokensToAdd;

    await supabase.from("user_tokens")
      .update({ balance: newBalance, total_purchased: newTotalPurchased })
      .eq("user_id", user.id);

    await supabase.from("token_transactions").insert({
      user_id: user.id,
      transaction_type: "purchase",
      amount: tokensToAdd,
      balance_after: newBalance,
      description: `Lemon Squeezy token purchase - ${tokensToAdd.toLocaleString()} tokens`,
      metadata: {
        payment_method: "lemonsqueezy",
        ls_order_id: lsOrderId,
        package_id,
        amount_paid: matchedOrder?.attributes?.total_formatted,
        currency: matchedOrder?.attributes?.currency,
      },
    });

    return new Response(
      JSON.stringify({ success: true, tokensAdded: tokensToAdd, newBalance }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("verify-lemonsqueezy-order error:", error);
    return new Response(JSON.stringify({ error: "Verification failed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
