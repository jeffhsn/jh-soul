"use client";

import { useEffect } from "react";
import { daysAgoKey } from "@/lib/dates";

/**
 * Registers the service worker (offline use + instant repeat loads) and
 * prunes stale per-day caches. Progress history (da:done/da:total) is kept
 * forever — it feeds the streaks and the consistency heatmap.
 */
export function Pwa() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    try {
      const cutoff = daysAgoKey(45);
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (!k) continue;
        const m = k.match(/^da:(prayers|count):(\d{4}-\d{2}-\d{2})/);
        if (m && m[2] < cutoff) localStorage.removeItem(k);
      }
    } catch {}
  }, []);
  return null;
}
