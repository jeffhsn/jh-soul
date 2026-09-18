"use client";

import { useSyncExternalStore } from "react";
import { BookOpenText } from "lucide-react";
import { QURAN_PAGES } from "@/data/quran-daily";
import { aamalKey } from "@/lib/aamal-day";
import { khatmDeadline, khatmState, paceFor } from "@/lib/khatm";
import { subscribe } from "@/lib/store";

interface QuranProgress {
  khatms: number;
  /** pages read in the current khatm */
  into: number;
  /** pages read overall, and the days they were read on */
  pages: number;
  days: number;
  /** pages a day that finish the current khatm inside its year */
  pace: number;
  /** when that year ends, as text — empty before the first day */
  deadline: string;
}

const EMPTY: QuranProgress = { khatms: 0, into: 0, pages: 0, days: 0, pace: 2, deadline: "" };
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
    deadline: deadline
      ? deadline.toLocaleDateString("en", { day: "numeric", month: "long", year: "numeric" })
      : "",
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
export function useQuranVersion(): string {
  const p = useQuranProgress();
  return `${p.khatms}:${p.into}:${p.days}`;
}

/** How many times the Quran has been completed — sibling of the Sadaqa panel. */
export function QuranPanel() {
  const { khatms, into, pages, days, pace, deadline } = useQuranProgress();
  const percent = (into / QURAN_PAGES) * 100;

  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h3 className="font-display text-[0.78rem] uppercase tracking-[0.22em] text-gold-dim">
          Quran
        </h3>
        <div className="hairline flex-1 opacity-40" />
        <span className="font-arabic text-base leading-none text-gold-bright/80">
          خَتْمُ ٱلْقُرْآنِ
        </span>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-night-line-soft bg-night-card px-5 py-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full opacity-60 blur-2xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--color-gold) 28%, transparent), transparent 70%)",
          }}
        />
        <p className="text-[0.7rem] uppercase tracking-[0.18em] text-cream-faint">
          Completed
        </p>
        <p className="mt-1.5 flex items-baseline gap-2">
          <span className="font-display text-[2.4rem] leading-none tabular-nums text-gold-bright">
            {khatms}
          </span>
          <span className="font-display text-[1.05rem] text-cream-dim">
            {khatms === 1 ? "time" : "times"}
          </span>
        </p>

        {/* the way to the next completion */}
        <div className="mt-5 border-t border-night-line-soft pt-4">
          <div className="flex items-baseline justify-between gap-3 text-[0.78rem]">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-cream-dim">
              <BookOpenText className="size-3.5 text-gold-dim" />
              {khatms === 0 ? "First khatm" : `Khatm ${khatms + 1}`}
            </span>
            <span className="whitespace-nowrap tabular-nums text-cream-faint">
              {into}/{QURAN_PAGES} pages
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-night-line-soft">
            <div
              className="h-full rounded-full bg-gold transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-night-line-soft pt-4">
          <Stat label="Days read" value={String(days)} />
          <Stat label="Pages read" value={String(pages)} />
        </div>

        <p className="mt-4 text-[0.72rem] italic leading-snug text-cream-dim">
          {days === 0 || !deadline
            ? "Tick the Daily Quran Portion — it continues from where you stop, and every page adds up here."
            : `At ${pace} ${pace === 1 ? "page" : "pages"} a day this khatm completes by ${deadline}. A missed day is made up, never skipped.`}
        </p>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[0.62rem] uppercase tracking-[0.16em] text-cream-faint">{label}</p>
      <p className="mt-0.5 truncate font-display text-[1.05rem] tabular-nums text-cream">
        {value}
      </p>
    </div>
  );
}
