// Verified audio sources per amal id, ordered by preference (Ali Fani first when available).
// Every YouTube id was checked against the oembed endpoint and every mp3 URL returns
// HTTP 200 with an audio/mpeg content type (verified 2026-08-18).

import type { AudioSource } from "./types";

export const audioOverrides: Record<string, AudioSource[]> = {
  // ——— Core duas ———

  "dua-faraj": [
    {
      title: "Dua Faraj “Allahumma Kun Li Waliyyik” — Ali Fani",
      reciter: "Ali Fani",
      kind: "youtube",
      url: "E3bJHT0uF1w",
    },
    {
      title: "Azumal Bala (Dua Faraj) — Ali Fani",
      reciter: "Ali Fani",
      kind: "youtube",
      url: "rGeCVjpEodM",
    },
    {
      title: "Dua Allahumma Kun li Waliyyik — Sayyed Nasser Sharaf",
      reciter: "Sayyed Nasser Sharaf",
      kind: "youtube",
      url: "HN3Xyq0Dmkc",
    },
  ],

  "dua-ahd": [
    {
      title: "Dua Ahd (EN sub) — Ali Fani",
      reciter: "Ali Fani",
      kind: "youtube",
      url: "bF3gUmjJv9M",
    },
    {
      title: "Dua Ahd (AR sub) — Ali Fani",
      reciter: "Ali Fani",
      kind: "youtube",
      url: "ZKKeRGROaoo",
    },
  ],

  "dua-kumayl": [
    {
      title: "Dua Kumayl — Ali Fani, Mohsen Farahmand Azad & Sayed Mustafa Al Musawi",
      reciter: "Ali Fani",
      kind: "youtube",
      url: "Vq_IhRfQYwQ",
    },
    {
      title: "Dua Kumayl (EN sub) — Abu Thar al-Halawaji",
      reciter: "Abu Thar al-Halawaji",
      kind: "youtube",
      url: "pvqdJsUBngA",
    },
    {
      title: "Dua Kumayl (HD) — Haaj Mahdi Samavati",
      reciter: "Mahdi Samavati",
      kind: "youtube",
      url: "3bWGJC1f5Pw",
    },
  ],

  "dua-nudba": [
    {
      title: "Dua Nudba (4K, AR/UR sub) — Haaj Mahdi Samavati",
      reciter: "Mahdi Samavati",
      kind: "youtube",
      url: "Jp12EFPb5NQ",
    },
    {
      title: "Dua Nudba — AbdulHai Qambar",
      reciter: "AbdulHai Qambar",
      kind: "youtube",
      url: "OmrfzVgXmzk",
    },
  ],

  salawat: [
    {
      title: "Be Taha Be Yasin — Ali Fani live at Jamkaran Mosque (Mid-Sha'ban)",
      reciter: "Ali Fani",
      kind: "youtube",
      url: "gmBl0fVzPNA",
    },
    {
      title: "Be Taha Be Yasin (Imam Mahdi nasheed) — Ali Fani",
      reciter: "Ali Fani",
      kind: "youtube",
      url: "RwmJZCqVhOE",
    },
  ],

  // ——— Daily dua of each weekday (duas.org mp3s) ———

  "sun-dua": [
    {
      title: "Dua of Sunday — AbdulHayy Al-Qambar",
      reciter: "AbdulHayy Al-Qambar",
      kind: "mp3",
      url: "https://mp3.duas.org/Day_of_week/Sunday%20Dua%20-%20AbdulHayy%20Al%20Qambar.mp3",
    },
  ],
  "mon-dua": [
    {
      title: "Dua of Monday — AbdulHayy Al-Qambar",
      reciter: "AbdulHayy Al-Qambar",
      kind: "mp3",
      url: "https://mp3.duas.org/Day_of_week/Monday%20Dua%20-%20AbdulHayy%20Al%20Qambar.mp3",
    },
  ],
  "tue-dua": [
    {
      title: "Dua of Tuesday — AbdulHayy Al-Qambar",
      reciter: "AbdulHayy Al-Qambar",
      kind: "mp3",
      url: "https://mp3.duas.org/Day_of_week/Tuesday%20Dua%20-%20AbdulHayy%20Al%20Qambar.mp3",
    },
  ],
  "wed-dua": [
    {
      title: "Dua of Wednesday — AbdulHayy Al-Qambar",
      reciter: "AbdulHayy Al-Qambar",
      kind: "mp3",
      url: "https://mp3.duas.org/Day_of_week/Wednesday%20Dua%20-%20AbdulHayy%20Al%20Qambar.mp3",
    },
  ],
  "thu-dua": [
    {
      title: "Dua of Thursday — AbdulHayy Al-Qambar",
      reciter: "AbdulHayy Al-Qambar",
      kind: "mp3",
      url: "https://mp3.duas.org/Day_of_week/Thursday%20Dua%20-%20AbdulHayy%20Al%20Qambar.mp3",
    },
  ],
  "fri-dua": [
    {
      title: "Dua of Friday — AbdulHayy Al-Qambar",
      reciter: "AbdulHayy Al-Qambar",
      kind: "mp3",
      url: "https://mp3.duas.org/Day_of_week/Friday%20Dua%20-%20AbdulHayy%20Al%20Qambar.mp3",
    },
  ],
  "sat-dua": [
    {
      title: "Dua of Saturday — AbdulHayy Al-Qambar",
      reciter: "AbdulHayy Al-Qambar",
      kind: "mp3",
      url: "https://mp3.duas.org/Day_of_week/Saturday%20Dua%20-%20AbdulHayy%20Al%20Qambar.mp3",
    },
  ],

  // ——— Ziyarat Ashura ———

  "ziyarat-ashura": [
    {
      title: "Ziyarat Ashura (7-language subtitles) — Ali Fani",
      reciter: "Ali Fani",
      kind: "youtube",
      url: "Sj5H_NOCUEI",
    },
    {
      title: "Ziyarat Ashura (with lyrics) — Ali Fani",
      reciter: "Ali Fani",
      kind: "youtube",
      url: "uR64-Yo6wfs",
    },
  ],

  // ——— Weekday ziyarat (duas.org mp3s) ———

  "ziyarat-prophet": [
    {
      title: "Saturday Ziyarat of the Holy Prophet (s)",
      reciter: "Duas.org",
      kind: "mp3",
      url: "https://mp3.duas.org/saturday-ziyarat-holyprophet-saws.mp3",
    },
  ],
  "ziyarat-ali-fatima": [
    {
      title: "Sunday Ziyarat of Imam Ali (a)",
      reciter: "Duas.org",
      kind: "mp3",
      url: "https://mp3.duas.org/sunday-ziyarat-imamali-as.mp3",
    },
    {
      title: "Sunday Ziyarat of Lady Fatima (a)",
      reciter: "Duas.org",
      kind: "mp3",
      url: "https://mp3.duas.org/sunday-ziyarat-ladyfatima-sa.mp3",
    },
  ],
  "ziyarat-hasanayn": [
    {
      title: "Monday Ziyarat of Imam Hasan & Imam Husayn (a)",
      reciter: "Duas.org",
      kind: "mp3",
      url: "https://mp3.duas.org/monday-ziyarat.mp3",
    },
  ],
  "ziyarat-sajjad-baqir-sadiq": [
    {
      title: "Tuesday Ziyarat of Imams Sajjad, Baqir & Sadiq (a)",
      reciter: "Duas.org",
      kind: "mp3",
      url: "https://mp3.duas.org/tuesday-ziyarat.mp3",
    },
  ],
  "ziyarat-kadhim-ridha-jawad-hadi": [
    {
      title: "Wednesday Ziyarat of Imams Kadhim, Ridha, Jawad & Hadi (a)",
      reciter: "Duas.org",
      kind: "mp3",
      url: "https://mp3.duas.org/wednesday-ziyarat.mp3",
    },
  ],
  "ziyarat-askari": [
    {
      title: "Thursday Ziyarat of Imam Hasan al-Askari (a)",
      reciter: "Duas.org",
      kind: "mp3",
      url: "https://mp3.duas.org/thursday-ziyarat.mp3",
    },
  ],
  "ziyarat-mahdi": [
    {
      title: "Friday Ziyarat of Imam Mahdi (aj)",
      reciter: "Duas.org",
      kind: "mp3",
      url: "https://mp3.duas.org/friday-ziyarat-imammahdi-as.mp3",
    },
  ],

  // ——— Tasbih ———

  "tasbih-zahra": [
    {
      title: "Tasbih al-Zahra (EN sub) — Mahdi Rasouli",
      reciter: "Mahdi Rasouli",
      kind: "youtube",
      url: "jkKUudHrLtA",
    },
  ],
};
