"use client";

import { useEffect, useMemo, useState } from "react";
import { Flame } from "lucide-react";
import { aamalForDay, TIME_LABELS, type Amal, type TimeOfDay, type Weekday } from "@/data";
import { gregorianDate, hijriDate, todayKey } from "@/lib/dates";
import { computeStreak, recordDayTotal, useDone } from "@/lib/store";
import { AmalCard } from "./amal-card";
import { FocusView } from "./focus-view";
import { ProgressRing } from "./progress-ring";

const TIME_SECTIONS: TimeOfDay[] = ["morning", "afternoon", "any", "evening", "night"];

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
        <p className="text-center font-display text-cream-dim">
          ﷽
        </p>
      </main>
    );
  }
  return <DayContent now={now} />;
}

function DayContent({ now }: { now: Date }) {
  const date = todayKey(now);
  const weekday = now.getDay() as Weekday;
  const aamal = useMemo(() => aamalForDay(weekday), [weekday]);
  const [done, setDone] = useDone(date);
  const [openId, setOpenId] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);

  const completed = aamal.filter((a) => done[a.id]).length;
  const total = aamal.length;
  const allDone = total > 0 && completed === total;

  useEffect(() => {
    recordDayTotal(date, total);
  }, [date, total]);
  useEffect(() => {
    setStreak(computeStreak());
  }, [done]);

  const open = openId ? aamal.find((a) => a.id === openId) ?? null : null;

  const sections = TIME_SECTIONS.map((t) => ({
    time: t,
    items: aamal.filter((a) => a.timeOfDay === t),
  })).filter((s) => s.items.length > 0);

  let cardIndex = 0;

  return (
    <main className="mx-auto max-w-xl px-5 pb-28 pt-10 sm:pt-14">
      {/* header */}
      <header className="animate-rise">
        <p className="text-center font-arabic text-xl text-gold/90 animate-glow-pulse">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>
        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[1.7rem] leading-tight tracking-tight">
              {gregorianDate(now)}
            </h1>
            <p className="mt-1 text-sm italic text-cream-dim">{hijriDate(now)}</p>
            {streak > 0 && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-night-line px-2.5 py-0.5 text-xs text-gold-bright">
                <Flame className="size-3.5" />
                {streak}-day streak
              </p>
            )}
          </div>
          <ProgressRing value={completed} max={total} size={72}>
            <span className="font-display text-sm text-cream">
              {completed}
              <span className="text-cream-faint">/{total}</span>
            </span>
          </ProgressRing>
        </div>
        <div className="hairline mt-6" />
      </header>

      {allDone && (
        <div className="mt-8 rounded-2xl border border-gold-dim/40 bg-night-card p-6 text-center animate-rise">
          <p className="font-arabic text-2xl text-gold-bright">
            تَقَبَّلَ اللَّهُ أَعْمَالَكُمْ
          </p>
          <p className="mt-2 font-display text-lg">May Allah accept your deeds.</p>
          <p className="mt-1 text-sm italic text-cream-dim">
            Today&rsquo;s aamal are complete. Rest with a peaceful heart.
          </p>
        </div>
      )}

      {/* sections */}
      {sections.map((section) => {
        const pending = section.items.filter((a) => !done[a.id]);
        const finished = section.items.filter((a) => done[a.id]);
        const ordered = [...pending, ...finished];
        return (
          <section key={section.time} className="mt-9">
            <div className="mb-3 flex items-center gap-3">
              <h2 className="font-display text-[0.78rem] uppercase tracking-[0.22em] text-gold-dim">
                {TIME_LABELS[section.time]}
              </h2>
              <div className="hairline flex-1 opacity-40" />
              <span className="text-[0.72rem] text-cream-faint">
                {finished.length}/{section.items.length}
              </span>
            </div>
            <div className="space-y-2.5">
              {ordered.map((amal) => (
                <AmalCard
                  key={amal.id}
                  amal={amal}
                  done={!!done[amal.id]}
                  index={cardIndex++}
                  onOpen={() => setOpenId(amal.id)}
                  onToggle={(v) => setDone(amal.id, v)}
                />
              ))}
            </div>
          </section>
        );
      })}

      <footer className="mt-16 text-center text-xs text-cream-faint">
        <div className="hairline mb-6 opacity-40" />
        <p className="italic">
          &ldquo;Verily in the remembrance of Allah do hearts find rest.&rdquo; — Qur&rsquo;an 13:28
        </p>
      </footer>

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
