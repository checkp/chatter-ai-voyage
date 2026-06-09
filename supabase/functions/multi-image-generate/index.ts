import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AGENTS = [
  { id: "openai", name: "ChatGPT", persona: "Warm, witty, evocative wordsmith." },
  { id: "anthropic", name: "Claude", persona: "Precise, elegant, structural visualizer." },
  { id: "deepseek", name: "DeepSeek", persona: "Finds rare, surprising visual details others miss." },
  { id: "grok", name: "Grok", persona: "Irreverent, bold, slightly absurd visual flair." },
  { id: "gemini", name: "Gemini", persona: "Adaptive, cinematic, mood-driven framing." },
  { id: "mistral", name: "Mistral", persona: "Sharp, minimal, high-contrast composition." },
  { id: "perplexity", name: "Perplexity", persona: "Accurate, reference-grounded, factual visual details." },
  { id: "qwen", name: "Qwen", persona: "Eastern aesthetic, lyrical, atmospheric brushwork." },
];

const IMAGE_MODELS: Record<string, { provider: "openai" | "gemini" | "grok" | "qwen"; cost: number; label: string }> = {
  "dall-e-3": { provider: "openai", cost: 40, label: "DALL·E 3" },
  "gpt-image-1": { provider: "openai", cost: 30, label: "GPT-Image-1" },
  "gemini-image": { provider: "gemini", cost: 15, label: "Gemini 2.5 Flash Image" },
  "gemini-pro-image": { provider: "gemini", cost: 35, label: "Gemini 3 Pro Image" },
  "grok-aurora": { provider: "grok", cost: 25, label: "Grok Aurora" },
  "qwen-image": { provider: "qwen", cost: 20, label: "Qwen Wanx" },
};

const COLLAB_COST = 50;

async function callOpenAIChat(systemPrompt: string, userPrompt: string): Promise<string> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY not set");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

async function callGateway(systemPrompt: string, userPrompt: string, model = "google/gemini-2.5-flash"): Promise<string> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return callOpenAIChat(systemPrompt, userPrompt);
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Gateway ${model} ${res.status}: ${text}`);
    // Fall back to direct OpenAI on payment/rate issues
    if (res.status === 402 || res.status === 429 || res.status >= 500) {
      try { return await callOpenAIChat(systemPrompt, userPrompt); } catch (e) {
        throw new Error(`Gateway ${res.status} and OpenAI fallback failed: ${e}`);
      }
    }
    throw new Error(`Gateway ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

async function generateWithOpenAI(prompt: string, model: string): Promise<Uint8Array> {
  const body: Record<string, unknown> = { model, prompt, n: 1, size: "1024x1024" };
  if (model === "dall-e-3") body.response_format = "b64_json";
  const r = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`OpenAI image ${r.status}: ${await r.text()}`);
  const d = await r.json();
  return Uint8Array.from(atob(d.data[0].b64_json), c => c.charCodeAt(0));
}

async function generateWithGemini(prompt: string, model: string): Promise<Uint8Array> {
  const gw = model === "gemini-pro-image"
    ? "google/gemini-3-pro-image-preview"
    : "google/gemini-2.5-flash-image";
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: gw,
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });
  if (!r.ok) throw new Error(`Gemini image ${r.status}: ${await r.text()}`);
  const d = await r.json();
  const url = d.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) throw new Error("No image returned from Gemini");
  const b64 = url.replace(/^data:image\/\w+;base64,/, "");
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

async function generateWithGrok(prompt: string): Promise<Uint8Array> {
  const key = Deno.env.get("GROK_API_KEY");
  if (!key) throw new Error("GROK_API_KEY not set");
  const r = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "grok-2-image",
      prompt,
      n: 1,
      response_format: "b64_json",
    }),
  });
  if (!r.ok) throw new Error(`Grok image ${r.status}: ${await r.text()}`);
  const d = await r.json();
  const b64 = d.data?.[0]?.b64_json;
  if (!b64) throw new Error("Grok returned no image");
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

