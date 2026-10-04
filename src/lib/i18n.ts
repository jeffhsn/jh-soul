"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { UI } from "@/i18n/ui";

/**
 * Four languages: English, Italian, Arabic (right to left) and German.
 *
 *  - `da:lang` holds this device's choice (a device preference, never synced);
 *    with none, the browser's language decides. layout.tsx sets <html lang dir>
 *    from it before the first paint, so Arabic opens mirrored without a flash.
 *  - Screen text: `t("key", { vars })` from the dictionaries in src/i18n/ui
 *    (one fragment per area). Plurals: `key_one`, `key_two`, `key_few`,
 *    `key_many`, `key_other` picked by Intl.PluralRules from `count`.
 *  - Content (aamal, events…): translated by their English text — see
 *    src/lib/content-i18n.ts and src/i18n/content.
 */

export type Locale = "en" | "it" | "ar" | "de";

export const LOCALES: Record<Locale, { name: string; dir: "ltr" | "rtl"; intl: string }> = {
  en: { name: "English", dir: "ltr", intl: "en" },
  it: { name: "Italiano", dir: "ltr", intl: "it" },
  ar: { name: "العربية", dir: "rtl", intl: "ar-u-nu-latn" },
  de: { name: "Deutsch", dir: "ltr", intl: "de" },
};

const KEY = "da:lang";
const listeners = new Set<() => void>();

export function isLocale(x: unknown): x is Locale {
  return x === "en" || x === "it" || x === "ar" || x === "de";
}

/** The saved choice, else the browser's language, else English. */
export function currentLocale(): Locale {
  if (typeof window === "undefined") return "en";
  try {
    const saved = window.localStorage.getItem(KEY);
    if (isLocale(saved)) return saved;
  } catch {}
  const nav = (navigator.language || "en").slice(0, 2);
  return isLocale(nav) ? nav : "en";
}

export function setLocale(next: Locale) {
  try {
    window.localStorage.setItem(KEY, next);
  } catch {}
  document.documentElement.lang = next;
  document.documentElement.dir = LOCALES[next].dir;
  listeners.forEach((l) => l());
}

/** Inline in <head>: lang and dir before the first paint. Keep in step with currentLocale(). */
export const LOCALE_BOOT = `try{var l=localStorage.getItem("${KEY}");if(["en","it","ar","de"].indexOf(l)<0){l=(navigator.language||"en").slice(0,2);if(["it","ar","de"].indexOf(l)<0)l="en"}document.documentElement.lang=l;document.documentElement.dir=l==="ar"?"rtl":"ltr"}catch(e){}`;

export function useLocale(): Locale {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    currentLocale,
    () => "en" as Locale,
  );
}

type Vars = Record<string, string | number>;

const pluralCache = new Map<Locale, Intl.PluralRules>();

/** Plain function form, for code outside components (pass the locale). */
export function translate(locale: Locale, key: string, vars?: Vars): string {
  let text: string | undefined;
  if (vars && typeof vars.count === "number") {
    let rules = pluralCache.get(locale);
    if (!rules) pluralCache.set(locale, (rules = new Intl.PluralRules(LOCALES[locale].intl)));
    const form = vars.count === 0 ? "zero" : rules.select(vars.count);
    text =
      UI[locale][`${key}_${form}`] ??
      UI[locale][`${key}_other`] ??
      UI.en[`${key}_${new Intl.PluralRules("en").select(vars.count)}`] ??
      UI.en[`${key}_other`];
  }
  text ??= UI[locale][key] ?? UI.en[key] ?? key;
  return vars ? text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : text;
}

/** `t` for the current language, plus what layout and dates need. */
export function useT() {
  const locale = useLocale();
  const t = useCallback((key: string, vars?: Vars) => translate(locale, key, vars), [locale]);
  return useMemo(
    () => ({ t, locale, dir: LOCALES[locale].dir, intl: LOCALES[locale].intl, rtl: locale === "ar" }),
    [t, locale],
  );
}
