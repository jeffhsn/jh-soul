"use client";

import { useEffect, useRef, useState } from "react";
import { HandCoins } from "lucide-react";
import { useSadaqaAmount, useSadaqaTotal } from "@/lib/store";
import { useT } from "@/lib/i18n";

/**
 * Money as money: €5 for whole euro, otherwise always two decimals (€0.70,
 * never €0.7). `intl` is the reader's locale (useT().intl) — Italian and
 * German write "0,70 €"; English keeps the Irish "€0.70".
 */
export const formatAmount = (n: number, intl: string = "en") => {
  const cents = Math.round(n * 100);
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat(intl === "en" ? "en-IE" : intl, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(cents / 100);
};

/** The locale's decimal separator: "." in English and Arabic, "," in Italian and German. */
const decimalSep = (intl: string) => (1.5).toLocaleString(intl).replace(/\d/g, "").charAt(0) || ".";

/** The same rule for the text field, without the symbol: "5", "0.70" ("0,70"). */
const fieldText = (n: number, sep: string) => {
  const cents = Math.round(n * 100);
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2).replace(".", sep);
};

/**
 * Keep digits and one decimal separator, at most two decimals (cents). Either
 * "." or "," is accepted as typed; the field shows the locale's own separator.
 */
function cleanMoney(raw: string, sep: string): string {
  const s = raw.replace(/,/g, ".").replace(/[^0-9.]/g, "");
  const dot = s.indexOf(".");
  if (dot === -1) return s;
  return s.slice(0, dot) + sep + s.slice(dot + 1).replace(/\./g, "").slice(0, 2);
}

/** "0,7" or "0.7" → 0.7 (rounded to the cent); empty or a lone separator → null. */
function parseMoney(cleaned: string): number | null {
  const n = cleaned === "" || cleaned === "." || cleaned === "," ? null : Number(cleaned.replace(",", "."));
  return n === null || !Number.isFinite(n) ? null : Math.round(n * 100) / 100;
}

/** Fill {placeholders} with React nodes, e.g. a highlighted amount. */
function rich(text: string, nodes: Record<string, React.ReactNode>): React.ReactNode[] {
  return text.split(/\{(\w+)\}/).map((part, i) =>
    i % 2 ? <span key={i}>{nodes[part] ?? part}</span> : part,
  );
}

/**
 * Compact inline amount field — lives on the sadaqa card and in the
 * Sadaqa panel. Every copy is bound to the same stored amount, so they agree.
 * While focused it shows what is being typed; otherwise the stored amount,
 * written as money (0.70).
 */
