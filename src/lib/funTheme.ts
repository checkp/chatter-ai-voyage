// Fun mode theme helpers: font whitelist, contrast guard, CSS var mapping,
// and per-bubble variations so individual messages feel distinct.

export const FUN_FONTS = {
  Inter: `'Inter', system-ui, sans-serif`,
  Fraunces: `'Fraunces', Georgia, serif`,
  "Space Grotesk": `'Space Grotesk', system-ui, sans-serif`,
  "DM Serif Display": `'DM Serif Display', Georgia, serif`,
  "JetBrains Mono": `'JetBrains Mono', ui-monospace, monospace`,
  Caveat: `'Caveat', 'Comic Sans MS', cursive`,
} as const;

export type FunFontKey = keyof typeof FUN_FONTS;

export type FunTheme = {
  vibe: string;
  bg: string;
  userBubbleBg: string;
  userBubbleFg: string;
  aiBubbleBg: string;
  aiBubbleFg: string;
  accent: string;
  headingFont: FunFontKey;
  bodyFont: FunFontKey;
  radius: number;
  shadow: "none" | "soft" | "lifted";
};

// --- Parse hsl("H S% L%") ---
function parseHsl(s: string): { h: number; s: number; l: number } | null {
  const m = s.trim().match(/^hsl\(\s*(\d{1,3})\s+(\d{1,3})%\s+(\d{1,3})%\s*\)$/);
  if (!m) return null;
  return { h: +m[1], s: +m[2], l: +m[3] };
}

