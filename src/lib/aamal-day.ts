import { todayKey } from "./dates";

/**
 * The aamal are done in one sitting after Maghrib, every day of the week. The list is the ordinary calendar day's list — the only
 * adjustment is that it does not turn over at midnight but at Fajr, so a late
 * sitting, the before-sleep surahs and Salat al-Layl all land on the day the
 * sitting began instead of being split across two dates.
 */

export interface DayMarks {
  /** minutes after local midnight */
  fajr: number;
  maghrib: number;
}

const FALLBACK: DayMarks = { fajr: 5 * 60, maghrib: 18 * 60 + 30 };

function storedLoc(): { lat: number; lon: number } | null {
  try {
    const l = JSON.parse(window.localStorage.getItem("da:location") ?? "null");
    if (l && isFinite(l.lat) && isFinite(l.lon)) return { lat: l.lat, lon: l.lon };
  } catch {}
  return null;
}

const toMin = (hhmm: unknown): number | null => {
  if (typeof hhmm !== "string") return null;
  const [h, m] = hhmm.split(":").map(Number);
  return isFinite(h) && isFinite(m) ? h * 60 + m : null;
};

/**
 * Minutes after local midnight at which the sun reaches `zenith` degrees,
 * rising or setting (NOAA approximation, good to a minute or two).
 * Assumes the device clock is in the location's timezone.
 */
function solarMinutes(
  date: Date,
  lat: number,
  lon: number,
  zenith: number,
  rising: boolean,
): number | null {
  const start = new Date(date.getFullYear(), 0, 0);
  const n = Math.round((date.getTime() - start.getTime()) / 86_400_000);
  const g = ((2 * Math.PI) / 365) * (n - 1);
  const eq =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(g) -
      0.032077 * Math.sin(g) -
      0.014615 * Math.cos(2 * g) -
      0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);
  const rad = Math.PI / 180;
  const cosHa =
    Math.cos(zenith * rad) / (Math.cos(lat * rad) * Math.cos(decl)) -
    Math.tan(lat * rad) * Math.tan(decl);
  if (cosHa < -1 || cosHa > 1) return null; // polar day / night
  const ha = Math.acos(cosHa) / rad;
  const utc = 720 - 4 * (lon + (rising ? ha : -ha)) - eq;
  const local = utc - date.getTimezoneOffset();
  return ((Math.round(local) % 1440) + 1440) % 1440;
}

/**
 * Midsummer at high latitudes the sun never sinks 16° below the horizon. The
 * usual angle-based rule then sets Fajr 16/60 of the night before sunrise.
 */
function twilightFajr(civil: Date, loc: { lat: number; lon: number }): number {
  const prev = new Date(civil.getFullYear(), civil.getMonth(), civil.getDate() - 1, 12);
  const sunrise = solarMinutes(civil, loc.lat, loc.lon, 90.833, true);
  const sunset = solarMinutes(prev, loc.lat, loc.lon, 90.833, false);
  if (sunrise === null || sunset === null) return FALLBACK.fajr;
  const night = (sunrise - sunset + 1440) % 1440;
  return Math.round(sunrise - (night * 16) / 60);
}

/**
 * Fajr and Maghrib for one civil date: the cached Jafari timings the prayer
 * panel already fetched when present, else computed from the saved location
 * (Jafari angles: Fajr 16°, Maghrib 4° below the horizon), else a fixed guess.
 */
export function dayMarks(civil: Date): DayMarks {
  if (typeof window === "undefined") return FALLBACK;
  const loc = storedLoc();
  if (!loc) return FALLBACK;
  try {
    const lat = Math.round(loc.lat * 100) / 100;
    const lon = Math.round(loc.lon * 100) / 100;
    const cached = JSON.parse(
      window.localStorage.getItem(`da:prayers:${todayKey(civil)}:${lat},${lon}`) ?? "null",
    );
    const fajr = toMin(cached?.Fajr);
    const maghrib = toMin(cached?.Maghrib);
    if (fajr !== null && maghrib !== null) return { fajr, maghrib };
  } catch {}
  return {
    fajr: solarMinutes(civil, loc.lat, loc.lon, 106, true) ?? twilightFajr(civil, loc),
    maghrib: solarMinutes(civil, loc.lat, loc.lon, 94, false) ?? FALLBACK.maghrib,
  };
}

const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes();

/** Between Maghrib and Fajr — the hours of the evening sitting. */
export function isNight(now: Date = new Date()): boolean {
  const { fajr, maghrib } = dayMarks(now);
  const m = minutesOf(now);
  return m >= maghrib || m < fajr;
}

/**
 * The calendar date whose checklist is active right now (at local noon, so
 * day arithmetic is DST-safe): still yesterday's between midnight and Fajr.
 */
export function aamalDate(now: Date = new Date()): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  if (minutesOf(now) < dayMarks(now).fajr) d.setDate(d.getDate() - 1);
  return d;
}

export function aamalKey(now: Date = new Date()): string {
  return todayKey(aamalDate(now));
}

export function formatMinutes(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}
