# Daily Aamal

A calm, daily checklist of Shia aamal — duas, ziyarat, tasbih and Quran — one gentle step at a time.

Inspired by duas.org and ShiaPlus, rebuilt around one idea: **you should never feel overwhelmed.** You open the site, see only today, and move through it like a todo list.

## What it does

- **Today only** — the aamal for the current weekday (daily items + that day's dua, ziyarat and specials like Dua Kumayl on Thursday night, Dua al-Nudba and Surah al-Kahf on Friday), grouped by time of day.
- **Checklist flow** — tap to open a focused reader, mark done, watch the gold progress ring fill. Completed items sink to the bottom. Streaks tracked locally.
- **Audio first** — every dua carries recitation audio where available: Ali Fani preferred, other reciters as fallback; Quran recited by Mishary Alafasy.
- **Interactive tasbih** — Tasbih of Sayyida Fatima al-Zahra (a) is a real misbaha: tap to pass beads along the strand through 34 / 33 / 33, with haptics.
- **Counters** — salawat and istighfar as big tap-to-count rings.
- **Trilingual reader** — Arabic with tashkeel, transliteration, translation; each togglable.
- **Quran links** — full-surah reading links out to [Al-Islam.org](https://al-islam.org/quran).

Progress lives in `localStorage` — no accounts, no servers, private by default.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Radix UI · lucide-react. Content sourced from duas.org, Al-Islam.org and alquran.cloud; audio from verified YouTube recitations and everyayah.com / quranicaudio.com.

## Develop

```bash
npm install
npm run dev
```

Content lives in `src/data/*.ts` conforming to the `Amal` interface in `src/data/types.ts`.
