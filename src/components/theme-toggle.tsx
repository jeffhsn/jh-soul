"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

/** Keep the browser/status-bar chrome color in step with the chosen theme. */
function syncThemeColor(light: boolean) {
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", light ? "#f3f6f0" : "#101613");
}

function useTheme() {
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

  return { light, toggle };
}

/** Small round toggle that sits inside a rail or header — no floating chrome. */
export function ThemeToggle() {
  const { light, toggle } = useTheme();
  return (
    <button
      aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
      onClick={toggle}
      className="grid size-10 shrink-0 place-items-center rounded-full border border-night-line text-cream-dim transition hover:border-gold-dim hover:text-gold-bright active:scale-95"
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

/** Bottom-navigation variant for phones — sits beside the Today/Calendar/Progress tabs. */
export function ThemeToggleNavItem() {
  const { light, toggle } = useTheme();
  return (
    <button
      aria-label={light ? "Theme: switch to dark mode" : "Theme: switch to light mode"}
      onClick={toggle}
      className={cn(
        "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-cream-faint transition",
        light === null && "opacity-0",
      )}
    >
      {light ? <Moon className="size-5" /> : <Sun className="size-5" />}
      <span className="text-[0.68rem] tracking-wide">Theme</span>
    </button>
  );
}
