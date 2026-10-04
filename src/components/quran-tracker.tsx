"use client";

import { useSyncExternalStore } from "react";
import { BookOpenText } from "lucide-react";
import { QURAN_PAGES } from "@/data/quran-daily";
import { aamalKey } from "@/lib/aamal-day";
import { useT } from "@/lib/i18n";
import { khatmDeadline, khatmState, owedOn, paceFor, portionFor, skippedRuns, type Owed } from "@/lib/khatm";
import { cn } from "@/lib/utils";
import type { PageRange } from "@/data/quran-daily";
import { subscribe } from "@/lib/store";

interface QuranProgress {
  khatms: number;
  /** pages read in the current khatm */
  into: number;
  /** pages read overall, and the days they were read on */
  pages: number;
  days: number;
  /** pages a day that finish the current khatm inside its month */
  pace: number;
  /** when that month ends (ms since epoch) — 0 before the first day */
  deadline: number;
  /** pages owed from missed days or unticked pages, and the reading that catches up */
  owed: Owed;
  /** the current khatm juz by juz: pages read of the juz, and whether any were missed behind the front */
  juz: { read: number; size: number; missed: [number, number] | null; today: boolean }[];
}

const EMPTY: QuranProgress = {
  khatms: 0,
  into: 0,
  pages: 0,
  days: 0,
  pace: 2,
  deadline: 0,
  owed: { pages: 0, skipped: [], next: null, missedDays: false },
  juz: [],
};

/** Juz n of the 604-page mushaf: juz 1 is pages 1–21, each later one 20 pages from (n-1)*20 + 2. */
const juzRange = (n: number): [number, number] => [n === 1 ? 1 : (n - 1) * 20 + 2, n === 30 ? 604 : n * 20 + 1];
let cache: QuranProgress = EMPTY;
let cacheSig = "";

/** Derived entirely from the ticked days — see src/lib/khatm.ts. */
function compute(): QuranProgress {
  if (typeof window === "undefined") return EMPTY;
  const state = khatmState();
  const deadline = khatmDeadline(state);
  return {
    khatms: state.khatms,
    into: state.read.size,
    pages: state.pages,
    days: state.days,
    pace: paceFor(state, aamalKey()),
    owed: owedOn(aamalKey()),
    juz: juzMap(state, aamalKey()),
    deadline: deadline ? deadline.getTime() : 0,
  };
}

function juzMap(state: ReturnType<typeof khatmState>, key: string): QuranProgress["juz"] {
  const skipped = skippedRuns(state);
  const today = portionFor(key, key);
  return Array.from({ length: 30 }, (_, i) => {
    const [a, b] = juzRange(i + 1);
    let read = 0;
    for (let p = a; p <= b; p++) if (state.read.has(p)) read++;
    const hole = skipped.find(([x, y]) => x <= b && y >= a);
    return {
      read,
      size: b - a + 1,
      missed: hole ? [Math.max(hole[0], a), Math.min(hole[1], b)] : null,
      today: today.from <= b && today.to >= a,
    };
  });
}

function useQuranProgress(): QuranProgress {
  return useSyncExternalStore(
    subscribe,
    () => {
      const next = compute();
      const sig = JSON.stringify(next);
      if (sig !== cacheSig) {
        cacheSig = sig;
        cache = next;
      }
      return cache;
    },
    () => EMPTY,
  );
}

/** Changes whenever reading progress does — lets the day view re-derive its portion. */
/** Pages owed and the catch-up reading, for the day's reader. */
export function useQuranOwed(): Owed {
  return useQuranProgress().owed;
}

/** Open a catch-up reading (handled by the day view, which owns the reader). */
export function openCatchUp(range: PageRange) {
  window.dispatchEvent(new CustomEvent<PageRange>("da:catch-up", { detail: range }));
}

export function useQuranVersion(): string {
  const p = useQuranProgress();
  return `${p.khatms}:${p.into}:${p.days}`;
}

