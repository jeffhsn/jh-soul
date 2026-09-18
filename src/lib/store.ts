"use client";

import { useCallback, useSyncExternalStore } from "react";
import { aamalDate, aamalKey } from "./aamal-day";
import { daysAgoKey } from "./dates";

/**
 * Progress lives in localStorage:
 *  - `da:done:<date>`    → JSON Record<amalId, true>
 *  - `da:count:<date>:<amalId>` → JSON of per-amal counter state
 *  - `da:total:<date>`   → number of aamal that day (for streaks)
 */

const listeners = new Set<() => void>();

export function emit() {
  listeners.forEach((l) => l());
}

/** Per-key last-write timestamps, used by cloud sync to merge devices. */
const META = "da:meta:updated";
export function stamp(key: string) {
  try {
    const m = JSON.parse(window.localStorage.getItem(META) ?? "{}");
    m[key] = Date.now();
    window.localStorage.setItem(META, JSON.stringify(m));
  } catch {}
}

export function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = () => cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    stamp(key);
  } catch {
    // storage full / private mode — degrade silently
  }
  emit();
}

// ---------- done map ----------

const doneCache = new Map<string, Record<string, boolean>>();

function doneKey(date: string) {
  return `da:done:${date}`;
}

function getDone(date: string): Record<string, boolean> {
  const key = doneKey(date);
  const raw = typeof window === "undefined" ? null : window.localStorage.getItem(key);
  const cached = doneCache.get(key);
  // re-parse only when the underlying string changed
  if (cached && (cached as { __raw?: string }).__raw === raw) return cached;
  const parsed = read<Record<string, boolean>>(key, {});
  Object.defineProperty(parsed, "__raw", { value: raw, enumerable: false });
  doneCache.set(key, parsed);
  return parsed;
}

export function useDone(date: string = aamalKey()) {
  const done = useSyncExternalStore(
    subscribe,
    () => getDone(date),
    () => ({}) as Record<string, boolean>,
  );
  const setDone = useCallback(
    (amalId: string, value: boolean) => {
      const next = { ...getDone(date) } as Record<string, boolean>;
      if (value) next[amalId] = true;
      else delete next[amalId];
      write(doneKey(date), next);
    },
    [date],
  );
  return [done, setDone] as const;
}

// ---------- morning checklist (bonus, never required) ----------
// `da:morning:<date>` → JSON Record<amalId, true>. Kept apart from `da:done` on
// purpose: streaks and the heatmap count the keys of `da:done` against
// `da:total`, so bonus ticks stored there would pass for required ones.

const morningCache = new Map<string, Record<string, boolean>>();

function morningKey(date: string) {
  return `da:morning:${date}`;
}

function getMorning(date: string): Record<string, boolean> {
  const key = morningKey(date);
  const raw = typeof window === "undefined" ? null : window.localStorage.getItem(key);
  const cached = morningCache.get(key);
  if (cached && (cached as { __raw?: string }).__raw === raw) return cached;
  const parsed = read<Record<string, boolean>>(key, {});
  Object.defineProperty(parsed, "__raw", { value: raw, enumerable: false });
  morningCache.set(key, parsed);
  return parsed;
}

export function useMorning(date: string = aamalKey()) {
  const morning = useSyncExternalStore(
    subscribe,
    () => getMorning(date),
    () => ({}) as Record<string, boolean>,
  );
  const setMorning = useCallback(
    (amalId: string, value: boolean) => {
      const next = { ...getMorning(date) } as Record<string, boolean>;
      if (value) next[amalId] = true;
      else delete next[amalId];
      write(morningKey(date), next);
    },
    [date],
  );
  return [morning, setMorning] as const;
}

/**
 * One-off per day: ticks made on morning aamal while they were still part of
 * the main list are dropped from it (or they would count as required to-dos).
 * They are deliberately NOT carried into the morning checklist — nothing there
 * is ever ticked except by the owner's own hand.
 */
export function migrateMorningTicks(date: string, morningIds: string[]) {
  if (typeof window === "undefined") return;
  const done = getDone(date);
  const moved = morningIds.filter((id) => done[id]);
  if (!moved.length) return;
  const nextDone = { ...done } as Record<string, boolean>;
  for (const id of moved) delete nextDone[id];
  write(doneKey(date), nextDone);
}

/**
 * Fix the active day's Quran portion the first time it is seen, so that it
 * cannot move once the day is ticked (see src/lib/khatm.ts).
 */
export function recordQuranPortion(date: string, range: { from: number; to: number }) {
  if (typeof window === "undefined") return;
  const key = `da:quran:${date}`;
  if (window.localStorage.getItem(key) !== null) return;
  write(key, range);
}

/** Record how many aamal existed today so streaks can be computed later. */
export function recordDayTotal(date: string, total: number) {
  if (typeof window === "undefined") return;
  const key = `da:total:${date}`;
  if (window.localStorage.getItem(key) !== String(total)) {
    try {
      window.localStorage.setItem(key, String(total));
      stamp(key);
    } catch {}
  }
}

