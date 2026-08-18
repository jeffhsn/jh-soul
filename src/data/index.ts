import type { Amal, TimeOfDay, Weekday } from "./types";
import { weekdayDuas } from "./weekday-duas";
import { dailyCore } from "./daily-core";
import { weekly } from "./weekly";
import { audioOverrides } from "./audio";

/** All aamal with researched audio merged in (Ali Fani first, then fallbacks). */
export const allAamal: Amal[] = [...dailyCore, ...weekdayDuas, ...weekly].map(
  (amal) => {
    const extra = audioOverrides[amal.id];
    if (!extra?.length) return amal;
    // researched sources first (already preference-ordered), then any inline ones
    const inline = (amal.audio ?? []).filter(
      (a) => !extra.some((e) => e.url === a.url),
    );
    return { ...amal, audio: [...extra, ...inline] };
  },
);

const TIME_ORDER: TimeOfDay[] = ["morning", "afternoon", "any", "evening", "night"];

export function aamalForDay(weekday: Weekday): Amal[] {
  return allAamal
    .filter((a) => a.days === "daily" || a.days.includes(weekday))
    .sort(
      (a, b) =>
        TIME_ORDER.indexOf(a.timeOfDay) - TIME_ORDER.indexOf(b.timeOfDay),
    );
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
