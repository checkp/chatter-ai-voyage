// Fun mode theme helpers: font whitelist, contrast guard, CSS var mapping.

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

/** Ensure fg has >=4.5:1 contrast on bg; if not, snap to near-black or near-white. */
export function ensureReadable(fg: string, bg: string, minRatio = 4.5): string {
  if (contrastRatio(fg, bg) >= minRatio) return fg;
  const B = parseHsl(bg);
  if (!B) return fg;
  // Pick whichever extreme has the better contrast against bg.
  return B.l >= 50 ? "hsl(0 0% 8%)" : "hsl(0 0% 98%)";
}

/** Clamp page bg to safe lightness so it never goes pure black / pure white. */
function clampPageBg(bg: string): string {
  const p = parseHsl(bg);
  if (!p) return bg;
  const s = Math.min(p.s, 40);
  const l = Math.min(Math.max(p.l, 8), 96);
  return `hsl(${p.h} ${s}% ${l}%)`;
}

/** Sanitize a theme: clamp page bg + enforce contrast on bubble texts. */
export function sanitizeTheme(t: FunTheme): FunTheme {
  const bg = clampPageBg(t.bg);
  return {
    ...t,
    bg,
    userBubbleFg: ensureReadable(t.userBubbleFg, t.userBubbleBg),
    aiBubbleFg: ensureReadable(t.aiBubbleFg, t.aiBubbleBg),
  };
}

export const SHADOW_MAP = {
  none: "none",
  soft: "0 1px 2px hsl(0 0% 0% / 0.08), 0 2px 6px hsl(0 0% 0% / 0.06)",
  lifted: "0 4px 12px hsl(0 0% 0% / 0.12), 0 10px 30px hsl(0 0% 0% / 0.10)",
} as const;

/** Map theme → CSS variables to apply on a wrapper div. */
export function themeToCssVars(t: FunTheme): React.CSSProperties {
  return {
    // Page surface
    background: t.bg,
    color: t.aiBubbleFg,
    fontFamily: FUN_FONTS[t.bodyFont],
    // Vars for bubbles
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
