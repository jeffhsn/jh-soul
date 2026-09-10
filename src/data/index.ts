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
 * One-sitting recitation order for the post-Fajr session:
 * Quran → dhikr counters → daily duas → sadaqa → ziyarat → weekly specials,
 * with the before-sleep items closing the list.
 */
const SESSION_ORDER: string[][] = [
  ["ghusl-jumua"],
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

export function aamalForDay(weekday: Weekday, date?: Date): Amal[] {
  const list = allAamal.filter(
    (a) => a.days === "daily" || a.days.includes(weekday),
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
