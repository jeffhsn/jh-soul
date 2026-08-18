"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { hijriMonthDays, hijriParts, todayKey } from "@/lib/dates";
import { eventsFor, type EventKind } from "@/data/hijri-events";
import { cn } from "@/lib/utils";

const KIND_COLOR: Record<EventKind, string> = {
  mourning: "#c0666e",
  celebration: "#7fb8a4",
  sacred: "#d9a954",
};

const KIND_LABEL: Record<EventKind, string> = {
  mourning: "mourning",
  celebration: "celebration",
  sacred: "sacred day",
};

export function HijriCalendar() {
  const [now, setNow] = useState<Date | null>(null);
  // anchor = any Gregorian date inside the displayed Hijri month
  const [anchor, setAnchor] = useState<Date | null>(null);
  useEffect(() => {
    const d = new Date();
    setNow(d);
    setAnchor(d);
  }, []);

  const days = useMemo(() => (anchor ? hijriMonthDays(anchor) : []), [anchor]);

  if (!now || !anchor || days.length === 0) {
    return (
      <main className="mx-auto max-w-xl px-5 py-16">
        <p className="text-center font-display text-cream-dim">﷽</p>
      </main>
    );
  }

  const month = days[0].hijri;
  const todayK = todayKey(now);
  const firstWeekday = days[0].date.getDay();
  const monthEvents = days
    .flatMap(({ date, hijri }) =>
      eventsFor(hijri.month, hijri.day).map((e) => ({ e, date, hijri })),
    );

  function shiftMonth(dir: -1 | 1) {
    const edge = new Date(
      dir === -1 ? days[0].date : days[days.length - 1].date,
    );
    edge.setDate(edge.getDate() + dir); // one day past the month boundary
    if (dir === -1) edge.setDate(edge.getDate() - 14); // land safely inside prev month
    setAnchor(edge);
  }

  return (
    <main className="mx-auto max-w-xl px-5 pb-24 pt-10 sm:pt-14">
      <header className="animate-rise">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-night-line px-3.5 py-1.5 text-xs text-cream-dim transition hover:border-gold-dim hover:text-cream"
          >
            <ArrowLeft className="size-3.5" />
            today&rsquo;s aamal
          </Link>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <button
            aria-label="Previous month"
            onClick={() => shiftMonth(-1)}
            className="grid size-9 place-items-center rounded-full border border-night-line text-cream-dim transition hover:border-gold-dim hover:text-cream"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="text-center">
            <h1 className="font-display text-2xl tracking-tight">
              {month.monthName}
            </h1>
            <p className="mt-0.5 text-sm italic text-cream-dim">
              {month.year} AH
            </p>
          </div>
          <button
            aria-label="Next month"
            onClick={() => shiftMonth(1)}
            className="grid size-9 place-items-center rounded-full border border-night-line text-cream-dim transition hover:border-gold-dim hover:text-cream"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <div className="hairline mt-6" />
      </header>

      {/* grid */}
      <div className="mt-6 grid grid-cols-7 gap-1 text-center">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i} className="pb-1 text-[0.68rem] uppercase tracking-wider text-cream-faint">
            {d}
          </span>
        ))}
        {Array.from({ length: firstWeekday }, (_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {days.map(({ date, hijri }) => {
          const isToday = todayKey(date) === todayK;
          const evts = eventsFor(hijri.month, hijri.day);
          return (
            <div
              key={hijri.day}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-xl border transition",
                isToday
                  ? "border-gold bg-gold/10 shadow-[0_0_14px_rgba(217,169,84,0.2)]"
                  : evts.length
                    ? "border-night-line bg-night-card"
                    : "border-night-line-soft/60",
              )}
            >
              <span
                className={cn(
                  "font-display text-[1.05rem] leading-none",
                  isToday ? "text-gold-bright" : "text-cream",
                )}
              >
                {hijri.day}
              </span>
              <span className="mt-0.5 text-[0.58rem] text-cream-faint">
                {date.getDate()}/{date.getMonth() + 1}
              </span>
              {evts.length > 0 && (
                <span className="absolute bottom-1.5 flex gap-0.5">
                  {evts.slice(0, 3).map((e, i) => (
                    <span
                      key={i}
                      className="size-1.5 rounded-full"
                      style={{ background: KIND_COLOR[e.kind] }}
                    />
                  ))}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* events this month */}
      <section className="mt-8">
        <div className="mb-3 flex items-center gap-3">
          <h2 className="font-display text-[0.78rem] uppercase tracking-[0.22em] text-gold-dim">
            This month
          </h2>
          <div className="hairline flex-1 opacity-40" />
        </div>
        {monthEvents.length === 0 ? (
          <p className="text-sm italic text-cream-dim">
            No major recorded occasions this month.
          </p>
        ) : (
          <ul className="space-y-2">
            {monthEvents.map(({ e, date, hijri }, i) => {
              const isToday = todayKey(date) === todayK;
              return (
                <li
                  key={i}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border px-4 py-3",
                    isToday
                      ? "border-gold-dim/60 bg-night-card"
                      : "border-night-line-soft bg-night-raise/50",
                  )}
                >
                  <span
                    className="mt-1.5 size-2 shrink-0 rounded-full"
                    style={{ background: KIND_COLOR[e.kind] }}
                  />
                  <div className="min-w-0">
                    <p className="text-[0.92rem] leading-snug text-cream">{e.title}</p>
                    <p className="mt-0.5 text-[0.72rem] text-cream-faint">
                      {hijri.day} {month.monthName} · {date.toLocaleDateString("en", { day: "numeric", month: "short" })}
                      {" · "}
                      <span style={{ color: KIND_COLOR[e.kind] }}>{KIND_LABEL[e.kind]}</span>
                      {isToday && <span className="text-gold-bright"> · today</span>}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-6 text-center text-[0.7rem] italic text-cream-faint">
          Dates follow the Umm al-Qura calendar — local moon-sighting may differ by a day.
        </p>
      </section>
    </main>
  );
}
