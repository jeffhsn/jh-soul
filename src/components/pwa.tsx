"use client";

import { useEffect } from "react";
import { daysAgoKey } from "@/lib/dates";
import { startSync } from "@/lib/sync";

/**
 * Registers the service worker (offline use + instant repeat loads) and
 * prunes stale per-day caches. Progress history (da:done/da:total) is kept
 * forever — it feeds the streaks and the consistency heatmap.
 */
export function Pwa() {
  useEffect(() => {
    startSync(); // keeps everything saved in the cloud, silently
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // an installed app can sit in memory for days — look for a new
          // build every time it comes back to the foreground
          document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") reg.update().catch(() => {});
          });
        })
        .catch(() => {});
      // when an updated worker takes over, reload once so the fresh
      // styles/shell appear without a manual hard-refresh
      let hadController = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (hadController) window.location.reload();
        hadController = true;
      });
    }
    try {
      const cutoff = daysAgoKey(45);
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (!k) continue;
        const m = k.match(/^da:(prayers|count|qtext):(\d{4}-\d{2}-\d{2})/);
        if (m && m[2] < cutoff) localStorage.removeItem(k);
      }
    } catch {}
  }, []);
  return null;
}
