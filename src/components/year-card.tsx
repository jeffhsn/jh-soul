"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight, Sparkles, X } from "lucide-react";
import { allAamal } from "@/data";
import { aamalDate } from "@/lib/aamal-day";
import { hijriParts, todayKey } from "@/lib/dates";
import { emit, stamp, subscribe } from "@/lib/store";
import { yearSummary, yearsWithData } from "@/lib/year";
import { formatAmount } from "./sadaqa-entry";

const titles = new Map(allAamal.map((a) => [a.id, a.title]));
const dayFmt = new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric" });
const keyDate = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
};

/** The Hijri year just ended, during the first month of the next one — else null. */
function justEnded(): number | null {
  const h = hijriParts(aamalDate());
  return h.month === 1 ? h.year - 1 : null;
}

/**
 * Your year: each Hijri year summed up — kept for good. During Muharram the
 * year just ended opens first; the arrows step through every year with data.
 */
export function YearCard({ refresh }: { refresh?: unknown }) {
  const years = useMemo(() => {
    void refresh;
    return typeof window === "undefined" ? [] : yearsWithData();
  }, [refresh]);
  const ended = justEnded();
  const [picked, setPicked] = useState<number | null>(null);
  const year = picked ?? (ended && years.includes(ended) ? ended : years[0]);
  const s = useMemo(() => {
    void refresh;
    return year ? yearSummary(year) : null;
  }, [year, refresh]);
  if (!year || !s) return null;

  const i = years.indexOf(year);
  const today = todayKey(aamalDate());
  const running = s.to >= today;
  const sadaqa = s.sadaqaCents / 100;

  return (
    <section id="your-year" className="scroll-mt-6">
      <div className="mb-3 flex items-center gap-3">
        <h3 className="font-display text-[0.78rem] uppercase tracking-[0.22em] text-gold-dim">Your year</h3>
        <div className="hairline flex-1 opacity-40" />
        <span className="font-arabic text-base leading-none text-gold-bright/80">حَصَادُ ٱلْعَامِ</span>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-night-line-soft bg-night-card px-4 py-5 sm:px-5">
        <div className="flex items-center justify-between gap-2">
          <button
            aria-label="Earlier year"
            disabled={i >= years.length - 1}
            onClick={() => setPicked(years[i + 1])}
            className="grid size-9 shrink-0 place-items-center rounded-full text-cream-dim transition hover:text-gold-bright disabled:opacity-25"
          >
            <ChevronLeft className="rtl:-scale-x-100 size-4" />
          </button>
          <div className="min-w-0 text-center">
            <p className="font-display text-[1.6rem] leading-none tabular-nums text-gold-bright">{year} AH</p>
            <p className="mt-1 text-[0.68rem] text-cream-faint">
              {dayFmt.format(keyDate(s.from))} – {dayFmt.format(keyDate(s.to))}
            </p>
          </div>
          <button
            aria-label="Later year"
            disabled={i <= 0}
            onClick={() => setPicked(years[i - 1])}
            className="grid size-9 shrink-0 place-items-center rounded-full text-cream-dim transition hover:text-gold-bright disabled:opacity-25"
          >
            <ChevronRight className="rtl:-scale-x-100 size-4" />
          </button>
        </div>

        <p className="mt-4 text-center text-[0.86rem] leading-snug text-cream-dim">
          {s.present === 0
            ? running
              ? "This year's page is still blank — every day you show up is written here."
              : "Nothing was kept this year."
            : `${s.present} ${s.present === 1 ? "day" : "days"} of remembrance${running ? " so far" : ""}.`}
        </p>

        {s.present > 0 && (
          <>
            <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-night-line-soft pt-4 sm:grid-cols-3">
              <Stat label="Whole days" value={String(s.perfect)} />
              <Stat label="Longest run" value={`${s.longestStreak} ${s.longestStreak === 1 ? "day" : "days"}`} />
              <Stat label="Khatms" value={String(s.khatms)} />
              <Stat label="Quran pages" value={s.quranPages.toLocaleString("en")} />
              <Stat label="Qada days" value={String(s.qada)} />
              <Stat label="Sadaqa" value={s.sadaqaDays ? formatAmount(sadaqa) : "—"} />
            </div>
            {s.top.length > 0 && (
              <p className="mt-4 border-t border-night-line-soft pt-3 text-[0.74rem] leading-snug text-cream-faint">
                Most kept:{" "}
                <span className="text-cream-dim">{s.top.map(([id]) => titles.get(id) ?? id).join(" · ")}</span>
              </p>
            )}
          </>
        )}

        <p className="mt-4 text-[0.7rem] italic leading-snug text-cream-faint">
          {running
            ? `On ${dayFmt.format(keyDate(s.to))} this year closes: its days are wrapped into this summary, kept for good, and a fresh year begins.`
            : "This year is wrapped up — kept for good as this summary."}
        </p>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[0.6rem] uppercase tracking-[0.14em] text-cream-faint">{label}</p>
      <p className="mt-0.5 truncate font-display text-[1rem] tabular-nums text-cream">{value}</p>
    </div>
  );
}

const SEEN = (y: number) => `da:yearseen:${y}`;

/**
 * During Muharram, one quiet line on the list: the year that just ended is
 * waiting in "Your year". Dismissed once, gone on every device.
 */
export function YearNudge({ onOpen }: { onOpen: () => void }) {
  const ended = justEnded();
  const seen = useSyncExternalStore(
    subscribe,
    () => (ended ? window.localStorage.getItem(SEEN(ended)) === "1" : true),
    () => true,
  );
  const present = useMemo(() => (ended && !seen ? yearSummary(ended).present : 0), [ended, seen]);
  if (!ended || seen || present === 0) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(SEEN(ended!), "1");
      stamp(SEEN(ended!));
    } catch {}
    emit();
  }

  return (
    <div className="mb-6 flex items-center gap-2 rounded-2xl border border-gold-dim/40 bg-night-card px-4 py-3">
      <Sparkles className="size-4 shrink-0 text-gold" />
      <button onClick={onOpen} className="min-w-0 flex-1 text-start text-[0.84rem] leading-snug text-cream-dim">
        <span className="text-gold-bright">{ended} AH is complete.</span> See your year — {present} days of
        remembrance.
      </button>
      <button aria-label="Dismiss" onClick={dismiss} className="grid size-8 shrink-0 place-items-center text-cream-faint">
        <X className="size-4" />
      </button>
    </div>
  );
}

