"use client";

import { useState } from "react";
import type { Line } from "@/data";
import { cn } from "@/lib/utils";

/**
 * Line-by-line trilingual reader: large Arabic, optional transliteration,
 * quiet translation. One line = one breath.
 */
export function LinesReader({ lines }: { lines: Line[] }) {
  const [showTr, setShowTr] = useState(true);
  const [showEn, setShowEn] = useState(true);

  return (
    <div>
      <div className="mb-6 flex items-center justify-end gap-2 text-[0.72rem]">
        <Toggle on={showTr} onClick={() => setShowTr((v) => !v)}>
          transliteration
        </Toggle>
        <Toggle on={showEn} onClick={() => setShowEn((v) => !v)}>
          translation
        </Toggle>
      </div>
      <ol className="space-y-7">
        {lines.map((line, i) => (
          <li key={i} className="group">
            <p className="arabic-text text-[1.55rem] text-cream">{line.ar}</p>
            {showTr && line.tr && (
              <p className="mt-1.5 text-[0.86rem] italic leading-relaxed text-sage/85">
                {line.tr}
              </p>
            )}
            {showEn && line.en && (
              <p className="mt-1 text-[0.9rem] leading-relaxed text-cream-dim">
                {line.en}
              </p>
            )}
            {i < lines.length - 1 && (
              <div className="mt-7 flex justify-center">
                <span className="text-[0.6rem] text-gold-dim/60">✦</span>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Toggle({
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
        "rounded-full border px-3 py-1 uppercase tracking-[0.14em] transition",
        on
          ? "border-gold-dim/60 text-gold-bright"
          : "border-night-line text-cream-faint hover:text-cream-dim",
      )}
    >
      {children}
    </button>
  );
}
