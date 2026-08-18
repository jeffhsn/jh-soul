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
  | { status: "idle" | "loading" }
  | { status: "denied" }
  | { status: "error" }
  | { status: "ready"; timings: Timings; city?: string };

/**
 * Prayer times for the user's location — Jafari (Shia Ithna-Ashari) method
 * via the AlAdhan API, cached per day + rounded coordinates.
 */
export function PrayerTimes({ date }: { date: Date }) {
  const [state, setState] = useState<State>({ status: "idle" });
  const dateKey = todayKey(date);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    if (!("geolocation" in navigator)) {
      setState({ status: "error" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Math.round(pos.coords.latitude * 100) / 100;
        const lon = Math.round(pos.coords.longitude * 100) / 100;
        const cacheKey = `da:prayers:${dateKey}:${lat},${lon}`;
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached && !cancelled) {
            setState({ status: "ready", ...JSON.parse(cached) });
            return;
          }
        } catch {}
        try {
          // method=0 → Shia Ithna-Ashari (Jafari), Leva Institute Qum;
          // midnightMode=1 → Jafari midnight (sunset to fajr)
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
          const payload = { timings };
          try {
            localStorage.setItem(cacheKey, JSON.stringify(payload));
          } catch {}
          if (!cancelled) setState({ status: "ready", ...payload });
        } catch {
          if (!cancelled) setState({ status: "error" });
        }
      },
      () => {
        if (!cancelled) setState({ status: "denied" });
      },
      { maximumAge: 3_600_000, timeout: 12_000 },
    );
    return () => {
      cancelled = true;
    };
  }, [dateKey, date]);

  if (state.status === "denied" || state.status === "error") {
    return (
      <p className="mt-4 flex items-center justify-center gap-1.5 text-[0.75rem] text-cream-faint">
        <MapPin className="size-3" />
        {state.status === "denied"
          ? "Allow location access to see prayer times"
          : "Prayer times unavailable right now"}
      </p>
    );
  }

  const timings = state.status === "ready" ? state.timings : null;

  // which prayer window are we in / what's next (only meaningful for today)
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
    <div className="mt-5 grid grid-cols-6 overflow-hidden rounded-2xl border border-night-line-soft bg-night-raise/60">
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
  );
}
