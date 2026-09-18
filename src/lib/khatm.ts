import { legacyRange, QURAN_PAGES, type PageRange } from "@/data/quran-daily";

/**
 * Progress-based khatm. The Quran is read in order, continuing from wherever
 * the owner actually is, and each day's portion is sized so that the khatm
 * completes within a year of its first day — so a missed day makes the
 * following portions a little larger instead of leaving a hole.
 *
 * What was read is the union of the portions of every day on which
 * "quran-daily" is ticked:
 *  - `da:quran:<date>` → {from,to}: the portion that day was given (stored the
 *    first time the day becomes active, so it cannot shift once ticked);
 *  - a ticked day without one read the old date-derived slice (`legacyRange`).
 * Everything else is derived; nothing else is stored.
 */

const YEAR_DAYS = 365;
/** a sane ceiling so one long absence cannot produce an impossible day */
const MAX_PAGES_A_DAY = 20;

export interface KhatmState {
  /** completed readings of the whole Quran */
  khatms: number;
  /** pages read in the current khatm */
  read: Set<number>;
  /** date key of the first ticked day of the current khatm, or null if not begun */
  startKey: string | null;
  /** first page read in the current khatm — reading proceeds cyclically from it */
  startPage: number;
  /** ticked days overall */
  days: number;
  /** pages read overall (each day's portion counted once) */
  pages: number;
}

const keyDate = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
};
const daysBetween = (a: string, b: string) =>
  Math.round((keyDate(b).getTime() - keyDate(a).getTime()) / 86_400_000);

function storedRange(key: string): PageRange | null {
  try {
    const r = JSON.parse(window.localStorage.getItem(`da:quran:${key}`) ?? "null");
    if (r && r.from >= 1 && r.to <= QURAN_PAGES && r.from <= r.to) return r;
  } catch {}
  return null;
}

function tickedOn(key: string): boolean {
  try {
    return !!JSON.parse(window.localStorage.getItem(`da:done:${key}`) ?? "{}")["quran-daily"];
  } catch {
    return false;
  }
}

/** The portion a given day stands for: its stored one, else the legacy slice. */
export function rangeOfDay(key: string): PageRange {
  return storedRange(key) ?? legacyRange(keyDate(key));
}

function fresh(): KhatmState {
  return { khatms: 0, read: new Set(), startKey: null, startPage: 1, days: 0, pages: 0 };
}

function apply(state: KhatmState, key: string, range: PageRange) {
  if (state.startKey === null) {
    state.startKey = key;
    state.startPage = range.from;
  }
  for (let p = range.from; p <= range.to; p++) state.read.add(p);
  state.days++;
  state.pages += range.to - range.from + 1;
  if (state.read.size >= QURAN_PAGES) {
    state.khatms++;
    state.read = new Set();
    state.startKey = null;
    state.startPage = 1;
  }
}

/** Everything read on ticked days strictly before `beforeKey` (or on all days). */
export function khatmState(beforeKey?: string): KhatmState {
  const state = fresh();
  if (typeof window === "undefined") return state;
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    const m = k?.match(/^da:done:(\d{4}-\d{2}-\d{2})$/);
    if (!m || (beforeKey && m[1] >= beforeKey)) continue;
    try {
      if (JSON.parse(window.localStorage.getItem(k!) ?? "{}")["quran-daily"]) keys.push(m[1]);
    } catch {}
  }
  for (const key of keys.sort()) apply(state, key, rangeOfDay(key));
  return state;
}

/** Pages a day needed from `key` on to finish the current khatm inside its year. */
export function paceFor(state: KhatmState, key: string): number {
  const left = QURAN_PAGES - state.read.size;
  const elapsed = state.startKey ? Math.max(0, daysBetween(state.startKey, key)) : 0;
  const daysLeft = Math.max(1, YEAR_DAYS - elapsed);
  return Math.min(MAX_PAGES_A_DAY, Math.max(1, Math.ceil(left / daysLeft)));
}

/**
 * The next portion: from the first unread page (cyclically from where the
 * khatm began), as many pages as the pace asks — stopping at a page already
 * read or at the end of the mushaf, so a portion is always one unbroken run.
 */
export function nextPortion(state: KhatmState, key: string): PageRange {
  const pace = paceFor(state, key);
  let from = state.startPage;
  for (let i = 0; i < QURAN_PAGES; i++) {
    const p = ((state.startPage - 1 + i) % QURAN_PAGES) + 1;
    if (!state.read.has(p)) {
      from = p;
      break;
    }
  }
  let to = from;
  while (to - from + 1 < pace && to < QURAN_PAGES && !state.read.has(to + 1)) to++;
  return { from, to };
}

/**
 * The portion to show for `key`, given which day is active:
 *  - the active day and earlier: the stored portion, else (active day) the next
 *    portion from real progress, else (older days) the legacy slice;
 *  - later days: a projection that assumes every day in between is read.
 */
export function portionFor(key: string, activeKey: string): PageRange {
  if (typeof window === "undefined") return legacyRange(keyDate(key));
  const stored = storedRange(key);
  if (stored) return stored;
  // already ticked without a stored portion: it was read as the legacy slice
  if (key < activeKey || tickedOn(key)) return legacyRange(keyDate(key));
  const state = khatmState(activeKey);
  let cursor = activeKey;
  // walk forward day by day to the requested one (bounded: browsing is near)
  for (let i = 0; i < 400; i++) {
    const range =
      storedRange(cursor) ??
      (tickedOn(cursor) ? legacyRange(keyDate(cursor)) : nextPortion(state, cursor));
    if (cursor === key) return range;
    apply(state, cursor, range);
    const d = keyDate(cursor);
    d.setDate(d.getDate() + 1);
    cursor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return legacyRange(keyDate(key));
}

/** The date by which the current khatm completes at its pace, for the tracker. */
export function khatmDeadline(state: KhatmState): Date | null {
  if (!state.startKey) return null;
  const d = keyDate(state.startKey);
  d.setDate(d.getDate() + YEAR_DAYS);
  return d;
}
