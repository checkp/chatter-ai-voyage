
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { usdToTokens } from "../_shared/billing.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Real USD provider cost per generated image, by (model, size).
// Mirrors public.image_model_pricing — keep in sync.
const IMAGE_USD: Record<string, { platform: string; bySize: Record<string, number>; default: number }> = {
  'dall-e-3':         { platform: 'openai', bySize: { '1024x1024': 0.040, '1024x1792': 0.080, '1792x1024': 0.080 }, default: 0.040 },
  'gpt-image-1':      { platform: 'openai', bySize: {}, default: 0.040 },
  'gemini-image':     { platform: 'google', bySize: {}, default: 0.020 },
  'gemini-pro-image': { platform: 'google', bySize: {}, default: 0.040 },
  'grok-aurora':      { platform: 'xai',    bySize: {}, default: 0.030 },
};
function imageCostUsd(model: string, size: string): { platform: string; usd: number } {
  const entry = IMAGE_USD[model] ?? IMAGE_USD['dall-e-3'];
  return { platform: entry.platform, usd: entry.bySize[size] ?? entry.default };
}


async function generateWithOpenAI(prompt: string, model: string, size: string): Promise<Uint8Array> {
  const resolvedModel = model === 'dall-e-3' ? 'gpt-image-1' : model;
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: resolvedModel, prompt, n: 1, size }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('OpenAI API error:', error);
    throw new Error('Failed to generate image with OpenAI');
  }

  const data = await response.json();
  const item = data.data?.[0];
  if (item?.b64_json) return Uint8Array.from(atob(item.b64_json), c => c.charCodeAt(0));
  if (item?.url) {
    const imgResponse = await fetch(item.url);
    if (!imgResponse.ok) throw new Error('Failed to download OpenAI image');
    return new Uint8Array(await imgResponse.arrayBuffer());
  }
  throw new Error('OpenAI returned no image data');
}

async function generateWithGemini(prompt: string, model: string): Promise<Uint8Array> {
  const directModel = model === 'gemini-pro-image'
    ? 'gemini-3-pro-image-preview'
    : 'gemini-2.5-flash-image';

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${directModel}:generateContent?key=${Deno.env.get('GOOGLE_API_KEY')}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Gemini API error:', error);
    throw new Error('Failed to generate image with Gemini');
  }

  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((part: any) => part.inlineData?.data || part.inline_data?.data);
  const b64 = imagePart?.inlineData?.data ?? imagePart?.inline_data?.data;
  if (!b64) throw new Error('No image returned from Gemini');
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

async function generateWithGrok(prompt: string): Promise<Uint8Array> {
  const response = await fetch('https://api.x.ai/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('GROK_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-imagine-image-quality',
      prompt,
      n: 1,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Grok API error:', error);
    throw new Error('Failed to generate image with Grok');
  }

  const data = await response.json();
  const item = data.data?.[0];
  if (item?.b64_json) return Uint8Array.from(atob(item.b64_json), c => c.charCodeAt(0));
  if (item?.url) {
    const imgResponse = await fetch(item.url);
    if (!imgResponse.ok) throw new Error('Failed to download Grok image');
    return new Uint8Array(await imgResponse.arrayBuffer());
  }
  throw new Error('No image returned from Grok');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, model = 'dall-e-3', size = '1024x1024' } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Real USD cost → app tokens via shared formula (ceil((usd × 1.20) / $0.001))
    const { platform: imgPlatform, usd: apiCostUsd } = imageCostUsd(model, size);
    const tokensRequired = usdToTokens(apiCostUsd);


    // Check balance
    const { data: userTokens, error: tokenError } = await supabase
      .from('user_tokens')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !userTokens || userTokens.balance < tokensRequired) {
      return new Response(
        JSON.stringify({
          error: 'Insufficient tokens',
          required: tokensRequired,
          available: userTokens?.balance || 0
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route to the correct provider
    let imageBuffer: Uint8Array;

    if (model === 'dall-e-3' || model === 'gpt-image-1') {
      imageBuffer = await generateWithOpenAI(prompt, model, size);
    } else if (model === 'gemini-image' || model === 'gemini-pro-image') {
      imageBuffer = await generateWithGemini(prompt, model);
    } else if (model === 'grok-aurora') {
      imageBuffer = await generateWithGrok(prompt);
    } else {
      // Fallback to OpenAI
      imageBuffer = await generateWithOpenAI(prompt, 'dall-e-3', size);
    }

    // Upload to storage
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.png`;

    const { error: uploadError } = await supabase.storage
      .from('generated-images')
      .upload(fileName, imageBuffer, { contentType: 'image/png' });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to save image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: urlData, error: signedUrlError } = await supabase.storage
      .from('generated-images')
      .createSignedUrl(fileName, 3600 * 24 * 7);

    if (signedUrlError || !urlData?.signedUrl) {
      console.error('Signed URL error:', signedUrlError);
      return new Response(
        JSON.stringify({ error: 'Failed to create image URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: imageRecord, error: dbError } = await supabase
      .from('generated_images')
      .insert({
        user_id: user.id,
        prompt,
        image_url: urlData.signedUrl,
        file_name: fileName,
        tokens_used: tokensRequired,
        model_used: model,
        size
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      await supabase.storage.from('generated-images').remove([fileName]);
      return new Response(
        JSON.stringify({ error: 'Failed to save image metadata' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduct tokens BEFORE returning success. If this fails, roll back the image.
    const newBalance = userTokens.balance - tokensRequired;
    const { error: deductError } = await supabase
      .from('user_tokens')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);

    if (deductError) {
      console.error('Token deduction failed:', deductError);
      await supabase.storage.from('generated-images').remove([fileName]);
      await supabase.from('generated_images').delete().eq('id', imageRecord.id);
      return new Response(
        JSON.stringify({ error: 'Token deduction failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the transaction (non-fatal if it fails)
    const { error: txError } = await supabase.from('token_transactions').insert({
      user_id: user.id,
      transaction_type: 'consumption',
      amount: -tokensRequired,
      balance_after: newBalance,
      description: `Image generation: ${model}`,
      metadata: {
        prompt: prompt.substring(0, 100),
        model,
        size,
        platform: 'image',
        image_id: imageRecord.id,
      },
    });
    if (txError) console.error('Token transaction log failed:', txError);

    return new Response(
      JSON.stringify({
        success: true,
        image: imageRecord,
        tokensUsed: tokensRequired
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );


  } catch (error) {
    console.error('Error in generate-image function:', error);
    return new Response(
      JSON.stringify({ error: 'Image generation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
