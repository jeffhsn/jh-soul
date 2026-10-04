/**
 * Hijri years whose day-by-day detail has been folded into a summary.
 *
 * `da:year:<hijriYear>` → YearSummary. A summary with `through` set stands in
 * for every dated key (`da:<kind>:<date>…`) up to and including that date:
 * those keys are gone, and whatever still needs them (lifetime sadaqa, the
 * streak, the khatm in progress) continues from the summary instead.
 * Kept free of other imports so store.ts and khatm.ts can both read it.
 */

export interface KhatmCarry {
  khatms: number;
  /** pages read in the khatm in progress, as [from, to] runs */
  read: [number, number][];
  startKey: string | null;
  startPage: number;
  days: number;
  pages: number;
}

export interface YearSummary {
  /** Hijri year */
  year: number;
  /** first and last Gregorian date keys of that Hijri year */
  from: string;
  to: string;
  /** days with anything kept */
  present: number;
  /** days with the whole list kept */
  perfect: number;
  longestStreak: number;
  /** the run of whole days still going on the year's last day */
  endStreak: number;
  /** aamal ticked, all days together */
  kept: number;
  /** days a day of qada prayers was made up */
  qada: number;
  quranPages: number;
  /** khatms completed within the year */
  khatms: number;
  sadaqaCents: number;
  sadaqaDays: number;
  /** most-kept aamal: [id, days] */
  top: [string, number][];
  /** set once the detail is folded: every dated key up to here is gone */
  through?: string;
  /** khatm progress at the end of the year, so the next one continues from it */
  khatm?: KhatmCarry;
}

const PREFIX = "da:year:";

/** Every stored summary, oldest year first. */
export function yearSummaries(): YearSummary[] {
  if (typeof window === "undefined") return [];
  const out: YearSummary[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k?.startsWith(PREFIX)) continue;
      const s = JSON.parse(window.localStorage.getItem(k) ?? "null") as YearSummary | null;
      if (s && typeof s.year === "number") out.push(s);
    }
  } catch {}
  return out.sort((a, b) => a.year - b.year);
}

/** The last folded summary — everything dated up to its `through` lives only in summaries. */
export function lastFolded(): YearSummary | null {
  const folded = yearSummaries().filter((s) => s.through);
  return folded.length ? folded[folded.length - 1] : null;
}

export const yearKey = (year: number) => `${PREFIX}${year}`;
