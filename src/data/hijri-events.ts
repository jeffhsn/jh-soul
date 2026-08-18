/**
 * Major Islamic (Shia) occasions keyed by Hijri "month-day" (1-based month).
 * Dates follow the widely observed (Twelver) calendar; local moon-sighting
 * may shift observance by a day.
 */

export type EventKind = "mourning" | "celebration" | "sacred";

export interface HijriEvent {
  month: number;
  day: number;
  title: string;
  kind: EventKind;
}

export const hijriEvents: HijriEvent[] = [
  // Muharram
  { month: 1, day: 1, title: "Islamic New Year — beginning of the mourning of Muharram", kind: "mourning" },
  { month: 1, day: 2, title: "Imam Husayn (a) arrives in Karbala", kind: "mourning" },
  { month: 1, day: 7, title: "Water blocked from the camp of Imam Husayn (a)", kind: "mourning" },
  { month: 1, day: 9, title: "Tasu'a — eve of Ashura; remembrance of Abbas (a)", kind: "mourning" },
  { month: 1, day: 10, title: "Ashura — martyrdom of Imam Husayn (a) and his companions", kind: "mourning" },
  { month: 1, day: 25, title: "Martyrdom of Imam Zayn al-Abidin (a)", kind: "mourning" },

  // Safar
  { month: 2, day: 7, title: "Birth of Imam Musa al-Kadhim (a) · Martyrdom of Imam Hasan (a) (one narration)", kind: "mourning" },
  { month: 2, day: 20, title: "Arba'een — fortieth of Imam Husayn (a)", kind: "mourning" },
  { month: 2, day: 28, title: "Demise of the Prophet Muhammad (s) · Martyrdom of Imam Hasan (a)", kind: "mourning" },
  { month: 2, day: 30, title: "Martyrdom of Imam Ali al-Ridha (a)", kind: "mourning" },

  // Rabi' al-Awwal
  { month: 3, day: 1, title: "Hijra — the Prophet (s) leaves for Madina; Imam Ali (a) sleeps in his bed (Laylat al-Mabit)", kind: "sacred" },
  { month: 3, day: 8, title: "Martyrdom of Imam Hasan al-Askari (a)", kind: "mourning" },
  { month: 3, day: 9, title: "Eid al-Zahra — start of the Imamate of Imam al-Mahdi (aj)", kind: "celebration" },
  { month: 3, day: 17, title: "Birth of the Prophet Muhammad (s) and Imam Ja'far al-Sadiq (a)", kind: "celebration" },

  // Rabi' al-Thani
  { month: 4, day: 8, title: "Birth of Imam Hasan al-Askari (a)", kind: "celebration" },
  { month: 4, day: 10, title: "Demise of Sayyida Ma'suma (a)", kind: "mourning" },

  // Jumada al-Awwal
  { month: 5, day: 5, title: "Birth of Sayyida Zaynab (a)", kind: "celebration" },
  { month: 5, day: 13, title: "Martyrdom of Sayyida Fatima al-Zahra (a) — first narration", kind: "mourning" },

  // Jumada al-Thani
  { month: 6, day: 3, title: "Martyrdom of Sayyida Fatima al-Zahra (a) — Ayyam al-Fatimiyya", kind: "mourning" },
  { month: 6, day: 20, title: "Birth of Sayyida Fatima al-Zahra (a)", kind: "celebration" },

  // Rajab
  { month: 7, day: 1, title: "Birth of Imam Muhammad al-Baqir (a)", kind: "celebration" },
  { month: 7, day: 3, title: "Martyrdom of Imam Ali al-Hadi (a)", kind: "mourning" },
  { month: 7, day: 10, title: "Birth of Imam Muhammad al-Jawad (a)", kind: "celebration" },
  { month: 7, day: 13, title: "Birth of Imam Ali (a) — inside the Ka'ba", kind: "celebration" },
  { month: 7, day: 15, title: "Demise of Sayyida Zaynab (a)", kind: "mourning" },
  { month: 7, day: 25, title: "Martyrdom of Imam Musa al-Kadhim (a)", kind: "mourning" },
  { month: 7, day: 27, title: "Mab'ath — the first revelation to the Prophet (s)", kind: "celebration" },

  // Sha'ban
  { month: 8, day: 3, title: "Birth of Imam Husayn (a)", kind: "celebration" },
  { month: 8, day: 4, title: "Birth of Abbas ibn Ali (a)", kind: "celebration" },
  { month: 8, day: 5, title: "Birth of Imam Zayn al-Abidin (a)", kind: "celebration" },
  { month: 8, day: 11, title: "Birth of Ali al-Akbar (a)", kind: "celebration" },
  { month: 8, day: 15, title: "Birth of Imam al-Mahdi (aj) — Laylat al-Bara'a", kind: "celebration" },

  // Ramadan
  { month: 9, day: 1, title: "First of the month of Ramadan", kind: "sacred" },
  { month: 9, day: 10, title: "Demise of Sayyida Khadija (a)", kind: "mourning" },
  { month: 9, day: 15, title: "Birth of Imam Hasan (a)", kind: "celebration" },
  { month: 9, day: 19, title: "Imam Ali (a) struck in the mihrab of Kufa — first night of Qadr", kind: "mourning" },
  { month: 9, day: 21, title: "Martyrdom of Imam Ali (a) — night of Qadr", kind: "mourning" },
  { month: 9, day: 23, title: "Laylat al-Qadr — the greatest night of Qadr", kind: "sacred" },

  // Shawwal
  { month: 10, day: 1, title: "Eid al-Fitr", kind: "celebration" },
  { month: 10, day: 25, title: "Martyrdom of Imam Ja'far al-Sadiq (a)", kind: "mourning" },

  // Dhu al-Qi'dah
  { month: 11, day: 1, title: "Birth of Sayyida Ma'suma (a)", kind: "celebration" },
  { month: 11, day: 11, title: "Birth of Imam Ali al-Ridha (a)", kind: "celebration" },
  { month: 11, day: 29, title: "Martyrdom of Imam Muhammad al-Jawad (a)", kind: "mourning" },

  // Dhu al-Hijjah
  { month: 12, day: 1, title: "Marriage of Imam Ali (a) and Sayyida Fatima (a)", kind: "celebration" },
  { month: 12, day: 7, title: "Martyrdom of Imam Muhammad al-Baqir (a)", kind: "mourning" },
  { month: 12, day: 9, title: "Day of Arafah · Martyrdom of Muslim ibn Aqil", kind: "sacred" },
  { month: 12, day: 10, title: "Eid al-Adha", kind: "celebration" },
  { month: 12, day: 15, title: "Birth of Imam Ali al-Hadi (a)", kind: "celebration" },
  { month: 12, day: 18, title: "Eid al-Ghadir — appointment of Imam Ali (a)", kind: "celebration" },
  { month: 12, day: 24, title: "Day of Mubahala", kind: "sacred" },
];

export function eventsFor(month: number, day: number): HijriEvent[] {
  return hijriEvents.filter((e) => e.month === month && e.day === day);
}
