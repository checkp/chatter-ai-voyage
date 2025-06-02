
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

    if (!user?.email) throw new Error("User not authenticated or email not available");

    const { package_id } = await req.json();

    // Get package details
    const { data: packageData, error: packageError } = await supabaseClient
      .from('token_packages')
      .select('*')
      .eq('id', package_id)
      .eq('is_active', true)
      .single();

    if (packageError || !packageData) {
      throw new Error('Token package not found');
    }

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

    const effectiveTokens = packageData.tokens + Math.floor(packageData.tokens * packageData.bonus_percentage / 100);

    // Create PayPal order
    const orderResponse = await fetch("https://api-m.paypal.com/v2/checkout/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: (packageData.price_cents / 100).toFixed(2),
            },
            description: `${packageData.name} - ${effectiveTokens.toLocaleString()} Tokens`,
            custom_id: `${user.id}:${package_id}:${effectiveTokens}`,
          },
        ],
        application_context: {
          return_url: `${req.headers.get("origin")}/success?payment_method=paypal`,
          cancel_url: `${req.headers.get("origin")}/settings`,
          brand_name: "Token Store",
          user_action: "PAY_NOW",
        },
      }),
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      throw new Error(`PayPal order creation failed: ${errorText}`);
    }

    const orderData = await orderResponse.json();
    
    // Find the approval URL
    const approvalUrl = orderData.links?.find((link: any) => link.rel === "approve")?.href;
    
    if (!approvalUrl) {
      throw new Error("PayPal approval URL not found");
    }

    return new Response(JSON.stringify({ 
      orderId: orderData.id,
      approvalUrl 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('PayPal order creation error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
