// Site-wide gradual color drift for fun mode.
// Captures the current :root design tokens, then slowly nudges each one along
// hue / saturation / lightness with its own random velocity so the whole UI
// quietly evolves over time. Starts at 0% drift on enable.

const TOKENS = [
  "--background", "--foreground",
  "--card", "--card-foreground",
  "--popover", "--popover-foreground",
  "--primary", "--primary-foreground",
  "--secondary", "--secondary-foreground",
  "--muted", "--muted-foreground",
  "--accent", "--accent-foreground",
  "--destructive", "--destructive-foreground",
  "--border", "--input", "--ring",
  "--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5",
  "--agent-openai", "--agent-anthropic", "--agent-deepseek", "--agent-grok",
  "--agent-google", "--agent-mistral", "--agent-perplexity", "--agent-qwen",
  "--md-accent-1", "--md-accent-2", "--md-accent-3", "--md-accent-4",
] as const;

type HSL = { h: number; s: number; l: number };
type Velocity = { vh: number; vs: number; vl: number };
type DriftState = {
  base: Record<string, HSL>;
  velocity: Record<string, Velocity>;
  accum: Record<string, HSL>; // accumulated deltas
};

// Per-token drift caps (foreground tokens get tighter lightness caps).
const CAP = { h: 50, s: 14, l: 12 };
const CAP_FG = { h: 50, s: 8, l: 5 };
const isFg = (tok: string) =>
  tok.includes("foreground") || tok === "--background" || tok === "--card" || tok === "--popover";

function parseTriplet(raw: string): HSL | null {
  const v = (raw || "").trim();
  const m = v.match(/^(\d{1,3})\s+(\d{1,3})%\s+(\d{1,3})%$/);
  if (!m) return null;
  return { h: +m[1], s: +m[2], l: +m[3] };
}
const fmt = (h: number, s: number, l: number) =>
  `${Math.round(((h % 360) + 360) % 360)} ${Math.round(s)}% ${Math.round(l)}%`;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const rand = (a: number, b: number) => a + Math.random() * (b - a);

let state: DriftState | null = null;

/** Capture current :root tokens as the drift baseline and seed random velocities. */
export function startDrift(): void {
  if (typeof window === "undefined") return;
  const cs = getComputedStyle(document.documentElement);
  const base: Record<string, HSL> = {};
  const velocity: Record<string, Velocity> = {};
  const accum: Record<string, HSL> = {};
  for (const tok of TOKENS) {
    const parsed = parseTriplet(cs.getPropertyValue(tok));
    if (!parsed) continue;
    base[tok] = parsed;
    accum[tok] = { h: 0, s: 0, l: 0 };
    // Each token gets its own slow, random drift rate so the palette
    // wanders rather than marching in lockstep.
    velocity[tok] = {
      vh: rand(-1.8, 1.8),
      vs: rand(-0.6, 0.6),
      vl: rand(-0.5, 0.5),
    };
  }
  state = { base, velocity, accum };
  // Start at 0% drift — no overrides applied yet.
  apply();
}

/** Advance drift by one step, then write the new values to :root. */
export function stepDrift(): void {
  if (!state) return;
  for (const tok of TOKENS) {
    if (!state.base[tok]) continue;
    const v = state.velocity[tok];
    const cap = isFg(tok) ? CAP_FG : CAP;
    // Small per-step jitter on top of the steady velocity so neighbouring
    // rounds don't look identical.
    const a = state.accum[tok];
    a.h = clamp(a.h + v.vh + rand(-0.4, 0.4), -cap.h, cap.h);
    a.s = clamp(a.s + v.vs + rand(-0.2, 0.2), -cap.s, cap.s);
    a.l = clamp(a.l + v.vl + rand(-0.15, 0.15), -cap.l, cap.l);
    // Occasionally flip velocity sign so drift meanders instead of saturating.
    if (Math.abs(a.h) > cap.h * 0.85) v.vh = -v.vh * rand(0.6, 1.1);
    if (Math.abs(a.s) > cap.s * 0.85) v.vs = -v.vs * rand(0.6, 1.1);
    if (Math.abs(a.l) > cap.l * 0.85) v.vl = -v.vl * rand(0.6, 1.1);
  }
  apply();
}

function apply(): void {
  if (!state || typeof window === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("transition", "background-color 1200ms ease, color 1200ms ease");
  for (const tok of TOKENS) {
    const b = state.base[tok];
    const a = state.accum[tok];
    if (!b || !a) continue;
    const s = clamp(b.s + a.s, 0, 100);
    const l = clamp(b.l + a.l, 2, 98);
    root.style.setProperty(tok, fmt(b.h + a.h, s, l));
  }
}

/** Remove all overrides and forget baseline. */
export function stopDrift(): void {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  for (const tok of TOKENS) root.style.removeProperty(tok);
  state = null;
}
