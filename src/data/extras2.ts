import type { Amal } from "./types";

/** Short daily items from the classic ShiaPlus-style checklist. */
export const extras2: Amal[] = [
  {
    id: "fatiha",
    title: "Surah al-Fatiha",
    arabicTitle: "سُورَةُ الْفَاتِحَة",
    subtitle: "The Opening — the greatest surah of the Quran",
    type: "quran",
    days: "daily",
    timeOfDay: "morning",
    minutes: 1,
    merit: "The Prophet (s) called it the greatest surah in the Quran — a cure and a light.",
    lines: [
      {
        ar: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
        tr: "Bismillahir-rahmanir-rahim",
        en: "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
      },
      {
        ar: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
        tr: "Alhamdu lillahi rabbil-'alamin",
        en: "All praise is due to Allah, Lord of the worlds —",
      },
      {
        ar: "الرَّحْمَٰنِ الرَّحِيمِ",
        tr: "Ar-rahmanir-rahim",
        en: "The Entirely Merciful, the Especially Merciful,",
      },
      {
        ar: "مَالِكِ يَوْمِ الدِّينِ",
        tr: "Maliki yawmid-din",
        en: "Sovereign of the Day of Recompense.",
      },
      {
        ar: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
        tr: "Iyyaka na'budu wa iyyaka nasta'in",
        en: "It is You we worship and You we ask for help.",
      },
      {
        ar: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ",
        tr: "Ihdinas-siratal-mustaqim",
        en: "Guide us to the straight path —",
      },
      {
        ar: "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ",
        tr: "Siratal-ladhina an'amta 'alayhim, ghayril-maghdubi 'alayhim wa lad-dallin",
        en: "The path of those upon whom You have bestowed favor, not of those who have evoked anger or of those who are astray.",
      },
    ],
    audio: [
      {
        title: "Surah al-Fatiha — Mishary Alafasy",
        reciter: "Mishary Rashid Alafasy",
        kind: "mp3",
        url: "https://server8.mp3quran.net/afs/001.mp3",
      },
    ],
  },
  {
    id: "tasbihat-arbaa",
    title: "Tasbihat al-Arba'a",
    arabicTitle: "التَّسْبِيحَاتُ الْأَرْبَعَة",
    subtitle: "The four praises, ten times",
    type: "counter",
    days: "daily",
    timeOfDay: "morning",
    minutes: 2,
    count: 10,
    merit: "The Prophet (s) said each recitation plants a tree in Paradise.",
    lines: [
      {
        ar: "سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ وَلَا إِلَٰهَ إِلَّا اللَّهُ وَاللَّهُ أَكْبَرُ",
        tr: "Subhanallahi wal-hamdu lillahi wa la ilaha illallahu wallahu akbar",
        en: "Glory be to Allah, all praise is for Allah, there is no god but Allah, and Allah is the Greatest.",
      },
    ],
  },
];
