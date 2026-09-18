import type { Amal, TimeOfDay, Weekday } from "./types";
import { weekdayDuas } from "./weekday-duas";
import { dailyCore } from "./daily-core";
import { weekly } from "./weekly";
import { extras } from "./extras";
import { extras2 } from "./extras2";
import { audioOverrides } from "./audio";
import { quranPortionFor } from "./quran-daily";

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
 * One-sitting recitation order for the session after Maghrib, every day:
 * Quran → dhikr counters → daily duas → sadaqa → ziyarat → weekly specials,
 * with the before-sleep items and Salat al-Layl closing the list.
 * The owner has a single free block a day, so the sitting holds every to-do.
 * The few morning-bound aamal (`morning` set) are kept out of it, in their own
 * checklist — see `morningForDay`.
 */
const SESSION_ORDER: string[][] = [
  ["fatiha"],
  ["ayat-kursi"],
  ["muawwidhat"],
  ["tasbih-zahra"],
  ["tasbihat-arbaa"],
  ["sun-dua", "mon-dua", "tue-dua", "wed-dua", "thu-dua", "fri-dua", "sat-dua"],
  ["dua-ahd"],
  ["dua-faraj"],
  ["salawat"],
  ["istighfar"],
  ["sadaqa"],
  [
    "ziyarat-prophet",
    "ziyarat-ali-fatima",
    "ziyarat-hasanayn",
    "ziyarat-sajjad-baqir-sadiq",
    "ziyarat-kadhim-ridha-jawad-hadi",
    "ziyarat-askari",
    "ziyarat-mahdi",
  ],
  ["ziyarat-ashura"],
  ["dua-kumayl", "dua-nudba", "dua-tawassul"],
  ["surah-kahf"],
  ["quran-daily"],
  ["surah-waqiah"],
  ["surah-mulk"],
  ["amana-rasul"],
  ["salat-layl"],
];

const RANK = new Map<string, number>(
  SESSION_ORDER.flatMap((group, i) => group.map((id) => [id, i] as const)),
);

const MORNING_ORDER = ["ghusl-jumua", "sadaqa", "dua-ahd", "dua-nudba"];

/**
 * The morning checklist: aamal whose blessing is lost if left to the evening.
 * Never part of the sitting or of the day's required total — a tick is a bonus.
 */
export function morningForDay(weekday: Weekday): Amal[] {
  return allAamal
    .filter((a) => a.morning && (a.days === "daily" || a.days.includes(weekday)))
    .sort((a, b) => MORNING_ORDER.indexOf(a.id) - MORNING_ORDER.indexOf(b.id));
}

/** The to-dos of the sitting after Maghrib (morning-bound aamal excluded). */
export function aamalForDay(weekday: Weekday, date?: Date): Amal[] {
  const list = allAamal.filter(
    (a) => !a.morning && (a.days === "daily" || a.days.includes(weekday)),
  );
  // the year-long khatm portion is computed from the date, not stored
  if (date) list.push(quranPortionFor(date));
  return list.sort((a, b) => (RANK.get(a.id) ?? 99) - (RANK.get(b.id) ?? 99));
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