export function SadaqaField({
  date,
  className,
}: {
  date?: string;
  className?: string;
}) {
  const { t, intl } = useT();
  const sep = decimalSep(intl);
  const [amount, setAmount] = useSadaqaAmount(date);
  const [typing, setTyping] = useState<string | null>(null);
  const value = typing ?? (amount === null ? "" : fieldText(amount, sep));
  const ref = useRef<HTMLInputElement>(null);

  return (
    <label
      className={
        "flex shrink-0 cursor-text items-center gap-1 rounded-full border border-night-line bg-night-card px-3 py-1.5 transition focus-within:border-gold-dim focus-within:shadow-[0_0_0_3px_rgba(220,175,94,0.12)] " +
        (className ?? "")
      }
    >
      <span className="font-display text-[0.95rem] text-gold-dim">€</span>
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        enterKeyHint="done"
        autoComplete="off"
        aria-label={t("sadaqa.fieldLabel")}
        placeholder={`0${sep}00`}
        value={value}
        onFocus={() => setTyping(value)}
        onChange={(e) => {
          const cleaned = cleanMoney(e.target.value, sep);
          setTyping(cleaned);
          setAmount(parseMoney(cleaned));
        }}
        onBlur={() => setTyping(null)}
        onKeyDown={(e) => {
          if (e.key === "Enter") ref.current?.blur();
        }}
        // 16px: anything smaller makes iOS zoom the page on focus
        className="w-[4.2rem] bg-transparent font-display text-[16px] tabular-nums text-cream outline-none placeholder:text-cream-faint/60"
      />
    </label>
  );
}

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
  const { t, intl } = useT();
  const sep = decimalSep(intl);
  const [amount, setAmount] = useSadaqaAmount(date);
  const [text, setText] = useState(amount === null ? "" : fieldText(amount, sep));
  const inputRef = useRef<HTMLInputElement>(null);
  const { total, days } = useSadaqaTotal();

  // the field is the whole point of this screen — keyboard up straight away
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  function commit(raw: string) {
    const cleaned = cleanMoney(raw, sep);
    setText(cleaned);
    // stored to the cent, so sums never pick up floating-point dust
    setAmount(parseMoney(cleaned));
  }

  return (
    <div className="space-y-6">
      <label className="block">
        <span className="flex items-center gap-1.5 text-[0.72rem] uppercase tracking-[0.18em] text-cream-faint">
          <HandCoins className="size-3.5 text-gold-dim" />
          {t("sadaqa.question")}
        </span>
        <div className="relative mt-3">
        <span className="pointer-events-none absolute start-5 top-1/2 -translate-y-1/2 font-display text-3xl text-gold-dim">
          €
        </span>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          enterKeyHint="done"
          autoComplete="off"
          placeholder={`0${sep}00`}
          value={text}
          onChange={(e) => commit(e.target.value)}
          // ".5" or "0.7" settle into real money on leaving the field: 0.50, 0.70
          onBlur={() => amount !== null && setText(fieldText(amount, sep))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              inputRef.current?.blur();
              onDone();
            }
          }}
          className="w-full rounded-2xl border border-night-line bg-night-card py-4 ps-12 pe-5 font-display text-3xl tabular-nums text-cream outline-none transition placeholder:text-cream-faint/60 focus:border-gold-dim focus:shadow-[0_0_0_3px_rgba(220,175,94,0.15)]"
        />
        </div>
        <span className="mt-2 block text-[0.78rem] italic text-cream-dim">
          {t("sadaqa.hint", { example: `0${sep}50` })}
        </span>
      </label>

      <div className="rounded-2xl border border-night-line-soft bg-night-raise/50 px-4 py-3 text-[0.84rem] text-cream-dim">
        {rich(t("sadaqa.givenSoFar"), {
          amount: <span className="font-display text-cream">{formatAmount(total, intl)}</span>,
        })}
        {days > 0 && (
          <span className="text-cream-faint">
            {" "}
            · {t("sadaqa.days", { count: days })}
          </span>
        )}
      </div>
    </div>
  );
}

/** Lifetime sadaqa — a rail panel beside the calendar and heatmap. */
export function SadaqaPanel() {
  const { t, intl } = useT();
  const { total, days } = useSadaqaTotal();
  const average = days > 0 ? total / days : 0;

  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h3 className="font-display text-[0.78rem] uppercase tracking-[0.22em] text-gold-dim">
          {t("sadaqa.title")}
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
          className="pointer-events-none absolute -end-10 -top-10 size-36 rounded-full opacity-60 blur-2xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--color-gold) 28%, transparent), transparent 70%)",
          }}
        />
        <p className="text-[0.7rem] uppercase tracking-[0.18em] text-cream-faint">
          {t("sadaqa.lifetime")}
        </p>
        <p className="mt-1.5 font-display text-[2.4rem] leading-none tabular-nums text-gold-bright">
          {formatAmount(total, intl)}
        </p>

        {/* write today's amount right here — no need to open anything */}
        <div className="relative mt-5 flex items-center justify-between gap-3 border-t border-night-line-soft pt-4">
          <span className="whitespace-nowrap text-[0.8rem] text-cream-dim">{t("sadaqa.today")}</span>
          <SadaqaField />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-night-line-soft pt-4">
          <Stat label={t("sadaqa.statDays")} value={days.toLocaleString(intl)} />
          <Stat label={t("sadaqa.statAverage")} value={days ? formatAmount(average, intl) : "—"} />
        </div>

        <p className="mt-4 text-[0.72rem] italic leading-snug text-cream-dim">
          {days === 0
            ? t("sadaqa.empty")
            : t("sadaqa.saying")}
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
