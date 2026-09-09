"use client";

import { useEffect, useRef, useState } from "react";
import { HandCoins } from "lucide-react";
import { useSadaqaAmount, useSadaqaTotal } from "@/lib/store";

export const formatAmount = (n: number) =>
  new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(n);

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
    const cleaned = raw.replace(/[^0-9.]/g, "");
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
          className="mt-3 w-full rounded-2xl border border-night-line bg-night-card px-5 py-4 font-display text-3xl tabular-nums text-cream outline-none transition placeholder:text-cream-faint/60 focus:border-gold-dim focus:shadow-[0_0_0_3px_rgba(220,175,94,0.15)]"
        />
        <span className="mt-2 block text-[0.78rem] italic text-cream-dim">
          Press Enter to mark it done. Any currency — it is your own number.
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

/** Lifetime sadaqa summary shown under the day's progress. */
export function SadaqaLifetime() {
  const { total, days } = useSadaqaTotal();
  return (
    <div className="mt-3 flex items-center gap-4 rounded-2xl border border-night-line-soft bg-night-card px-5 py-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-full border border-gold-dim/40 text-gold-bright">
        <HandCoins className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="font-display text-[1.05rem] tabular-nums">
          {formatAmount(total)}
          <span className="ml-2 text-[0.84rem] font-normal text-cream-dim">
            sadaqa given in your lifetime
          </span>
        </p>
        <p className="mt-0.5 text-[0.8rem] text-cream-faint">
          {days === 0
            ? "Write down what you give in the Daily Sadaqa card — it adds up here."
            : `Recorded across ${days} ${days === 1 ? "day" : "days"}.`}
        </p>
      </div>
    </div>
  );
}
