"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Flame,
  ListChecks,
  Sunrise,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { aamalForDay, type Weekday } from "@/data";
import { eventsFor } from "@/data/hijri-events";
import { gregorianDate, hijriDate, hijriParts, todayKey } from "@/lib/dates";
import { CalendarPanel } from "./hijri-calendar";
import { ContributionGraph } from "./contribution-graph";
import { PrayerTimes } from "./prayer-times";
import { computeStreak, recordDayTotal, useDone } from "@/lib/store";
import { AmalCard } from "./amal-card";
import { ProgressRing } from "./progress-ring";
import { ResourcesPanel } from "./resources";
import { SadaqaPanel } from "./sadaqa-entry";
import { Splash } from "./splash";
import { ThemeToggle, ThemeToggleNavItem } from "./theme-toggle";

// the reader dialog (audio players, tasbih beads, counters) is only needed
// once an item is tapped — keep it out of the initial bundle
const FocusView = dynamic(
  () => import("./focus-view").then((m) => m.FocusView),
  { ssr: false },
);

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

export function DailyView() {
  // resolve "today" on the client only, to avoid SSR/client date mismatch
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      {/* splash overlay — stays mounted and fades out, so the first paint
          (the bismillah) remains the page's largest contentful paint */}
      <div
        aria-hidden={!!now}
        className={cn(
          "fixed inset-0 z-[60] grid place-items-center transition-opacity duration-700",
          now && "pointer-events-none opacity-0",
        )}
        style={{ background: "var(--color-night)" }}
      >
        <Splash />
      </div>
      {now && <DayContent now={now} />}
    </>
  );
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
  const aamal = useMemo(() => aamalForDay(weekday, viewed), [weekday, viewed]);
  const [done, setDone] = useDone(date);
  const [openId, setOpenId] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  // phone navigation: the list is the app; calendar and progress are one tap away
  const [tab, setTab] = useState<"today" | "calendar" | "progress">("today");
  function switchTab(next: typeof tab) {
    setTab(next);
    window.scrollTo(0, 0);
  }

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

  // ← / → move day by day (unless typing or the reader is open)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (openId) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)
      )
        return;
      if (e.key === "ArrowLeft") setOffset((o) => o - 1);
      else if (e.key === "ArrowRight") setOffset((o) => o + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId]);

  // swipe left/right anywhere on the day (except the calendar) to change days,
  // mirroring the arrow keys on desktop
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    if ((e.target as HTMLElement).closest("[data-no-swipe]")) {
      touchStart.current = null;
      return;
    }
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    const s = touchStart.current;
    touchStart.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    // decisively horizontal only, so vertical scrolling never changes the day
    if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy)) {
      setOffset((o) => o + (dx < 0 ? 1 : -1));
    }
  }

  const hp = hijriParts(viewed);
  const todaysEvents = eventsFor(hp.month, hp.day);

  const open = openId ? aamal.find((a) => a.id === openId) ?? null : null;
  const pending = aamal.filter((a) => !done[a.id]);
  const finished = aamal.filter((a) => done[a.id]);
  const ordered = [...pending, ...finished];

  // reader navigation: step through the day's list without closing it
  const openIdx = open ? ordered.findIndex((a) => a.id === open.id) : -1;
  function stepReader(delta: 1 | -1) {
    const target = ordered[openIdx + delta];
    if (target) setOpenId(target.id);
  }
  /** After checking an item off, open the next unfinished one (wrapping); close when the day is done. */
  function advanceAfterDone(fromId: string) {
    const i = ordered.findIndex((a) => a.id === fromId);
    const rest = [...ordered.slice(i + 1), ...ordered.slice(0, i)];
    const next = rest.find((a) => !done[a.id]);
    setOpenId(next ? next.id : null);
  }

  const navButton =
    "grid size-9 shrink-0 place-items-center rounded-full border border-night-line text-cream-dim transition hover:border-gold-dim hover:text-cream active:scale-95";

  return (
    <main className="mx-auto max-w-xl px-4 pb-32 pt-8 sm:px-5 sm:pt-14 lg:grid lg:h-dvh lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-14 lg:overflow-hidden lg:pb-0 lg:pt-0 xl:max-w-[88rem] xl:grid-cols-[400px_minmax(0,1fr)_300px]">
      {/* calendar — fixed left rail on wide screens; only the middle column scrolls */}
      <aside className="no-scrollbar scroll-fade hidden xl:block xl:h-dvh xl:overflow-y-auto xl:border-r xl:border-night-line-soft/60 xl:py-12 xl:pr-12 animate-rise">
        <CalendarPanel />
        <p className="mt-6 text-center text-[0.65rem] italic text-cream-faint">
          Umm al-Qura dates — moon-sighting may differ by a day.
        </p>
      </aside>

      {/* phone tabs: calendar and progress live on their own screens */}
      {tab === "calendar" && (
        <div className="animate-rise lg:hidden">
          <CalendarPanel />
          <p className="mt-6 text-center text-[0.7rem] italic text-cream-faint">
            Umm al-Qura dates — moon-sighting may differ by a day.
          </p>
        </div>
      )}
      {tab === "progress" && (
        <div className="animate-rise lg:hidden">
          <SadaqaPanel />
          <div className="mt-10">
            <ContributionGraph refresh={done} />
          </div>
          <div className="mt-10">
            <ResourcesPanel />
          </div>
        </div>
      )}

      <div
        className={cn(
          "no-scrollbar min-w-0 lg:h-dvh lg:overflow-y-auto lg:py-14",
          tab !== "today" && "hidden lg:block",
        )}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
      {/* 1 — what day is it */}
      <header className="animate-rise">
        <p className="text-center font-arabic text-xl text-gold/90 animate-glow-pulse">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>

        {/* week strip — larger screens only; phones use the arrows beside the date */}
        <div className="mt-6 hidden items-center justify-between gap-2 sm:flex">
          <button
            aria-label="Previous day"
            onClick={() => setOffset((o) => o - 1)}
            className={navButton}
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="flex flex-1 items-center justify-center gap-2">
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
                    "flex size-10 shrink-0 flex-col items-center justify-center rounded-full leading-none transition " +
                    (selected
                      ? "on-gold bg-gold font-semibold text-night shadow-[0_0_12px_rgba(220,175,94,0.35)]"
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
            className={navButton}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* the day itself — front and centre */}
        <div className="mt-5 flex items-center gap-2 sm:mt-6">
          <button
            aria-label="Previous day"
            onClick={() => setOffset((o) => o - 1)}
            className={navButton + " sm:hidden"}
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h1 className="font-display text-[1.6rem] leading-tight tracking-tight sm:text-[1.7rem]">
              {isToday ? "Today" : gregorianDate(viewed)}
            </h1>
            <p className="mt-0.5 text-[0.84rem] italic text-cream-dim sm:text-sm">
              {isToday && (
                <span className="whitespace-nowrap">{gregorianDate(viewed)} · </span>
              )}
              <span className="whitespace-nowrap">{hijriDate(viewed)}</span>
            </p>
          </div>
          <button
            aria-label="Next day"
            onClick={() => setOffset((o) => o + 1)}
            className={navButton + " sm:hidden"}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          {streak > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-night-line px-2.5 py-0.5 text-xs text-gold-bright">
              <Flame className="size-3.5" />
              {streak}-day streak
            </span>
          )}
          {!isToday && (
            <button
              onClick={() => setOffset(0)}
              className="rounded-full border border-gold-dim/50 px-2.5 py-0.5 text-xs text-gold-bright transition hover:border-gold"
            >
              ← back to today
            </button>
          )}
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
                          ? "#6db894"
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

        {/* prayer times — one quiet line on phones, tap to expand */}
        <PrayerTimes date={viewed} />

        {/* slim session bar — the list is next, progress lives at the end */}
        <div className="mt-5">
          <div className="h-1 overflow-hidden rounded-full bg-night-line-soft">
            <div
              className="h-full rounded-full bg-gold transition-all duration-500"
              style={{ width: `${total ? (completed / total) * 100 : 0}%` }}
            />
          </div>
          <p className="mt-2 flex items-center justify-between gap-3 text-[0.75rem] text-cream-faint">
            <span className="inline-flex items-center gap-1.5">
              <Sunrise className="size-3.5 text-gold-dim" />
              One sitting, after Fajr
            </span>
            <span className="tabular-nums">
              {completed}/{total}
              {allDone ? " · complete" : completed > 0 ? ` · ~${remainingMinutes} min left` : ` · ~${totalMinutes} min`}
            </span>
          </p>
        </div>
      </header>

      {/* 2 — the session itself, in recitation order */}
      <section className="mt-4">
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

      {/* 3 — progress, the reward at the end */}
      <section className="mt-10">
        {allDone ? (
          <div className="rounded-2xl border border-gold-dim/40 bg-night-card p-6 text-center animate-rise">
            <p className="font-arabic text-2xl text-gold-bright">
              تَقَبَّلَ اللَّهُ أَعْمَالَكُمْ
            </p>
            <p className="mt-2 font-display text-lg">May Allah accept your deeds.</p>
            <p className="mt-1 text-sm italic text-cream-dim">
              {isToday
                ? "Today's session is complete. Go into your day with a light heart."
                : "This day's session was completed."}
            </p>
            {streak > 0 && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-night-line px-3 py-1 text-xs text-gold-bright">
                <Flame className="size-3.5" />
                {streak}-day streak — keep it alight
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-5 rounded-2xl border border-night-line-soft bg-night-card px-5 py-4">
            <ProgressRing value={completed} max={total} size={76}>
              <span className="font-display text-sm text-cream">
                {completed}
                <span className="text-cream-faint">/{total}</span>
              </span>
            </ProgressRing>
            <div className="min-w-0">
              <p className="font-display text-[1.05rem]">
                {isToday ? "Today's progress" : "This day's progress"}
              </p>
              <p className="mt-0.5 text-[0.84rem] leading-snug text-cream-dim">
                {completed === 0
                  ? `Nothing checked yet — the whole session is about ${totalMinutes} minutes.`
                  : `${completed} of ${total} done · ~${remainingMinutes} min to finish.`}
              </p>
            </div>
          </div>
        )}

        {/* consistency heatmap inline on lg two-column; phones have the Progress tab */}
        <div className="mt-10 hidden lg:block xl:hidden">
          <ContributionGraph refresh={done} />
        </div>
      </section>

      <footer className="mt-14 text-center text-xs text-cream-faint">
        <div className="hairline mb-6 opacity-40" />
        <p className="italic">
          &ldquo;Verily in the remembrance of Allah do hearts find rest.&rdquo; — Qur&rsquo;an 13:28
        </p>
      </footer>
      </div>

      {/* right rail: fixed pane — calendar on lg (2-col), heatmap on xl (3-col) */}
      <aside className="no-scrollbar scroll-fade hidden lg:block lg:h-dvh lg:overflow-y-auto lg:border-l lg:border-night-line-soft/60 lg:py-12 lg:pl-12 animate-rise">
        <div className="mb-8 flex justify-end">
          <ThemeToggle />
        </div>
        <div className="mb-10">
          <SadaqaPanel />
        </div>
        <div className="xl:hidden">
          <CalendarPanel />
          <p className="mt-6 text-center text-[0.65rem] italic text-cream-faint">
            Umm al-Qura dates — moon-sighting may differ by a day.
          </p>
        </div>
        <div className="hidden xl:block">
          <ContributionGraph refresh={done} />
        </div>
        {/* optional reading — desktop keeps it in the rail, off the checklist */}
        <div className="mt-10">
          <ResourcesPanel />
        </div>
      </aside>

      {/* phone bottom navigation — the list first, the rest one tap away */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-night-line-soft bg-night-raise/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-xl">
          {(
            [
              { key: "today", label: "Today", Icon: ListChecks },
              { key: "calendar", label: "Calendar", Icon: CalendarDays },
              { key: "progress", label: "Progress", Icon: TrendingUp },
            ] as const
          ).map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => switchTab(key)}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 transition",
                tab === key ? "text-gold-bright" : "text-cream-faint",
              )}
            >
              <Icon className="size-5" />
              <span className="text-[0.68rem] tracking-wide">{label}</span>
            </button>
          ))}
          <ThemeToggleNavItem />
        </div>
      </nav>

      {open && (
        <FocusView
          key={open.id}
          amal={open}
          date={date}
          done={!!done[open.id]}
          step={{ index: openIdx, total: ordered.length }}
          onStep={stepReader}
          onClose={() => setOpenId(null)}
          onDone={(v) => {
            setDone(open.id, v);
            if (v) advanceAfterDone(open.id);
          }}
        />
      )}
    </main>
  );
}
