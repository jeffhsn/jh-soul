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
import { dayMarks, formatMinutes } from "@/lib/aamal-day";
import { translate, type Locale } from "@/lib/i18n";

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
 * The evening session, after Maghrib: a day of qada prayers → dhikr → duas → weekly night duas →
 * Quran, the before-sleep surahs, and Salat al-Layl last.
 * The morning aamal (`morning` set) are the other session — see `morningForDay`.
 */
const SESSION_ORDER: string[][] = [
  // an obligation before anything recommended: one day of missed prayers made up
  ["qada-salat"],
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
  // reading on the self and the day's self-accounting, before sleep
  ["tazkiya"],
  // before sleep, in the seasons when Fajr is too early to wake for
  ["salat-layl", "salat-layl-night"],
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
  "salat-layl",
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
 * Salat al-Layl follows the seasons. Its time ends at Fajr, and the owner
 * wakes around WAKE_AT: when Fajr comes at least 30 minutes after that (in
 * Witten roughly October to mid-February), it is prayed on waking, before
 * Fajr, and opens the Morning list. Otherwise it closes the Evening list,
 * prayed before sleep.
 */
const WAKE_AT = 5 * 60 + 30;
const LAYL_MINUTES = 30;
const fajrOf = (d: Date) => dayMarks(d).fajr;
const laylAtDawn = (d: Date) => fajrOf(d) >= WAKE_AT + LAYL_MINUTES;
const layl = () => allAamal.find((a) => a.id === "salat-layl")!;

function laylMorning(d: Date, locale: Locale): Amal {
  return {
    ...layl(),
    subtitle: translate(locale, "day.layl.morningSubtitle", { time: formatMinutes(fajrOf(d)) }),
    morning: translate(locale, "day.layl.morningReason"),
  };
}

function laylEvening(d: Date, locale: Locale): Amal {
  return {
    ...layl(),
    subtitle: translate(locale, "day.layl.eveningSubtitle", { time: formatMinutes(fajrOf(d)) }),
  };
}

/**
 * The morning session, after Fajr: every amal whose time is the morning
 * (`morning` set). Real to-dos, ticked into the same `da:done` as the evening.
 */
export function morningForDay(weekday: Weekday, date?: Date, locale: Locale = "en"): Amal[] {
  const list = allAamal
    .filter((a) => a.morning && (a.days === "daily" || a.days.includes(weekday)));
  if (date && laylAtDawn(date)) list.push(laylMorning(date, locale));
  list.sort((a, b) => MORNING_ORDER.indexOf(a.id) - MORNING_ORDER.indexOf(b.id));
  // aamal of the daylight of today's Hijri date (Ghadir, Arafah, Arba'in…)
  if (date)
    list.push(...occasionsFor("day", hijriParts(date), date, hijriParts(dayAfter(date))));
  return list;
}

/** The evening session's to-dos, after Maghrib (morning aamal excluded). */
export function aamalForDay(
  weekday: Weekday,
  date?: Date,
  quran?: PageRange,
  locale: Locale = "en",
): Amal[] {
  const list = allAamal.filter(
    (a) =>
      !a.morning &&
      a.id !== "salat-layl" &&
      (a.days === "daily" || a.days.includes(weekday)),
  );
  if (!date) list.push(layl());
  // tonight's Salat al-Layl, unless tomorrow's Fajr is late enough to wake for.
  // On a changeover day this morning's list already holds one (prayed before
  // today's dawn), so tonight's takes its own id.
  else if (!laylAtDawn(dayAfter(date))) {
    const night = laylEvening(dayAfter(date), locale);
    list.push(laylAtDawn(date) ? { ...night, id: "salat-layl-night" } : night);
  }
  if (date) {
    // the portion comes from real reading progress (src/lib/khatm.ts)
    list.push(quranPortionFor(quran ?? legacyRange(date), undefined, locale));
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

const TIMES: TimeOfDay[] = ["morning", "afternoon", "any", "evening", "night"];

/** "Morning", "Through the day"… in the given language. */
export function timeLabels(locale: Locale): Record<TimeOfDay, string> {
  return Object.fromEntries(TIMES.map((t) => [t, translate(locale, `day.time.${t}`)])) as Record<
    TimeOfDay,
    string
  >;
}

export const TIME_LABELS: Record<TimeOfDay, string> = timeLabels("en");

export type {
  Amal,
  AudioSource,
  CounterPhase,
  Line,
  TimeOfDay,
  Weekday,
} from "./types";
