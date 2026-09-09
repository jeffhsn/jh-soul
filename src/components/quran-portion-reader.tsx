"use client";

import { useEffect, useRef, useState } from "react";
import type { AudioSource } from "@/data";
import { cn } from "@/lib/utils";
import { PlaylistPlayer } from "./audio-player";

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
}: {
  refs: VerseRef[];
  audio: AudioSource[];
  date: string;
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
                  "w-full rounded-2xl border px-4 py-3 text-left transition",
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
