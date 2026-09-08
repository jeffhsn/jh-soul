// Daily Quran portion — the 604-page Madani mushaf spread over the calendar
// year (1–2 pages a day), so one full khatm completes every year on Dec 31.
// The portion is derived purely from the date: whatever day it is, the app
// always knows exactly which pages are due, so there is nothing to track.
// Quran.com's page view shows that exact mushaf page and recites it with
// word-by-word highlighting — made for following along while someone reads.
import type { Amal } from "./types";

const TOTAL_PAGES = 604;

/** Page each surah starts on in the standard 604-page Madani mushaf (index 0 = surah 1). */
const SURAH_START_PAGES = [
  1, 2, 50, 77, 106, 128, 151, 177, 187, 208, 221, 235, 249, 255, 262, 267,
  282, 293, 305, 312, 322, 332, 342, 350, 359, 367, 377, 385, 396, 404, 411,
  415, 418, 428, 434, 440, 446, 453, 458, 467, 477, 483, 489, 496, 499, 502,
  507, 511, 515, 518, 520, 523, 526, 528, 531, 534, 537, 542, 545, 549, 551,
  553, 554, 556, 558, 560, 562, 564, 566, 568, 570, 572, 574, 575, 577, 578,
  580, 582, 583, 585, 586, 587, 587, 589, 590, 591, 591, 592, 593, 594, 595,
  595, 596, 596, 597, 597, 598, 598, 599, 599, 600, 600, 601, 601, 601, 602,
  602, 602, 603, 603, 603, 604, 604, 604,
];

const SURAH_NAMES = [
  "al-Fatiha", "al-Baqara", "Aal Imran", "al-Nisa", "al-Ma'ida", "al-An'am",
  "al-A'raf", "al-Anfal", "al-Tawba", "Yunus", "Hud", "Yusuf", "al-Ra'd",
  "Ibrahim", "al-Hijr", "al-Nahl", "al-Isra", "al-Kahf", "Maryam", "Ta-Ha",
  "al-Anbiya", "al-Hajj", "al-Mu'minun", "al-Nur", "al-Furqan", "al-Shu'ara",
  "al-Naml", "al-Qasas", "al-Ankabut", "al-Rum", "Luqman", "al-Sajda",
  "al-Ahzab", "Saba", "Fatir", "Ya-Sin", "al-Saffat", "Sad", "al-Zumar",
  "Ghafir", "Fussilat", "al-Shura", "al-Zukhruf", "al-Dukhan", "al-Jathiya",
  "al-Ahqaf", "Muhammad", "al-Fath", "al-Hujurat", "Qaf", "al-Dhariyat",
  "al-Tur", "al-Najm", "al-Qamar", "al-Rahman", "al-Waqi'a", "al-Hadid",
  "al-Mujadila", "al-Hashr", "al-Mumtahana", "al-Saff", "al-Jumu'a",
  "al-Munafiqun", "al-Taghabun", "al-Talaq", "al-Tahrim", "al-Mulk",
  "al-Qalam", "al-Haqqa", "al-Ma'arij", "Nuh", "al-Jinn", "al-Muzzammil",
  "al-Muddaththir", "al-Qiyama", "al-Insan", "al-Mursalat", "al-Naba",
  "al-Nazi'at", "Abasa", "al-Takwir", "al-Infitar", "al-Mutaffifin",
  "al-Inshiqaq", "al-Buruj", "al-Tariq", "al-A'la", "al-Ghashiya", "al-Fajr",
  "al-Balad", "al-Shams", "al-Layl", "al-Duha", "al-Sharh", "al-Tin",
  "al-Alaq", "al-Qadr", "al-Bayyina", "al-Zalzala", "al-Adiyat", "al-Qari'a",
  "al-Takathur", "al-Asr", "al-Humaza", "al-Fil", "Quraysh", "al-Ma'un",
  "al-Kawthar", "al-Kafirun", "al-Nasr", "al-Masad", "al-Ikhlas", "al-Falaq",
  "al-Nas",
];

/** 1-based surah number whose text page `page` falls in (last surah starting on or before it). */
function surahAtPage(page: number): number {
  let n = 1;
  for (let i = 0; i < SURAH_START_PAGES.length; i++) {
    if (SURAH_START_PAGES[i] <= page) n = i + 1;
    else break;
  }
  return n;
}

/** Juz containing `page` — juz 1 is pages 1–21, each later juz starts at (n−1)·20 + 2. */
function juzAtPage(page: number): number {
  return page <= 21 ? 1 : Math.min(30, Math.floor((page - 2) / 20) + 1);
}

function dayOfYear(d: Date): { day: number; days: number } {
  // compare midnights only — the time of day must never shift the portion
  const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const jan1 = new Date(d.getFullYear(), 0, 1);
  // Math.round absorbs DST hour shifts in the local-time difference
  const day = Math.round((midnight.getTime() - jan1.getTime()) / 86_400_000) + 1;
  const leap = new Date(d.getFullYear(), 1, 29).getDate() === 29;
  return { day, days: leap ? 366 : 365 };
}

/** Today's slice of the year-long khatm as a checklist item. */
export function quranPortionFor(date: Date): Amal {
  const { day, days } = dayOfYear(date);
  const start = Math.floor(((day - 1) * TOTAL_PAGES) / days) + 1;
  const end = Math.floor((day * TOTAL_PAGES) / days);
  const pages = end - start + 1;
  const surah = surahAtPage(start);
  const juz = juzAtPage(start);
  const pageLabel = pages === 1 ? `page ${start}` : `pages ${start}–${end}`;

  return {
    id: "quran-daily",
    title: "Daily Quran Portion",
    arabicTitle: "وِرْدُ ٱلْقُرْآنِ",
    subtitle: `Today: ${pageLabel} of 604 · Juz ${juz}, Surah ${SURAH_NAMES[surah - 1]} — one khatm a year`,
    type: "quran",
    days: "daily",
    timeOfDay: "any",
    minutes: pages * 3,
    merit:
      "Read what is easy of the Quran each day — this pace completes the whole Book every year. Tap the Quran.com link, press play, and follow the highlighted words as it is recited to you.",
    lines: [
      {
        ar: "أَعُوذُ بِٱللَّهِ مِنَ ٱلشَّيْطَانِ ٱلرَّجِيمِ",
        tr: "A'udhu billahi minash-shaytanir-rajim",
        en: "I seek refuge in Allah from Satan, the accursed.",
      },
      {
        ar: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
        tr: "Bismillahir-Rahmanir-Rahim",
        en: `In the name of Allah, the Entirely Merciful, the Especially Merciful. — then open today's reading (${pageLabel}) below.`,
      },
    ],
    links: [
      {
        label: `Listen & follow — ${pageLabel} on Quran.com`,
        url: `https://quran.com/page/${start}`,
      },
      {
        label: `Translation — Surah ${SURAH_NAMES[surah - 1]} on Al-Islam.org`,
        url: `https://al-islam.org/quran/${surah}`,
      },
    ],
  };
}
