"use client";

import { useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import type { CounterPhase } from "@/data";
import { useCountState } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * A digital misbaha that behaves like the real thing: beads hang on a sagging
 * string; the current bead sits large under your thumb in the middle; each tap
 * flicks it to the pile on the left with a spring. 34 / 33 / 33, each phase
 * with its own bead material.
 */
export function TasbihBeads({
  amalId,
  date,
  phases,
  onComplete,
}: {
  amalId: string;
  date: string;
  phases: CounterPhase[];
  onComplete: () => void;
}) {
  const [state, setState] = useCountState(amalId, date);
  const doneRef = useRef(false);
  const phase = phases[Math.min(state.phase, phases.length - 1)];
  const finished = state.phase >= phases.length;
  const totalAll = useMemo(() => phases.reduce((s, p) => s + p.count, 0), [phases]);
  const doneAll =
    phases.slice(0, Math.min(state.phase, phases.length)).reduce((s, p) => s + p.count, 0) +
    (finished ? 0 : state.count);

  function vibrate(pattern: number | number[]) {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {}
    }
  }

  function tap() {
    if (finished) return;
    vibrate(12);
    const nextCount = state.count + 1;
    if (nextCount >= phase.count) {
      const nextPhase = state.phase + 1;
      setState({ phase: nextPhase, count: 0 });
      vibrate([20, 40, 20]);
      if (nextPhase >= phases.length && !doneRef.current) {
        doneRef.current = true;
        setTimeout(onComplete, 1100);
      }
    } else {
      setState({ phase: state.phase, count: nextCount });
    }
  }

  return (
    <div className="flex select-none flex-col items-center">
      {/* phase phrase */}
      <div className="min-h-[7.5rem] text-center" key={finished ? "done" : state.phase}>
        {finished ? (
          <>
            <p className="arabic-text animate-rise text-3xl text-gold-bright">
              تَقَبَّلَ اللَّهُ
            </p>
            <p className="mt-2 text-sm italic text-cream-dim">
              Tasbih complete — may it be accepted.
            </p>
          </>
        ) : (
          <>
            <p className="arabic-text animate-rise text-4xl text-cream">{phase.phrase.ar}</p>
            <p className="mt-2 text-sm italic text-sage/85">{phase.phrase.tr}</p>
            <p className="mt-0.5 text-[0.82rem] text-cream-dim">{phase.phrase.en}</p>
          </>
        )}
      </div>

      {/* the strand */}
      <button
        onClick={tap}
        disabled={finished}
        aria-label="Pass one bead"
        className="relative mt-2 block h-[230px] w-full max-w-md touch-manipulation overflow-hidden outline-none"
      >
        <Strand
          count={finished ? phases[phases.length - 1].count : phase.count}
          value={finished ? phases[phases.length - 1].count : state.count}
          phase={finished ? phases.length - 1 : state.phase}
          finished={finished}
        />
        {/* count, under the strand */}
        <div className="pointer-events-none absolute inset-x-0 bottom-1 flex items-baseline justify-center gap-1.5">
          <span
            key={finished ? "fin" : state.count}
            className="animate-bead-pop font-display text-5xl tabular-nums text-cream"
          >
            {finished ? "✓" : state.count}
          </span>
          {!finished && (
            <span className="text-sm text-cream-faint">/ {phase.count}</span>
          )}
        </div>
      </button>

      {!finished && (
        <p className="mt-3 text-[0.78rem] uppercase tracking-[0.2em] text-cream-faint">
          tap to pass a bead
        </p>
      )}

      {/* phase pips + overall progress */}
      <div className="mt-5 flex items-center gap-2">
        {phases.map((p, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all duration-500",
              i < state.phase
                ? "w-8 bg-gold"
                : i === state.phase && !finished
                  ? "w-8 bg-gold/40"
                  : "w-4 bg-night-line",
            )}
          />
        ))}
      </div>
      <p className="mt-2 text-[0.72rem] tabular-nums text-cream-faint">
        {Math.min(doneAll, totalAll)} / {totalAll}
      </p>

      <button
        onClick={() => {
          doneRef.current = false;
          setState({ phase: 0, count: 0 });
        }}
        className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-night-line px-3.5 py-1.5 text-xs text-cream-faint transition hover:text-cream-dim"
      >
        <RotateCcw className="size-3" />
        start over
      </button>
    </div>
  );
}

/** Bead materials per phase: [highlight, base, shadow, glow] */
const MATERIALS = [
  { hi: "#f4dCA0", base: "#d9a954", lo: "#7a5a22", glow: "rgba(217,169,84,0.5)" }, // amber — Allahu Akbar
  { hi: "#c8e8db", base: "#7fb8a4", lo: "#3c6a59", glow: "rgba(127,184,164,0.45)" }, // jade — Alhamdulillah
  { hi: "#f0c9ae", base: "#c98d6b", lo: "#7a4a30", glow: "rgba(201,141,107,0.45)" }, // clay — SubhanAllah
];

