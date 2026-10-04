import { legacyRange, QURAN_PAGES, type PageRange } from "@/data/quran-daily";
import { lastFolded, type KhatmCarry } from "./folded";

/**
 * Progress-based khatm. The Quran is read in order, continuing from wherever
 * the owner actually is, and each day's portion is sized so that the khatm
 * completes within a month (30 days) of its first day — about a juz a day —
 * so a missed day makes the following portions a little larger instead of
 * leaving a hole.
 *
 * What was read is the union of the portions of every day on which
 * "quran-daily" is ticked:
 *  - `da:quran:<date>` → {from,to}: the portion that day was given (stored the
 *    first time the day becomes active, so it cannot shift once ticked);
 *  - a ticked day without one read the old date-derived slice (`legacyRange`).
 * Everything else is derived; nothing else is stored. Days of a folded Hijri
 * year (src/lib/folded.ts) are gone; their progress continues from the
 * year's `khatm` carry.
 */

const KHATM_DAYS = 30;
/** a sane ceiling (two juz) so one long absence cannot produce an impossible day */
const MAX_PAGES_A_DAY = 40;
/**
 * Khatms used to be paced over a year (about two pages a day). On this day the
 * pace became monthly and a fresh khatm began from page 1: the khatm that was
 * under way is set aside (its pages still count in the totals), and portions
 * pinned for this day or later under the old logic are recomputed unless
 * already ticked. New pins carry `v: 2`.
 */
export const KHATM_RESET = "2026-10-04";
const paceStart = (startKey: string) => (startKey > KHATM_RESET ? startKey : KHATM_RESET);

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

/** A run of pages read, minus any the reader unticked as not read. */
export interface ReadRange extends PageRange {
  skip?: number[];
}

function valid(r: unknown): ReadRange | null {
  const x = r as ReadRange | null;
  if (!x || !(x.from >= 1 && x.to <= QURAN_PAGES && x.from <= x.to)) return null;
  const skip = Array.isArray(x.skip) ? x.skip.filter((p) => p >= x.from && p <= x.to) : [];
  return skip.length ? { from: x.from, to: x.to, skip } : { from: x.from, to: x.to };
}

function storedRange(key: string): ReadRange | null {
  try {
    const raw = JSON.parse(window.localStorage.getItem(`da:quran:${key}`) ?? "null");
    // pinned on or after the fresh start by the old logic, and not read yet: recompute it
    if (raw && !raw.v && key >= KHATM_RESET && !tickedOn(key)) return null;
    return valid(raw);
  } catch {}
  return null;
}

/** Catch-up reading done on a day, beyond its portion: `da:quranx:<date>` → ReadRange[]. */
export function extrasOn(key: string): ReadRange[] {
  try {
    const list = JSON.parse(window.localStorage.getItem(`da:quranx:${key}`) ?? "[]");
    return Array.isArray(list) ? (list.map(valid).filter(Boolean) as ReadRange[]) : [];
  } catch {
    return [];
  }
}

function tickedOn(key: string): boolean {
  try {
    return !!JSON.parse(window.localStorage.getItem(`da:done:${key}`) ?? "{}")["quran-daily"];
  } catch {
    return false;
  }
}

/** The portion a given day stands for: its stored one, else the legacy slice. */
export function rangeOfDay(key: string): ReadRange {
  return storedRange(key) ?? legacyRange(keyDate(key));
}

const pagesIn = (r: ReadRange) => r.to - r.from + 1 - (r.skip?.length ?? 0);

/** Pages actually read on a day: its portion if ticked (minus unticked pages), plus catch-up. */
export function pagesReadOn(key: string): number {
  let n = tickedOn(key) ? pagesIn(rangeOfDay(key)) : 0;
  for (const x of extrasOn(key)) n += pagesIn(x);
  return n;
}

function fresh(): KhatmState {
  return { khatms: 0, read: new Set(), startKey: null, startPage: 1, days: 0, pages: 0 };
}

