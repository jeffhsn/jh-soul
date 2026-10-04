"use client";

import { useEffect, useRef, useState } from "react";
import type { AudioSource } from "@/data";
import { cn } from "@/lib/utils";
import { PlaylistPlayer } from "./audio-player";
import { openCatchUp, useQuranOwed } from "./quran-tracker";

interface VerseRef {
  surah: number;
  ayah: number;
  name: string;
}

interface VerseText {
  ar: string;
  tr: string;
  en: string;
}

/**
 * Fetch the portion's verses (Uthmani Arabic, transliteration, Sahih
 * International) from api.alquran.cloud — the app's Quran text source —
 * and cache the assembled lines per day.
 */
async function fetchPortionText(
  refs: VerseRef[],
  dateKey: string,
): Promise<VerseText[]> {
  const cacheKey = `da:qtext:${dateKey}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {}

  const surahs = [...new Set(refs.map((r) => r.surah))];
  const bySurah = new Map<number, Record<number, VerseText>>();
  await Promise.all(
    surahs.map(async (s) => {
      const res = await fetch(
        `https://api.alquran.cloud/v1/surah/${s}/editions/quran-uthmani,en.transliteration,en.sahih`,
      );
      const json = await res.json();
      if (json.code !== 200) throw new Error("bad response");
      const [ar, tr, en] = json.data;
      const map: Record<number, VerseText> = {};
      interface ApiAyah { numberInSurah: number; text: string }
      (ar.ayahs as ApiAyah[]).forEach((a, i) => {
        map[a.numberInSurah] = {
          ar: a.text,
          tr: tr.ayahs[i]?.text ?? "",
          en: en.ayahs[i]?.text ?? "",
        };
      });
      bySurah.set(s, map);
    }),
  );

  const lines = refs.map(
    (r) => bySurah.get(r.surah)?.[r.ayah] ?? { ar: "", tr: "", en: "" },
  );
  try {
    localStorage.setItem(cacheKey, JSON.stringify(lines));
  } catch {}
  return lines;
}

/**
 * Read-along view of the daily Quran portion: the recitation plays verse
 * by verse while the matching ayah is highlighted and kept in view.
 * Tapping a verse jumps the recitation to it.
 */
export function QuranPortionReader({
  refs,
  audio,
  date,
  pages,
  skip = [],
  onSkip,
  catchUpHint = false,
}: {
  refs: VerseRef[];
  audio: AudioSource[];
  date: string;
  /** the portion's pages, ticked one by one: untick what wasn't read */
  pages?: { from: number; to: number };
  skip?: number[];
  onSkip?: (skip: number[]) => void;
  /** the day's own portion: offer the catch-up when pages are owed */
  catchUpHint?: boolean;
}) {
  const [verses, setVerses] = useState<VerseText[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [current, setCurrent] = useState(0);
  const [showTr, setShowTr] = useState(true);
  const [showEn, setShowEn] = useState(true);
  const listRef = useRef<HTMLOListElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetchPortionText(refs, date)
      .then((v) => !cancelled && setVerses(v))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [refs, date]);

  // keep the recited ayah in view (but don't yank the scroll on open)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    listRef.current?.children[current]?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  }, [current]);

  return (
    <div>
      {/* the player follows you down the page */}
      <div
        className="sticky -top-7 z-10 pb-3 pt-1"
        style={{ backgroundColor: "var(--color-night-raise)" }}
      >
        <PlaylistPlayer sources={audio} index={current} onIndexChange={setCurrent} />
      </div>

      <div className="mb-5 mt-3 flex items-center justify-end gap-2 text-[0.72rem]">
        <TogglePill on={showTr} onClick={() => setShowTr((v) => !v)}>
          transliteration
        </TogglePill>
        <TogglePill on={showEn} onClick={() => setShowEn((v) => !v)}>
          translation
        </TogglePill>
      </div>

      {failed ? (
        <p className="rounded-2xl border border-night-line-soft bg-night-raise/50 px-4 py-3 text-[0.9rem] text-cream-dim">
          Couldn&rsquo;t load the verses right now — check your connection. The
          recitation above still plays, and the Al-Islam.org links below open
          the passage to read.
        </p>
      ) : !verses ? (
        <p className="py-6 text-center text-[0.85rem] italic text-cream-faint">
          loading today&rsquo;s verses…
        </p>
      ) : (
        <ol ref={listRef} className="space-y-3">
          {refs.map((r, i) => (
            <li key={`${r.surah}:${r.ayah}`}>
              <button
                onClick={() => setCurrent(i)}
                className={cn(
                  "w-full rounded-2xl border px-4 py-3 text-start transition",
                  i === current
                    ? "border-gold-dim/60 bg-night-card shadow-[0_0_18px_rgba(220,175,94,0.12)]"
                    : "border-transparent hover:border-night-line-soft",
                )}
              >
                <p
                  className={cn(
                    "text-[0.7rem] uppercase tracking-wider",
                    i === current ? "text-gold-bright" : "text-gold-dim",
                  )}
                >
                  {r.name} · {r.ayah}
                </p>
                <p className="arabic-text mt-1.5 text-[1.55rem] text-cream">
                  {verses[i].ar}
                </p>
                {showTr && verses[i].tr && (
                  <p className="mt-1.5 text-[0.86rem] italic leading-relaxed text-sage/85">
                    {verses[i].tr}
                  </p>
                )}
                {showEn && verses[i].en && (
                  <p className="mt-1 text-[0.9rem] leading-relaxed text-cream-dim">
                    {verses[i].en}
                  </p>
                )}
              </button>
            </li>
          ))}
        </ol>
      )}

      {pages && onSkip && pages.to > pages.from && (
        <PageTicks pages={pages} skip={skip} onSkip={onSkip} />
      )}
      {catchUpHint && <CatchUpHint />}
    </div>
  );
}

