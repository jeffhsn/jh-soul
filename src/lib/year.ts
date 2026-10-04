"use client";

import { allAamal } from "@/data";
import { aamalDate } from "./aamal-day";
import { hijriParts, todayKey } from "./dates";
import { lastFolded, yearKey, yearSummaries, type YearSummary } from "./folded";
import { carryOf, khatmState, pagesReadOn } from "./khatm";
import { emit, stamp } from "./store";

/**
 * "Your year": each Hijri year, summed up. While the year runs its numbers are
 * computed from the day-by-day detail. When it ends (1 Muharram) the detail is
 * folded into the summary for good — `da:year:<year>` — and every new year
 * starts fresh, so what each person stores stays small however many years
 * they keep coming. The summary stays, and the lifetime sadaqa, the streak and
 * the khatm all continue from it.
 */

const DATED = /^da:[a-z]+:(\d{4}-\d{2}-\d{2})/;
const META = "da:meta:updated";

const keyDate = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
};
const shift = (key: string, days: number) => {
  const d = keyDate(key);
  d.setDate(d.getDate() + days);
  return todayKey(d);
};

const boundsCache = new Map<number, { from: string; to: string }>();

/** First and last Gregorian day of a Hijri year (Umm al-Qura). */
export function yearBounds(year: number): { from: string; to: string } {
  const hit = boundsCache.get(year);
  if (hit) return hit;
  // 1 Muharram 1448 ≈ 16 Jun 2026; a Hijri year is ~354.37 days
  const guess = new Date(2026, 5, 16, 12);
  guess.setDate(guess.getDate() + Math.round((year - 1448) * 354.367));
  const d = new Date(guess);
  while (hijriParts(d).year >= year) d.setDate(d.getDate() - 1);
  while (hijriParts(d).year < year) d.setDate(d.getDate() + 1);
  const from = todayKey(d);
  d.setDate(d.getDate() + 350);
  while (hijriParts(d).year === year) d.setDate(d.getDate() + 1);
  d.setDate(d.getDate() - 1);
  const out = { from, to: todayKey(d) };
  boundsCache.set(year, out);
  return out;
}

function json<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Sum a year up from its day-by-day detail (up to today, if it is still running). */
function computeYear(year: number): YearSummary {
  const { from, to } = yearBounds(year);
  const today = todayKey(aamalDate());
  const last = to < today ? to : today;
  const s: YearSummary = {
    year, from, to, present: 0, perfect: 0, longestStreak: 0, endStreak: 0, kept: 0,
    qada: 0, quranPages: 0, khatms: 0, sadaqaCents: 0, sadaqaDays: 0, top: [],
  };
  const counts = new Map<string, number>();
  let run = 0;
  for (let key = from; key <= last; key = shift(key, 1)) {
    const done = json<Record<string, boolean>>(`da:done:${key}`, {});
    const bonus = Object.keys(json<Record<string, boolean>>(`da:morning:${key}`, {})).length;
    const ids = Object.keys(done);
    const caughtUp = window.localStorage.getItem(`da:quranx:${key}`) !== null;
    const total = Number(window.localStorage.getItem(`da:total:${key}`) ?? 0);
    if (ids.length + bonus > 0 || caughtUp) s.present++;
    s.kept += ids.length + bonus;
    if (total > 0 && ids.length >= total) {
      s.perfect++;
      run++;
      s.longestStreak = Math.max(s.longestStreak, run);
    } else if (key !== today) run = 0; // today may still be in progress
    for (const id of ids) {
      const base = id === "salat-layl-night" ? "salat-layl" : id;
      counts.set(base, (counts.get(base) ?? 0) + 1);
    }
    if (done["qada-salat"]) s.qada++;
    s.quranPages += pagesReadOn(key); // the portion (minus unticked pages) and any catch-up
    const given = Number(window.localStorage.getItem(`da:sadaqa:${key}`));
    if (Number.isFinite(given) && given > 0) {
      s.sadaqaCents += Math.round(given * 100);
      s.sadaqaDays++;
    }
  }
  s.endStreak = last === to ? run : 0;
  s.khatms = khatmState(shift(last, 1)).khatms - khatmState(from).khatms;
  const known = new Set(allAamal.map((a) => a.id));
  s.top = [...counts]
    .filter(([id]) => known.has(id) && id !== "quran-daily")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  return s;
}

/** Hijri years this person has anything for, newest first (the current one always). */
export function yearsWithData(): number[] {
  const years = new Set(yearSummaries().map((y) => y.year));
  years.add(hijriParts(aamalDate()).year);
  const seen = new Set<string>();
  for (let i = 0; i < window.localStorage.length; i++) {
    const m = window.localStorage.key(i)?.match(/^da:done:(\d{4}-\d{2}-\d{2})$/);
    if (!m) continue;
    const month = m[1].slice(0, 7); // one Hijri lookup per Gregorian month edge is plenty
    for (const day of [`${month}-01`, `${month}-28`]) {
      if (seen.has(day)) continue;
      seen.add(day);
      years.add(hijriParts(keyDate(day)).year);
    }
  }
  return [...years].sort((a, b) => b - a);
}

/** A year's summary: the stored one once folded, else computed from the detail. */
export function yearSummary(year: number): YearSummary {
  const stored = json<YearSummary | null>(yearKey(year), null);
  return stored?.through ? stored : computeYear(year);
}

/**
 * Fold every finished year: write its summary, then drop its day-by-day keys. Runs after a sync, so the summary is made from
 * everything this person's devices hold. Oldest year first, so each khatm
 * carry builds on the one before.
 */
export function foldOldYears() {
  if (typeof window === "undefined") return;
  // a year folds once its last day is over (the active day turns over at Fajr)
  const cutoff = shift(todayKey(aamalDate()), -1);
  const dated: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    const m = k?.match(DATED);
    if (k && m && m[1] <= cutoff) dated.push(k);
  }
  if (!dated.length) return;
  const folded = lastFolded();
  let changed = false;
  const oldest = dated.map((k) => k.match(DATED)![1]).sort()[0];
  for (let year = hijriParts(keyDate(oldest)).year; ; year++) {
    const { to } = yearBounds(year);
    if (to > cutoff) break;
    if (folded?.through && to <= folded.through) continue; // already folded
    const { from } = yearBounds(year);
    if (!dated.some((k) => { const d = k.match(DATED)![1]; return d >= from && d <= to; })) continue;
    const summary: YearSummary = { ...computeYear(year), through: to, khatm: carryOf(khatmState(shift(to, 1))) };
    // write the summary before anything is removed
    window.localStorage.setItem(yearKey(year), JSON.stringify(summary));
    stamp(yearKey(year));
    const meta = json<Record<string, number>>(META, {});
    for (const k of dated) {
      if (k.match(DATED)![1] > to) continue;
      window.localStorage.removeItem(k);
      delete meta[k]; // no tombstone: the server drops these by the summary's `through`
    }
    window.localStorage.setItem(META, JSON.stringify(meta));
    changed = true;
  }
  if (changed) emit();
}