function apply(state: KhatmState, key: string, range: ReadRange, day = true) {
  if (state.startKey === null) {
    state.startKey = key;
    state.startPage = range.from;
  }
  const skip = new Set(range.skip);
  for (let p = range.from; p <= range.to; p++) if (!skip.has(p)) state.read.add(p);
  if (day) state.days++;
  state.pages += pagesIn(range);
  if (state.read.size >= QURAN_PAGES) {
    state.khatms++;
    state.read = new Set();
    state.startKey = null;
    state.startPage = 1;
  }
}

export function carryOf(state: KhatmState): KhatmCarry {
  const read: [number, number][] = [];
  for (const p of [...state.read].sort((a, b) => a - b)) {
    const last = read[read.length - 1];
    if (last && last[1] === p - 1) last[1] = p;
    else read.push([p, p]);
  }
  const { khatms, startKey, startPage, days, pages } = state;
  return { khatms, read, startKey, startPage, days, pages };
}

function fromCarry(c: KhatmCarry): KhatmState {
  const read = new Set<number>();
  for (const [from, to] of c.read) for (let p = from; p <= to; p++) read.add(p);
  return { khatms: c.khatms, read, startKey: c.startKey, startPage: c.startPage, days: c.days, pages: c.pages };
}

/** Everything read on ticked days strictly before `beforeKey` (or on all days). */
export function khatmState(beforeKey?: string): KhatmState {
  if (typeof window === "undefined") return fresh();
  // a folded year carries everything read up to its last day
  const folded = lastFolded();
  const carried = folded?.khatm && folded.through && (!beforeKey || folded.through < beforeKey);
  const state = carried ? fromCarry(folded.khatm!) : fresh();
  const after = carried ? folded.through! : "";
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    const m = k?.match(/^da:done:(\d{4}-\d{2}-\d{2})$/);
    if (!m || (beforeKey && m[1] >= beforeKey) || m[1] <= after) continue;
    try {
      if (JSON.parse(window.localStorage.getItem(k!) ?? "{}")["quran-daily"]) keys.push(m[1]);
    } catch {}
  }
  // days with catch-up reading count too, ticked or not
  for (let i = 0; i < window.localStorage.length; i++) {
    const m = window.localStorage.key(i)?.match(/^da:quranx:(\d{4}-\d{2}-\d{2})$/);
    if (m && !(beforeKey && m[1] >= beforeKey) && m[1] > after && !keys.includes(m[1])) keys.push(m[1]);
  }
  const sorted = keys.sort();
  const run = (key: string) => {
    if (tickedOn(key)) apply(state, key, rangeOfDay(key));
    for (const x of extrasOn(key)) apply(state, key, x, !tickedOn(key));
  };
  for (const key of sorted) if (key < KHATM_RESET) run(key);
  // the fresh start: the khatm under way is set aside, its pages stay in the totals
  if (!beforeKey || beforeKey >= KHATM_RESET) {
    state.read = new Set();
    state.startKey = null;
    state.startPage = 1;
  }
  for (const key of sorted) if (key >= KHATM_RESET) run(key);
  return state;
}

/** Position of a page in the current khatm's reading order (cyclic from where it began). */
const orderOf = (state: KhatmState, p: number) => (p - state.startPage + QURAN_PAGES) % QURAN_PAGES;

/** The furthest page read in the current khatm, as a position in its order; -1 before the first. */
function frontOf(state: KhatmState): number {
  let front = -1;
  for (const p of state.read) front = Math.max(front, orderOf(state, p));
  return front;
}

const pageAt = (state: KhatmState, i: number) => ((state.startPage - 1 + i) % QURAN_PAGES) + 1;

/** Pages left behind the furthest page read — unticked as not read — as [from, to] runs. */
export function skippedRuns(state: KhatmState): [number, number][] {
  const runs: [number, number][] = [];
  const front = frontOf(state);
  for (let i = 0; i < front; i++) {
    const p = pageAt(state, i);
    if (state.read.has(p)) continue;
    const last = runs[runs.length - 1];
    if (last && last[1] === p - 1) last[1] = p;
    else runs.push([p, p]);
  }
  return runs;
}

/**
 * How many pages short of an even monthly pace this khatm will still be once
 * `todayPortion` is read — the missed days. Zero when on time or ahead.
 */