/**
 * One tick per page of the portion, all on: untick a page that wasn't read
 * and it stays owed — it waits in the Quran catch-up instead of being lost.
 */
function PageTicks({
  pages,
  skip,
  onSkip,
}: {
  pages: { from: number; to: number };
  skip: number[];
  onSkip: (skip: number[]) => void;
}) {
  const list: number[] = [];
  for (let p = pages.from; p <= pages.to; p++) list.push(p);
  const off = new Set(skip);
  const read = list.length - off.size;
  return (
    <div className="mt-8 rounded-2xl border border-night-line-soft px-4 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[0.72rem] uppercase tracking-[0.16em] text-gold-dim">Pages read</p>
        <p className="text-[0.75rem] tabular-nums text-cream-faint">
          {read} of {list.length}
        </p>
      </div>
      <p className="mt-1.5 text-[0.78rem] leading-snug text-cream-faint">
        Didn&rsquo;t get through all of it? Untick the pages you didn&rsquo;t read — they wait for you as
        pages owed, nothing is lost.
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {list.map((p) => {
          const on = !off.has(p);
          return (
            <button
              key={p}
              aria-pressed={on}
              onClick={() => onSkip(on ? [...skip, p] : skip.filter((x) => x !== p))}
              className={cn(
                "min-w-11 rounded-lg border px-2 py-1.5 text-[0.78rem] tabular-nums transition active:scale-95",
                on
                  ? "border-gold-dim/70 text-gold-bright"
                  : "border-night-line text-cream-faint line-through decoration-cream-faint/60",
              )}
            >
              {p}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Under the day's portion: pages owed from missed days, read now if there is time. */
function CatchUpHint() {
  const owed = useQuranOwed();
  if (!owed.next || owed.pages <= 0) return null;
  const n = owed.next.to - owed.next.from + 1;
  return (
    <div className="mt-4 rounded-2xl border border-gold-dim/40 bg-night-card px-4 py-4">
      <p className="text-[0.85rem] leading-snug text-cream-dim">
        <span className="text-gold-bright">{owed.pages} {owed.pages === 1 ? "page" : "pages"} owed</span> from
        days you missed. Have more time today? Read on — the coming portions shrink as you catch up.
      </p>
      <button
        onClick={() => openCatchUp(owed.next!)}
        className="mt-3 w-full rounded-xl border border-gold-dim/60 py-2.5 text-[0.85rem] text-gold-bright transition hover:border-gold active:scale-[0.99]"
      >
        Read {n} more {n === 1 ? "page" : "pages"} now
      </button>
    </div>
  );
}

function TogglePill({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 uppercase tracking-wider transition",
        on
          ? "border-gold-dim/70 text-gold-bright"
          : "border-night-line text-cream-faint hover:text-cream-dim",
      )}
    >
      {children}
    </button>
  );
}
