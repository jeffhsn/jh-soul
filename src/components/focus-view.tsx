"use client";

import { useEffect, useRef } from "react";
import { Dialog } from "radix-ui";
import { ArrowUpRight, Check, ChevronDown, ChevronUp, X } from "lucide-react";
import type { Amal } from "@/data";
import type { ExternalLink } from "@/data/types";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { AudioPlayer } from "./audio-player";
import { LinesReader } from "./lines-reader";
import { PhraseCounter } from "./phrase-counter";
import { QuranPortionReader } from "./quran-portion-reader";
import { SadaqaEntry } from "./sadaqa-entry";
import { TasbihBeads } from "./tasbih-beads";

export function FocusView({
  amal,
  date,
  done,
  step,
  onStep,
  onClose,
  onDone,
  quran,
  doneLabel,
}: {
  amal: Amal;
  date: string;
  done: boolean;
  /** position in the day's list (for the arrows) and how many are checked off (for the label) */
  step: { index: number; total: number; completed: number };
  /** move to the previous/next amal without closing the reader */
  onStep: (delta: 1 | -1) => void;
  onClose: () => void;
  onDone: (value: boolean) => void;
  /** Quran readings: per-page ticks, and whether to offer the catch-up */
  quran?: {
    pages: { from: number; to: number };
    skip: number[];
    onSkip: (skip: number[]) => void;
    catchUpHint?: boolean;
  };
  /** the done button's wording (already translated), when "I have completed this" does not fit */
  doneLabel?: string;
}) {
  const { t, rtl } = useT();
  const interactive = amal.type === "tasbih" || amal.type === "counter";

  // ← / → step through the day's aamal in reading direction (mirrored in
  // Arabic), ↑ / ↓ always back / forward; Enter checks the open one as done
  useEffect(() => {
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)
      )
        return;
      if (e.key === forward || e.key === "ArrowDown") {
        e.preventDefault();
        onStep(1);
      } else if (e.key === back || e.key === "ArrowUp") {
        e.preventDefault();
        onStep(-1);
      } else if (e.key === "Enter" && !interactive) {
        // buttons/links inside the dialog keep their native Enter behaviour
        if (
          t &&
          (t.tagName === "BUTTON" || t.tagName === "A") &&
          t.closest('[role="dialog"]')
        )
          return;
        e.preventDefault();
        onDone(!done);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStep, onDone, done, interactive, rtl]);

  const contentRef = useRef<HTMLDivElement>(null);

  const stepButton =
    "grid size-11 shrink-0 place-items-center rounded-full bg-gold text-night shadow-[0_4px_16px_rgba(0,0,0,0.35)] transition hover:bg-gold-bright active:scale-95 disabled:opacity-35 disabled:hover:bg-gold";

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-night/85 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          ref={contentRef}
          // keep focus on the dialog itself so Enter marks the amal done
          // instead of activating whichever button happens to be focused
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            contentRef.current?.focus();
          }}
          // the step arrows live outside the panel — don't close on their clicks
          onInteractOutside={(e) => {
            if ((e.target as HTMLElement)?.closest?.("[data-step-nav]"))
              e.preventDefault();
          }}
          className="fixed inset-x-0 bottom-0 top-0 z-50 flex flex-col overflow-hidden outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-8 data-[state=open]:fade-in-0 sm:inset-x-auto sm:left-1/2 sm:top-[3vh] sm:h-[94vh] sm:w-full sm:max-w-2xl sm:-translate-x-1/2 sm:rounded-3xl sm:border sm:border-night-line"
          style={{ backgroundColor: "var(--color-night-raise)" }}
        >
          {/* header — clears the status bar when full-screen on phones */}
          <div className="border-b border-night-line-soft px-6 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:pt-5">
            <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Dialog.Title className="font-display text-xl leading-tight">
                {amal.title}
              </Dialog.Title>
              {amal.arabicTitle && (
                <p className="font-arabic mt-1 text-lg leading-none text-gold-bright/85">
                  {amal.arabicTitle}
                </p>
              )}
            </div>
            <Dialog.Close
              aria-label={t("reader.close")}
              className="mt-1 grid size-9 shrink-0 place-items-center rounded-full border border-night-line text-cream-dim transition hover:border-gold-dim hover:text-cream"
            >
              <X className="size-4" />
            </Dialog.Close>
            </div>
            {amal.merit && (
              <Dialog.Description className="mt-2 text-[0.82rem] italic leading-snug text-cream-dim">
                {amal.merit}
              </Dialog.Description>
            )}
          </div>

          {/* body */}
          <div className="scroll-fade no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-7">
            {amal.type === "tasbih" && amal.counterPhases ? (
              <TasbihBeads
                amalId={amal.id}
                date={date}
                phases={amal.counterPhases}
                onComplete={() => onDone(true)}
              />
            ) : amal.type === "counter" && amal.count ? (
              <PhraseCounter
                amalId={amal.id}
                date={date}
                target={amal.count}
                phrase={amal.lines?.[0]}
                onComplete={() => onDone(true)}
              />
            ) : amal.id === "sadaqa" ? (
              <>
                <SadaqaEntry date={date} onDone={() => onDone(true)} />
                {amal.links?.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-night-line px-4 py-2 text-sm text-sage transition hover:border-gold-dim hover:text-gold-bright"
                  >
                    {link.label}
                    <ArrowUpRight className="rtl:-scale-x-100 size-3.5" />
                  </a>
                ))}
              </>
            ) : amal.verseRefs && amal.audio ? (
              <>
                {/* daily Quran portion: read along with the recitation */}
                <QuranPortionReader
                  refs={amal.verseRefs}
                  audio={amal.audio}
                  date={date}
                  pages={quran?.pages}
                  skip={quran?.skip}
                  onSkip={quran?.onSkip}
                  catchUpHint={quran?.catchUpHint}
                />
                {amal.links?.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-night-line px-4 py-2 text-sm text-sage transition hover:border-gold-dim hover:text-gold-bright"
                  >
                    {link.label}
                    <ArrowUpRight className="rtl:-scale-x-100 size-3.5" />
                  </a>
                ))}
              </>
            ) : (
              <>
                {amal.audio && amal.audio.length > 0 && (
                  <div className="mb-6">
                    <AudioPlayer sources={amal.audio} />
                  </div>
                )}
                {amal.steps && (
                  <ol className="mb-6 space-y-3.5 pe-12 sm:pe-0">
                    {amal.steps.map((step, i) => (
                      <li key={i} className="flex gap-3.5">
                        <span className="grid size-6 shrink-0 place-items-center rounded-full border border-gold-dim/50 font-display text-[0.75rem] tabular-nums text-gold-bright">
                          {i + 1}
                        </span>
                        <span className="pt-0.5 text-[0.95rem] leading-relaxed text-cream">
                          {step}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
                {amal.lines && <LinesReader lines={amal.lines} />}
                {amal.links?.some((l) => l.group) ? (
                  <GroupedLinks links={amal.links} />
                ) : amal.links?.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="me-2 mt-6 inline-flex items-center gap-1.5 rounded-full border border-night-line px-4 py-2 text-sm text-sage transition hover:border-gold-dim hover:text-gold-bright"
                  >
                    {link.label}
                    <ArrowUpRight className="rtl:-scale-x-100 size-3.5" />
                  </a>
                ))}
              </>
            )}
          </div>

          {/* footer — mark done (interactive types complete themselves) */}
          {!interactive && (
            <div className="border-t border-night-line-soft px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4">
              <button
                onClick={() => onDone(!done)}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-display text-[0.95rem] transition-all",
                  done
                    ? "border border-night-line text-cream-dim hover:text-cream"
                    : "bg-gold text-night shadow-[0_0_24px_rgba(220,175,94,0.25)] hover:bg-gold-bright",
                )}
              >
                <Check className="size-4" strokeWidth={3} />
                {done ? t("reader.done.undo") : (doneLabel ?? t("reader.done.mark"))}
              </button>
            </div>
          )}
        </Dialog.Content>

        {/* vertical stepper — floats outside the panel (end edge on phones;
            beside the panel's end side on wider screens, mirrored in Arabic),
            gold so it reads as "move through the day", not part of the amal */}
        {step.total > 1 && (
        <div
          data-step-nav
          className={cn(
            "pointer-events-auto fixed bottom-[7.5rem] end-2.5 z-50 flex flex-col items-center gap-2 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2",
            rtl
              ? "sm:left-auto sm:right-[min(calc(50%+21rem+0.75rem),calc(100vw-4rem))]"
              : "sm:right-auto sm:left-[min(calc(50%+21rem+0.75rem),calc(100vw-4rem))]",
          )}
        >
          <button
            aria-label={t("reader.step.prev")}
            disabled={step.index <= 0}
            onClick={() => onStep(-1)}
            className={stepButton}
          >
            <ChevronUp className="size-5" strokeWidth={2.5} />
          </button>
          <span className="rounded-full bg-night/70 px-2 py-0.5 text-[0.7rem] tabular-nums text-gold-bright backdrop-blur">
            {step.completed}/{step.total}
          </span>
          <button
            aria-label={t("reader.step.next")}
            disabled={step.index >= step.total - 1}
            onClick={() => onStep(1)}
            className={stepButton}
          >
            <ChevronDown className="size-5" strokeWidth={2.5} />
          </button>
        </div>
        )}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * A reading/watching shelf in titled sections: books as cover tiles, channels
 * as avatar cards (numbered in their ranked order), anything else as a row.
 */
