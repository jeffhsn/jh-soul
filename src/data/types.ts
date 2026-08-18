// Data contract for all a'māl content. Every data file must conform to these types.

/** 0 = Sunday … 6 = Saturday (JS Date.getDay convention) */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type AmalType =
  | "dua" // recited supplication, shown line by line
  | "ziyarat" // salutation to the Prophet / Imams
  | "tasbih" // multi-phase bead counter (e.g. Tasbih al-Zahra)
  | "counter" // single-phrase repetition counter (e.g. salawat x100)
  | "quran" // Quran recitation with verse audio
  | "action"; // a deed to do (ghusl, sadaqa, etc.), no text to recite

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night" | "any";

/** One line of recitable text in three scripts. */
export interface Line {
  /** Arabic with full tashkeel/diacritics */
  ar: string;
  /** Latin transliteration */
  tr: string;
  /** English translation */
  en: string;
}

export interface AudioSource {
  /** Human title, e.g. "Dua al-Faraj — Ali Fani" */
  title: string;
  reciter: string;
  kind: "youtube" | "mp3";
  /** For youtube: the 11-char video id. For mp3: absolute URL. */
  url: string;
}

export interface CounterPhase {
  phrase: Line;
  count: number;
}

export interface ExternalLink {
  label: string;
  url: string;
}

export interface Amal {
  /** stable kebab-case id, used for progress storage */
  id: string;
  title: string;
  arabicTitle?: string;
  /** one short line shown under the title in the checklist */
  subtitle?: string;
  type: AmalType;
  /** which weekdays this appears on; "daily" = every day */
  days: Weekday[] | "daily";
  timeOfDay: TimeOfDay;
  /** honest estimated minutes to complete */
  minutes: number;
  /** one-line merit/reward or source, e.g. "Taught by the Prophet (s) to Lady Fatima (a)" */
  merit?: string;
  /** recitable text, required for dua/ziyarat/quran */
  lines?: Line[];
  /** for type "counter" */
  count?: number;
  /** for type "tasbih" */
  counterPhases?: CounterPhase[];
  /** ordered by preference: Ali Fani first when available, then fallbacks */
  audio?: AudioSource[];
  links?: ExternalLink[];
}
