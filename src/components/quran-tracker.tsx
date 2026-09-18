"use client";

import { useSyncExternalStore } from "react";
import { BookOpenText } from "lucide-react";
import { QURAN_PAGES, quranPagesFor } from "@/data/quran-daily";
import { subscribe } from "@/lib/store";

interface QuranProgress {
  /** mushaf pages read in total — the sum of every ticked daily portion */
  pages: number;
  /** days on which the portion was ticked */
  days: number;
}

const EMPTY: QuranProgress = { pages: 0, days: 0 };
let cache: QuranProgress = EMPTY;

/**
 * Nothing extra is stored: every `da:done:<date>` that holds "quran-daily" is
 * a day's portion read, and the portion's size follows from the date.
 */
function compute(): QuranProgress {
  if (typeof window === "undefined") return EMPTY;
  let pages = 0;
  let days = 0;
  const prefix = "da:done:";
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith(prefix)) continue;
    const m = key.slice(prefix.length).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) continue;
    try {
      const done = JSON.parse(window.localStorage.getItem(key) ?? "{}");
      if (!done["quran-daily"]) continue;
    } catch {
      continue;
    }
    pages += quranPagesFor(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
    days++;
  }
  return { pages, days };
}

function useQuranProgress(): QuranProgress {
  return useSyncExternalStore(
    subscribe,
    () => {
      const next = compute();
      if (next.pages !== cache.pages || next.days !== cache.days) cache = next;
      return cache;
    },
    () => EMPTY,
  );
}

/** How many times the Quran has been completed — sibling of the Sadaqa panel. */
export function QuranPanel() {
  const { pages, days } = useQuranProgress();
  const khatms = Math.floor(pages / QURAN_PAGES);
  const into = pages % QURAN_PAGES;
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
          {days === 0
            ? "Tick the Daily Quran Portion — every page adds up here."
            : "The best of you is the one who learns the Quran and teaches it."}
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
