import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    if (!user?.id) throw new Error("User not authenticated");

    const { checkout_id } = await req.json();
    if (!checkout_id) throw new Error("checkout_id required");

    const apiKey = Deno.env.get("LEMONSQUEEZY_API_KEY");
    if (!apiKey) throw new Error("LEMONSQUEEZY_API_KEY not configured");

    // Idempotency
    const { data: existing } = await supabase
      .from("token_transactions")
      .select("id, amount")
      .eq("user_id", user.id)
      .contains("metadata", { ls_checkout_id: checkout_id })
      .maybeSingle();

    if (existing) {
      const { data: t } = await supabase
        .from("user_tokens").select("balance").eq("user_id", user.id).single();
      return new Response(JSON.stringify({
        success: true, tokensAdded: existing.amount, newBalance: t?.balance, alreadyProcessed: true
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Find order by checkout_id via orders list filter (LS exposes filter[checkout_id] indirectly via custom data)
    // Best approach: query orders with filter[user_email]+ recent and match by checkout via custom data
    const checkoutRes = await fetch(`https://api.lemonsqueezy.com/v1/checkouts/${checkout_id}`, {
      headers: { Accept: "application/vnd.api+json", Authorization: `Bearer ${apiKey}` },
    });
    const checkoutJson = await checkoutRes.json();
    if (!checkoutRes.ok) {
      console.error("LS checkout fetch error:", checkoutJson);
      throw new Error("Failed to fetch checkout from Lemon Squeezy");
    }

    const custom = checkoutJson?.data?.attributes?.checkout_data?.custom || {};
    if (custom.user_id !== user.id) throw new Error("User ID mismatch");

    const tokensToAdd = parseInt(custom.tokens || "0", 10);
    if (!tokensToAdd) throw new Error("No tokens in checkout custom data");

    // Verify payment occurred. LS doesn't surface order on the checkout object directly,
    // so query orders filtered by user email and match by custom data.
    const ordersRes = await fetch(
      `https://api.lemonsqueezy.com/v1/orders?filter[store_id]=399091&filter[user_email]=${encodeURIComponent(user.email!)}&page[size]=25&sort=-created_at`,
      { headers: { Accept: "application/vnd.api+json", Authorization: `Bearer ${apiKey}` } }
    );
    const ordersJson = await ordersRes.json();
    if (!ordersRes.ok) {
      console.error("LS orders fetch error:", ordersJson);
      throw new Error("Failed to verify order");
    }

    const matchedOrder = (ordersJson.data || []).find((o: any) => {
      const c = o?.attributes?.first_order_item?.checkout_data?.custom
        || o?.attributes?.checkout_data?.custom
        || {};
      return c.user_id === user.id && c.package_id === custom.package_id;
    });

    if (!matchedOrder) {
      throw new Error("Order not found yet — please refresh in a moment.");
    }

    const status = matchedOrder?.attributes?.status;
    if (status !== "paid") {
      throw new Error(`Payment not completed (status: ${status})`);
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
        ls_checkout_id: checkout_id,
        ls_order_id: matchedOrder.id,
        package_id: custom.package_id,
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
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
