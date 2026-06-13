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
 * Skips the very first render because index.html already fires the initial
 * page_view via `gtag('config', ...)`.
 */
const Analytics: React.FC = () => {
  const location = useLocation();
  const isFirst = useRef(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    const send = () => {
      if (typeof window.gtag !== 'function') return;
      const path = location.pathname + location.search;
      // Update config so subsequent events are attributed to the new page,
      // then explicitly fire a page_view event.
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
    return () => window.clearTimeout(t);
  }, [location.pathname, location.search]);

  return null;
};

export default Analytics;
