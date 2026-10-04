/**
 * Collects every human-readable English string in the content (src/data) into
 * src/i18n/source/*.json — the lists the translations in src/i18n/content are
 * made from. Run: npx tsx --tsconfig tsconfig.json scripts/i18n-extract.mts
 *
 * `all`  — needed in every language;
 * `read` — translations of recited Arabic (duas, ziyarat, Quran): needed in
 *          Italian and German, not in Arabic, where the Arabic itself is read.
 */
import { readFileSync, writeFileSync } from "node:fs";
(globalThis as any).window = undefined;
const { dailyCore } = await import("../src/data/daily-core.ts");
const { weekdayDuas } = await import("../src/data/weekday-duas.ts");
const { weekly } = await import("../src/data/weekly.ts");
const { extras } = await import("../src/data/extras.ts");
const { extras2 } = await import("../src/data/extras2.ts");
const { OCCASIONS } = await import("../src/data/occasions.ts");
const { hijriEvents } = await import("../src/data/hijri-events.ts");

const all = new Set<string>();
const read = new Set<string>();
const add = (set: Set<string>, s?: string) => {
  if (s && /[A-Za-z]/.test(s) && !/^https?:/.test(s)) set.add(s.trim());
};

const amals = [...dailyCore, ...weekdayDuas, ...weekly, ...extras, ...extras2, ...OCCASIONS.map((o: any) => o.amal)];
for (const a of amals as any[]) {
  add(all, a.title);
  add(all, a.subtitle);
  add(all, a.merit);
  add(all, a.morning);
  for (const s of a.steps ?? []) add(all, s);
  for (const l of a.links ?? []) {
    add(all, l.label);
    add(all, l.note);
    add(all, l.group);
  }
  const action = a.type === "action";
  for (const l of a.lines ?? []) {
    if (action) {
      add(all, l.tr); // in an action the "transliteration" is a label (e.g. "Fajr — 2 rak'ahs")
      add(all, l.en);
    } else add(read, l.en);
  }
  for (const p of a.counterPhases ?? []) add(read, p.phrase?.en);
}
for (const e of hijriEvents) add(all, e.title);
// plain string literals of the calendar's ghusl and fast notes
for (const m of readFileSync("src/data/observances.ts", "utf8").matchAll(/"((?:Ghusl|Fast|Rajab|Sha'ban)[^"]*)"/g)) add(all, m[1]);
for (const s of all) read.delete(s);

const sorted = (set: Set<string>) => [...set].sort();
writeFileSync("src/i18n/source/all.json", JSON.stringify(sorted(all), null, 1));
writeFileSync("src/i18n/source/read.json", JSON.stringify(sorted(read), null, 1));
console.log("all", all.size, "read", read.size, "chars", [...all].join("").length, [...read].join("").length);
