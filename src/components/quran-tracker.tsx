"use client";

import { useSyncExternalStore } from "react";
import { BookOpenText } from "lucide-react";
import { QURAN_PAGES } from "@/data/quran-daily";
import { aamalKey } from "@/lib/aamal-day";
import { useT } from "@/lib/i18n";
import { khatmDeadline, khatmState, owedOn, paceFor, type Owed } from "@/lib/khatm";
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
}

const EMPTY: QuranProgress = {
  khatms: 0,
  into: 0,
  pages: 0,
  days: 0,
  pace: 2,
  deadline: 0,
  owed: { pages: 0, skipped: [], next: null },
};
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
    deadline: deadline ? deadline.getTime() : 0,
  };
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
  const { khatms, into, pages, days, pace, deadline, owed } = useQuranProgress();
  const percent = (into / QURAN_PAGES) * 100;
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

        {/* the way to the next completion */}
        <div className="mt-5 border-t border-night-line-soft pt-4">
          <div className="flex items-baseline justify-between gap-3 text-[0.78rem]">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-cream-dim">
              <BookOpenText className="size-3.5 text-gold-dim" />
              {khatms === 0 ? t("reader.quran.firstKhatm") : t("reader.quran.khatmN", { n: khatms + 1 })}
            </span>
            <span className="whitespace-nowrap tabular-nums text-cream-faint">
              {t("reader.quran.progress", { into, total: QURAN_PAGES })}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-night-line-soft">
            <div
              className="h-full rounded-full bg-gold transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* pages owed: missed days and unticked pages, caught up on any day */}
        {owed.pages > 0 && owed.next && (
          <div className="relative mt-4 border-t border-night-line-soft pt-4">
            <div className="flex items-baseline justify-between gap-3 text-[0.78rem]">
              <span className="text-cream-dim">{t("reader.quran.owed")}</span>
              <span className="tabular-nums text-gold-bright">
                {t("reader.quran.pages", { count: owed.pages })}
              </span>
            </div>
            <p className="mt-1.5 text-[0.72rem] leading-snug text-cream-faint">
              {t(owed.skipped.length ? "reader.quran.owedFromSkipped" : "reader.quran.owedFrom")}
            </p>
            {owed.skipped.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {owed.skipped.slice(0, 8).map((run) => (
                  <button
                    key={run[0]}
                    onClick={() => openCatchUp({ from: run[0], to: Math.min(run[1], run[0] + 39) })}
                    className="rounded-full border border-night-line px-2.5 py-1 text-[0.7rem] tabular-nums text-cream-dim transition hover:border-gold-dim hover:text-gold-bright"
                  >
                    {runLabel(run)}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => openCatchUp(owed.next!)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-gold-dim/60 py-2.5 text-[0.82rem] text-gold-bright transition hover:border-gold hover:bg-night-raise active:scale-[0.99]"
            >
              <BookOpenText className="size-3.5" />
              {t("reader.quran.readNow", { count: owed.next.to - owed.next.from + 1 })}
              <span className="tabular-nums text-cream-faint">· {runLabel([owed.next.from, owed.next.to])}</span>
            </button>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-night-line-soft pt-4">
          <Stat label={t("reader.quran.daysRead")} value={String(days)} />
          <Stat label={t("reader.quran.pagesRead")} value={String(pages)} />
        </div>

        <p className="mt-4 text-[0.72rem] italic leading-snug text-cream-dim">
          {days === 0 || !deadline
            ? t("reader.quran.intro")
            : t("reader.quran.pace", { count: pace, date: deadlineText })}
        </p>
      </div>
    </section>
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
