"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [light, setLight] = useState<boolean | null>(null);

  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("light");
    document.documentElement.classList.toggle("light", next);
    try {
      localStorage.setItem("da:theme", next ? "light" : "dark");
    } catch {}
    setLight(next);
  }

  return (
    <button
      aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
      onClick={toggle}
      className="fixed right-4 top-4 z-30 grid size-10 place-items-center rounded-full border border-night-line bg-night-raise/80 text-cream-dim backdrop-blur transition hover:border-gold-dim hover:text-gold-bright sm:right-6 sm:top-6"
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
