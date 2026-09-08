"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/** Keep the browser/status-bar chrome color in step with the chosen theme. */
function syncThemeColor(light: boolean) {
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", light ? "#f3f6f0" : "#101613");
}

export function ThemeToggle() {
  const [light, setLight] = useState<boolean | null>(null);

  useEffect(() => {
    const isLight = document.documentElement.classList.contains("light");
    setLight(isLight);
    syncThemeColor(isLight);
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("light");
    document.documentElement.classList.toggle("light", next);
    try {
      localStorage.setItem("da:theme", next ? "light" : "dark");
    } catch {}
    syncThemeColor(next);
    setLight(next);
  }

  return (
    <button
      aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
      onClick={toggle}
      className="fixed right-4 z-30 grid size-10 place-items-center rounded-full border border-night-line bg-night-raise/80 text-cream-dim backdrop-blur transition hover:border-gold-dim hover:text-gold-bright active:scale-95 sm:right-6"
      style={{ top: "max(1rem, env(safe-area-inset-top))" }}
    >
      {light === null ? (
        <Moon className="size-4 opacity-0" />
      ) : light ? (
        <Moon className="size-4" />
      ) : (
        <Sun className="size-4" />
      )}
    </button>
  );
}
