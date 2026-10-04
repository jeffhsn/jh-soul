"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { shareLink, useSyncStatus } from "@/lib/sync";

const STATUS = {
  off: "Saved on this device.",
  syncing: "Saving…",
  synced: "Saved on this device and backed up.",
  error: "Saved on this device — the backup will catch up when you are online.",
} as const;

/**
 * No accounts: each person's progress is theirs alone. This is the one place
 * that says so, and hands over the private link that opens the same progress
 * on another phone or computer.
 */
export function SyncNote() {
  const status = useSyncStatus();
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = shareLink();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Your private link", url);
    }
  }

  return (
    <div className="mx-auto mb-8 max-w-md text-[0.78rem] leading-relaxed text-cream-faint">
      <p>Your progress is yours alone. {STATUS[status]}</p>
      <button
        onClick={share}
        className="mt-3 inline-flex items-center gap-2 rounded-full border border-night-line px-4 py-2 text-cream-dim transition hover:border-gold-dim hover:text-gold-bright active:scale-95"
      >
        {copied ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />}
        {copied ? "Link copied" : "Use on another device"}
      </button>
      <p className="mt-2 text-[0.7rem] italic">
        Open the copied link on your other phone or computer. Keep it private — it opens your progress.
      </p>
    </div>
  );
}
