"use client";

import { ArrowUpRight, ChevronDown, Library } from "lucide-react";

const RESOURCES: { title: string; note: string; url: string }[] = [
  {
    title: "Al-Islam.org",
    note: "The Ahlul Bayt digital library — beliefs, history, and hundreds of books",
    url: "https://al-islam.org/",
  },
  {
    title: "Quran on Al-Islam.org",
    note: "Read the Quran with translations and Shia commentary",
    url: "https://al-islam.org/quran",
  },
  {
    title: "Duas.org",
    note: "Mafatih al-Jinan online — duas, ziyarat, and a'mal with audio",
    url: "https://duas.org/",
  },
  {
    title: "Sistani.org",
    note: "Official site of Sayyid al-Sistani — Islamic laws and Q&A",
    url: "https://www.sistani.org/english/",
  },
];

/** Quiet reference shelf — collapsed by default, it is not part of the daily session. */
export function ResourcesPanel() {
  return (
    <details className="group">
      <summary className="flex list-none items-center justify-between gap-3 rounded-2xl border border-night-line-soft bg-night-raise/40 px-4 py-3 transition hover:border-gold-dim/50 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2 font-display text-[0.95rem] text-cream-dim">
          <Library className="size-4 text-gold-dim" />
          Library — read &amp; learn
        </span>
        <ChevronDown className="size-4 text-cream-faint transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-2 space-y-2">
        {RESOURCES.map((r) => (
          <a
            key={r.url}
            href={r.url}
            target="_blank"
            rel="noreferrer"
            className="group flex items-start justify-between gap-3 rounded-2xl border border-night-line-soft bg-night-raise/50 px-4 py-3 transition hover:border-gold-dim/50"
          >
            <span className="min-w-0">
              <span className="block text-[0.88rem] text-cream">{r.title}</span>
              <span className="mt-0.5 block text-[0.75rem] leading-snug text-cream-faint">
                {r.note}
              </span>
            </span>
            <ArrowUpRight className="mt-1 size-3.5 shrink-0 text-cream-faint transition group-hover:text-gold-bright" />
          </a>
        ))}
      </div>
    </details>
  );
}