const W = 440; // logical width
const CENTER = W / 2;

/** y along the sagging string for a given x */
function sag(x: number) {
  const d = (x - CENTER) / CENTER; // -1 … 1
  return 92 + 46 * (1 - d * d); // parabola, lowest at center
}

function Strand({
  count,
  value,
  phase,
  finished,
}: {
  count: number;
  value: number;
  phase: number;
  finished: boolean;
}) {
  const m = MATERIALS[phase % MATERIALS.length];
  const [uid] = useState(() => Math.random().toString(36).slice(2, 8));

  // position of bead i given how many are passed
  function place(i: number) {
    if (finished || i < value) {
      // passed pile, most recent nearest center-left
      const k = value - 1 - i; // 0 = just passed
      const x = Math.max(34, CENTER - 92 - k * 16);
      return { x, y: sag(x), s: 1, o: k > 11 ? 0 : 1 - k * 0.055, z: 40 - k };
    }
    if (i === value) {
      // current bead, big, at the lowest point
      return { x: CENTER, y: sag(CENTER), s: 1.65, o: 1, z: 60 };
    }
    // waiting, climbing up to the right
    const k = i - value; // 1 = next
    const x = CENTER + 76 + (k - 1) * 34;
    return { x, y: sag(x), s: 1, o: x > W - 20 ? 0 : 1 - k * 0.09, z: 40 - k };
  }

  // string path through the sag
  const stringD = useMemo(() => {
    const pts: string[] = [];
    for (let x = 12; x <= W - 12; x += 16) pts.push(`${x} ${sag(x)}`);
    return "M " + pts.join(" L ");
  }, []);

  return (
    <div className="absolute inset-0">
      {/* string */}
      <svg viewBox={`0 0 ${W} 230`} className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <linearGradient id={`str-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#1d3338" stopOpacity="0" />
            <stop offset="0.12" stopColor="#2c4a50" />
            <stop offset="0.88" stopColor="#2c4a50" />
            <stop offset="1" stopColor="#1d3338" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={stringD} fill="none" stroke={`url(#str-${uid})`} strokeWidth="2.5" />
      </svg>

      {/* glow under the current bead */}
      {!finished && (
        <div
          className="absolute size-24 rounded-full transition-all duration-300"
          style={{
            left: `${((CENTER - 48) / W) * 100}%`,
            top: sag(CENTER) - 24,
            background: `radial-gradient(circle, ${m.glow}, transparent 65%)`,
            filter: "blur(6px)",
          }}
        />
      )}

      {/* beads */}
      {Array.from({ length: count }, (_, i) => {
        const p = place(i);
        const passed = finished || i < value;
        const current = !finished && i === value;
        return (
          <div
            key={i}
            className="absolute size-9 rounded-full will-change-transform"
            style={{
              left: `${(p.x / W) * 100}%`,
              top: p.y,
              transform: `translate(-50%, -50%) scale(${p.s})`,
              opacity: p.o,
              zIndex: p.z,
              transition:
                "left 0.42s cubic-bezier(0.34,1.45,0.5,1), top 0.42s cubic-bezier(0.34,1.45,0.5,1), transform 0.42s cubic-bezier(0.34,1.45,0.5,1), opacity 0.4s ease, background 0.3s ease",
              background: passed || current
                ? `radial-gradient(circle at 33% 28%, ${m.hi}, ${m.base} 52%, ${m.lo} 100%)`
                : `radial-gradient(circle at 33% 28%, #2a444a, #17282c 55%, #0d181b 100%)`,
              boxShadow: current
                ? `0 6px 18px rgba(0,0,0,0.5), 0 0 22px ${m.glow}, inset 0 -3px 6px rgba(0,0,0,0.35)`
                : passed
                  ? `0 3px 8px rgba(0,0,0,0.45), inset 0 -2px 4px rgba(0,0,0,0.3)`
                  : `0 2px 6px rgba(0,0,0,0.4), inset 0 -2px 4px rgba(0,0,0,0.45)`,
              border: passed || current ? "none" : "1px solid #223a40",
            }}
          >
            {/* specular highlight */}
            <span
              className="absolute rounded-full"
              style={{
                left: "24%",
                top: "16%",
                width: "26%",
                height: "20%",
                background: "rgba(255,255,255,0.5)",
                filter: "blur(1.5px)",
                opacity: passed || current ? 0.7 : 0.18,
              }}
            />
            {/* string hole hint */}
            <span
              className="absolute left-1/2 top-1/2 size-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ background: "rgba(0,0,0,0.35)" }}
            />
          </div>
        );
      })}
    </div>
  );
}
