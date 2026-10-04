"use client";

import { useT } from "@/lib/i18n";

/**
 * Branded splash — server-rendered, so it paints instantly while the
 * client resolves the local date and hydrates the day's session.
 */
export function Splash() {
  const { t } = useT();
  return (
    <div className="grid min-h-[82dvh] place-items-center">
      <div className="animate-rise px-6 text-center">
        <p className="font-arabic text-[2.6rem] leading-[1.9] text-gold animate-glow-pulse">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>
        <p className="mt-5 font-display text-2xl tracking-tight text-cream">
          {t("app.name")}
        </p>
        <p className="mt-1.5 text-[0.9rem] italic text-cream-dim">
          {t("day.splash.tagline")}
        </p>
        <div className="hairline mx-auto mt-7 w-44" />
      </div>
    </div>
  );
}
