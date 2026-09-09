/**
 * Branded splash — server-rendered, so it paints instantly while the
 * client resolves the local date and hydrates the day's session.
 */
export function Splash() {
  return (
    <div className="grid min-h-[82dvh] place-items-center">
      <div className="animate-rise px-6 text-center">
        <p className="font-arabic text-[2.6rem] leading-[1.9] text-gold animate-glow-pulse">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>
        <p className="mt-5 font-display text-2xl tracking-tight text-cream">
          jh-soul
        </p>
        <p className="mt-1.5 text-[0.9rem] italic text-cream-dim">
          your day of remembrance
        </p>
        <div className="hairline mx-auto mt-7 w-44" />
      </div>
    </div>
  );
}