function fmtHsl(h: number, s: number, l: number) {
  return `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function relLuminance([r, g, b]: [number, number, number]) {
  const f = (v: number) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(a: string, b: string): number {
  const A = parseHsl(a), B = parseHsl(b);
  if (!A || !B) return 1;
  const la = relLuminance(hslToRgb(A.h, A.s, A.l));
  const lb = relLuminance(hslToRgb(B.h, B.s, B.l));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Ensure fg has >=minRatio contrast on bg by walking lightness toward extreme. */
export function ensureReadable(fg: string, bg: string, minRatio = 4.5): string {
  const F = parseHsl(fg);
  const B = parseHsl(bg);
  if (!F || !B) return fg;
  if (contrastRatio(fg, bg) >= minRatio) return fg;
  // Walk lightness away from bg lightness in 5% steps, keep hue/sat.
  const goDark = B.l >= 50;
  let l = F.l;
  for (let i = 0; i < 18; i++) {
    l = goDark ? Math.max(0, l - 5) : Math.min(100, l + 5);
    const candidate = fmtHsl(F.h, F.s, l);
    if (contrastRatio(candidate, bg) >= minRatio) return candidate;
  }
  return goDark ? "hsl(0 0% 6%)" : "hsl(0 0% 98%)";
}

/** Clamp page bg to safe lightness so it never goes pure black / pure white. */
function clampPageBg(bg: string): string {
  const p = parseHsl(bg);
  if (!p) return bg;
  const s = Math.min(p.s, 45);
  const l = Math.min(Math.max(p.l, 10), 95);
  return fmtHsl(p.h, s, l);
}

/** Nudge a bubble bg lightness away from page bg if they're too similar. */
function differentiate(bubble: string, page: string, minDelta = 8): string {
  const Bb = parseHsl(bubble); const Pp = parseHsl(page);
  if (!Bb || !Pp) return bubble;
  const delta = Bb.l - Pp.l;
  if (Math.abs(delta) >= minDelta) return bubble;
  const goUp = Pp.l < 50; // light page → bubble slightly darker? prefer opposite of page
  const newL = goUp ? Math.min(100, Pp.l + minDelta) : Math.max(0, Pp.l - minDelta);
  return fmtHsl(Bb.h, Bb.s, newL);
}

/** Sanitize a theme: clamp page bg + enforce contrast + bubble differentiation. */
export function sanitizeTheme(t: FunTheme): FunTheme {
  const bg = clampPageBg(t.bg);
  const userBubbleBg = differentiate(t.userBubbleBg, bg);
  const aiBubbleBg = differentiate(t.aiBubbleBg, bg);
  const userBubbleFg = ensureReadable(t.userBubbleFg, userBubbleBg, 4.5);
  const aiBubbleFg = ensureReadable(t.aiBubbleFg, aiBubbleBg, 4.5);
  // Accent should be visible against page bg (min 3:1 — large/decorative)
  const accent = ensureReadable(t.accent, bg, 3);
  return { ...t, bg, userBubbleBg, aiBubbleBg, userBubbleFg, aiBubbleFg, accent };
}

/** Interpolate two HSL color strings by weight in [0,1] (0 = a, 1 = b). */
function lerpHsl(a: string, b: string, w: number): string {
  const A = parseHsl(a), B = parseHsl(b);
  if (!A || !B) return w < 0.5 ? a : b;
  // Hue is circular: take the shortest arc.
  let dh = B.h - A.h;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  const h = (A.h + dh * w + 360) % 360;
  const s = A.s + (B.s - A.s) * w;
  const l = A.l + (B.l - A.l) * w;
  return fmtHsl(h, s, l);
}

/**
 * Blend a generated theme toward a base theme so the visible result starts at
 * `base` and gradually drifts toward `target` as `weight` grows from 0 → 1.
 * Fonts/radius/shadow snap from base to target once weight crosses 0.5.
 */
export function blendThemes(base: FunTheme, target: FunTheme, weight: number): FunTheme {
  const w = Math.max(0, Math.min(1, weight));
  return {
    vibe: target.vibe,
    bg: lerpHsl(base.bg, target.bg, w),
    userBubbleBg: lerpHsl(base.userBubbleBg, target.userBubbleBg, w),
    userBubbleFg: lerpHsl(base.userBubbleFg, target.userBubbleFg, w),
    aiBubbleBg: lerpHsl(base.aiBubbleBg, target.aiBubbleBg, w),
    aiBubbleFg: lerpHsl(base.aiBubbleFg, target.aiBubbleFg, w),
    accent: lerpHsl(base.accent, target.accent, w),
    headingFont: w >= 0.5 ? target.headingFont : base.headingFont,
    bodyFont: w >= 0.5 ? target.bodyFont : base.bodyFont,
    radius: Math.round(base.radius + (target.radius - base.radius) * w),
    shadow: w >= 0.5 ? target.shadow : base.shadow,
  };
}

export const SHADOW_MAP = {
  none: "none",
  soft: "0 1px 2px hsl(0 0% 0% / 0.08), 0 2px 6px hsl(0 0% 0% / 0.06)",
  lifted: "0 4px 12px hsl(0 0% 0% / 0.12), 0 10px 30px hsl(0 0% 0% / 0.10)",
} as const;

/** Map theme → CSS variables to apply on a wrapper div. */
export function themeToCssVars(t: FunTheme): React.CSSProperties {
  // Page foreground should be readable against page bg.
  const pageFg = ensureReadable(t.aiBubbleFg, t.bg, 4.5);
  return {
    background: t.bg,
    color: pageFg,
    fontFamily: FUN_FONTS[t.bodyFont],
    ["--fun-page-bg" as any]: t.bg,
    ["--fun-page-fg" as any]: pageFg,
    ["--fun-user-bg" as any]: t.userBubbleBg,
    ["--fun-user-fg" as any]: t.userBubbleFg,
    ["--fun-ai-bg" as any]: t.aiBubbleBg,
    ["--fun-ai-fg" as any]: t.aiBubbleFg,
    ["--fun-accent" as any]: t.accent,
    ["--fun-radius" as any]: `${t.radius}px`,
    ["--fun-shadow" as any]: SHADOW_MAP[t.shadow],
    ["--fun-font-heading" as any]: FUN_FONTS[t.headingFont],
    ["--fun-font-body" as any]: FUN_FONTS[t.bodyFont],
  } as React.CSSProperties;
}

export const FUN_THEME_CAP = 40;

/** Read current app theme tokens to use as the starting baseline before drift. */
export function readBaseTheme(): FunTheme {
  const fallback: FunTheme = {
    vibe: "baseline",
    bg: "hsl(0 0% 100%)",
    userBubbleBg: "hsl(222 47% 11%)",
    userBubbleFg: "hsl(0 0% 100%)",
    aiBubbleBg: "hsl(210 40% 96%)",
    aiBubbleFg: "hsl(222 47% 11%)",
    accent: "hsl(221 83% 53%)",
    headingFont: "Inter",
    bodyFont: "Inter",
    radius: 12,
    shadow: "soft",
  };
  if (typeof window === "undefined") return fallback;
  try {
    const cs = getComputedStyle(document.documentElement);
    const wrap = (raw: string, fb: string) => {
      const v = (raw || "").trim();
      if (!v) return fb;
      return v.startsWith("hsl(") ? v : `hsl(${v})`;
    };
    return {
      ...fallback,
      bg: wrap(cs.getPropertyValue("--background"), fallback.bg),
      userBubbleBg: wrap(cs.getPropertyValue("--primary"), fallback.userBubbleBg),
      userBubbleFg: wrap(cs.getPropertyValue("--primary-foreground"), fallback.userBubbleFg),
      aiBubbleBg: wrap(cs.getPropertyValue("--card") || cs.getPropertyValue("--muted"), fallback.aiBubbleBg),
      aiBubbleFg: wrap(cs.getPropertyValue("--foreground"), fallback.aiBubbleFg),
      accent: wrap(cs.getPropertyValue("--accent") || cs.getPropertyValue("--primary"), fallback.accent),
    };
  } catch {
    return fallback;
  }
}

// ---- Per-bubble variation -----------------------------------------------

const VARIANTS = 8;
function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Per-message subtle style override so each bubble has its own personality. */
export function bubbleVariant(
  id: string,
  role: "user" | "ai",
  t: FunTheme | null,
): React.CSSProperties {
  if (!t) return {};
  const v = hashId(id || role) % VARIANTS;
  const accent = t.accent;
  const base: React.CSSProperties = {};
  switch (v) {
    case 0: return { borderRadius: `${t.radius + 6}px ${Math.max(2, t.radius - 4)}px ${t.radius + 6}px ${Math.max(2, t.radius - 4)}px` };
    case 1: return { borderLeft: role === "ai" ? `4px solid ${accent}` : undefined, borderRight: role === "user" ? `4px solid ${accent}` : undefined };
    case 2: return { borderTop: `2px dashed ${accent}` };
    case 3: return { transform: "rotate(-0.4deg)" };
    case 4: return { transform: "rotate(0.5deg)" };
    case 5: return { outline: `1px dotted ${accent}`, outlineOffset: "2px" };
    case 6: return { backgroundImage: role === "user"
        ? `linear-gradient(135deg, var(--fun-user-bg), color-mix(in srgb, var(--fun-user-bg) 80%, ${accent}))`
        : `linear-gradient(135deg, var(--fun-ai-bg), color-mix(in srgb, var(--fun-ai-bg) 85%, ${accent}))` };
    case 7: return { borderBottom: `3px double ${accent}` };
    default: return base;
  }
}
