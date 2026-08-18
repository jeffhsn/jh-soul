"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { todayKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

interface Timings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Sunset: string;
  Maghrib: string;
  Midnight: string;
}

const SHOWN: { key: keyof Timings; label: string }[] = [
  { key: "Fajr", label: "Fajr" },
  { key: "Sunrise", label: "Sunrise" },
  { key: "Dhuhr", label: "Dhuhr" },
  { key: "Sunset", label: "Sunset" },
  { key: "Maghrib", label: "Maghrib" },
  { key: "Midnight", label: "Midnight" },
];

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; timings: Timings; approx: boolean };

/** Precise coords if the user allows; otherwise approximate IP-based coords. */
async function resolveCoords(): Promise<{ lat: number; lon: number; approx: boolean }> {
  const fromGeo = await new Promise<{ lat: number; lon: number } | null>((resolve) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      resolve(null);
      return;
    }
    // don't hang forever on an unanswered permission prompt
    const bail = setTimeout(() => resolve(null), 8_000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(bail);
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => {
        clearTimeout(bail);
        resolve(null);
      },
      { maximumAge: 3_600_000, timeout: 7_000 },
    );
  });
  if (fromGeo) return { ...fromGeo, approx: false };

  // IP fallback — approximate but always available
  for (const url of ["https://ipapi.co/json/", "https://ipwho.is/"]) {
    try {
      const res = await fetch(url);
      const j = await res.json();
      const lat = Number(j.latitude);
      const lon = Number(j.longitude);
      if (isFinite(lat) && isFinite(lon) && (lat !== 0 || lon !== 0)) {
        return { lat, lon, approx: true };
      }
    } catch {}
  }
  throw new Error("no location");
}

/**
 * Prayer times — Jafari (Shia Ithna-Ashari) method via the AlAdhan API.
 * Uses precise geolocation when granted, IP location otherwise; cached per day.
 */
export function PrayerTimes({ date }: { date: Date }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const dateKey = todayKey(date);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    const cacheKey = `da:prayers:${dateKey}`;

    (async () => {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (!cancelled) setState({ status: "ready", ...parsed });
          return;
        }
      } catch {}

      try {
        const { lat, lon, approx } = await resolveCoords();
        // method=0 → Shia Ithna-Ashari (Jafari); midnightMode=1 → Jafari midnight
        const dd = `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
        const res = await fetch(
          `https://api.aladhan.com/v1/timings/${dd}?latitude=${lat}&longitude=${lon}&method=0&midnightMode=1`,
        );
        const json = await res.json();
        if (json.code !== 200) throw new Error("bad response");
        const t = json.data.timings as Timings;
        const timings = Object.fromEntries(
          SHOWN.map(({ key }) => [key, (t[key] ?? "").slice(0, 5)]),
        ) as unknown as Timings;
        const payload = { timings, approx };
        try {
          localStorage.setItem(cacheKey, JSON.stringify(payload));
        } catch {}
        if (!cancelled) setState({ status: "ready", ...payload });
      } catch {
        if (!cancelled) setState({ status: "error" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dateKey, date]);

  if (state.status === "error") {
    return (
      <p className="mt-4 flex items-center justify-center gap-1.5 text-[0.75rem] text-cream-faint">
        <MapPin className="size-3" />
        Prayer times unavailable — check your connection
      </p>
    );
  }

  const timings = state.status === "ready" ? state.timings : null;

  // what's next (only meaningful for today)
  const isToday = dateKey === todayKey(new Date());
  let nextKey: keyof Timings | null = null;
  if (timings && isToday) {
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    for (const { key } of SHOWN) {
      const [h, m] = timings[key].split(":").map(Number);
      if (h * 60 + m > nowMin) {
        nextKey = key;
        break;
      }
    }
  }

  return (
    <div className="mt-5">
      <div className="grid grid-cols-6 overflow-hidden rounded-2xl border border-night-line-soft bg-night-raise/60">
        {SHOWN.map(({ key, label }) => (
          <div
            key={key}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2.5",
              nextKey === key && "bg-gold/10",
            )}
          >
            <span
              className={cn(
                "text-[0.62rem] uppercase tracking-wider",
                nextKey === key ? "text-gold-bright" : "text-cream-faint",
              )}
            >
              {label}
            </span>
            <span
              className={cn(
                "text-[0.8rem] tabular-nums",
                nextKey === key ? "text-gold-bright" : "text-cream-dim",
              )}
            >
              {timings ? timings[key] : "··:··"}
            </span>
          </div>
        ))}
      </div>
      {state.status === "ready" && state.approx && (
        <p className="mt-1.5 text-center text-[0.65rem] text-cream-faint">
          approximate location — allow location access for precise times
        </p>
      )}
    </div>
  );
}
