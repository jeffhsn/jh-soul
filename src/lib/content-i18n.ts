"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Amal } from "@/data";
import { useLocale, type Locale } from "./i18n";

/**
 * Content (aamal, events, notes) is translated by its English text:
 * src/i18n/content/<locale>/*.json map each English string, as written in
 * src/data, to its translation. A string with no translation stays English.
 * The source lists come from scripts/i18n-extract.mts.
 *
 * A language's file is fetched only when that language is chosen, so English
 * pays nothing for it. In Arabic the recited Arabic stands on its own: the
 * translation and transliteration of duas, ziyarat and Quran are not shown.
 */

const LOADERS: Record<Exclude<Locale, "en">, () => Promise<{ default: Record<string, string> }>> = {
  it: () => import("@/i18n/content/it"),
  de: () => import("@/i18n/content/de"),
  ar: () => import("@/i18n/content/ar"),
};

const loaded = new Map<Locale, Record<string, string>>();
const pending = new Set<Locale>();
const listeners = new Set<() => void>();

function ensure(locale: Locale) {
  if (locale === "en" || loaded.has(locale) || pending.has(locale)) return;
  pending.add(locale);
  LOADERS[locale]()
    .then((m) => loaded.set(locale, m.default))
    .catch(() => {})
    .finally(() => {
      pending.delete(locale);
      listeners.forEach((l) => l());
    });
}

const EMPTY: Record<string, string> = {};

/** This language's content dictionary (empty until it has loaded, and for English). */
function useDictionary(locale: Locale) {
  ensure(locale);
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => loaded.get(locale) ?? EMPTY,
    () => EMPTY,
  );
}

export type Tx = (english: string | undefined) => string;

/** `tx("English content text")` → the current language's text. */
export function useContent(): { tx: Tx; locale: Locale; ready: boolean } {
  const locale = useLocale();
  const dict = useDictionary(locale);
  const tx = useCallback<Tx>((s) => (s ? (dict[s.trim()] ?? s) : ""), [dict]);
  return { tx, locale, ready: locale === "en" || dict !== EMPTY };
}

/** An amal with every displayed text in the current language. */
export function localizeAmal(a: Amal, tx: Tx, locale: Locale): Amal {
  if (locale === "en") return a;
  const action = a.type === "action";
  const ar = locale === "ar";
  return {
    ...a,
    title: tx(a.title),
    subtitle: a.subtitle && tx(a.subtitle),
    merit: a.merit && tx(a.merit),
    morning: a.morning && tx(a.morning),
    steps: a.steps?.map(tx),
    links: a.links?.map((l) => ({ ...l, label: tx(l.label), note: l.note && tx(l.note), group: l.group && tx(l.group) })),
    lines: a.lines?.map((l) =>
      action
        ? { ...l, tr: tx(l.tr), en: tx(l.en) }
        : ar
          ? { ...l, tr: "", en: "" }
          : { ...l, en: tx(l.en) },
    ),
    counterPhases: a.counterPhases?.map((p) => ({
      ...p,
      phrase: ar ? { ...p.phrase, tr: "", en: "" } : { ...p.phrase, en: tx(p.phrase.en) },
    })),
  };
}
