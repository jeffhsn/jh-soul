"use client";

import { useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import type { CounterPhase } from "@/data";
import { useCountState } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * A digital misbaha. Tap anywhere on the strand to pass one bead.
 * Beads slide along an arc like a real strand; each phase (34/33/33)
 * gets its own bead colour, with a separator bead between phases.
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
  const [justTapped, setJustTapped] = useState(0);
  const doneRef = useRef(false);

  const phase = phases[Math.min(state.phase, phases.length - 1)];
  const finished = state.phase >= phases.length;
  const totalAll = useMemo(() => phases.reduce((s, p) => s + p.count, 0), [phases]);
  const doneAll = useMemo(
    () =>
      phases
        .slice(0, Math.min(state.phase, phases.length))
        .reduce((s, p) => s + p.count, 0) + (finished ? 0 : state.count),
    [phases, state, finished],
  );

  function tap() {
    if (finished) return;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(12);
      } catch {}
    }
    setJustTapped((t) => t + 1);
    const nextCount = state.count + 1;
    if (nextCount >= phase.count) {
      const nextPhase = state.phase + 1;
      setState({ phase: nextPhase, count: 0 });
      if (nextPhase >= phases.length && !doneRef.current) {
        doneRef.current = true;
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          try {
            navigator.vibrate([30, 60, 30]);
          } catch {}
        }
        setTimeout(onComplete, 900);
      }
    } else {
      setState({ phase: state.phase, count: nextCount });
    }
  }

  return (
    <div className="flex select-none flex-col items-center">
      {/* phase phrase */}
      <div className="text-center" key={finished ? "done" : state.phase}>
        {finished ? (
          <>
            <p className="arabic-text text-3xl text-gold-bright">
              تَقَبَّلَ اللَّهُ
            </p>
            <p className="mt-2 text-sm italic text-cream-dim">
              Tasbih complete — may it be accepted.
            </p>
          </>
        ) : (
          <>
            <p className="arabic-text animate-rise text-4xl text-cream">
              {phase.phrase.ar}
            </p>
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
        className="relative mt-8 block w-full max-w-md cursor-pointer touch-manipulation outline-none"
      >
        <BeadStrand
          count={finished ? phases[phases.length - 1].count : phase.count}
          value={finished ? phases[phases.length - 1].count : state.count}
          phase={finished ? phases.length - 1 : state.phase}
          pulse={justTapped}
        />
        {/* big count */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-4">
          <span
            key={finished ? "fin" : state.count}
            className="animate-bead-pop font-display text-6xl tabular-nums text-cream"
          >
            {finished ? "✓" : state.count}
          </span>
          {!finished && (
            <span className="mt-1 text-sm text-cream-faint">of {phase.count}</span>
          )}
        </div>
      </button>

      {!finished && (
        <p className="mt-4 text-[0.78rem] uppercase tracking-[0.2em] text-cream-faint">
          tap the beads
        </p>
      )}

      {/* phase pips + overall progress */}
      <div className="mt-6 flex items-center gap-2">
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

const PHASE_COLORS = [
  { fill: "#d9a954", glow: "rgba(217,169,84,0.55)" }, // gold — Allahu Akbar
  { fill: "#7fb8a4", glow: "rgba(127,184,164,0.5)" }, // sage — Alhamdulillah
  { fill: "#c98d6b", glow: "rgba(201,141,107,0.5)" }, // clay — SubhanAllah
];

/**
 * SVG strand: beads laid on a catenary-ish curve. Passed beads gather to the
 * left, glowing; the current bead sits highlighted; remaining wait on the right.
 */
function BeadStrand({
  count,
  value,
  phase,
  pulse,
}: {
  count: number;
  value: number;
  phase: number;
  pulse: number;
}) {
  const W = 400;
  const H = 240;
  const color = PHASE_COLORS[phase % PHASE_COLORS.length];

  // bead positions along a hanging curve
  const positions = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const x = 28 + t * (W - 56);
      // catenary dip
      const y = 46 + Math.sin(Math.PI * t) * 132;
      pts.push({ x, y });
    }
    return pts;
  }, [count]);

  const pathD = useMemo(() => {
    if (!positions.length) return "";
    return (
      `M ${positions[0].x} ${positions[0].y} ` +
      positions
        .slice(1)
        .map((p) => `L ${p.x} ${p.y}`)
        .join(" ")
    );
  }, [positions]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* string */}
      <path d={pathD} fill="none" stroke="var(--color-night-line)" strokeWidth="1.5" />
      {positions.map((p, i) => {
        const passed = i < value;
        const isCurrent = i === value;
        const r = isCurrent ? 11 : 8;
        return (
          <g key={i}>
            {passed && (
              <circle cx={p.x} cy={p.y} r={r + 4} fill={color.glow} opacity={0.18} />
            )}
            <circle
              cx={p.x}
              cy={p.y}
              r={r}
              fill={passed ? color.fill : "var(--color-night-card)"}
              stroke={
                isCurrent
                  ? color.fill
                  : passed
                    ? "transparent"
                    : "var(--color-night-line)"
              }
              strokeWidth={isCurrent ? 2.5 : 1.5}
              className="transition-all duration-300"
              style={
                isCurrent && pulse
                  ? { filter: `drop-shadow(0 0 8px ${color.glow})` }
                  : undefined
              }
            />
            {/* bead highlight */}
            {passed && (
              <circle cx={p.x - r / 3} cy={p.y - r / 3} r={r / 4} fill="#fff" opacity={0.25} />
            )}
          </g>
        );
      })}
    </svg>
  );
}