export function behindBy(state: KhatmState, key: string, todayPortion?: ReadRange | null): number {
  if (!state.startKey) return 0;
  const elapsed = Math.max(0, daysBetween(paceStart(state.startKey), key)) + 1;
  const due = Math.ceil((QURAN_PAGES * Math.min(KHATM_DAYS, elapsed)) / KHATM_DAYS);
  const coming = todayPortion ? pagesIn(todayPortion) : 0;
  return Math.max(0, due - state.read.size - coming);
}

/**
 * The next catch-up reading: a skipped run if there is one, else the pages
 * after the furthest read — beyond today's portion (`reservedTo`), so it never
 * repeats it — as many as are owed, at most two juz at a sitting.
 */
export function catchUpPortion(state: KhatmState, owed: number, reservedTo?: number): PageRange | null {
  const skipped = skippedRuns(state)[0];
  if (skipped) return { from: skipped[0], to: Math.min(skipped[1], skipped[0] + MAX_PAGES_A_DAY - 1) };
  if (owed <= 0) return null;
  let start = frontOf(state) + 1;
  if (reservedTo !== undefined) start = Math.max(start, orderOf(state, reservedTo) + 1);
  if (start >= QURAN_PAGES) return null;
  const from = pageAt(state, start);
  let to = from;
  while (to - from + 1 < Math.min(owed, MAX_PAGES_A_DAY) && to < QURAN_PAGES && !state.read.has(to + 1)) to++;
  return { from, to };
}

/** Pages a day needed from `key` on to finish the current khatm inside its month. */
export function paceFor(state: KhatmState, key: string): number {
  // pages skipped behind the front are caught up apart; the pace covers what lies ahead
  const ahead = QURAN_PAGES - 1 - frontOf(state);
  const left = ahead > 0 ? ahead : QURAN_PAGES - state.read.size;
  const elapsed = state.startKey ? Math.max(0, daysBetween(paceStart(state.startKey), key)) : 0;
  const daysLeft = Math.max(1, KHATM_DAYS - elapsed);
  return Math.min(MAX_PAGES_A_DAY, Math.max(1, Math.ceil(left / daysLeft)));
}

/**
 * The next portion: from the first unread page (cyclically from where the
 * khatm began), as many pages as the pace asks — stopping at a page already
 * read or at the end of the mushaf, so a portion is always one unbroken run.
 */
export function nextPortion(state: KhatmState, key: string): PageRange {
  const pace = paceFor(state, key);
  // continue after the furthest page read; skipped pages wait in the catch-up
  let from = state.startPage;
  const front = frontOf(state);
  let found = false;
  for (let i = front + 1; i < QURAN_PAGES && !found; i++)
    if (!state.read.has(pageAt(state, i))) [from, found] = [pageAt(state, i), true];
  for (let i = 0; i < QURAN_PAGES && !found; i++)
    if (!state.read.has(pageAt(state, i))) [from, found] = [pageAt(state, i), true];
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
  const d = keyDate(paceStart(state.startKey));
  d.setDate(d.getDate() + KHATM_DAYS - 1);
  return d;
}

export interface Owed {
  /** pages owed in all: the missed days, or the skipped pages if more */
  pages: number;
  /** pages unticked as not read, behind the furthest page read */
  skipped: [number, number][];
  /** the reading "Read more now" opens, or null when nothing is owed */
  next: PageRange | null;
  /** owed because days were missed (not only because pages were unticked) */
  missedDays: boolean;
}

/** What `key`'s reader still owes this khatm, beyond the day's own portion. */
export function owedOn(key: string): Owed {
  if (typeof window === "undefined") return { pages: 0, skipped: [], next: null, missedDays: false };
  const state = khatmState();
  const today = tickedOn(key) ? null : storedRange(key);
  const behind = behindBy(state, key, today);
  const skipped = skippedRuns(state);
  const skippedPages = skipped.reduce((n, [a, b]) => n + b - a + 1, 0);
  const pages = Math.max(behind, skippedPages);
  return {
    pages,
    skipped,
    next: pages > 0 ? catchUpPortion(state, behind, today?.to) : null,
    missedDays: behind > skippedPages,
  };
}
