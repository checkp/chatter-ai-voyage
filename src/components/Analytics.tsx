import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

const GA_ID = 'G-TMXE4NJCKP';

/**
 * Fires a GA4 page_view on every SPA route change.
 *
 * Normal case: gtag.js loaded from index.html and already fired the initial
 * page_view via `gtag('config', ...)`, so we skip the first render to avoid
 * a double-count.
 *
 * Resilient case: if gtag isn't a function at mount (ad-blocker, slow network,
 * script blocked), we DON'T skip the first render — we let the effect run and
 * try to fire once gtag becomes available (polled briefly). This prevents the
 * very first visitor pageview from being lost when the initial config never ran.
 */
const Analytics: React.FC = () => {
  const location = useLocation();
  // Only skip the first render if gtag was already ready (so the inline config
  // in index.html has already fired the initial page_view).
  const isFirst = useRef(
    typeof window !== 'undefined' && typeof window.gtag === 'function'
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const send = () => {
      if (cancelled) return;
      if (typeof window.gtag !== 'function') {
        // Poll briefly for gtag to load (up to ~5s), then give up silently.
        if (attempts++ < 25) {
          window.setTimeout(send, 200);
        }
        return;
      }
      const path = location.pathname + location.search;
      window.gtag('config', GA_ID, {
        page_path: path,
        page_location: window.location.href,
        page_title: document.title,
      });
      window.gtag('event', 'page_view', {
        send_to: GA_ID,
        page_path: path,
        page_location: window.location.href,
        page_title: document.title,
      });
    };

    // Defer slightly so document.title (often updated by the new route) is current.
    const t = window.setTimeout(send, 50);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [location.pathname, location.search]);

  return null;
};

export default Analytics;
