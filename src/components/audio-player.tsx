"use client";

import { useEffect, useRef, useState } from "react";
import { CirclePlay, Pause, Play } from "lucide-react";
import type { AudioSource } from "@/data";
import { cn } from "@/lib/utils";

/**
 * Plays the preferred source first (Ali Fani when available) with the rest as
 * selectable fallbacks. mp3 → native audio with custom controls;
 * youtube → lightweight embed that only loads the iframe on tap.
 */
export function AudioPlayer({ sources }: { sources: AudioSource[] }) {
  const [active, setActive] = useState(0);
  const source = sources[active];

  // disambiguate pills when the same reciter appears more than once
  const labels = sources.map((s, i) => {
    if (sources.filter((o) => o.reciter === s.reciter).length === 1)
      return s.reciter;
    const hint = s.title.match(/\(([^)]+)\)/)?.[1];
    if (hint) return `${s.reciter} · ${hint}`;
    const nth = sources.slice(0, i + 1).filter((o) => o.reciter === s.reciter).length;
    return `${s.reciter} · ${nth}`;
  });

  return (
    <div className="rounded-2xl border border-night-line bg-night-card/70 p-4">
      {sources.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {sources.map((s, i) => (
            <button
              key={s.url}
              onClick={() => setActive(i)}
              className={cn(
                "rounded-full border px-3 py-1 text-[0.72rem] transition",
                i === active
                  ? "border-gold-dim/70 text-gold-bright"
                  : "border-night-line text-cream-faint hover:text-cream-dim",
              )}
            >
              {labels[i]}
            </button>
          ))}
        </div>
      )}
      {source.kind === "mp3" ? (
        <Mp3Player key={source.url} source={source} />
      ) : (
        <YouTubePlayer key={source.url} source={source} />
      )}
    </div>
  );
}

function formatTime(s: number) {
  if (!isFinite(s)) return "–:––";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function Mp3Player({ source }: { source: AudioSource }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onTime = () => setTime(el.currentTime);
    const onMeta = () => setDuration(el.duration);
    const onEnd = () => setPlaying(false);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("ended", onEnd);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("ended", onEnd);
    };
  }, []);

  return (
    <div className="flex items-center gap-4">
      <audio ref={ref} src={source.url} preload="metadata" />
      <button
        aria-label={playing ? "Pause" : "Play"}
        onClick={() => {
          const el = ref.current;
          if (!el) return;
          if (playing) el.pause();
          else void el.play();
          setPlaying(!playing);
        }}
        className="grid size-11 shrink-0 place-items-center rounded-full bg-gold text-night shadow-[0_0_18px_rgba(217,169,84,0.3)] transition hover:bg-gold-bright"
      >
        {playing ? (
          <Pause className="size-4" fill="currentColor" />
        ) : (
          <Play className="size-4 translate-x-[1px]" fill="currentColor" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.82rem] text-cream">{source.title}</p>
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={time}
          onChange={(e) => {
            const el = ref.current;
            if (el) el.currentTime = Number(e.target.value);
          }}
          className="mt-1.5 h-1 w-full cursor-pointer appearance-none rounded-full bg-night-line accent-[var(--color-gold)]"
        />
        <div className="mt-1 flex justify-between text-[0.68rem] text-cream-faint">
          <span>{formatTime(time)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}

function YouTubePlayer({ source }: { source: AudioSource }) {
  const [loaded, setLoaded] = useState(false);
  const id = source.url;

  if (!loaded) {
    return (
      <button
        onClick={() => setLoaded(true)}
        className="group relative block w-full overflow-hidden rounded-xl border border-night-line"
        aria-label={`Play ${source.title}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
          alt=""
          className="aspect-video w-full object-cover opacity-70 transition group-hover:opacity-90"
        />
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-14 place-items-center rounded-full bg-night/80 text-gold-bright backdrop-blur transition group-hover:scale-105">
            <CirclePlay className="size-6" />
          </span>
        </span>
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-night/90 to-transparent px-4 pb-3 pt-8 text-left text-[0.8rem] text-cream">
          {source.title}
        </span>
      </button>
    );
  }

  return (
    <iframe
      className="aspect-video w-full rounded-xl border border-night-line"
      src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
      title={source.title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
}
