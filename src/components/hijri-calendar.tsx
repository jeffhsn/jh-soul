"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowLeftRight, ChevronLeft, ChevronRight } from "lucide-react";
import { hijriMonthDays, todayKey } from "@/lib/dates";
import { eventsFor, type EventKind } from "@/data/hijri-events";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";

const KIND_COLOR: Record<EventKind, string> = {
  mourning: "#c0666e",
  celebration: "#6db894",
  sacred: "#d9a954",
};

const KIND_LABEL: Record<EventKind, string> = {
  mourning: "mourning",
  celebration: "celebration",
  sacred: "sacred day",
};

export function HijriCalendar() {
  return (
    <main className="mx-auto max-w-xl px-5 pb-24 pt-10 sm:pt-14">
      <header className="flex items-center justify-between gap-3 animate-rise">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-night-line px-3.5 py-1.5 text-xs text-cream-dim transition hover:border-gold-dim hover:text-cream"
        >
          <ArrowLeft className="size-3.5" />
          today&rsquo;s aamal
        </Link>
        <ThemeToggle />
      </header>
      <div className="mt-8">
        <CalendarPanel />
      </div>
      <p className="mt-8 text-center text-[0.7rem] italic text-cream-faint">
        Dates follow the Umm al-Qura calendar — local moon-sighting may differ by a day.
      </p>
    </main>
  );
}

/** Month grid + occasions — embeddable (sidebar on desktop, page on mobile). */
export function CalendarPanel() {
  const [now, setNow] = useState<Date | null>(null);
  // anchor = any Gregorian date inside the displayed Hijri month
  const [anchor, setAnchor] = useState<Date | null>(null);
  // which day numbers the grid shows; the hover tooltip shows the other
  const [calMode, setCalMode] = useState<"hijri" | "gregorian">("hijri");
  useEffect(() => {
    const d = new Date();
    setNow(d);
    setAnchor(d);
    try {
      if (localStorage.getItem("da:calmode") === "gregorian")
        setCalMode("gregorian");
    } catch {}
  }, []);

  function flipMode() {
    setCalMode((m) => {
      const next = m === "hijri" ? "gregorian" : "hijri";
      try {
        localStorage.setItem("da:calmode", next);
      } catch {}
      return next;
    });
  }

  const days = useMemo(() => (anchor ? hijriMonthDays(anchor) : []), [anchor]);

  if (!now || !anchor || days.length === 0) {
    return <p className="py-10 text-center font-display text-cream-dim">﷽</p>;
  }

  const month = days[0].hijri;
  const todayK = todayKey(now);
  const firstWeekday = days[0].date.getDay();
  const monthEvents = days.flatMap(({ date, hijri }) =>
    eventsFor(hijri.month, hijri.day).map((e) => ({ e, date, hijri })),
  );

  const fmt = (d: Date) =>
    d.toLocaleDateString("en", { day: "numeric", month: "short" });
  const range = `${fmt(days[0].date)} — ${fmt(days[days.length - 1].date)}`;

  function shiftMonth(dir: -1 | 1) {
    const edge = new Date(
      dir === -1 ? days[0].date : days[days.length - 1].date,
    );
    edge.setDate(edge.getDate() + dir); // one day past the month boundary
    if (dir === -1) edge.setDate(edge.getDate() - 14); // land safely inside prev month
    setAnchor(edge);
  }

  return (
    <div>
      {/* month header */}
      <div className="flex items-center justify-between">
        <button
          aria-label="Previous month"
          onClick={() => shiftMonth(-1)}
          className="grid size-8 place-items-center rounded-full text-cream-faint transition hover:text-gold-bright"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="text-center">
          <h2 className="font-display text-[1.35rem] tracking-tight">
            {month.monthName}{" "}
            <span className="text-gold-dim">{month.year}</span>
          </h2>
          <p className="mt-0.5 text-[0.72rem] italic text-cream-faint">{range}</p>
          <button
            onClick={flipMode}
            className="mx-auto mt-1.5 flex items-center gap-1 rounded-full border border-night-line px-2.5 py-0.5 text-[0.65rem] text-cream-faint transition hover:border-gold-dim hover:text-cream-dim"
          >
            <ArrowLeftRight className="size-3" />
            {calMode === "hijri" ? "show Gregorian days" : "show Hijri days"}
          </button>
        </div>
        <button
          aria-label="Next month"
          onClick={() => shiftMonth(1)}
          className="grid size-8 place-items-center rounded-full text-cream-faint transition hover:text-gold-bright"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {/* grid — bare numbers, no boxes */}
      <div className="mt-5 grid grid-cols-7 gap-y-1 text-center">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span
            key={i}
            className="pb-2 text-[0.62rem] uppercase tracking-[0.18em] text-cream-faint"
          >
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
              title={evts.length ? evts.map((e) => e.title).join(" · ") : undefined}
              className="group relative flex flex-col items-center"
            >
              {/* subtle hover tooltip: the same day in the other calendar */}
              <span className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full border border-night-line bg-night-card px-2.5 py-1 text-[0.68rem] text-cream-dim opacity-0 shadow-[0_6px_18px_rgba(0,0,0,0.3)] transition-opacity duration-150 group-hover:opacity-100">
                {calMode === "hijri"
                  ? date.toLocaleDateString("en", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })
                  : `${date.toLocaleDateString("en", { weekday: "short" })}, ${hijri.day} ${month.monthName}`}
              </span>
              <span
                className={cn(
                  "grid size-9 place-items-center rounded-full font-display text-[0.95rem] leading-none transition",
                  isToday
                    ? "bg-gold text-night shadow-[0_0_14px_rgba(220,175,94,0.4)]"
                    : evts.length
                      ? "text-cream"
                      : "text-cream-faint",
                )}
              >
                {calMode === "hijri" ? hijri.day : date.getDate()}
              </span>
              <span className="flex h-1.5 items-center gap-0.5">
                {evts.slice(0, 3).map((e, i) => (
                  <span
                    key={i}
                    className="size-1 rounded-full"
                    style={{ background: KIND_COLOR[e.kind] }}
                  />
                ))}
              </span>
            </div>
          );
        })}
      </div>

      {/* occasions — quiet timeline */}
      <div className="mt-6">
        <div className="hairline mb-1 opacity-50" />
        {monthEvents.length === 0 ? (
          <p className="py-3 text-sm italic text-cream-dim">
            No major recorded occasions this month.
          </p>
        ) : (
          <ul>
            {monthEvents.map(({ e, date, hijri }, i) => {
              const isToday = todayKey(date) === todayK;
              return (
                <li
                  key={i}
                  className={cn(
                    "flex gap-3.5 py-3",
                    i < monthEvents.length - 1 &&
                      "border-b border-night-line-soft/50",
                  )}
                >
                  <span
                    className={cn(
                      "w-7 shrink-0 pt-0.5 text-right font-display text-[1.15rem] leading-none",
                      isToday ? "text-gold-bright" : "text-cream-dim",
                    )}
                  >
                    {hijri.day}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[0.85rem] leading-snug text-cream">
                      {e.title}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-[0.68rem] text-cream-faint">
                      <span
                        className="size-1.5 rounded-full"
                        style={{ background: KIND_COLOR[e.kind] }}
                      />
                      {KIND_LABEL[e.kind]} · {fmt(date)}
                      {isToday && (
                        <span className="text-gold-bright">· today</span>
                      )}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
