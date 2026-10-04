"use client";

import { Languages } from "lucide-react";
import { LOCALES, setLocale, useT, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * The language picker is the phone's own list (a native select laid over the
 * button): instant on any device, fully accessible, nothing to download.
 */
function Picker({ className }: { className?: string }) {
  const { t, locale } = useT();
  return (
    <select
      aria-label={t("lang.label")}
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      className={cn("absolute inset-0 cursor-pointer opacity-0", className)}
    >
      {(Object.keys(LOCALES) as Locale[]).map((l) => (
        <option key={l} value={l} lang={l}>
          {LOCALES[l].name}
        </option>
      ))}
    </select>
  );
}

/** Round button beside the theme toggle, showing the current language's code. */
export function LanguageSwitcher() {
  const { locale } = useT();
  return (
    <span className="relative grid size-10 shrink-0 place-items-center rounded-full border border-night-line text-[0.72rem] font-medium uppercase text-cream-dim transition hover:border-gold-dim hover:text-gold-bright">
      {locale === "ar" ? "ع" : locale}
      <Picker />
    </span>
  );
}

/** Bottom-navigation variant for phones. */
export function LanguageNavItem() {
  const { t } = useT();
  return (
    <span className="relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-cream-faint transition">
      <Languages className="size-5" />
      <span className="text-[0.68rem] tracking-wide">{t("lang.label")}</span>
      <Picker />
    </span>
  );
}
