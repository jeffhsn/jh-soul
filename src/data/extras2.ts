import type { Amal } from "./types";

/** Short daily items from the classic ShiaPlus-style checklist. */
export const extras2: Amal[] = [
  {
    id: "fatiha",
    title: "Surah al-Fatiha",
    arabicTitle: "سُورَةُ الْفَاتِحَة",
    subtitle: "The Opening — the greatest surah of the Quran",
    morning: "A morning recitation — it opens the day as it opens the Book",
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
    morning: "Part of the morning dhikr",
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
  {
    id: "dua-itidhar",
    title: "Dua of Apology",
    arabicTitle: "دُعَاءُ ٱلِٱعْتِذَارِ",
    subtitle: "Seeking pardon for wrongs toward Allah's servants",
    type: "dua",
    days: "daily",
    timeOfDay: "evening",
    minutes: 2,
    merit:
      "Supplication 38 of al-Sahifa al-Sajjadiyya — Imam Zayn al-Abidin (a) asking pardon for misdeeds toward others and for falling short in their rights",
    lines: [
      { ar: "اَللَّهُمَّ إِنِّي أَعْتَذِرُ إِلَيْكَ", tr: "Allahumma inni a'tadhiru ilayk", en: "O Allah, I ask pardon from You" },
      { ar: "مِنْ مَظْلُومٍ ظُلِمَ بِحَضْرَتِي فَلَمْ أَنْصُرْهُ", tr: "min mazlumin zulima bi-hadrati fa-lam ansurh", en: "for the person wronged in my presence whom I did not help," },
      { ar: "وَمِنْ مَعْرُوفٍ أُسْدِيَ إِلَيَّ فَلَمْ أَشْكُرْهُ", tr: "wa min ma'rufin usdiya ilayya fa-lam ashkurh", en: "for the favour done to me for which I returned no thanks," },
      { ar: "وَمِنْ مُسِيءٍ ٱعْتَذَرَ إِلَيَّ فَلَمْ أَعْذِرْهُ", tr: "wa min musi'in i'tadhara ilayya fa-lam a'dhirh", en: "for the wrongdoer who asked my pardon and whom I did not pardon," },
      { ar: "وَمِنْ ذِي فَاقَةٍ سَأَلَنِي فَلَمْ أُوثِرْهُ", tr: "wa min dhi faqatin sa'alani fa-lam uthirh", en: "for the needy one who asked of me and whom I did not prefer over myself," },
      { ar: "وَمِنْ حَقِّ ذِي حَقٍّ لَزِمَنِي لِمُؤْمِنٍ فَلَمْ أُوَفِّرْهُ", tr: "wa min haqqi dhi haqqin lazimani li-mu'minin fa-lam uwaffirh", en: "for the right of a believer that was incumbent on me and which I did not fulfil," },
      { ar: "وَمِنْ عَيْبِ مُؤْمِنٍ ظَهَرَ لِي فَلَمْ أَسْتُرْهُ", tr: "wa min 'aybi mu'minin zahara li fa-lam asturh", en: "for the fault of a believer that became plain to me and which I did not conceal," },
      { ar: "وَمِنْ كُلِّ إِثْمٍ عَرَضَ لِي فَلَمْ أَهْجُرْهُ", tr: "wa min kulli ithmin 'arada li fa-lam ahjurh", en: "and for every sin that presented itself to me and which I did not shun." },
      { ar: "أَعْتَذِرُ إِلَيْكَ يَا إِلٰهِي مِنْهُنَّ وَمِنْ نَظَائِرِهِنَّ", tr: "a'tadhiru ilayka ya ilahi minhunna wa min naza'irihinn", en: "I ask Your pardon, my God, for all of these and for their likes," },
      { ar: "ٱعْتِذَارَ نَدَامَةٍ يَكُونُ وَاعِظًا لِمَا بَيْنَ يَدَيَّ مِنْ أَشْبَاهِهِنَّ", tr: "i'tidhara nadamatin yakunu wa'izan lima bayna yadayya min ashbahihinn", en: "with an apology of remorse that may warn me against the like of them that lie ahead of me." },
      { ar: "فَصَلِّ عَلَىٰ مُحَمَّدٍ وَآلِهِ", tr: "fa-salli 'ala Muhammadin wa alih", en: "So bless Muhammad and his Household," },
      { ar: "وَٱجْعَلْ نَدَامَتِي عَلَىٰ مَا وَقَعْتُ فِيهِ مِنَ ٱلزَّلَّاتِ", tr: "waj'al nadamati 'ala ma waqa'tu fihi minaz-zallat", en: "and make my remorse for the slips into which I have fallen," },
      { ar: "وَعَزْمِي عَلَىٰ تَرْكِ مَا يَعْرِضُ لِي مِنَ ٱلسَّيِّئَاتِ", tr: "wa 'azmi 'ala tarki ma ya'ridu li minas-sayyi'at", en: "and my resolve to leave the evil deeds that present themselves to me," },
      { ar: "تَوْبَةً تُوجِبُ لِي مَحَبَّتَكَ", tr: "tawbatan tujibu li mahabbatak", en: "a repentance that makes Your love for me certain," },
      { ar: "يَا مُحِبَّ ٱلتَّوَّابِينَ", tr: "ya muhibbat-tawwabin", en: "O Lover of those who repent!" },
    ],
    audio: [
      {
        title: "Sahifa Sajjadiyya, Supplication 38 — Duas.org",
        reciter: "Duas.org",
        kind: "mp3",
        url: "https://mp3.duas.org/Sahifa%20Sajjadia/SS038.mp3",
      },
    ],
    links: [
      {
        label: "Supplication 38 with translation — Duas.org",
        url: "https://www.duas.org/sajjadiya/s38.htm",
      },
    ],
  },
];
