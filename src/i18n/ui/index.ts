/**
 * Screen text in all four languages, merged from one fragment per area so
 * each can be edited on its own. Every fragment exports
 * `{ en: {...}, it: {...}, ar: {...}, de: {...} }` with the same keys;
 * English is the fallback for anything missing.
 */
import type { Locale } from "@/lib/i18n";
import core from "./core";
import day from "./day";
import reader from "./reader";
import calendar from "./calendar";

export type Dict = Record<string, string>;
export type Fragment = Record<Locale, Dict>;

const FRAGMENTS: Fragment[] = [core, day, reader, calendar];

export const UI: Record<Locale, Dict> = { en: {}, it: {}, ar: {}, de: {} };
for (const f of FRAGMENTS) for (const l of Object.keys(UI) as Locale[]) Object.assign(UI[l], f[l]);
