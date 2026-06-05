import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
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

    const { session_id } = await req.json();
    if (!session_id) throw new Error("session_id required");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      throw new Error(`Payment not completed (status: ${session.payment_status})`);
    }

    const metadata = session.metadata || {};
    if (metadata.user_id !== user.id) {
      throw new Error("User ID mismatch");
    }

    const tokensToAdd = parseInt(metadata.tokens || "0", 10);
    if (!tokensToAdd) throw new Error("No tokens in session metadata");

    // Idempotency: skip if already processed
    const { data: existing } = await supabaseClient
      .from("token_transactions")
      .select("id")
      .eq("user_id", user.id)
      .contains("metadata", { stripe_session_id: session_id })
      .maybeSingle();

    if (existing) {
      const { data: tokenData } = await supabaseClient
        .from("user_tokens")
        .select("balance")
        .eq("user_id", user.id)
        .single();
      return new Response(
        JSON.stringify({ success: true, tokensAdded: tokensToAdd, newBalance: tokenData?.balance, alreadyProcessed: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const { data: tokenData, error: tokenError } = await supabaseClient
      .from("user_tokens")
      .select("balance, total_purchased")
      .eq("user_id", user.id)
      .single();

    if (tokenError) throw new Error("Unable to fetch current token balance");

    const newBalance = (tokenData?.balance || 0) + tokensToAdd;
    const newTotalPurchased = (tokenData?.total_purchased || 0) + tokensToAdd;

    await supabaseClient
      .from("user_tokens")
      .update({ balance: newBalance, total_purchased: newTotalPurchased })
      .eq("user_id", user.id);

    await supabaseClient.from("token_transactions").insert({
      user_id: user.id,
      transaction_type: "purchase",
      amount: tokensToAdd,
      balance_after: newBalance,
      description: `Stripe token purchase - ${tokensToAdd.toLocaleString()} tokens`,
      metadata: {
        payment_method: "stripe",
        stripe_session_id: session_id,
        package_id: metadata.package_id,
        amount_paid: ((session.amount_total || 0) / 100).toFixed(2),
        currency: session.currency,
      },
    });

    return new Response(
      JSON.stringify({ success: true, tokensAdded: tokensToAdd, newBalance }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Verify Stripe session error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
