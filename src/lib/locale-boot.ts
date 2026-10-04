// Server-safe (no "use client"): layout.tsx inlines it in <head>.
const KEY = "da:lang";

/** Inline in <head>: lang and dir before the first paint. Keep in step with currentLocale() in src/lib/i18n.ts. */
export const LOCALE_BOOT = `try{var l=localStorage.getItem("${KEY}");if(["en","it","ar","de"].indexOf(l)<0){l=(navigator.language||"en").slice(0,2);if(["it","ar","de"].indexOf(l)<0)l="en"}document.documentElement.lang=l;document.documentElement.dir=l==="ar"?"rtl":"ltr"}catch(e){}`;

