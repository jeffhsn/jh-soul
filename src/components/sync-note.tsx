"use client";

import { useRef, useState } from "react";
import { Check, Download, Link2, Upload } from "lucide-react";
import { backupFile, restoreFile, shareLink, useSyncStatus } from "@/lib/sync";

const STATUS = {
  off: "Saved on this device.",
  syncing: "Saving…",
  synced: "Saved on this device and backed up.",
  paused: "Saved on this device — the backup resumes tomorrow.",
  error: "Saved on this device — the backup will catch up when you are online.",
} as const;

const button =
  "inline-flex items-center gap-2 rounded-full border border-night-line px-4 py-2 text-cream-dim transition hover:border-gold-dim hover:text-gold-bright active:scale-95";

/**
 * No accounts: each person's progress is theirs alone. This is the one place
 * that says so, hands over the private link that opens the same progress on
 * another device (and brings it back if this browser is ever cleared), and
 * offers a backup file that needs no server at all.
 */
export function SyncNote() {
  const status = useSyncStatus();
  const [copied, setCopied] = useState(false);
  const [restored, setRestored] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

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

  async function restore(file: File | undefined) {
    if (!file) return;
    try {
      await restoreFile(file);
      setRestored("Backup restored.");
    } catch {
      setRestored("That file is not a Daily Aamal backup.");
    }
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <div className="mx-auto mb-8 max-w-md text-[0.78rem] leading-relaxed text-cream-faint">
      <p>Your progress is yours alone. {STATUS[status]}</p>
      <p className="mt-1">
        Keep your private link somewhere safe — bookmark it or send it to yourself. It opens your progress on
        another device, and brings it back if this browser is ever cleared.
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <button onClick={share} className={button}>
          {copied ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />}
          {copied ? "Link copied" : "Copy my private link"}
        </button>
        <button onClick={backupFile} className={button}>
          <Download className="size-3.5" />
          Backup file
        </button>
        <button onClick={() => fileInput.current?.click()} className={button}>
          <Upload className="size-3.5" />
          Restore
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => restore(e.target.files?.[0])}
        />
      </div>
      {restored && <p className="mt-2">{restored}</p>}
      <p className="mt-2 text-[0.7rem] italic">Anyone with your link sees your progress — share it only with yourself.</p>
    </div>
  );
}