/** How many times the Quran has been completed — sibling of the Sadaqa panel. */
export function QuranPanel() {
  const { t, intl } = useT();
  const { khatms, into, pages, days, pace, deadline, owed, juz } = useQuranProgress();
  const runLabel = ([a, b]: [number, number]) =>
    a === b ? t("reader.quran.run", { a }) : t("reader.quran.runRange", { a, b });
  const deadlineText = deadline
    ? new Date(deadline).toLocaleDateString(intl, { day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h3 className="font-display text-[0.78rem] uppercase tracking-[0.22em] text-gold-dim rtl:normal-case rtl:tracking-normal">
          {t("reader.quran.heading")}
        </h3>
        <div className="hairline flex-1 opacity-40" />
        <span className="font-arabic text-base leading-none text-gold-bright/80">
          خَتْمُ ٱلْقُرْآنِ
        </span>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-night-line-soft bg-night-card px-5 py-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-10 -top-10 size-36 rounded-full opacity-60 blur-2xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--color-gold) 28%, transparent), transparent 70%)",
          }}
        />
        <p className="text-[0.7rem] uppercase tracking-[0.18em] text-cream-faint rtl:normal-case rtl:tracking-normal">
          {t("reader.quran.completed")}
        </p>
        <p className="mt-1.5 flex items-baseline gap-2">
          <span className="font-display text-[2.4rem] leading-none tabular-nums text-gold-bright">
            {khatms}
          </span>
          <span className="font-display text-[1.05rem] text-cream-dim">
            {t("reader.quran.times", { count: khatms })}
          </span>
        </p>

        {/* the khatm map: 30 juz, gold as they are read, marked where pages were missed */}
        <div className="mt-5 border-t border-night-line-soft pt-4">
          <div className="flex items-baseline justify-between gap-3 text-[0.78rem]">
            <span className="inline-flex items-center gap-1.5 text-cream-dim">
              <BookOpenText className="size-3.5 shrink-0 text-gold-dim" />
              {khatms === 0 ? t("reader.quran.firstKhatm") : t("reader.quran.khatmN", { n: khatms + 1 })}
            </span>
            <span className="whitespace-nowrap tabular-nums text-cream-faint">
              {t("reader.quran.progress", { into, total: QURAN_PAGES })}
            </span>
          </div>
          <div className="mt-2.5 grid grid-cols-10 gap-1" role="list" aria-label={t("reader.quran.map")}>
            {juz.map((j, i) => {
              const share = j.read / j.size;
              const label = `${t("reader.quran.juz", { n: i + 1 })} · ${t("reader.quran.progress", { into: j.read, total: j.size })}${j.missed ? ` · ${t("reader.quran.legendMissed")}` : ""}`;
              const cell = (
                <span
                  className={cn(
                    "relative block h-3.5 overflow-hidden rounded-[3px] bg-night-line-soft",
                    j.today && "ring-1 ring-gold/80 ring-offset-1 ring-offset-night-card",
                    j.missed && "outline outline-1 outline-offset-1 outline-[#e39a7a]",
                  )}
                >
                  <span className="absolute inset-y-0 start-0 bg-gold" style={{ width: `${share * 100}%` }} />
                </span>
              );
              return j.missed ? (
                <button
                  key={i}
                  role="listitem"
                  title={label}
                  aria-label={label}
                  onClick={() => openCatchUp({ from: j.missed![0], to: j.missed![1] })}
                  className="block py-1 active:scale-90"
                >
                  {cell}
                </button>
              ) : (
                <span key={i} role="listitem" title={label} aria-label={label} className="block py-1">
                  {cell}
                </span>
              );
            })}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.66rem] text-cream-faint">
            <Legend swatch="bg-gold" label={t("reader.quran.legendRead")} />
            <Legend swatch="ring-1 ring-gold/80 bg-night-line-soft" label={t("reader.quran.legendToday")} />
            {juz.some((j) => j.missed) && (
              <Legend swatch="outline outline-1 outline-[#e39a7a] bg-night-line-soft" label={t("reader.quran.legendMissed")} />
            )}
          </div>
        </div>

        {/* where you stand: on track, or behind — with the one thing to do about it */}
        <div className="mt-4 border-t border-night-line-soft pt-4">
          {owed.pages > 0 && owed.next ? (
            <>
              <p className="font-display text-[1.02rem] leading-snug text-gold-bright">
                {t("reader.quran.behind", { count: owed.pages })}
              </p>
              <p className="mt-1 text-[0.74rem] leading-snug text-cream-faint">
                {t(
                  !owed.missedDays
                    ? "reader.quran.owedSkippedOnly"
                    : owed.skipped.length
                      ? "reader.quran.owedFromSkipped"
                      : "reader.quran.owedFrom",
                )}
              </p>
              <button
                onClick={() => openCatchUp(owed.next!)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-2.5 font-display text-[0.9rem] text-night shadow-[0_0_18px_rgba(220,175,94,0.2)] transition hover:bg-gold-bright active:scale-[0.99]"
              >
                <BookOpenText className="size-4" />
                {t("reader.quran.readNow", { count: owed.next.to - owed.next.from + 1 })}
              </button>
              <p className="mt-1.5 text-center text-[0.68rem] tabular-nums text-cream-faint">
                {runLabel([owed.next.from, owed.next.to])}
              </p>
            </>
          ) : (
            <p className="text-[0.8rem] leading-snug text-cream-dim">
              <span className="text-sage">{t("reader.quran.onTrack")}</span>
              {days > 0 && deadline ? ` · ${t("reader.quran.paceShort", { count: pace, date: deadlineText })}` : ""}
            </p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-night-line-soft pt-4">
          <Stat label={t("reader.quran.daysRead")} value={String(days)} />
          <Stat label={t("reader.quran.pagesRead")} value={String(pages)} />
        </div>

        {(days === 0 || !deadline) && (
          <p className="mt-4 text-[0.72rem] italic leading-snug text-cream-dim">{t("reader.quran.intro")}</p>
        )}
      </div>
    </section>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("inline-block size-2.5 rounded-[2px]", swatch)} />
      {label}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[0.62rem] uppercase tracking-[0.16em] text-cream-faint rtl:normal-case rtl:tracking-normal">
        {label}
      </p>
      <p className="mt-0.5 truncate font-display text-[1.05rem] tabular-nums text-cream">
        {value}
      </p>
    </div>
  );
}