async function generateWithQwen(prompt: string): Promise<Uint8Array> {
  const key = Deno.env.get("DASHSCOPE_API_KEY");
  if (!key) throw new Error("DASHSCOPE_API_KEY not set");
  // Submit async task
  const submit = await fetch(
    "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify({
        model: "wanx2.1-t2i-turbo",
        input: { prompt },
        parameters: { size: "1024*1024", n: 1 },
      }),
    },
  );
  if (!submit.ok) throw new Error(`Qwen submit ${submit.status}: ${await submit.text()}`);
  const submitData = await submit.json();
  const taskId = submitData.output?.task_id;
  if (!taskId) throw new Error("Qwen returned no task_id");

  // Poll task (max ~60s)
  let imageUrl: string | undefined;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const poll = await fetch(`https://dashscope-intl.aliyuncs.com/api/v1/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!poll.ok) continue;
    const pd = await poll.json();
    const status = pd.output?.task_status;
    if (status === "SUCCEEDED") {
      imageUrl = pd.output?.results?.[0]?.url;
      break;
    }
    if (status === "FAILED" || status === "CANCELED" || status === "UNKNOWN") {
      throw new Error(`Qwen task ${status}: ${pd.output?.message ?? ""}`);
    }
  }
  if (!imageUrl) throw new Error("Qwen task timed out");

  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Qwen image download ${imgRes.status}`);
  return new Uint8Array(await imgRes.arrayBuffer());
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth");
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) throw new Error("Unauthorized");

    const { userPrompt, models } = await req.json();
    if (!userPrompt || !Array.isArray(models) || models.length === 0) {
      return new Response(JSON.stringify({ error: "userPrompt and models required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validModels = models.filter((m: string) => IMAGE_MODELS[m]);
    if (validModels.length === 0) {
      return new Response(JSON.stringify({ error: "No valid models" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imageCost = validModels.reduce((s: number, m: string) => s + IMAGE_MODELS[m].cost, 0);
    const totalCost = COLLAB_COST + imageCost;

    const { data: tokens } = await supabase
      .from("user_tokens").select("balance, total_consumed").eq("user_id", user.id).single();
    if (!tokens || tokens.balance < totalCost) {
      return new Response(JSON.stringify({ error: "Insufficient tokens", required: totalCost, available: tokens?.balance ?? 0 }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PHASE 1: 7 agents propose
    const proposals = await Promise.all(AGENTS.map(async (a) => {
      try {
        const text = await callGateway(
          `You are ${a.name}. ${a.persona} Respond ONLY with a single vivid image prompt (max 25 words). No preamble.`,
          `User wants an image of: ${userPrompt}`,
        );
        return { agent: a.id, name: a.name, proposal: text };
      } catch (e) {
        return { agent: a.id, name: a.name, proposal: "", error: String(e).slice(0, 200) };
      }
    }));

    // PHASE 2: Conductor merge
    const proposalList = proposals
      .filter(p => p.proposal)
      .map(p => `- [${p.name}]: ${p.proposal}`).join("\n");

    let masterPrompt = userPrompt;
    try {
      const merged = await callGateway(
        `You are the Conductor. Synthesize the agents' proposals into ONE vivid, detailed image prompt (max 60 words). Merge their unique angles. Respond ONLY with the final prompt.`,
        `Original request: ${userPrompt}\n\nProposals:\n${proposalList}`,
        "google/gemini-2.5-flash",
      );
      if (merged) masterPrompt = merged;
    } catch (e) {
      console.error("Conductor merge failed:", e);
    }

    // PHASE 3: Parallel image gen
    const imageResults = await Promise.all(validModels.map(async (model: string) => {
      const meta = IMAGE_MODELS[model];
      try {
        const buf = meta.provider === "openai"
          ? await generateWithOpenAI(masterPrompt, model)
          : meta.provider === "grok"
          ? await generateWithGrok(masterPrompt)
          : meta.provider === "qwen"
          ? await generateWithQwen(masterPrompt)
          : await generateWithGemini(masterPrompt, model);

        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
        const { error: upErr } = await supabase.storage
          .from("generated-images").upload(fileName, buf, { contentType: "image/png" });
        if (upErr) throw upErr;

        const { data: urlData } = await supabase.storage
          .from("generated-images").createSignedUrl(fileName, 3600 * 24 * 7);

        await supabase.from("generated_images").insert({
          user_id: user.id, prompt: masterPrompt, image_url: urlData?.signedUrl ?? "",
          file_name: fileName, tokens_used: meta.cost, model_used: model, size: "1024x1024",
        });

        return {
          model, label: meta.label, cost: meta.cost,
          fileName, url: urlData?.signedUrl ?? "", success: true,
        };
      } catch (e) {
        console.error(`Image gen failed for ${model}:`, e);
        return { model, label: meta.label, cost: meta.cost, success: false, error: String(e).slice(0, 200) };
      }
    }));

    // Deduct tokens (only for successful images + collab)
    const successCost = imageResults.filter(r => r.success).reduce((s, r) => s + r.cost, 0);
    const finalCost = COLLAB_COST + successCost;
    const newBalance = tokens.balance - finalCost;

    await supabase.from("user_tokens").update({
      balance: newBalance,
      total_consumed: (tokens.total_consumed || 0) + finalCost,
    }).eq("user_id", user.id);

    await supabase.from("token_transactions").insert({
      user_id: user.id,
      transaction_type: "consumption",
      amount: -finalCost,
      balance_after: newBalance,
      description: `Multi-image generation (${imageResults.filter(r => r.success).length}/${validModels.length} models)`,
      metadata: { models: validModels, collab_cost: COLLAB_COST, image_cost: successCost },
    });

    return new Response(JSON.stringify({
      success: true,
      proposals,
      masterPrompt,
      images: imageResults,
      tokensUsed: finalCost,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });

  } catch (e) {
    console.error("multi-image-generate error:", e);
    return new Response(JSON.stringify({ error: String(e).slice(0, 300) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
