import type { Amal, TimeOfDay, Weekday } from "./types";
import { weekdayDuas } from "./weekday-duas";
import { dailyCore } from "./daily-core";
import { weekly } from "./weekly";
import { extras } from "./extras";
import { extras2 } from "./extras2";
import { audioOverrides } from "./audio";
import { legacyRange, quranPortionFor, type PageRange } from "./quran-daily";
import { occasionsFor } from "./occasions";
import { hijriParts } from "@/lib/dates";

/** All aamal with researched audio merged in (Ali Fani first, then fallbacks). */
export const allAamal: Amal[] = [
  ...dailyCore,
  ...weekdayDuas,
  ...weekly,
  ...extras,
  ...extras2,
].map((amal) => {
  const extra = audioOverrides[amal.id];
  if (!extra?.length) return amal;
  // researched sources first (already preference-ordered), then any inline ones
  const inline = (amal.audio ?? []).filter(
    (a) => !extra.some((e) => e.url === a.url),
  );
  return { ...amal, audio: [...extra, ...inline] };
});

/**
 * The evening session, after Maghrib: dhikr → duas → weekly night duas →
 * Quran, the before-sleep surahs, and Salat al-Layl last.
 * The morning aamal (`morning` set) are the other session — see `morningForDay`.
 */
const SESSION_ORDER: string[][] = [
  ["tasbih-zahra"],
  ["dua-faraj"],
  ["salawat"],
  ["istighfar"],
  ["dua-itidhar"],
  ["dua-kumayl", "dua-tawassul"],
  ["quran-daily"],
  ["surah-waqiah"],
  ["surah-mulk"],
  ["amana-rasul"],
  // the last part of the night, before Fajr — the day only turns over at Fajr
  ["salat-layl"],
];

const OCCASION_RANK = SESSION_ORDER.findIndex((g) => g.includes("dua-kumayl")) + 0.5;

const RANK = new Map<string, number>(
  SESSION_ORDER.flatMap((group, i) => group.map((id) => [id, i] as const)),
);

/**
 * After Fajr: the deeds first (Friday ghusl, sadaqa given early), then Dua
 * al-Ahd, the morning Quran and dhikr, the day's own dua and ziyarat, Ziyarat
 * Ashura, and Friday's Nudba and Kahf.
 */
const MORNING_ORDER = [
  "ghusl-jumua",
  "sadaqa",
  "dua-ahd",
  "fatiha",
  "ayat-kursi",
  "muawwidhat",
  "tasbihat-arbaa",
  "sun-dua", "mon-dua", "tue-dua", "wed-dua", "thu-dua", "fri-dua", "sat-dua",
  "ziyarat-prophet",
  "ziyarat-ali-fatima",
  "ziyarat-hasanayn",
  "ziyarat-sajjad-baqir-sadiq",
  "ziyarat-kadhim-ridha-jawad-hadi",
  "ziyarat-askari",
  "ziyarat-mahdi",
  "ziyarat-ashura",
  "dua-nudba",
  "surah-kahf",
];

const dayAfter = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 12);

/**
 * The morning session, after Fajr: every amal whose time is the morning
 * (`morning` set). Real to-dos, ticked into the same `da:done` as the evening.
 */
export function morningForDay(weekday: Weekday, date?: Date): Amal[] {
  const list = allAamal
    .filter((a) => a.morning && (a.days === "daily" || a.days.includes(weekday)))
    .sort((a, b) => MORNING_ORDER.indexOf(a.id) - MORNING_ORDER.indexOf(b.id));
  // aamal of the daylight of today's Hijri date (Ghadir, Arafah, Arba'in…)
  if (date)
    list.push(...occasionsFor("day", hijriParts(date), date, hijriParts(dayAfter(date))));
  return list;
}

/** The evening session's to-dos, after Maghrib (morning aamal excluded). */
export function aamalForDay(weekday: Weekday, date?: Date, quran?: PageRange): Amal[] {
  const list = allAamal.filter(
    (a) => !a.morning && (a.days === "daily" || a.days.includes(weekday)),
  );
  if (date) {
    // the portion comes from real reading progress (src/lib/khatm.ts)
    list.push(quranPortionFor(quran ?? legacyRange(date)));
    // tonight, after Maghrib, is already the night of TOMORROW's Hijri date
    const tomorrow = dayAfter(date);
    list.push(
      ...occasionsFor("night", hijriParts(tomorrow), tomorrow, hijriParts(dayAfter(tomorrow))),
    );
  }
  // the night's special aamal come after the weekly ones, before the Quran portion
  const rank = (a: Amal) => RANK.get(a.id) ?? (a.id.startsWith("occ-") ? OCCASION_RANK : 99);
  return list.sort((a, b) => rank(a) - rank(b));
}

export const TIME_LABELS: Record<TimeOfDay, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  any: "Through the day",
  evening: "Evening",
  night: "Night",
};

export type {
  Amal,
  AudioSource,
  CounterPhase,
  Line,
  TimeOfDay,
  Weekday,
} from "./types";
