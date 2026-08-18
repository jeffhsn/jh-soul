"use client";

import { useCallback, useEffect, useState } from "react";
import { LocateFixed, MapPin, Pencil } from "lucide-react";
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

interface Loc {
  lat: number;
  lon: number;
  label: string;
  source: "geo" | "ip" | "manual";
}

const SHOWN: { key: keyof Timings; label: string }[] = [
  { key: "Fajr", label: "Fajr" },
  { key: "Sunrise", label: "Sunrise" },
  { key: "Dhuhr", label: "Dhuhr" },
  { key: "Sunset", label: "Sunset" },
  { key: "Maghrib", label: "Maghrib" },
  { key: "Midnight", label: "Midnight" },
];

const LOC_KEY = "da:location";

function loadLoc(): Loc | null {
  try {
    const raw = localStorage.getItem(LOC_KEY);
    if (!raw) return null;
    const l = JSON.parse(raw);
    if (isFinite(l.lat) && isFinite(l.lon) && l.label) return l as Loc;
  } catch {}
  return null;
}

function saveLoc(loc: Loc) {
  try {
    localStorage.setItem(LOC_KEY, JSON.stringify(loc));
  } catch {}
}

async function labelFor(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
    );
    const j = await res.json();
    const city = j.city || j.locality || j.principalSubdivision;
    if (city) return j.countryCode ? `${city}, ${j.countryCode}` : city;
  } catch {}
  return "your location";
}

/** Detect location: precise if the user allows, else IP-approximate. */
async function detectLoc(): Promise<Loc> {
  const fromGeo = await new Promise<{ lat: number; lon: number } | null>((resolve) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      resolve(null);
      return;
    }
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
  if (fromGeo) {
    return { ...fromGeo, label: await labelFor(fromGeo.lat, fromGeo.lon), source: "geo" };
  }
  for (const url of ["https://ipapi.co/json/", "https://ipwho.is/"]) {
    try {
      const res = await fetch(url);
      const j = await res.json();
      const lat = Number(j.latitude);
      const lon = Number(j.longitude);
      if (isFinite(lat) && isFinite(lon) && (lat !== 0 || lon !== 0)) {
        const city = j.city || j.region;
        const cc = j.country_code || j.country;
        return {
          lat,
          lon,
          label: city ? `${city}${cc ? `, ${cc}` : ""}` : "approximate location",
          source: "ip",
        };
      }
    } catch {}
  }
  throw new Error("no location");
}

/** Geocode a typed place name → Loc (Nominatim). */
async function geocode(query: string): Promise<Loc | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&accept-language=en`,
    );
    const j = await res.json();
    if (Array.isArray(j) && j[0]) {
      const parts = String(j[0].display_name).split(",");
      const label =
        parts.length > 1
          ? `${parts[0].trim()}, ${parts[parts.length - 1].trim()}`
          : parts[0].trim();
      return { lat: Number(j[0].lat), lon: Number(j[0].lon), label, source: "manual" };
    }
  } catch {}
  return null;
}

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; timings: Timings };

/**
 * Prayer times — Jafari (Shia Ithna-Ashari) method via the AlAdhan API,
 * for a location that is detected once, shown, and manually changeable.
 */
export function PrayerTimes({ date }: { date: Date }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [loc, setLoc] = useState<Loc | null>(null);
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [editBusy, setEditBusy] = useState<false | "search" | "detect">(false);
  const [editError, setEditError] = useState(false);
  const dateKey = todayKey(date);

  // resolve location once (stored > detected)
  useEffect(() => {
    let cancelled = false;
    const stored = loadLoc();
    if (stored) {
      setLoc(stored);
      return;
    }
    detectLoc()
      .then((l) => {
        if (cancelled) return;
        saveLoc(l);
        setLoc(l);
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // fetch timings for (date, loc)
  useEffect(() => {
    if (!loc) return;
    let cancelled = false;
    setState({ status: "loading" });
    const lat = Math.round(loc.lat * 100) / 100;
    const lon = Math.round(loc.lon * 100) / 100;
    const cacheKey = `da:prayers:${dateKey}:${lat},${lon}`;
    (async () => {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          if (!cancelled) setState({ status: "ready", timings: JSON.parse(cached) });
          return;
        }
      } catch {}
      try {
        // method=0 → Shia Ithna-Ashari (Jafari); midnightMode=1 → Jafari midnight
        const dd = `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
        const res = await fetch(
          `https://api.aladhan.com/v1/timings/${dd}?latitude=${loc.lat}&longitude=${loc.lon}&method=0&midnightMode=1`,
        );
        const json = await res.json();
        if (json.code !== 200) throw new Error("bad response");
        const t = json.data.timings as Timings;
        const timings = Object.fromEntries(
          SHOWN.map(({ key }) => [key, (t[key] ?? "").slice(0, 5)]),
        ) as unknown as Timings;
        try {
          localStorage.setItem(cacheKey, JSON.stringify(timings));
        } catch {}
        if (!cancelled) setState({ status: "ready", timings });
      } catch {
        if (!cancelled) setState({ status: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dateKey, date, loc]);

  const submitQuery = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setEditBusy("search");
    setEditError(false);
    const found = await geocode(q);
    setEditBusy(false);
    if (found) {
      saveLoc(found);
      setLoc(found);
      setEditing(false);
      setQuery("");
    } else {
      setEditError(true);
    }
  }, [query]);

  const useMyLocation = useCallback(async () => {
    setEditBusy("detect");
    setEditError(false);
    try {
      const l = await detectLoc();
      saveLoc(l);
      setLoc(l);
      setEditing(false);
      setQuery("");
    } catch {
      setEditError(true);
    }
    setEditBusy(false);
  }, []);

  if (state.status === "error" && !loc) {
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

      {/* location line */}
      {!editing ? (
        <div className="mt-1.5 flex items-center justify-center gap-2 text-[0.7rem] text-cream-faint">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3" />
            {loc ? loc.label : "locating…"}
            {loc?.source === "ip" && " (approximate)"}
          </span>
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 rounded-full border border-night-line px-2 py-0.5 transition hover:border-gold-dim hover:text-cream-dim"
          >
            <Pencil className="size-2.5" />
            change
          </button>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitQuery()}
            placeholder="City, e.g. Najaf or London"
            className="w-52 rounded-full border border-night-line bg-night-card px-3.5 py-1.5 text-[0.78rem] text-cream placeholder:text-cream-faint focus:border-gold-dim focus:outline-none"
          />
          <button
            onClick={submitQuery}
            disabled={editBusy !== false}
            className="rounded-full bg-gold px-3.5 py-1.5 text-[0.72rem] font-semibold text-night transition hover:bg-gold-bright disabled:opacity-60"
          >
            {editBusy === "search" ? "…" : "set"}
          </button>
          <button
            onClick={useMyLocation}
            disabled={editBusy !== false}
            className="inline-flex items-center gap-1 rounded-full border border-night-line px-3 py-1.5 text-[0.72rem] text-cream-dim transition hover:border-gold-dim hover:text-cream disabled:opacity-60"
          >
            <LocateFixed className="size-3" />
            {editBusy === "detect" ? "…" : "use my location"}
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setEditError(false);
            }}
            className="text-[0.72rem] text-cream-faint hover:text-cream-dim"
          >
            cancel
          </button>
          {editError && (
            <span className="w-full text-center text-[0.7rem] text-[#c0666e]">
              Couldn&rsquo;t find that place — try a city name
            </span>
          )}
        </div>
      )}
    </div>
  );
}
