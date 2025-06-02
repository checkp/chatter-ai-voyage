
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

    const { orderId } = await req.json();

    const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const paypalClientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    
    if (!paypalClientId || !paypalClientSecret) {
      throw new Error("PayPal credentials not configured");
    }

    // Get PayPal access token
    const authResponse = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${btoa(`${paypalClientId}:${paypalClientSecret}`)}`,
      },
      body: "grant_type=client_credentials",
    });

    if (!authResponse.ok) {
      throw new Error("Failed to authenticate with PayPal");
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    // Capture the payment
    const captureResponse = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (!captureResponse.ok) {
      const errorText = await captureResponse.text();
      throw new Error(`PayPal capture failed: ${errorText}`);
    }

    const captureData = await captureResponse.json();
    
    if (captureData.status !== "COMPLETED") {
      throw new Error("PayPal payment not completed");
    }

    // Extract token information from custom_id
    const customId = captureData.purchase_units[0].payments.captures[0].custom_id;
    const [userId, packageId, tokensStr] = customId.split(':');
    const tokensToAdd = parseInt(tokensStr);

    if (userId !== user.id) {
      throw new Error("User ID mismatch");
    }

    // Get current token balance
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('user_tokens')
      .select('balance, total_purchased')
      .eq('user_id', user.id)
      .single();

    if (tokenError) {
      throw new Error('Unable to fetch current token balance');
    }

    // Update token balance
    const newBalance = (tokenData?.balance || 0) + tokensToAdd;
    const newTotalPurchased = (tokenData?.total_purchased || 0) + tokensToAdd;

    await supabaseClient
      .from('user_tokens')
      .update({ 
        balance: newBalance,
        total_purchased: newTotalPurchased
      })
      .eq('user_id', user.id);

    // Log the transaction
    await supabaseClient
      .from('token_transactions')
      .insert({
        user_id: user.id,
        transaction_type: 'purchase',
        amount: tokensToAdd,
        balance_after: newBalance,
        description: `PayPal token purchase - ${tokensToAdd.toLocaleString()} tokens`,
        metadata: {
          payment_method: 'paypal',
          paypal_order_id: orderId,
          paypal_capture_id: captureData.purchase_units[0].payments.captures[0].id,
          package_id: packageId,
          amount_paid: captureData.purchase_units[0].payments.captures[0].amount.value
        }
      });

    return new Response(JSON.stringify({ 
      success: true,
      tokensAdded: tokensToAdd,
      newBalance 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('PayPal capture error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
