"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Flame, Sunrise } from "lucide-react";
import { aamalForDay, type Weekday } from "@/data";
import { eventsFor } from "@/data/hijri-events";
import { gregorianDate, hijriDate, hijriParts, todayKey } from "@/lib/dates";
import { CalendarPanel } from "./hijri-calendar";
import { ContributionGraph } from "./contribution-graph";
import { PrayerTimes } from "./prayer-times";
import { computeStreak, recordDayTotal, useDone } from "@/lib/store";
import { AmalCard } from "./amal-card";
import { FocusView } from "./focus-view";
import { ProgressRing } from "./progress-ring";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

export function DailyView() {
  // resolve "today" on the client only, to avoid SSR/client date mismatch
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  if (!now) {
    return (
      <main className="mx-auto max-w-xl px-5 py-16">
        <div className="hairline mb-8" />
        <p className="text-center font-display text-cream-dim">﷽</p>
      </main>
    );
  }
  return <DayContent now={now} />;
}

function DayContent({ now }: { now: Date }) {
  // offset in days from today; 0 = today
  const [offset, setOffset] = useState(0);
  const viewed = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    return d;
  }, [now, offset]);

  const date = todayKey(viewed);
  const isToday = offset === 0;
  const weekday = viewed.getDay() as Weekday;
  const aamal = useMemo(() => aamalForDay(weekday), [weekday]);
  const [done, setDone] = useDone(date);
  const [openId, setOpenId] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);

  const completed = aamal.filter((a) => done[a.id]).length;
  const total = aamal.length;
  const totalMinutes = aamal.reduce((s, a) => s + a.minutes, 0);
  const remainingMinutes = aamal
    .filter((a) => !done[a.id])
    .reduce((s, a) => s + a.minutes, 0);
  const allDone = total > 0 && completed === total;

  useEffect(() => {
    // only stamp real today — browsing other days must not affect streaks
    if (isToday) recordDayTotal(date, total);
  }, [isToday, date, total]);
  useEffect(() => {
    setStreak(computeStreak());
  }, [done]);

  const hp = hijriParts(viewed);
  const todaysEvents = eventsFor(hp.month, hp.day);

  const open = openId ? aamal.find((a) => a.id === openId) ?? null : null;
  const pending = aamal.filter((a) => !done[a.id]);
  const finished = aamal.filter((a) => done[a.id]);
  const ordered = [...pending, ...finished];

  return (
    <main className="mx-auto max-w-xl px-5 pb-28 pt-10 sm:pt-14 lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-14 xl:max-w-[88rem] xl:grid-cols-[300px_minmax(0,1fr)_400px]">
      {/* activity heatmap — left rail on wide screens */}
      <aside className="hidden xl:sticky xl:top-10 xl:block xl:rounded-3xl xl:border xl:border-night-line-soft xl:bg-night-raise/40 xl:p-6 animate-rise">
        <ContributionGraph refresh={done} />
      </aside>

      <div className="min-w-0">
      {/* header */}
      <header className="animate-rise">
        <p className="text-center font-arabic text-xl text-gold/90 animate-glow-pulse">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>

        {/* day navigation */}
        <div className="mt-6 flex items-center justify-between gap-2">
          <button
            aria-label="Previous day"
            onClick={() => setOffset((o) => o - 1)}
            className="grid size-8 shrink-0 place-items-center rounded-full border border-night-line text-cream-dim transition hover:border-gold-dim hover:text-cream sm:size-9"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="flex flex-1 items-center justify-center gap-1 sm:gap-2">
            {DAY_LETTERS.map((letter, d) => {
              // the strip always shows the week containing the *viewed* day
              const dayDate = new Date(viewed);
              dayDate.setDate(dayDate.getDate() + (d - viewed.getDay()));
              const dayOffset = offset + (d - viewed.getDay());
              const selected = d === viewed.getDay();
              const isTodayDot = dayOffset === 0;
              return (
                <button
                  key={d}
                  aria-label={`View ${dayDate.toDateString()}`}
                  onClick={() => setOffset(dayOffset)}
                  className={
                    "flex size-9 flex-col items-center justify-center rounded-full leading-none transition sm:size-10 " +
                    (selected
                      ? "bg-gold font-semibold text-night shadow-[0_0_12px_rgba(217,169,84,0.35)]"
                      : isTodayDot
                        ? "border border-gold-dim/60 text-gold-bright"
                        : "border border-night-line text-cream-faint hover:text-cream-dim")
                  }
                >
                  <span className="text-[0.6rem] uppercase opacity-70">{letter}</span>
                  <span className="mt-0.5 text-[0.78rem] tabular-nums">
                    {dayDate.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            aria-label="Next day"
            onClick={() => setOffset((o) => o + 1)}
            className="grid size-8 shrink-0 place-items-center rounded-full border border-night-line text-cream-dim transition hover:border-gold-dim hover:text-cream sm:size-9"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[1.7rem] leading-tight tracking-tight">
              {isToday ? "Today" : gregorianDate(viewed)}
            </h1>
            <p className="mt-1 text-sm italic text-cream-dim">
              {isToday && <>{gregorianDate(viewed)} · </>}
              {hijriDate(viewed)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {streak > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-night-line px-2.5 py-0.5 text-xs text-gold-bright">
                  <Flame className="size-3.5" />
                  {streak}-day streak
                </span>
              )}
              <Link
                href="/calendar"
                className="inline-flex items-center gap-1.5 rounded-full border border-night-line px-2.5 py-0.5 text-xs text-cream-dim transition hover:border-gold-dim hover:text-cream lg:hidden"
              >
                <CalendarDays className="size-3.5" />
                calendar
              </Link>
              {!isToday && (
                <button
                  onClick={() => setOffset(0)}
                  className="rounded-full border border-gold-dim/50 px-2.5 py-0.5 text-xs text-gold-bright transition hover:border-gold"
                >
                  ← back to today
                </button>
              )}
            </div>
          </div>
          <ProgressRing value={completed} max={total} size={72}>
            <span className="font-display text-sm text-cream">
              {completed}
              <span className="text-cream-faint">/{total}</span>
            </span>
          </ProgressRing>
        </div>
        {/* occasions on this day */}
        {todaysEvents.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {todaysEvents.map((e, i) => (
              <Link
                key={i}
                href="/calendar"
                className="flex items-start gap-2.5 rounded-2xl border border-night-line-soft bg-night-raise/50 px-3.5 py-2.5 transition hover:border-gold-dim/50"
              >
                <span
                  className="mt-1.5 size-2 shrink-0 rounded-full"
                  style={{
                    background:
                      e.kind === "mourning"
                        ? "#c0666e"
                        : e.kind === "celebration"
                          ? "#7fb8a4"
                          : "#d9a954",
                  }}
                />
                <span className="text-[0.85rem] leading-snug text-cream-dim">
                  {e.title}
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* prayer times for the viewed day */}
        <PrayerTimes date={viewed} />

        <div className="hairline mt-6" />
      </header>

      {allDone ? (
        <div className="mt-8 rounded-2xl border border-gold-dim/40 bg-night-card p-6 text-center animate-rise">
          <p className="font-arabic text-2xl text-gold-bright">
            تَقَبَّلَ اللَّهُ أَعْمَالَكُمْ
          </p>
          <p className="mt-2 font-display text-lg">May Allah accept your deeds.</p>
          <p className="mt-1 text-sm italic text-cream-dim">
            {isToday
              ? "Today's session is complete. Go into your day with a light heart."
              : "This day's session was completed."}
          </p>
        </div>
      ) : (
        /* one-sitting banner */
        <div className="mt-8 flex items-center gap-3 rounded-2xl border border-night-line-soft bg-night-raise/60 px-4 py-3 animate-rise">
          <Sunrise className="size-4 shrink-0 text-gold" />
          <p className="text-[0.85rem] leading-snug text-cream-dim">
            <span className="text-cream">One sitting, after Fajr.</span>{" "}
            {completed > 0 ? (
              <>~{remainingMinutes} min left of {totalMinutes}.</>
            ) : (
              <>The whole session is about {totalMinutes} minutes.</>
            )}
          </p>
        </div>
      )}

      {/* the session — one flat block, in recitation order */}
      <section className="mt-6">
        <div className="space-y-2.5">
          {ordered.map((amal, i) => (
            <AmalCard
              key={amal.id}
              amal={amal}
              done={!!done[amal.id]}
              index={i}
              onOpen={() => setOpenId(amal.id)}
              onToggle={(v) => setDone(amal.id, v)}
            />
          ))}
        </div>
      </section>

      {/* activity heatmap — inline below the list on smaller screens */}
      <div className="mt-12 rounded-3xl border border-night-line-soft bg-night-raise/40 p-5 xl:hidden">
        <ContributionGraph refresh={done} />
      </div>

      <footer className="mt-16 text-center text-xs text-cream-faint">
        <div className="hairline mb-6 opacity-40" />
        <p className="italic">
          &ldquo;Verily in the remembrance of Allah do hearts find rest.&rdquo; — Qur&rsquo;an 13:28
        </p>
      </footer>
      </div>

      {/* always-visible calendar on wide screens */}
      <aside className="hidden lg:sticky lg:top-10 lg:block lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto lg:rounded-3xl lg:border lg:border-night-line-soft lg:bg-night-raise/40 lg:p-6 animate-rise">
        <CalendarPanel />
        <p className="mt-5 text-center text-[0.65rem] italic text-cream-faint">
          Umm al-Qura dates — moon-sighting may differ by a day.
        </p>
      </aside>

      {open && (
        <FocusView
          amal={open}
          date={date}
          done={!!done[open.id]}
          onClose={() => setOpenId(null)}
          onDone={(v) => {
            setDone(open.id, v);
            if (v) setOpenId(null);
          }}
        />
      )}
    </main>
  );
}
