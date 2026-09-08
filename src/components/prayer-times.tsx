"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, LocateFixed, MapPin, Pencil } from "lucide-react";
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

/**
 * Detect location. Browser geolocation (a permission prompt) only runs when
 * the user explicitly asks via "use my location" — first visits fall back to
 * a silent IP lookup so the page never prompts on load.
 */
async function detectLoc(useBrowserGeo = false): Promise<Loc> {
  const fromGeo = !useBrowserGeo
    ? null
    : await new Promise<{ lat: number; lon: number } | null>((resolve) => {
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

interface Suggestion extends Loc {
  /** full place description for the dropdown's second line */
  detail: string;
}

/** Search place names → suggestions (Nominatim). */
async function searchPlaces(query: string): Promise<Suggestion[]> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1&accept-language=en`,
    );
    const j = await res.json();
    if (!Array.isArray(j)) return [];
    return j
      .map((r): Suggestion | null => {
        const lat = Number(r.lat);
        const lon = Number(r.lon);
        if (!isFinite(lat) || !isFinite(lon)) return null;
        const a = r.address ?? {};
        const place =
          a.city || a.town || a.village || a.municipality || a.county ||
          String(r.display_name).split(",")[0].trim();
        const cc = a.country_code ? String(a.country_code).toUpperCase() : "";
        const parts = String(r.display_name).split(",").map((s: string) => s.trim());
        return {
          lat,
          lon,
          label: cc ? `${place}, ${cc}` : place,
          detail: parts.slice(1).join(", "),
          source: "manual",
        };
      })
      .filter((s): s is Suggestion => s !== null);
  } catch {
    return [];
  }
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
  // phones show the full grid by default; the summary line collapses it
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [highlight, setHighlight] = useState(0);
  const [searching, setSearching] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [editError, setEditError] = useState(false);
  const dateKey = todayKey(date);

  // debounced autocomplete
  useEffect(() => {
    if (!editing) return;
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const found = await searchPlaces(q);
      setSuggestions(found);
      setHighlight(0);
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [query, editing]);

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

  const pick = useCallback((s: Loc) => {
    saveLoc(s);
    setLoc(s);
    setEditing(false);
    setQuery("");
    setSuggestions([]);
    setEditError(false);
  }, []);

  const useMyLocation = useCallback(async () => {
    setDetecting(true);
    setEditError(false);
    try {
      const l = await detectLoc(true);
      pick(l);
    } catch {
      setEditError(true);
    }
    setDetecting(false);
  }, [pick]);

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
    <div className="mt-4 sm:mt-5">
      {/* phone summary line — next prayer at a glance, tap for the rest */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-night-line-soft bg-night-raise/60 px-4 py-2.5 text-[0.8rem] text-cream-dim transition active:scale-[0.99] sm:hidden"
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <MapPin className="size-3.5 shrink-0 text-gold-dim" />
          {nextKey && timings ? (
            <span className="truncate">
              Next ·{" "}
              <span className="text-cream">
                {nextKey} {timings[nextKey]}
              </span>
            </span>
          ) : (
            <span className="truncate">Prayer times{loc ? ` · ${loc.label}` : ""}</span>
          )}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>

      <div className={cn(open ? "mt-2 block" : "hidden", "sm:mt-0 sm:block")}>
      <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-night-line-soft bg-night-raise/60 sm:grid-cols-6">
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
        <div className="mx-auto mt-2 w-full max-w-sm">
          <div className="relative">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlight((h) => Math.max(h - 1, 0));
                } else if (e.key === "Enter" && suggestions[highlight]) {
                  pick(suggestions[highlight]);
                } else if (e.key === "Escape") {
                  setEditing(false);
                }
              }}
              placeholder="Start typing a city… e.g. Najaf, Qom, London"
              className="w-full rounded-2xl border border-night-line bg-night-card px-4 py-2.5 text-[16px] text-cream placeholder:text-cream-faint focus:border-gold-dim focus:outline-none"
            />
            {(suggestions.length > 0 || searching) && (
              <ul className="absolute inset-x-0 top-full z-20 mt-1.5 overflow-hidden rounded-2xl border border-night-line bg-night-card shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
                {searching && suggestions.length === 0 && (
                  <li className="px-4 py-3 text-[0.78rem] italic text-cream-faint">
                    searching…
                  </li>
                )}
                {suggestions.map((s, i) => (
                  <li key={`${s.lat},${s.lon}`}>
                    <button
                      onClick={() => pick(s)}
                      onMouseEnter={() => setHighlight(i)}
                      className={cn(
                        "flex w-full flex-col items-start px-4 py-2.5 text-left transition",
                        i === highlight && "bg-gold/10",
                      )}
                    >
                      <span className="inline-flex items-center gap-1.5 text-[0.85rem] text-cream">
                        <MapPin className="size-3 text-gold-dim" />
                        {s.label}
                      </span>
                      {s.detail && (
                        <span className="mt-0.5 line-clamp-1 pl-[18px] text-[0.68rem] text-cream-faint">
                          {s.detail}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-2 flex items-center justify-center gap-2">
            <button
              onClick={useMyLocation}
              disabled={detecting}
              className="inline-flex items-center gap-1 rounded-full border border-night-line px-3 py-1.5 text-[0.72rem] text-cream-dim transition hover:border-gold-dim hover:text-cream disabled:opacity-60"
            >
              <LocateFixed className="size-3" />
              {detecting ? "detecting…" : "use my location"}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setEditError(false);
              }}
              className="rounded-full px-3 py-1.5 text-[0.72rem] text-cream-faint hover:text-cream-dim"
            >
              cancel
            </button>
          </div>
          {editError && (
            <p className="mt-1.5 text-center text-[0.7rem] text-[#c0666e]">
              Couldn&rsquo;t detect your location — try typing a city instead
            </p>
          )}
          {query.trim().length >= 2 && !searching && suggestions.length === 0 && (
            <p className="mt-1.5 text-center text-[0.7rem] text-cream-faint">
              No places found — keep typing or try another spelling
            </p>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