function GroupedLinks({ links }: { links: ExternalLink[] }) {
  const groups = [...new Set(links.map((l) => l.group ?? ""))];
  return (
    <div className="mt-8 space-y-8 pe-12 sm:pe-0">
      {groups.map((group) => {
        const items = links.filter((l) => (l.group ?? "") === group);
        const books = items.filter((l) => l.kind === "book");
        const channels = items.filter((l) => l.kind === "channel");
        const rows = items.filter((l) => !l.kind);
        return (
          <section key={group}>
            {group && (
              <h3 className="mb-3 text-[0.7rem] uppercase tracking-[0.18em] text-gold-dim rtl:normal-case rtl:tracking-normal">
                {group}
              </h3>
            )}
            {books.length > 0 && (
              <div className="grid grid-cols-3 gap-2.5">
                {books.map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="group block">
                    <span className="relative flex aspect-[2/3] flex-col justify-between overflow-hidden rounded-xl border border-gold-dim/40 bg-gradient-to-b from-night-card to-night-raise p-2.5 shadow-[inset_4px_0_0_var(--color-gold-dim)] transition group-hover:border-gold">
                      <span className="font-display text-[0.9rem] leading-tight text-cream">{l.label}</span>
                      <span className="text-[0.62rem] leading-snug text-gold-dim">{l.by}</span>
                    </span>
                    <span className="mt-1.5 line-clamp-2 block text-[0.68rem] leading-snug text-cream-faint">
                      {l.note}
                    </span>
                  </a>
                ))}
              </div>
            )}
            {channels.length > 0 && (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {channels.map((l, i) => (
                  <a
                    key={l.url}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative flex flex-col items-center rounded-2xl border border-night-line-soft bg-night-raise/40 px-2.5 pt-4 pb-3 text-center transition hover:border-gold-dim/60 hover:bg-night-raise"
                  >
                    <span className="absolute top-2 start-2 grid size-5 place-items-center rounded-full bg-night text-[0.62rem] tabular-nums text-gold-dim">
                      {i + 1}
                    </span>
                    {l.image && (
                      // eslint-disable-next-line @next/next/no-img-element -- tiny local avatars
                      <img
                        src={l.image}
                        alt=""
                        width={56}
                        height={56}
                        loading="lazy"
                        className="size-14 rounded-full ring-1 ring-gold-dim/40 transition group-hover:ring-gold"
                      />
                    )}
                    <span className="mt-2.5 line-clamp-2 text-[0.8rem] leading-tight text-cream">{l.label}</span>
                    <span className="mt-1 line-clamp-2 text-[0.66rem] leading-snug text-cream-faint">
                      {l.note}
                    </span>
                  </a>
                ))}
              </div>
            )}
            {rows.length > 0 && (
              <ul
                className={cn(
                  "overflow-hidden rounded-2xl border border-night-line-soft",
                  (books.length > 0 || channels.length > 0) && "mt-3",
                )}
              >
                {rows.map((l) => (
                  <li key={l.url} className="border-t border-night-line-soft first:border-t-0">
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-center justify-between gap-3 bg-night-raise/40 px-4 py-3 transition hover:bg-night-raise"
                    >
                      <span className="min-w-0">
                        <span className="block text-[0.9rem] text-cream">{l.label}</span>
                        {l.note && (
                          <span className="mt-0.5 block text-[0.75rem] leading-snug text-cream-faint">
                            {l.note}
                          </span>
                        )}
                      </span>
                      <ArrowUpRight className="rtl:-scale-x-100 size-3.5 shrink-0 text-cream-faint transition group-hover:text-gold-bright" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
