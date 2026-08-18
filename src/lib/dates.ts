/** Date helpers — local-time based, since aamal follow the user's local day. */

export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function hijriDate(d: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return "";
  }
}

export function gregorianDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
}

/** Previous local date key, n days back. */
export function daysAgoKey(n: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  return todayKey(d);
}

// ---------- Hijri (Umm al-Qura via Intl) ----------

export interface HijriParts {
  /** 1-based Hijri month (1 = Muharram … 12 = Dhu al-Hijjah) */
  month: number;
  day: number;
  year: number;
  monthName: string;
}

const HIJRI_MONTHS = [
  "Muharram",
  "Safar",
  "Rabi' al-Awwal",
  "Rabi' al-Thani",
  "Jumada al-Awwal",
  "Jumada al-Thani",
  "Rajab",
  "Sha'ban",
  "Ramadan",
  "Shawwal",
  "Dhu al-Qi'dah",
  "Dhu al-Hijjah",
];

const hijriFmt =
  typeof Intl !== "undefined"
    ? new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
        day: "numeric",
        month: "numeric",
        year: "numeric",
      })
    : null;

export function hijriParts(d: Date): HijriParts {
  const parts = hijriFmt!.formatToParts(d);
  const get = (t: string) =>
    Number(parts.find((p) => p.type === t)?.value ?? 0);
  const month = get("month");
  return {
    month,
    day: get("day"),
    year: get("year"),
    monthName: HIJRI_MONTHS[month - 1] ?? "",
  };
}

/**
 * All Gregorian dates of the Hijri month containing `anchor`.
 * Scans backward to the 1st, then forward until the month changes.
 */
export function hijriMonthDays(anchor: Date): { date: Date; hijri: HijriParts }[] {
  const start = new Date(anchor);
  let h = hijriParts(start);
  start.setDate(start.getDate() - (h.day - 1));
  h = hijriParts(start);
  // guard against umalqura rounding: walk to day 1 exactly
  while (h.day !== 1) {
    start.setDate(start.getDate() + (h.day > 15 ? 1 : -1));
    h = hijriParts(start);
  }
  const days: { date: Date; hijri: HijriParts }[] = [];
  const cur = new Date(start);
  const month = h.month;
  for (let i = 0; i < 31; i++) {
    const hp = hijriParts(cur);
    if (hp.month !== month) break;
    days.push({ date: new Date(cur), hijri: hp });
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}