/**
 * Consecutive days (ending today or yesterday) where everything was completed.
 * "Today" is the active aamal day, which turns over at Fajr rather than midnight.
 */
export function computeStreak(): number {
  if (typeof window === "undefined") return 0;
  let streak = 0;
  const today = aamalDate();
  for (let i = 0; i < 366; i++) {
    const date = daysAgoKey(i, today);
    const total = Number(window.localStorage.getItem(`da:total:${date}`) ?? 0);
    const done = read<Record<string, boolean>>(doneKey(date), {});
    const completed = Object.keys(done).length;
    const full = total > 0 && completed >= total;
    if (full) {
      streak++;
    } else if (i === 0) {
      // today may still be in progress — don't break the streak yet
      continue;
    } else {
      break;
    }
  }
  return streak;
}

// ---------- per-amal counter state (tasbih / counters) ----------

export interface CountState {
  phase: number;
  count: number;
}

const ZERO: CountState = { phase: 0, count: 0 };
const countCache = new Map<string, CountState>();

function countKey(date: string, amalId: string) {
  return `da:count:${date}:${amalId}`;
}

export function useCountState(amalId: string, date: string = aamalKey()) {
  const key = countKey(date, amalId);
  const state = useSyncExternalStore(
    subscribe,
    () => {
      const raw = typeof window === "undefined" ? null : window.localStorage.getItem(key);
      const cached = countCache.get(key);
      if (cached && (cached as { __raw?: string }).__raw === raw) return cached;
      const parsed = read<CountState>(key, ZERO);
      Object.defineProperty(parsed, "__raw", { value: raw, enumerable: false });
      countCache.set(key, parsed);
      return parsed;
    },
    () => ZERO,
  );
  const setState = useCallback(
    (next: CountState) => write(key, next),
    [key],
  );
  return [state, setState] as const;
}

// ---------- sadaqa amounts ----------
// `da:sadaqa:<date>` → number (how much was given that day, in the user's own currency)

function sadaqaKey(date: string) {
  return `da:sadaqa:${date}`;
}

function readSadaqa(date: string): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(sadaqaKey(date));
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Amount given on one day; `null` means nothing was written down. */
export function useSadaqaAmount(date: string = aamalKey()) {
  const amount = useSyncExternalStore(
    subscribe,
    () => readSadaqa(date),
    () => null,
  );
  const setAmount = useCallback(
    (next: number | null) => {
      if (next === null || !Number.isFinite(next)) {
        try {
          window.localStorage.removeItem(sadaqaKey(date));
          stamp(sadaqaKey(date));
        } catch {}
        emit();
      } else {
        write(sadaqaKey(date), next);
      }
    },
    [date],
  );
  return [amount, setAmount] as const;
}

export interface SadaqaTotal {
  /** sum of every amount ever written down */
  total: number;
  /** number of days with an amount recorded */
  days: number;
}

function computeSadaqaTotal(): SadaqaTotal {
  if (typeof window === "undefined") return { total: 0, days: 0 };
  let cents = 0; // summed in cents — 0.1 + 0.2 must come out as 0.30
  let days = 0;
  const prefix = "da:sadaqa:";
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith(prefix)) continue;
    const n = Number(window.localStorage.getItem(key));
    if (!Number.isFinite(n) || n <= 0) continue;
    cents += Math.round(n * 100);
    days++;
  }
  return { total: cents / 100, days };
}

const EMPTY_SADAQA: SadaqaTotal = { total: 0, days: 0 };
let sadaqaTotalCache: SadaqaTotal = EMPTY_SADAQA;

/** Lifetime sadaqa given, recomputed whenever any progress changes. */
export function useSadaqaTotal(): SadaqaTotal {
  return useSyncExternalStore(
    subscribe,
    () => {
      const next = computeSadaqaTotal();
      if (
        next.total !== sadaqaTotalCache.total ||
        next.days !== sadaqaTotalCache.days
      )
        sadaqaTotalCache = next;
      return sadaqaTotalCache;
    },
    () => EMPTY_SADAQA,
  );
}

// ---------- playback speed ----------
// `da:speed` → number (rate every recitation plays at, 1 = normal); synced like all preferences

export const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;
const SPEED_KEY = "da:speed";

function readSpeed(): number {
  const n = read<number>(SPEED_KEY, 1);
  return typeof n === "number" && n >= 0.5 && n <= 3 ? n : 1;
}

/** Playback rate shared by every audio player in the app. */
export function useSpeed() {
  const speed = useSyncExternalStore(subscribe, readSpeed, () => 1);
  const setSpeed = useCallback((next: number) => write(SPEED_KEY, next), []);
  return [speed, setSpeed] as const;
}
