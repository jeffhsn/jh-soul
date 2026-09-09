"use client";

import { useCallback, useSyncExternalStore } from "react";
import { daysAgoKey, todayKey } from "./dates";

/**
 * Progress lives in localStorage:
 *  - `da:done:<date>`    → JSON Record<amalId, true>
 *  - `da:count:<date>:<amalId>` → JSON of per-amal counter state
 *  - `da:total:<date>`   → number of aamal that day (for streaks)
 */

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
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

export function useDone(date: string = todayKey()) {
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

/** Record how many aamal existed today so streaks can be computed later. */
export function recordDayTotal(date: string, total: number) {
  if (typeof window === "undefined") return;
  const key = `da:total:${date}`;
  if (window.localStorage.getItem(key) !== String(total)) {
    try {
      window.localStorage.setItem(key, String(total));
    } catch {}
  }
}

/** Consecutive days (ending today or yesterday) where everything was completed. */
export function computeStreak(): number {
  if (typeof window === "undefined") return 0;
  let streak = 0;
  for (let i = 0; i < 366; i++) {
    const date = daysAgoKey(i);
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

export function useCountState(amalId: string, date: string = todayKey()) {
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
export function useSadaqaAmount(date: string = todayKey()) {
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
  let total = 0;
  let days = 0;
  const prefix = "da:sadaqa:";
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith(prefix)) continue;
    const n = Number(window.localStorage.getItem(key));
    if (!Number.isFinite(n) || n <= 0) continue;
    total += n;
    days++;
  }
  return { total, days };
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
