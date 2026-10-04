"use client";

import { useSyncExternalStore } from "react";
import { emit, subscribe } from "./store";

/**
 * Everything under `da:` lives in this browser first; the cloud keeps each
 * person's own copy so nothing is lost and their devices agree. No accounts:
 * every browser makes up a random secret id (`da:sync:id`) the first time,
 * and opening the site with `#id=<id>` makes another device join that copy
 * (its own progress is merged in, nothing is thrown away).
 *
 * Per-key last-write-wins using the `da:meta:updated` timestamps that
 * store.write()/stamp() record; a stamped key that is gone locally is a
 * deletion. The server merges each save into what it holds and answers with
 * the merged copy, so one round trip both pushes and pulls.
 *
 *  - pull on load, when the tab becomes visible, and every 5 minutes while visible
 *  - push (debounced) after any local write, and on page hide
 */

const ID_STORAGE = "da:sync:id";
const META = "da:meta:updated";
/** device preferences, caches and this device's own id stay local */
const SKIP = new Set([ID_STORAGE, "da:sync:key", META, "da:theme", "da:calmode", "da:location", "da:sync:off"]);
const SKIP_PREFIX = ["da:prayers:", "da:qtext:"];

export type SyncStatus = "off" | "syncing" | "synced" | "error";
type Snapshot = { data: Record<string, unknown>; updated: Record<string, number> };

let status: SyncStatus = "off";
let id: string | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let started = false;
let inflight = false;
let dirty = false;
let applying = false; // true while remote values are being written locally
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
    id = window.localStorage.getItem(ID_STORAGE);
    if (!id || !VALID.test(id)) {
      id = newId();
      window.localStorage.setItem(ID_STORAGE, id);
    }
  } catch {
    return null;
  }
  return id;
}

/** Link that opens this same progress on another device. */
export function shareLink() {
  const k = getSyncId();
  return k ? `${window.location.origin}/#id=${k}` : null;
}

function skipped(k: string) {
  return !k.startsWith("da:") || SKIP.has(k) || SKIP_PREFIX.some((p) => k.startsWith(p));
}

function readUpdated(): Record<string, number> {
  try {
    return JSON.parse(window.localStorage.getItem(META) ?? "{}");
  } catch {
    return {};
  }
}

function snapshot(): Snapshot {
  const data: Record<string, unknown> = {};
  const updated: Record<string, number> = {};
  for (const [k, t] of Object.entries(readUpdated())) if (!skipped(k)) updated[k] = t;
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (!k || skipped(k)) continue;
    const raw = window.localStorage.getItem(k);
    if (raw === null) continue;
    try {
      data[k] = JSON.parse(raw);
    } catch {
      data[k] = raw; // plain strings (e.g. da:total:<date>)
    }
    updated[k] ??= 0;
  }
  return { data, updated };
}

/** Bring the cloud copy in; returns true when this device holds something newer. */
function apply(remote: Partial<Snapshot>) {
  const rData = remote.data ?? {};
  const rUpd = remote.updated ?? {};
  const meta = readUpdated();
  const local = snapshot();
  let changed = false;
  let localNewer = false;
  applying = true;
  try {
    for (const k of new Set([...Object.keys(rData), ...Object.keys(rUpd)])) {
      if (skipped(k)) continue;
      const lt = local.updated[k] ?? 0;
      const rt = rUpd[k] ?? 0;
      const has = k in local.data;
      if (k in rData) {
        if (!has || rt > lt) {
          const v = rData[k];
          window.localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
          meta[k] = rt;
          changed = true;
        } else if (lt > rt) localNewer = true;
      } else if (rt > lt) {
        // deleted on another device
        if (has) {
          window.localStorage.removeItem(k);
          changed = true;
        }
        meta[k] = rt;
      } else if (has) localNewer = true;
    }
    for (const k of Object.keys(local.data)) if (!(k in rData) && !(k in rUpd)) localNewer = true;
    window.localStorage.setItem(META, JSON.stringify(meta));
    if (changed) emit();
  } finally {
    applying = false;
  }
  return localNewer;
}

async function request(method: "GET" | "PUT", body?: string) {
  const k = getSyncId();
  if (!k) throw new Error("no id");
  const res = await fetch("/api/sync", {
    method,
    headers: { "x-da-id": k, ...(body ? { "content-type": "application/json" } : {}) },
    body,
    keepalive: method === "PUT" && !!body && body.length < 60_000,
  });
  if (res.status === 503) {
    setStatus("off");
    throw new Error("sync not configured");
  }
  if (!res.ok) throw new Error(`sync ${res.status}`);
  return (await res.json()) as Partial<Snapshot>;
}

/** Bring remote changes in, then push anything local that is newer. */
export async function pull() {
  if (!getSyncId() || inflight) return;
  inflight = true;
  try {
    setStatus("syncing");
    const localNewer = apply(await request("GET"));
    setStatus("synced");
    if (localNewer || dirty) schedulePush(0);
  } catch (e) {
    if (status !== "off") setStatus("error");
    console.warn("[sync] pull failed", e);
  } finally {
    inflight = false;
  }
}

async function push() {
  if (!getSyncId()) return;
  if (inflight) {
    dirty = true;
    return;
  }
  const snap = snapshot();
  dirty = false;
  // a visitor who has not ticked anything yet has nothing worth a cloud copy
  if (!Object.keys(snap.data).length && !Object.keys(snap.updated).length) return;
  inflight = true;
  try {
    setStatus("syncing");
    apply(await request("PUT", JSON.stringify(snap)));
    setStatus("synced");
  } catch (e) {
    if (status !== "off") setStatus("error");
    console.warn("[sync] push failed", e);
  } finally {
    inflight = false;
    if (dirty) schedulePush(500);
  }
}

function schedulePush(delay = 3000) {
  if (!getSyncId()) return;
  dirty = true;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void push();
  }, delay);
}

function flush() {
  if (!dirty && !pushTimer) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = null;
  void push();
}

/** Start once per page. Safe to call repeatedly. */
export function startSync() {
  if (started || typeof window === "undefined") return;
  started = true;
  // ask the browser to never evict this site's storage under pressure
  try {
    void navigator.storage?.persist?.();
  } catch {}
  // joining from another device: https://…/#id=<id>
  try {
    const url = new URL(window.location.href);
    const given = (new URLSearchParams(url.hash.slice(1)).get("id") ?? url.searchParams.get("id"))?.trim();
    if (given && VALID.test(given)) {
      id = given;
      window.localStorage.setItem(ID_STORAGE, given);
      dirty = true; // merge whatever this device already had into the joined copy
    }
    if (given !== undefined) {
      url.searchParams.delete("id");
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  } catch {}
  if (getSyncId()) void pull();
  // any local write → push soon (not the ones we just pulled in)
  subscribe(() => {
    if (!applying) schedulePush();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void pull();
    else flush();
  });
  window.addEventListener("pagehide", flush);
  setInterval(() => {
    if (document.visibilityState === "visible") void pull();
  }, 5 * 60_000);
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
