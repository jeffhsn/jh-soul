"use client";

import {
  BookOpenText,
  Check,
  CircleDot,
  Clock3,
  Headphones,
  MoonStar,
  Sparkles,
} from "lucide-react";
import type { Amal } from "@/data";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<Amal["type"], React.ComponentType<{ className?: string }>> = {
  dua: Sparkles,
  ziyarat: MoonStar,
  tasbih: CircleDot,
  counter: CircleDot,
  quran: BookOpenText,
  action: Check,
};

export function AmalCard({
  amal,
  done,
  onOpen,
  onToggle,
  index,
}: {
  amal: Amal;
  done: boolean;
  onOpen: () => void;
  onToggle: (value: boolean) => void;
  index: number;
}) {
  const Icon = TYPE_ICON[amal.type];
  const hasAudio = !!amal.audio?.length;

  return (
    <div
      className={cn(
        "group relative flex items-center gap-4 rounded-2xl border px-4 py-3.5 transition-all duration-300 animate-rise",
        done
          ? "border-night-line-soft bg-night-raise/50 opacity-55"
          : "border-night-line bg-night-card hover:-translate-y-[1px] hover:border-gold-dim/60 hover:bg-night-card/80 hover:shadow-[0_10px_28px_rgba(0,0,0,0.35)] active:scale-[0.99]",
      )}
      style={{ animationDelay: `${Math.min(index * 60, 480)}ms` }}
    >
      {/* check control — 44px hit area around a smaller visual circle */}
      <button
        aria-label={done ? `Mark ${amal.title} as not done` : `Mark ${amal.title} as done`}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(!done);
        }}
        className="-m-2 grid size-11 shrink-0 place-items-center active:scale-90 transition-transform"
      >
        <span
          className={cn(
            "grid size-7 place-items-center rounded-full border transition-all duration-300",
            done
              ? "border-gold bg-gold text-night shadow-[0_0_10px_rgba(217,169,84,0.4)]"
              : "border-cream-faint text-transparent hover:border-gold hover:text-gold-dim",
          )}
        >
          <Check className="size-4" strokeWidth={3} />
        </span>
      </button>

      {/* main click area opens focus view */}
      <button
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span
              className={cn(
                "font-display text-[1.05rem] leading-snug",
                done && "line-through decoration-gold-dim/50 decoration-1",
              )}
            >
              {amal.title}
            </span>
            {amal.arabicTitle && (
              <span className="font-arabic ml-auto text-[1.05rem] leading-none text-gold-bright/80">
                {amal.arabicTitle}
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3 text-[0.8rem] text-cream-dim">
            <span className="inline-flex items-center gap-1">
              <Icon className="size-3.5 text-gold-dim" />
              {amal.subtitle}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-[0.72rem] tracking-wide text-cream-faint">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="size-3" />
              {amal.minutes} min
            </span>
            {hasAudio && (
              <span className="inline-flex items-center gap-1 text-sage/80">
                <Headphones className="size-3" />
                audio
              </span>
            )}
          </div>
        </div>
      </button>
    </div>
  );
}
