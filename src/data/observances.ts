import type { HijriParts } from "@/lib/dates";

/**
 * Recommended (mustahabb) ghusl days and recommended fasts, shown as small
 * icons on the Hijri calendar. Sources: Mafatih al-Jinan and the risalas of
 * the contemporary maraji'. Beyond Friday and the two Eids, most scholars say
 * the other ghusls are performed in hope of reward (raja').
 */

const md = (month: number, day: number) => `${month}-${day}`;

const GHUSL_DAYS: Record<string, string> = {
  [md(7, 1)]: "Ghusl of the 1st of Rajab",
  [md(7, 15)]: "Ghusl of the middle of Rajab",
  [md(7, 27)]: "Ghusl of the day of Mab'ath",
  [md(8, 15)]: "Ghusl of the night of 15 Sha'ban",
  [md(9, 1)]: "Ghusl of the first night of Ramadan",
  [md(9, 15)]: "Ghusl of the night of 15 Ramadan",
  [md(9, 17)]: "Ghusl of the night of 17 Ramadan",
  [md(9, 19)]: "Ghusl of the night of Qadr (the evening before the 19th)",
  [md(9, 21)]: "Ghusl of the night of Qadr (the evening before the 21st)",
  [md(9, 23)]: "Ghusl of the night of Qadr (the evening before the 23rd)",
  [md(10, 1)]: "Ghusl of Eid al-Fitr",
  [md(11, 25)]: "Ghusl of Dahw al-Ardh",
  [md(12, 8)]: "Ghusl of the day of Tarwiya",
  [md(12, 9)]: "Ghusl of the day of Arafah",
  [md(12, 10)]: "Ghusl of Eid al-Adha",
  [md(12, 18)]: "Ghusl of Eid al-Ghadir",
  [md(12, 24)]: "Ghusl of the day of Mubahala",
  [md(3, 17)]: "Ghusl of the birth of the Prophet (s)",
};

const FAST_DAYS: Record<string, string> = {
  [md(1, 1)]: "Fast of the 1st of Muharram",
  [md(1, 3)]: "Fast of the 3rd of Muharram",
  [md(3, 17)]: "Fast of the birth of the Prophet (s)",
  [md(7, 27)]: "Fast of the day of Mab'ath",
  [md(11, 25)]: "Fast of Dahw al-Ardh",
  [md(12, 18)]: "Fast of Eid al-Ghadir",
  [md(12, 24)]: "Fast of the day of Mubahala",
};

/** days on which fasting is forbidden or disliked — never marked */
const NO_FAST = new Set([
  md(10, 1), // Eid al-Fitr — haram
  md(12, 10), // Eid al-Adha — haram
  md(1, 9), // Tasu'a
  md(1, 10), // Ashura — disliked; one abstains until the afternoon without the intention of a fast
]);

export function ghuslFor(date: Date, h: HijriParts): string | null {
  const special = GHUSL_DAYS[md(h.month, h.day)];
  if (special) return special;
  return date.getDay() === 5 ? "Ghusl al-Jumu'a — Fajr until sunset, best before noon" : null;
}

/**
 * `monthLength` is the number of days in this Hijri month (for the last
 * Thursday). Ramadan is obligatory, so nothing is marked in it.
 */
export function fastFor(date: Date, h: HijriParts, monthLength: number): string | null {
  if (h.month === 9 || NO_FAST.has(md(h.month, h.day))) return null;
  const special = FAST_DAYS[md(h.month, h.day)];
  if (special) return special;
  if (h.month === 12 && h.day <= 9) return "Fast of the first nine days of Dhu al-Hijjah";
  const wd = date.getDay();
  // the three monthly fasts the Prophet (s) kept until the end of his life
  if (wd === 4 && h.day <= 7) return "Fast of the first Thursday of the month";
  if (wd === 4 && h.day > monthLength - 7) return "Fast of the last Thursday of the month";
  if (wd === 3 && h.day >= 11 && h.day <= 17)
    return "Fast of the first Wednesday after the 10th of the month";
  if (h.day >= 13 && h.day <= 15) return "Fast of the white days (Ayyam al-Bid)";
  return null;
}

/** Months in which a fast on any day is especially recommended. */
export function fastingMonthNote(month: number): string | null {
  if (month === 7) return "Rajab — fasting on any day of this month is highly recommended, even a single day.";
  if (month === 8) return "Sha'ban — the Prophet's (s) month; fasting on any day of it is highly recommended.";
  return null;
}
