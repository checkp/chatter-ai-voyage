/**
 * The local agent (LM Studio / Ollama) requires the browser to fetch
 * http://localhost from this page. Firefox and Safari block that as mixed
 * content on HTTPS with no user override, so the feature is effectively
 * unusable there. Chromium-based browsers (Chrome, Edge, Brave, Opera, Arc)
 * allow it — either directly on HTTP, or via the "Insecure content" toggle
 * on HTTPS. We hide the UI everywhere else so users aren't offered a
 * feature that can't work in their browser.
 */
export function isLocalAgentSupported(): boolean {
  if (typeof window === "undefined") return false;

  // On HTTP (localhost dev, self-hosted plain HTTP) every browser works.
  if (window.location.protocol !== "https:") return true;

  // Prefer the modern UA-Client-Hints API when available — it reports
  // Chromium presence without the usual UA-string ambiguity.
  const uaData = (navigator as any).userAgentData;
  if (uaData?.brands?.length) {
    return uaData.brands.some((b: { brand: string }) =>
      /Chromium|Google Chrome|Microsoft Edge|Opera|Brave/i.test(b.brand),
    );
  }

  // Fallback: sniff the UA string. Exclude Firefox (no Chrome token) and
  // desktop Safari (has "Safari" but not "Chrome"/"Chromium").
  const ua = navigator.userAgent;
  const isChromium = /Chrome|Chromium|Edg\/|OPR\//.test(ua) && !/Firefox|FxiOS/.test(ua);
  return isChromium;
}
