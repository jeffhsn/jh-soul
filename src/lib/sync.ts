"use client";

import { useSyncExternalStore } from "react";
import { emit, subscribe } from "./store";
import { foldOldYears } from "./year";

/**
 * Everything under `da:` lives in this browser first; the cloud keeps each
 * person's own copy so nothing is lost and their devices agree. No accounts:
 * every browser makes up a random secret id (`da:sync:id`) the first time,
 * and opening the site with `#id=<id>` makes another device join that copy
 * (its own progress is merged in, nothing is thrown away).
 *
 * Only changes travel. A sync sends the keys stamped (`da:meta:updated`)
 * since the last one, with deletions as a stamp without a value, and gets
 * back every key the cloud changed since `da:sync:rev`. Newest stamp wins.
 * One request, one Redis command (src/app/api/sync/route.ts).
 *
 *  - on load, and when the tab comes back after 10 minutes or more
 *  - 20 s after a local write, and on page hide
 * The cloud lives on a free plan with a daily budget: when it says the budget
 * is spent (429) or it is full (507), this device keeps working from its own
 * copy and tries again later.
 */

const ID = "da:sync:id";
const REV = "da:sync:rev";
const PUSHED = "da:sync:pushed";
const META = "da:meta:updated";
/** device preferences, caches and this device's own sync bookkeeping stay local */
const SKIP = new Set([ID, REV, PUSHED, "da:sync:key", META, "da:theme", "da:calmode", "da:location", "da:sync:off"]);
const SKIP_PREFIX = ["da:prayers:", "da:qtext:"];

export type SyncStatus = "off" | "syncing" | "synced" | "paused" | "error";
type Change = [string, number, string | null];

let status: SyncStatus = "off";
let id: string | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let started = false;
let inflight = false;
let again = false;
let applying = false; // true while cloud values are being written locally
let lastSync = 0;
const statusListeners = new Set<() => void>();

function setStatus(s: SyncStatus) {
  status = s;
  statusListeners.forEach((l) => l());
}

function newId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const VALID = /^[A-Za-z0-9_-]{16,64}$/;

/** This person's secret id — made up on first use. `null` = this browser never talks to the cloud. */
export function getSyncId(): string | null {
  if (id !== null) return id;
  try {
    // "da:sync:off" = test harnesses keep the page away from the cloud
    if (window.localStorage.getItem("da:sync:off")) return null;
    id = window.localStorage.getItem(ID);
    if (!id || !VALID.test(id)) {
      id = newId();
      window.localStorage.setItem(ID, id);
    }
  } catch {
    return null;
  }
  return id;
}

function skipped(k: string) {
  return !k.startsWith("da:") || SKIP.has(k) || SKIP_PREFIX.some((p) => k.startsWith(p));
}

function readMeta(): Record<string, number> {
  try {
    return JSON.parse(window.localStorage.getItem(META) ?? "{}");
  } catch {
    return {};
  }
}

const num = (k: string) => Number(window.localStorage.getItem(k) ?? 0) || 0;

/** Keys stamped since the last sync (all of them on a device's first). */
function changesSince(pushed: number): Change[] {
  const meta = readMeta();
  const keys = new Set(Object.keys(meta));
  if (pushed <= 0)
    for (let i = 0; i < window.localStorage.length; i++) keys.add(window.localStorage.key(i)!);
  const out: Change[] = [];
  for (const k of keys) {
    if (!k || skipped(k)) continue;
    const t = meta[k] ?? 0;
    if (pushed > 0 && t < pushed) continue;
    out.push([k, t, window.localStorage.getItem(k)]);
  }
  return out;
}

/** Bring the cloud's changes in; newest stamp wins. */
function apply(changes: Change[]) {
  if (!changes.length) return;
  const meta = readMeta();
  let changed = false;
  applying = true;
  try {
    for (const [k, t, v] of changes) {
      if (skipped(k)) continue;
      const local = window.localStorage.getItem(k);
      if (t < (meta[k] ?? 0) || (t === (meta[k] ?? 0) && local !== null)) continue;
      if (v === null) {
        if (local !== null) window.localStorage.removeItem(k);
      } else if (local !== v) window.localStorage.setItem(k, v);
      meta[k] = t;
      changed = true;
    }
    window.localStorage.setItem(META, JSON.stringify(meta));
  } finally {
    applying = false;
  }
  if (changed) emit();
}

async function sync() {
  const k = getSyncId();
  if (!k) return;
  if (inflight) {
    again = true;
    return;
  }
  const since = num(REV);
  const pushed = num(PUSHED);
  const startedAt = Date.now();
  const changes = changesSince(pushed);
  // a new visitor with nothing yet has nothing in the cloud either
  if (!changes.length && since === 0 && pushed > 0) return;
  inflight = true;
  again = false;
  try {
    setStatus("syncing");
    lastSync = startedAt;
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "x-da-id": k, "content-type": "application/json" },
      body: JSON.stringify({ since, changes }),
      keepalive: true,
    });
    if (res.status === 503) return setStatus("off");
    if (res.status === 429 || res.status === 507) return setStatus("paused");
    if (!res.ok) throw new Error(`sync ${res.status}`);
    const out = (await res.json()) as { rev: number; reset: boolean; changes: Change[] };
    apply(out.changes);
    window.localStorage.setItem(REV, String(out.rev));
    // the cloud lost track of this device (or was emptied): send everything next time
    window.localStorage.setItem(PUSHED, out.reset ? "-1" : String(startedAt));
    if (out.reset) again = true;
    setStatus("synced");
    foldOldYears(); // after a sync, so a year is summed from everything this person holds
  } catch (e) {
    setStatus("error");
    console.warn("[sync] failed", e);
  } finally {
    inflight = false;
    if (again) schedule(500);
  }
}

function schedule(delay = 20_000) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void sync();
  }, delay);
}

function flush() {
  if (!timer) return;
  clearTimeout(timer);
  timer = null;
  void sync();
}

/** Start once per page. Safe to call repeatedly. */
export function startSync() {
  if (started || typeof window === "undefined") return;
  started = true;
  // ask the browser to never evict this site's storage under pressure
  try {
    void navigator.storage?.persist?.();
  } catch {}
  try {
    // joining from another device: https://…/#id=<id>
    const url = new URL(window.location.href);
    const given = (new URLSearchParams(url.hash.slice(1)).get("id") ?? url.searchParams.get("id"))?.trim();
    if (given && VALID.test(given)) {
      id = given;
      window.localStorage.setItem(ID, given);
      window.localStorage.setItem(REV, "0"); // fetch the whole copy…
      window.localStorage.setItem(PUSHED, "-1"); // …and merge in everything this device holds
    }
    if (given !== undefined) {
      url.searchParams.delete("id");
      window.history.replaceState(null, "", url.pathname + url.search);
    }
    // first run on this device (or since the per-person cloud): send everything once
    if (window.localStorage.getItem(PUSHED) === null) window.localStorage.setItem(PUSHED, "-1");
  } catch {}
  if (getSyncId()) void sync();
  else foldOldYears();
  // any local write → sync soon (not the ones just pulled in)
  subscribe(() => {
    if (!applying) schedule();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      if (Date.now() - lastSync > 10 * 60_000) void sync();
    } else flush();
  });
  window.addEventListener("pagehide", flush);
}

export function useSyncStatus() {
  return useSyncExternalStore(
    (cb) => {
      statusListeners.add(cb);
      return () => statusListeners.delete(cb);
    },
    () => status,
    () => "off" as SyncStatus,
  );
}
