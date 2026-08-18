"use client";

import { useMemo } from "react";
import { daysAgoKey, todayKey } from "@/lib/dates";

const WEEKS = 17; // ~4 months
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface Cell {
  key: string;
  date: Date;
  completed: number;
  total: number;
  level: 0 | 1 | 2 | 3 | 4;
  future: boolean;
}

const LEVEL_STYLE: Record<Cell["level"], React.CSSProperties> = {
  0: { background: "var(--heat-0)" },
  1: { background: "color-mix(in srgb, var(--color-gold) 25%, transparent)" },
  2: { background: "color-mix(in srgb, var(--color-gold) 48%, transparent)" },
  3: { background: "color-mix(in srgb, var(--color-gold) 75%, transparent)" },
  4: {
    background: "var(--heat-4)",
    boxShadow: "var(--heat-4-glow)",
  },
};

function readDay(key: string): { completed: number; total: number } {
  try {
    const done = JSON.parse(localStorage.getItem(`da:done:${key}`) ?? "{}");
    const total = Number(localStorage.getItem(`da:total:${key}`) ?? 0);
    return { completed: Object.keys(done).length, total };
  } catch {
    return { completed: 0, total: 0 };
  }
}

/**
 * GitHub-style activity heatmap of the last ~4 months.
 * Columns are weeks (Sun→Sat top to bottom); gold depth = share of that
 * day's aamal completed; full completion glows.
 */
export function ContributionGraph({ refresh }: { refresh?: unknown }) {
  const { cells, monthLabels, stats } = useMemo(() => {
    void refresh; // recompute when today's done-map changes
    const today = new Date();
    // last column = current week; align grid start to that week's Sunday
    const end = new Date(today);
    end.setDate(end.getDate() + (6 - end.getDay())); // Saturday of this week
    const start = new Date(end);
    start.setDate(start.getDate() - (WEEKS * 7 - 1));

    const todayK = todayKey(today);
    const cells: Cell[] = [];
    const monthLabels: { col: number; label: string }[] = [];
    const cur = new Date(start);
    for (let i = 0; i < WEEKS * 7; i++) {
      const key = todayKey(cur);
      const { completed, total } = readDay(key);
      const ratio = total > 0 ? completed / total : 0;
      const level: Cell["level"] =
        completed === 0
          ? 0
          : ratio >= 1
            ? 4
            : ratio >= 0.67
              ? 3
              : ratio >= 0.34
                ? 2
                : 1;
      if (cur.getDate() === 1) {
        monthLabels.push({ col: Math.floor(i / 7), label: MONTHS[cur.getMonth()] });
      }
      cells.push({
        key,
        date: new Date(cur),
        completed,
        total,
        level,
        future: key > todayK,
      });
      cur.setDate(cur.getDate() + 1);
    }

    // this-month stats
    const m = today.getMonth();
    const y = today.getFullYear();
    let active = 0;
    let perfect = 0;
    for (let d = 1; d <= today.getDate(); d++) {
      const { completed, total } = readDay(todayKey(new Date(y, m, d)));
      if (completed > 0) active++;
      if (total > 0 && completed >= total) perfect++;
    }
    return { cells, monthLabels, stats: { active, perfect } };
  }, [refresh]);

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <h3 className="font-display text-[0.78rem] uppercase tracking-[0.22em] text-gold-dim">
          Your consistency
        </h3>
        <div className="hairline flex-1 opacity-40" />
      </div>

      {/* month labels */}
      <div
        className="grid gap-[3px] text-[0.58rem] text-cream-faint"
        style={{ gridTemplateColumns: `repeat(${WEEKS}, 1fr)` }}
      >
        {Array.from({ length: WEEKS }, (_, col) => (
          <span key={col} className="h-3.5 overflow-visible whitespace-nowrap">
            {monthLabels.find((l) => l.col === col)?.label ?? ""}
          </span>
        ))}
      </div>

      {/* grid: columns = weeks, rows = Sun..Sat */}
      <div
        className="grid grid-flow-col gap-[3px]"
        style={{
          gridTemplateRows: "repeat(7, 1fr)",
          gridTemplateColumns: `repeat(${WEEKS}, 1fr)`,
        }}
      >
        {cells.map((c) => (
          <div
            key={c.key}
            title={
              c.future
                ? undefined
                : `${c.date.toLocaleDateString("en", { day: "numeric", month: "short" })} — ${c.completed}${c.total ? `/${c.total}` : ""} aamal`
            }
            className="aspect-square w-full rounded-[3px] transition-colors"
            style={c.future ? { background: "transparent" } : LEVEL_STYLE[c.level]}
          />
        ))}
      </div>

      {/* legend + stats */}
      <div className="mt-3 flex items-center justify-between text-[0.62rem] text-cream-faint">
        <span className="inline-flex items-center gap-1">
          less
          {([0, 1, 2, 3, 4] as const).map((l) => (
            <span key={l} className="size-2.5 rounded-[2px]" style={LEVEL_STYLE[l]} />
          ))}
          more
        </span>
      </div>
      <p className="mt-3 text-[0.75rem] leading-relaxed text-cream-dim">
        This month:{" "}
        <span className="text-gold-bright">{stats.active}</span> active{" "}
        {stats.active === 1 ? "day" : "days"},{" "}
        <span className="text-gold-bright">{stats.perfect}</span> fully completed.
      </p>
    </div>
  );
}
