"use client";

import { useEffect, useRef } from "react";
import { Dialog } from "radix-ui";
import { ArrowUpRight, Check, ChevronDown, ChevronUp, X } from "lucide-react";
import type { Amal } from "@/data";
import { cn } from "@/lib/utils";
import { AudioPlayer } from "./audio-player";
import { LinesReader } from "./lines-reader";
import { PhraseCounter } from "./phrase-counter";
import { QuranPortionReader } from "./quran-portion-reader";
import { TasbihBeads } from "./tasbih-beads";

export function FocusView({
  amal,
  date,
  done,
  step,
  onStep,
  onClose,
  onDone,
}: {
  amal: Amal;
  date: string;
  done: boolean;
  /** position of this amal in the day's list (0-based) and the list length */
  step: { index: number; total: number };
  /** move to the previous/next amal without closing the reader */
  onStep: (delta: 1 | -1) => void;
  onClose: () => void;
  onDone: (value: boolean) => void;
}) {
  const interactive = amal.type === "tasbih" || amal.type === "counter";

  // ← / → step through the day's aamal; Enter checks the open one as done
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)
      )
        return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        onStep(1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
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
  }, [onStep, onDone, done, interactive]);

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
              aria-label="Close"
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
            ) : amal.verseRefs && amal.audio ? (
              <>
                {/* daily Quran portion: read along with the recitation */}
                <QuranPortionReader
                  refs={amal.verseRefs}
                  audio={amal.audio}
                  date={date}
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
                    <ArrowUpRight className="size-3.5" />
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
                {amal.lines && <LinesReader lines={amal.lines} />}
                {amal.links?.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-night-line px-4 py-2 text-sm text-sage transition hover:border-gold-dim hover:text-gold-bright"
                  >
                    {link.label}
                    <ArrowUpRight className="size-3.5" />
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
                {done ? "Marked as done — undo" : "I have completed this"}
              </button>
            </div>
          )}
        </Dialog.Content>

        {/* vertical stepper — floats outside the panel (right edge on phones),
            gold so it reads as "move through the day", not part of the amal */}
        <div
          data-step-nav
          className="pointer-events-auto fixed bottom-[7.5rem] right-2.5 z-50 flex flex-col items-center gap-2 sm:bottom-auto sm:right-auto sm:left-[min(calc(50%+21rem+0.75rem),calc(100vw-4rem))] sm:top-1/2 sm:-translate-y-1/2"
        >
          <button
            aria-label="Previous amal"
            disabled={step.index <= 0}
            onClick={() => onStep(-1)}
            className={stepButton}
          >
            <ChevronUp className="size-5" strokeWidth={2.5} />
          </button>
          <span className="rounded-full bg-night/70 px-2 py-0.5 text-[0.7rem] tabular-nums text-gold-bright backdrop-blur">
            {step.index + 1}/{step.total}
          </span>
          <button
            aria-label="Next amal"
            disabled={step.index >= step.total - 1}
            onClick={() => onStep(1)}
            className={stepButton}
          >
            <ChevronDown className="size-5" strokeWidth={2.5} />
          </button>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
