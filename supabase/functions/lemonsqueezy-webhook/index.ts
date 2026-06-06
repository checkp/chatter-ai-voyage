import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-event-name",
};

async function verifySignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
    const expected = Array.from(new Uint8Array(sigBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    // constant-time compare
    if (expected.length !== signature.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    return diff === 0;
  } catch (e) {
    console.error("Signature verify error:", e);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rawBody = await req.text();
  const signature = req.headers.get("X-Signature") || req.headers.get("x-signature") || "";
  const secret = Deno.env.get("LEMONSQUEEZY_WEBHOOK_SECRET") || "";

  if (!secret) {
    console.error("LEMONSQUEEZY_WEBHOOK_SECRET not configured");
    return new Response(JSON.stringify({ error: "Misconfigured" }), { status: 500, headers: corsHeaders });
  }

  const valid = await verifySignature(rawBody, signature, secret);
  if (!valid) {
    console.warn("Invalid LS webhook signature");
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers: corsHeaders });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders });
  }

  const eventName = event?.meta?.event_name || req.headers.get("X-Event-Name") || "";
  const custom = event?.meta?.custom_data || {};
  const order = event?.data;
  const orderId = order?.id;
  const status = order?.attributes?.status;

  console.log("LS webhook received:", { eventName, orderId, status, custom });

  // We only credit on paid order creation
  if (eventName !== "order_created" || status !== "paid") {
    return new Response(JSON.stringify({ received: true, ignored: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId: string | undefined = custom.user_id;
  const packageId: string | undefined = custom.package_id;

  if (!userId || !packageId || !orderId) {
    console.error("Missing user_id/package_id/order id in webhook payload");
    return new Response(JSON.stringify({ received: true, error: "missing fields" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    // Idempotency by LS order id
    const { data: existing } = await supabase
      .from("token_transactions")
      .select("id")
      .eq("user_id", userId)
      .contains("metadata", { ls_order_id: orderId })
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ received: true, alreadyProcessed: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: pkg, error: pkgErr } = await supabase
      .from("token_packages")
      .select("tokens, bonus_percentage, name")
      .eq("id", packageId)
      .eq("is_active", true)
      .maybeSingle();
    if (pkgErr || !pkg) throw new Error("Package not found");

    const tokensToAdd = pkg.tokens + Math.floor(pkg.tokens * pkg.bonus_percentage / 100);

    const { data: tokenData, error: tErr } = await supabase
      .from("user_tokens")
      .select("balance, total_purchased")
      .eq("user_id", userId)
      .single();
    if (tErr) throw new Error("Unable to fetch token balance");

    const newBalance = (tokenData?.balance || 0) + tokensToAdd;
    const newTotalPurchased = (tokenData?.total_purchased || 0) + tokensToAdd;

    await supabase
      .from("user_tokens")
      .update({ balance: newBalance, total_purchased: newTotalPurchased })
      .eq("user_id", userId);

    await supabase.from("token_transactions").insert({
      user_id: userId,
      transaction_type: "purchase",
      amount: tokensToAdd,
      balance_after: newBalance,
      description: `Lemon Squeezy token purchase - ${tokensToAdd.toLocaleString()} tokens`,
      metadata: {
        payment_method: "lemonsqueezy",
        ls_order_id: orderId,
        package_id: packageId,
        amount_paid: order?.attributes?.total_formatted,
        currency: order?.attributes?.currency,
        source: "webhook",
      },
    });

    console.log(`Credited ${tokensToAdd} tokens to ${userId} for LS order ${orderId}`);
  } catch (e) {
    console.error("LS webhook processing error:", e);
    // Return 200 so LS doesn't keep retrying on app errors; we've logged it
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
