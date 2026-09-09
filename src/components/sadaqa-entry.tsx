"use client";

import { useEffect, useRef, useState } from "react";
import { HandCoins } from "lucide-react";
import { useSadaqaAmount, useSadaqaTotal } from "@/lib/store";

export const formatAmount = (n: number) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);

/**
 * Quick amount field for the daily sadaqa: type a number, press Enter, done.
 * The amount is saved as you type so nothing is lost if the reader is closed.
 */
export function SadaqaEntry({
  date,
  onDone,
}: {
  date: string;
  onDone: () => void;
}) {
  const [amount, setAmount] = useSadaqaAmount(date);
  const [text, setText] = useState(amount === null ? "" : String(amount));
  const inputRef = useRef<HTMLInputElement>(null);
  const { total, days } = useSadaqaTotal();

  // the field is the whole point of this screen — keyboard up straight away
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  function commit(raw: string) {
    setText(raw);
    const cleaned = raw.replace(",", ".").replace(/[^0-9.]/g, "");
    const n = cleaned === "" ? null : Number(cleaned);
    setAmount(n === null || !Number.isFinite(n) ? null : n);
  }

  return (
    <div className="space-y-6">
      <label className="block">
        <span className="flex items-center gap-1.5 text-[0.72rem] uppercase tracking-[0.18em] text-cream-faint">
          <HandCoins className="size-3.5 text-gold-dim" />
          How much did you give today?
        </span>
        <div className="relative mt-3">
        <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 font-display text-3xl text-gold-dim">
          €
        </span>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          enterKeyHint="done"
          autoComplete="off"
          placeholder="0"
          value={text}
          onChange={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              inputRef.current?.blur();
              onDone();
            }
          }}
          className="w-full rounded-2xl border border-night-line bg-night-card py-4 pl-12 pr-5 font-display text-3xl tabular-nums text-cream outline-none transition placeholder:text-cream-faint/60 focus:border-gold-dim focus:shadow-[0_0_0_3px_rgba(220,175,94,0.15)]"
        />
        </div>
        <span className="mt-2 block text-[0.78rem] italic text-cream-dim">
          In euro. Press Enter to mark it done.
        </span>
      </label>

      <div className="rounded-2xl border border-night-line-soft bg-night-raise/50 px-4 py-3 text-[0.84rem] text-cream-dim">
        <span className="font-display text-cream">{formatAmount(total)}</span>{" "}
        given so far
        {days > 0 && (
          <span className="text-cream-faint">
            {" "}
            · {days} {days === 1 ? "day" : "days"}
          </span>
        )}
      </div>
    </div>
  );
}

/** Lifetime sadaqa — a rail panel beside the calendar and heatmap. */
export function SadaqaPanel() {
  const { total, days } = useSadaqaTotal();
  const [today] = useSadaqaAmount();
  const average = days > 0 ? total / days : 0;

  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h3 className="font-display text-[0.78rem] uppercase tracking-[0.22em] text-gold-dim">
          Sadaqa
        </h3>
        <div className="hairline flex-1 opacity-40" />
        <span className="font-arabic text-base leading-none text-gold-bright/80">
          ٱلصَّدَقَةُ
        </span>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-night-line-soft bg-night-card px-5 py-5">
        {/* soft gold glow behind the figure */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full opacity-60 blur-2xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--color-gold) 28%, transparent), transparent 70%)",
          }}
        />
        <p className="text-[0.7rem] uppercase tracking-[0.18em] text-cream-faint">
          Given in your lifetime
        </p>
        <p className="mt-1.5 font-display text-[2.4rem] leading-none tabular-nums text-gold-bright">
          {formatAmount(total)}
        </p>

        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-night-line-soft pt-4">
          <Stat label="Today" value={today === null ? "—" : formatAmount(today)} />
          <Stat label="Days" value={String(days)} />
          <Stat label="Per day" value={days ? formatAmount(Math.round(average)) : "—"} />
        </div>

        <p className="mt-4 text-[0.72rem] italic leading-snug text-cream-dim">
          {days === 0
            ? "Write down what you give in Daily Sadaqa — it adds up here."
            : "Calamity does not step over sadaqa."}
        </p>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[0.62rem] uppercase tracking-[0.16em] text-cream-faint">{label}</p>
      <p className="mt-0.5 truncate font-display text-[1.05rem] tabular-nums text-cream">
        {value}
      </p>
    </div>
  );
}
