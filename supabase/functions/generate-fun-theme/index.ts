import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FONTS = ["Inter", "Fraunces", "Space Grotesk", "DM Serif Display", "JetBrains Mono", "Caveat"] as const;
const SHADOWS = ["none", "soft", "lifted"] as const;

type Theme = {
  vibe: string;
  bg: string;
  userBubbleBg: string;
  userBubbleFg: string;
  aiBubbleBg: string;
  aiBubbleFg: string;
  accent: string;
  headingFont: string;
  bodyFont: string;
  radius: number;
  shadow: string;
};

const isHsl = (s: unknown): s is string =>
  typeof s === "string" && /^hsl\(\s*\d{1,3}\s+\d{1,3}%\s+\d{1,3}%\s*\)$/.test(s.trim());

function validate(t: any): Theme | null {
  if (!t || typeof t !== "object") return null;
  const ok =
    typeof t.vibe === "string" && t.vibe.length <= 60 &&
    isHsl(t.bg) && isHsl(t.userBubbleBg) && isHsl(t.userBubbleFg) &&
    isHsl(t.aiBubbleBg) && isHsl(t.aiBubbleFg) && isHsl(t.accent) &&
    FONTS.includes(t.headingFont) && FONTS.includes(t.bodyFont) &&
    typeof t.radius === "number" && t.radius >= 4 && t.radius <= 28 &&
    SHADOWS.includes(t.shadow);
  return ok ? (t as Theme) : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) throw new Error("Not authenticated");

    const { recentMessages, previousTheme, round } = await req.json();
    if (!Array.isArray(recentMessages)) throw new Error("recentMessages required");

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) throw new Error("LOVABLE_API_KEY not configured");

    const trimmed = recentMessages
      .slice(-6)
      .map((m: any) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: String(m.content || "").slice(0, 600),
      }));

    const sys = `You are a UI art director. Given a short conversation excerpt, return ONLY a JSON object describing a chat theme that subtly EVOLVES from the previous theme to better match the conversation's tone.

Rules:
- Output strict JSON, no prose, no markdown fences.
- Evolve: shift hues by 10–40deg, nudge lightness/saturation slightly. Do NOT reset.
- All colors must be valid CSS \`hsl(H S% L%)\` strings (space-separated, no commas, no alpha).
- Keep page bg lightness in 8–22% (dark) OR 92–98% (light); pick one regime and stay consistent with previousTheme.
- Bubble backgrounds must contrast meaningfully from page bg (different lightness).
- Fonts MUST be from this list exactly: ${FONTS.join(", ")}.
- Change fonts at most every 4 rounds; otherwise reuse previous fonts.
- radius: integer 4–28. shadow: one of ${SHADOWS.join("|")}.
- vibe: a 2–4 word evocative label (e.g. "midnight library", "citrus picnic").

Schema:
{"vibe":string,"bg":hsl,"userBubbleBg":hsl,"userBubbleFg":hsl,"aiBubbleBg":hsl,"aiBubbleFg":hsl,"accent":hsl,"headingFont":string,"bodyFont":string,"radius":number,"shadow":"none"|"soft"|"lifted"}`;

    const userMsg = JSON.stringify({
      round: round ?? 0,
      previousTheme: previousTheme ?? null,
      conversation: trimmed,
    });

    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: sys },
              { role: "user", content: userMsg },
            ],
            response_format: { type: "json_object" },
          }),
        });

        if (res.status === 429) throw new Error("rate_limited");
        if (res.status === 402) {
          return new Response(JSON.stringify({ error: "credits_exhausted" }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!res.ok) throw new Error(`gateway_${res.status}`);

        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (!content) throw new Error("empty_content");

        let parsed: any;
        try { parsed = JSON.parse(content); } catch { throw new Error("invalid_json"); }

        const theme = validate(parsed);
        if (!theme) throw new Error("invalid_schema");

        return new Response(JSON.stringify({ theme }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        lastErr = e;
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }

    throw lastErr instanceof Error ? lastErr : new Error("theme_generation_failed");
  } catch (error) {
    console.error("generate-fun-theme error:", error);
    return new Response(JSON.stringify({ error: "theme_generation_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
