"use client";

import { useEffect, useRef } from "react";

/**
 * Keyboard alternative to tapping a counter: Space counts one, Backspace takes
 * one back. A held key does not repeat — each recitation is its own press.
 */
export function useCountKeys(onCount: () => void, onUndo: () => void) {
  const handlers = useRef({ onCount, onUndo });
  useEffect(() => {
    handlers.current = { onCount, onUndo };
  });

  useEffect(() => {
    function typing(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === "Space") {
        // also stops the page scrolling and a focused button "clicking" itself
        e.preventDefault();
        if (!e.repeat) handlers.current.onCount();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        if (!e.repeat) handlers.current.onUndo();
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      // a focused <button> activates on Space keyup — that would count twice
      if (e.code === "Space" && !typing(e)) e.preventDefault();
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);
}
