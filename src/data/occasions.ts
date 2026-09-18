import type { HijriParts } from "@/lib/dates";
import type { Amal } from "./types";

/**
 * Aamal tied to a date of the Hijri year (Mafatih al-Jinan; links go to the
 * full method on Duas.org). Two kinds:
 *
 *  - "night": an amal of the NIGHT of an Islamic date. The Islamic night comes
 *    before its day, so it is done in the sitting after Maghrib on the evening
 *    BEFORE that date — it joins that civil day's to-dos.
 *  - "day": an amal of the daylight of the date. The owner's only free block is
 *    after Maghrib, by which time the day is over, so these are never to-dos:
 *    they join that day's morning checklist as bonus ticks.
 *
 * Dates follow Umm al-Qura; local moon-sighting may differ by a day.
 */
interface Occasion {
  when: "night" | "day";
  /** `h`/`date` are the Islamic date the amal belongs to; `next` is the day after it */
  match: (h: HijriParts, date: Date, next: HijriParts) => boolean;
  amal: Omit<Amal, "days" | "timeOfDay" | "type"> & { type?: Amal["type"] };
}

const on = (month: number, ...days: number[]) => (h: HijriParts) =>
  h.month === month && days.includes(h.day);

const DUAS = "https://www.duas.org";

const OCCASIONS: Occasion[] = [
  // ——— every month ———
  {
    when: "night",
    match: (h) => h.day === 1,
    amal: {
      id: "occ-new-moon",
      title: "Dua at the New Moon",
      arabicTitle: "دُعَاءُ رُؤْيَةِ ٱلْهِلَالِ",
      subtitle: "Tonight a new Hijri month begins",
      minutes: 4,
      merit: "Supplication 43 of al-Sahifa al-Sajjadiyya — Imam Zayn al-Abidin (a) on sighting the crescent",
      steps: [
        "Look for the crescent if you can, facing the qibla.",
        "Recite the dua of the new moon, asking that the month be one of safety, faith and well-being.",
      ],
      links: [{ label: "Dua at the new moon (Sahifa 43) — Duas.org", url: `${DUAS}/sajjadiya/s43.htm` }],
    },
  },
  {
    when: "day",
    match: (h) => h.day === 1 && h.month !== 10, // 1 Shawwal has the Eid's own aamal
    amal: {
      id: "occ-first-of-month",
      title: "Prayer of the First of the Month",
      subtitle: "Two rak'ats and a sadaqa",
      morning: "Done on the first day of the month — it buys the month's safety",
      minutes: 15,
      merit: "Imam al-Jawad (a): whoever does this on the first day of the month has purchased his safety for that month",
      steps: [
        "First rak'at: al-Hamd once, then al-Ikhlas 30 times.",
        "Second rak'at: al-Hamd once, then al-Qadr 30 times.",
        "Afterwards give a sadaqa, however small.",
      ],
    },
  },

  // ——— Muharram ———
  {
    when: "night",
    match: on(1, 10),
    amal: {
      id: "occ-ashura-night",
      title: "The Night of Ashura",
      subtitle: "A night of vigil and grief",
      minutes: 40,
      merit: "The night Imam Husayn (a) and his companions spent in prayer, recitation and supplication",
      steps: [
        "Keep as much of the night as you can in worship.",
        "Recite the ziyarat of Imam Husayn (a).",
        "Pray four rak'ats (two by two): in each rak'at al-Hamd once and al-Ikhlas 50 times.",
        "Send many salawat and curse the killers of Husayn (a).",
      ],
      links: [{ label: "Aamal of Ashura — Duas.org", url: `${DUAS}/ashura.htm` }],
    },
  },
  {
    when: "day",
    match: on(1, 10),
    amal: {
      id: "occ-ashura-day",
      title: "The Day of Ashura",
      subtitle: "Mourning, ziyarat and abstaining until the afternoon",
      morning: "Its aamal belong to the daylight of Ashura",
      minutes: 60,
      merit: "The day of the martyrdom of Imam Husayn (a) — a day of grief, not of worldly business",
      steps: [
        "Leave food and drink until the late afternoon without the intention of a fast, then break it with something simple.",
        "Recite Ziyarat Ashura, and the ziyarat of condolence.",
        "Say 1000 times: Allahumma il'an qatalata al-Husayn (a).",
        "Console the believers: A'zama Allahu ujurana bi-musabina bil-Husayn (a)…",
        "Set aside the day's business; attend or listen to a majlis.",
      ],
      links: [{ label: "Aamal of Ashura — Duas.org", url: `${DUAS}/ashura.htm` }],
    },
  },

  // ——— Safar ———
  {
    when: "day",
    match: on(2, 20),
    amal: {
      id: "occ-arbaeen",
      title: "Ziyarat al-Arba'in",
      arabicTitle: "زِيَارَةُ ٱلْأَرْبَعِينَ",
      subtitle: "The fortieth of Imam Husayn (a)",
      morning: "Recited once the day has risen on the 20th of Safar",
      minutes: 15,
      merit: "Imam al-Askari (a) counted the Ziyarat of Arba'in among the five signs of a believer",
      steps: ["Recite Ziyarat al-Arba'in, from near or far, then pray two rak'ats."],
      links: [{ label: "Ziyarat al-Arba'in — Duas.org", url: `${DUAS}/arbaeen.htm` }],
    },
  },
  {
    when: "day",
    match: on(2, 28),
    amal: {
      id: "occ-28-safar",
      title: "Ziyarat of the Prophet (s) and Imam Hasan (a)",
      subtitle: "The day of the Prophet's (s) passing",
      morning: "A ziyarat from afar on the day itself",
      minutes: 10,
      merit: "The 28th of Safar — the demise of the Messenger of Allah (s) and the martyrdom of Imam Hasan (a)",
      steps: ["Recite the ziyarat of the Prophet (s) and of Imam Hasan (a) from afar."],
      links: [{ label: "Aamal of Safar — Duas.org", url: `${DUAS}/safar.htm` }],
    },
  },
  {
    when: "day",
    match: (h, _d, next) => h.month === 2 && next.month === 3,
    amal: {
      id: "occ-last-safar",
      title: "Ziyarat of Imam al-Ridha (a)",
      subtitle: "The day of his martyrdom — the last of Safar",
      morning: "A ziyarat from afar on the day itself",
      minutes: 10,
      steps: ["Recite the ziyarat of Imam Ali al-Ridha (a) from afar."],
      links: [{ label: "Aamal of Safar — Duas.org", url: `${DUAS}/safar.htm` }],
    },
  },

  // ——— Rabi' al-Awwal ———
  {
    when: "day",
    match: on(3, 17),
    amal: {
      id: "occ-17-rabi",
      title: "Birth of the Prophet (s) — Aamal of the Day",
      subtitle: "One of the four great days of fasting",
      morning: "Fast, ghusl and ziyarat belong to the daylight of the 17th",
      minutes: 30,
      merit: "The birthday of the Messenger of Allah (s) and of Imam al-Sadiq (a); fasting it equals the fast of a year",
      steps: [
        "Fast the day, and perform ghusl.",
        "Recite the ziyarat of the Prophet (s) and of Imam Ali (a) from afar.",
        "In the forenoon pray two rak'ats: in each, al-Hamd once, al-Qadr 10 times and al-Ikhlas 10 times.",
        "Give sadaqa and bring joy to the believers.",
      ],
      links: [{ label: "Aamal of Rabi' al-Awwal — Duas.org", url: `${DUAS}/rabiulawwal.htm` }],
    },
  },

  // ——— Rajab ———
  {
    when: "night",
    match: (h) => h.month === 7,
    amal: {
      id: "occ-rajab-dua",
      title: "Daily Dua of Rajab",
      subtitle: "Ya man arjuhu li-kulli khayr",
      minutes: 2,
      merit: "Taught by Imam al-Sadiq (a) to be recited after the prayers throughout Rajab, the month of Allah",
      steps: [
        "After your prayer recite: Ya man arjuhu li-kulli khayr…",
        "Rajab is the month of istighfar — say often: Astaghfirullaha wa as'aluhut-tawba.",
      ],
      links: [{ label: "Aamal of Rajab — Duas.org", url: `${DUAS}/rajab.htm` }],
    },
  },
  {
    when: "night",
    // the eve of the first Friday of Rajab
    match: (h, d) => h.month === 7 && d.getDay() === 5 && h.day <= 7,
    amal: {
      id: "occ-raghaib",
      title: "Laylat al-Ragha'ib",
      arabicTitle: "لَيْلَةُ ٱلرَّغَائِبِ",
      subtitle: "The night of wishes — the first Thursday night of Rajab",
      minutes: 45,
      merit: "The Prophet (s): do not be heedless of the first Friday night of Rajab, for the angels call it the Night of Wishes",
      steps: [
        "If you can, fast this Thursday.",
        "Between Maghrib and Isha pray 12 rak'ats (six prayers of two): in each rak'at al-Hamd once, al-Qadr 3 times and al-Ikhlas 12 times.",
        "Then say 70 times: Allahumma salli 'ala Muhammadin al-nabiyyil-ummiyyi wa 'ala alih.",
        "In sajda say 70 times: Subbuhun quddusun rabbul-mala'ikati war-ruh.",
        "Sit and say 70 times: Rabbighfir warham wa tajawaz 'amma ta'lam, innaka antal-'aliyyul-a'zam.",
        "Sajda again with the same 70 tasbih, then ask for your needs.",
      ],
      links: [{ label: "Aamal of Rajab — Duas.org", url: `${DUAS}/rajab.htm` }],
    },
  },
  {
    when: "day",
    match: on(7, 15),
    amal: {
      id: "occ-umm-dawud",
      title: "Amal of Umm Dawud",
      subtitle: "The middle of Rajab",
      morning: "Performed near noon on the 15th, after fasting the 13th, 14th and 15th",
      minutes: 60,
      merit: "Taught by Imam al-Sadiq (a) to Umm Dawud — famed for the fulfilment of needs and relief from oppression",
      steps: [
        "Fast the three white days of Rajab (13th, 14th, 15th).",
        "On the 15th perform ghusl near noon, pray Zuhr and Asr, then recite the set surahs and the dua of Umm Dawud.",
      ],
      links: [{ label: "Amal of Umm Dawud — Duas.org", url: `${DUAS}/rajab.htm` }],
    },
  },
  {
    when: "night",
    match: on(7, 27),
    amal: {
      id: "occ-mabath-night",
      title: "The Night of Mab'ath",
      subtitle: "The eve of the 27th of Rajab",
      minutes: 40,
      merit: "One of the blessed nights of the year — the night before the Messenger (s) was raised as Prophet",
      steps: [
        "Perform ghusl.",
        "Recite the ziyarat of Imam Ali (a) — the best act of this night.",
        "Pray 12 rak'ats (six prayers of two), each with al-Hamd and any surah.",
        "Then recite 7 times each: al-Hamd, al-Falaq, al-Nas, al-Ikhlas, al-Kafirun, al-Qadr and Ayat al-Kursi, and the dua that follows.",
      ],
      links: [{ label: "Aamal of 27 Rajab — Duas.org", url: `${DUAS}/rajab27.htm` }],
    },
  },
  {
    when: "day",
    match: on(7, 27),
    amal: {
      id: "occ-mabath-day",
      title: "The Day of Mab'ath",
      subtitle: "One of the four great days of fasting",
      morning: "Fast, ghusl and ziyarat belong to the daylight of the 27th",
      minutes: 20,
      merit: "Fasting the day of Mab'ath equals the fast of seventy years",
      steps: [
        "Fast the day, and perform ghusl.",
        "Send abundant salawat.",
        "Recite the ziyarat of the Prophet (s) and of Imam Ali (a).",
      ],
      links: [{ label: "Aamal of 27 Rajab — Duas.org", url: `${DUAS}/rajab27.htm` }],
    },
  },

  // ——— Sha'ban ———
  {
    when: "night",
    match: on(8, 15),
    amal: {
      id: "occ-15-shaban-night",
      title: "The Night of 15 Sha'ban",
      arabicTitle: "لَيْلَةُ ٱلنِّصْفِ مِنْ شَعْبَانَ",
      subtitle: "The birth night of Imam al-Mahdi (aj)",
      minutes: 60,
      merit: "Imam al-Baqir (a): after Laylat al-Qadr it is the best of nights — in it Allah grants His servants His favour",
      steps: [
        "Perform ghusl and keep the night in worship.",
        "Recite the ziyarat of Imam Husayn (a) — the best act of this night.",
        "Recite Dua Kumayl.",
        "Recite the dua of the night: Allahumma bi-haqqi laylatina hadhihi wa mawludiha…",
        "Say 100 times each: Subhanallah, Alhamdulillah, Allahu akbar, La ilaha illallah.",
        "Pray for the relief of Imam al-Mahdi (aj).",
      ],
      links: [{ label: "Aamal of 15 Sha'ban — Duas.org", url: `${DUAS}/15shaban.htm` }],
    },
  },

  // ——— Ramadan ———
  {
    when: "night",
    match: (h) => h.month === 9,
    amal: {
      id: "occ-iftitah",
      title: "Dua al-Iftitah",
      arabicTitle: "دُعَاءُ ٱلِٱفْتِتَاحِ",
      subtitle: "Recited every night of the month of Ramadan",
      minutes: 20,
      merit: "Taught by Imam al-Mahdi (aj) through his deputy to be recited on each night of Ramadan",
      steps: ["Recite Dua al-Iftitah."],
      links: [{ label: "Dua al-Iftitah — Duas.org", url: `${DUAS}/iftitah.htm` }],
    },
  },
  {
    when: "night",
    match: on(9, 19, 21, 23),
    amal: {
      id: "occ-qadr",
      title: "Laylat al-Qadr",
      arabicTitle: "لَيْلَةُ ٱلْقَدْرِ",
      subtitle: "A night better than a thousand months",
      minutes: 120,
      merit: "The common aamal of the three nights of Qadr — the 23rd is the most likely, so give it the most",
      steps: [
        "Perform ghusl near sunset and keep the night awake.",
        "Pray two rak'ats: in each al-Hamd once and al-Ikhlas 7 times; then 70 times Astaghfirullaha wa atubu ilayh.",
        "Open the Quran before you, then place it on your head and call on Allah by it and by the Fourteen Infallibles, ten times each.",
        "Recite the ziyarat of Imam Husayn (a).",
        "Recite Dua al-Jawshan al-Kabir.",
        "On the 23rd add Surahs al-'Ankabut, al-Rum and al-Dukhan, Surah al-Qadr 1000 times, and the dua for the Imam: Allahumma kun li-waliyyik…",
        "Ask forgiveness, and ask for your needs in this world and the next.",
      ],
      links: [{ label: "Aamal of Laylat al-Qadr — Duas.org", url: `${DUAS}/mobile/ramadan-laylatul-qadr.html` }],
    },
  },

  // ——— Shawwal ———
  {
    when: "night",
    match: on(10, 1),
    amal: {
      id: "occ-eid-fitr-night",
      title: "The Night of Eid al-Fitr",
      subtitle: "Set aside the Zakat al-Fitra tonight",
      minutes: 30,
      merit: "Zakat al-Fitra becomes obligatory at sunset on the eve of Eid — the rest of the night's aamal are recommended",
      steps: [
        "Zakat al-Fitra (obligatory): set it aside tonight for yourself and everyone you provide for; pay it before the Eid prayer, or before Zuhr.",
        "Perform ghusl.",
        "After Maghrib and Isha recite the takbirs of Eid: Allahu akbar, Allahu akbar, la ilaha illallahu wallahu akbar, Allahu akbar wa lillahil-hamd…",
        "Recite the ziyarat of Imam Husayn (a).",
        "Pray two rak'ats: al-Hamd with al-Ikhlas 1000 times in the first (or once, if that is too much), and al-Hamd with al-Ikhlas once in the second.",
      ],
      links: [{ label: "Aamal of Ramadan and Eid — Duas.org", url: `${DUAS}/ramadhan.htm` }],
    },
  },
  {
    when: "day",
    match: on(10, 1),
    amal: {
      id: "occ-eid-fitr-day",
      title: "The Day of Eid al-Fitr",
      subtitle: "Fitra, ghusl and the Eid prayer",
      morning: "The Eid prayer is in the morning, and the fitra is due before it",
      minutes: 45,
      merit: "Fasting today is forbidden",
      steps: [
        "Pay the Zakat al-Fitra before the Eid prayer.",
        "Perform ghusl, and eat something — dates — before going out.",
        "Pray Salat al-Eid and recite the takbirs after Fajr and after the Eid prayer.",
        "Recite Dua al-Nudba.",
      ],
      links: [{ label: "Aamal of Ramadan and Eid — Duas.org", url: `${DUAS}/ramadhan.htm` }],
    },
  },

  // ——— Dhu al-Qa'dah ———
  {
    when: "day",
    match: on(11, 25),
    amal: {
      id: "occ-dahw-al-ardh",
      title: "Dahw al-Ardh",
      subtitle: "The day the earth was spread out — 25 Dhu al-Qa'dah",
      morning: "One of the four great days of fasting; its prayer is in the forenoon",
      minutes: 25,
      merit: "Fasting this day is counted as the fast of seventy years",
      steps: [
        "Fast the day, and perform ghusl.",
        "In the forenoon pray two rak'ats: in each al-Hamd once and al-Shams 5 times, then the dua that follows.",
        "Recite the ziyarat of Imam al-Ridha (a).",
      ],
      links: [{ label: "Aamal of Dhu al-Qa'dah — Duas.org", url: `${DUAS}/zilqad.htm` }],
    },
  },

  // ——— Dhu al-Hijjah ———
  {
    when: "night",
    match: (h) => h.month === 12 && h.day <= 10,
    amal: {
      id: "occ-ten-nights",
      title: "Prayer of the Ten Nights",
      subtitle: "Two rak'ats between Maghrib and Isha — first ten nights of Dhu al-Hijjah",
      minutes: 5,
      merit: "Imam al-Sadiq (a): whoever prays it shares in the reward of the pilgrims, even without making the Hajj",
      steps: [
        "Between Maghrib and Isha pray two rak'ats.",
        "In each rak'at: al-Hamd, al-Ikhlas, then the verse “Wa wa'adna Musa thalathina laylatan…” (al-A'raf 7:142).",
      ],
      links: [{ label: "Aamal of Dhu al-Hijjah — Duas.org", url: `${DUAS}/zilhajj.htm` }],
    },
  },
  {
    when: "day",
    match: on(12, 9),
    amal: {
      id: "occ-arafah",
      title: "The Day of Arafah",
      arabicTitle: "يَوْمُ عَرَفَةَ",
      subtitle: "Dua Arafah of Imam Husayn (a)",
      morning: "Its aamal are in the afternoon of Arafah, before sunset",
      minutes: 90,
      merit: "A day of dua and forgiveness — fast it only if fasting will not weaken you for supplication",
      steps: [
        "Perform ghusl before noon.",
        "Recite the ziyarat of Imam Husayn (a).",
        "After Asr, under the open sky if you can, recite Dua Arafah of Imam Husayn (a).",
        "Recite Supplication 47 of al-Sahifa al-Sajjadiyya.",
      ],
      links: [
        { label: "Aamal and Dua of Arafah — Duas.org", url: `${DUAS}/zilhajj/arafa.htm` },
        { label: "Sahifa Sajjadiyya, Supplication 47 — Duas.org", url: `${DUAS}/sajjadiya/s47.htm` },
      ],
    },
  },
  {
    when: "day",
    match: on(12, 10),
    amal: {
      id: "occ-eid-adha",
      title: "The Day of Eid al-Adha",
      subtitle: "Ghusl, the Eid prayer and the sacrifice",
      morning: "The Eid prayer is in the morning",
      minutes: 45,
      merit: "Fasting today is forbidden",
      steps: [
        "Perform ghusl and pray Salat al-Eid; eat after the prayer, from the sacrifice if you can.",
        "Offer or arrange a sacrifice (qurbani).",
        "Recite the takbirs after the prayers, and Dua al-Nudba.",
      ],
      links: [{ label: "Aamal of Dhu al-Hijjah — Duas.org", url: `${DUAS}/zilhajj.htm` }],
    },
  },
  {
    when: "day",
    match: on(12, 18),
    amal: {
      id: "occ-ghadir",
      title: "Eid al-Ghadir",
      arabicTitle: "عِيدُ ٱلْغَدِيرِ",
      subtitle: "The greatest Eid — the day of the wilaya of Imam Ali (a)",
      morning: "Fast, ghusl, the prayer before noon and the ziyarat all belong to the day",
      minutes: 45,
      merit: "Imam al-Sadiq (a): fasting the day of Ghadir equals the fast of a lifetime and is an expiation for sixty years",
      steps: [
        "Fast the day, and perform ghusl.",
        "Recite the ziyarat of Imam Ali (a) — Ziyarat Aminullah.",
        "Half an hour before noon pray two rak'ats: in each al-Hamd once, then al-Ikhlas, Ayat al-Kursi and al-Qadr 10 times each.",
        "Recite Dua al-Nudba.",
        "Greet the believers: Alhamdu lillahil-ladhi ja'alana minal-mutamassikina bi-wilayati Amiril-Mu'minina wal-a'imma (a).",
        "Feed a believer and give sadaqa.",
      ],
      links: [{ label: "Aamal of Eid al-Ghadir — Duas.org", url: `${DUAS}/ghadir.htm` }],
    },
  },
  {
    when: "day",
    match: on(12, 24),
    amal: {
      id: "occ-mubahala",
      title: "The Day of Mubahala",
      subtitle: "24 Dhu al-Hijjah",
      morning: "Fast, ghusl and the prayer belong to the day",
      minutes: 30,
      merit: "The day the Prophet (s) brought out his Ahl al-Bayt (a) against the Christians of Najran — and the day Imam Ali (a) gave his ring in ruku'",
      steps: [
        "Fast the day, and perform ghusl.",
        "Pray the two rak'ats as on the day of Ghadir.",
        "Recite the Dua of Mubahala.",
        "Give sadaqa, following Imam Ali (a).",
      ],
      links: [{ label: "Aamal of Mubahala — Duas.org", url: `${DUAS}/mubahila.htm` }],
    },
  },
];

function build(o: Occasion): Amal {
  return {
    ...o.amal,
    type: o.amal.type ?? "action",
    days: [],
    timeOfDay: o.when === "night" ? "night" : "morning",
  };
}

/** Occasion aamal belonging to the Islamic date `h` (whose daylight is `date`). */
export function occasionsFor(
  when: "night" | "day",
  h: HijriParts,
  date: Date,
  next: HijriParts,
): Amal[] {
  return OCCASIONS.filter((o) => o.when === when && o.match(h, date, next)).map(build);
}
