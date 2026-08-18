"use client";

import { useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import type { Line } from "@/data";
import { useCountState } from "@/lib/store";
import { ProgressRing } from "./progress-ring";

/**
 * Single-phrase repetition counter (salawat, istighfar…).
 * One huge tap target — the whole ring is the button.
 */
export function PhraseCounter({
  amalId,
  date,
  target,
  phrase,
  onComplete,
}: {
  amalId: string;
  date: string;
  target: number;
  phrase?: Line;
  onComplete: () => void;
}) {
  const [state, setState] = useCountState(amalId, date);
  const [, setTick] = useState(0);
  const doneRef = useRef(false);
  const finished = state.count >= target;

  function tap() {
    if (finished) return;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(12);
      } catch {}
    }
    setTick((t) => t + 1);
    const next = state.count + 1;
    setState({ phase: 0, count: next });
    if (next >= target && !doneRef.current) {
      doneRef.current = true;
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate([30, 60, 30]);
        } catch {}
      }
      setTimeout(onComplete, 900);
    }
  }

  return (
    <div className="flex select-none flex-col items-center">
      {phrase && (
        <div className="text-center">
          <p className="arabic-text text-3xl text-cream">{phrase.ar}</p>
          <p className="mt-2 text-sm italic text-sage/85">{phrase.tr}</p>
          <p className="mt-0.5 text-[0.82rem] text-cream-dim">{phrase.en}</p>
        </div>
      )}

      <button
        onClick={tap}
        disabled={finished}
        aria-label="Count one recitation"
        className="relative mt-10 touch-manipulation rounded-full outline-none transition active:scale-[0.97]"
      >
        {state.count > 0 && !finished && (
          <span
            key={state.count}
            className="tap-ripple pointer-events-none absolute inset-0 rounded-full border-2 border-gold/60"
          />
        )}
        <ProgressRing value={Math.min(state.count, target)} max={target} size={220} stroke={6}>
          <span className="flex flex-col items-center">
            <span
              key={state.count}
              className="animate-bead-pop font-display text-6xl tabular-nums text-cream"
            >
              {finished ? "✓" : state.count}
            </span>
            <span className="mt-1 text-sm text-cream-faint">
              {finished ? "complete" : `of ${target}`}
            </span>
          </span>
        </ProgressRing>
      </button>

      {!finished && (
        <p className="mt-5 text-[0.78rem] uppercase tracking-[0.2em] text-cream-faint">
          tap to count
        </p>
      )}

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
