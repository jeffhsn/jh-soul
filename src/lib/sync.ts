"use client";

import { useSyncExternalStore } from "react";
import { emit, subscribe } from "./store";

/**
 * Keeps every `da:` key mirrored in the cloud so nothing is lost and every
 * device shows the same thing. Per-key last-write-wins using the
 * `da:meta:updated` timestamps that store.write() records.
 *
 *  - pull on load, when the tab becomes visible, and every minute
 *  - push (debounced) after any local write, and on page hide
 */

const KEY_STORAGE = "da:sync:key";
const META = "da:meta:updated";
/** device preferences and caches stay local */
const SKIP = new Set([KEY_STORAGE, META, "da:theme", "da:calmode", "da:location", "da:sync:off"]);
const SKIP_PREFIX = ["da:prayers:", "da:qtext:"];

export type SyncStatus = "off" | "syncing" | "synced" | "error" | "unauthorized";
type Snapshot = { data: Record<string, unknown>; updated: Record<string, number> };

let status: SyncStatus = "off";
let lastSync = 0;
let key: string | null = null;
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

/** Single-user app: the key is built in, so saving just works. A stored key still wins. */
const BUILT_IN = process.env.NEXT_PUBLIC_DA_SYNC_KEY ?? null;

export function getSyncKey(): string | null {
  if (key !== null) return key;
  try {
    // "da:sync:off" = this browser never talks to the cloud (test harnesses set it)
    if (window.localStorage.getItem("da:sync:off")) return null;
    key = window.localStorage.getItem(KEY_STORAGE) ?? BUILT_IN;
  } catch {
    key = BUILT_IN;
  }
  return key;
}

function skipped(k: string) {
  return SKIP.has(k) || SKIP_PREFIX.some((p) => k.startsWith(p));
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
  const updated = readUpdated();
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (!k || !k.startsWith("da:") || skipped(k)) continue;
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

async function request(method: "GET" | "PUT", body?: string) {
  const k = getSyncKey();
  if (!k) throw new Error("no key");
  const res = await fetch("/api/sync", {
    method,
    headers: { "x-da-key": k, ...(body ? { "content-type": "application/json" } : {}) },
    body,
    keepalive: method === "PUT",
  });
  if (res.status === 401) {
    setStatus("unauthorized");
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error(`sync ${res.status}`);
  return res;
}

/** Bring remote changes in, then push anything local that is newer. */
export async function pull() {
  if (!getSyncKey() || inflight) return;
  inflight = true;
  try {
    setStatus("syncing");
    const remote = (await (await request("GET")).json()) as Partial<Snapshot>;
    const rData = remote.data ?? {};
    const rUpd = remote.updated ?? {};
    const local = snapshot();
    let changed = false;
    let localNewer = false;
    applying = true;
    for (const k of Object.keys(rData)) {
      if (skipped(k)) continue;
      const lt = local.updated[k] ?? 0;
      const rt = rUpd[k] ?? 0;
      if (!(k in local.data) || rt > lt) {
        const v = rData[k];
        window.localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
        local.updated[k] = rt;
        changed = true;
      } else if (lt > rt) {
        localNewer = true;
      }
    }
    for (const k of Object.keys(local.data)) if (!(k in rData)) localNewer = true;
    window.localStorage.setItem(META, JSON.stringify(local.updated));
    if (changed) emit();
    applying = false;
    lastSync = Date.now();
    setStatus("synced");
    if (localNewer || dirty) schedulePush(0);
  } catch (e) {
    if (status !== "unauthorized") setStatus("error");
    console.warn("[sync] pull failed", e);
  } finally {
    applying = false;
    inflight = false;
  }
}

async function push() {
  if (!getSyncKey()) return;
  if (inflight) {
    dirty = true;
    return;
  }
  inflight = true;
  dirty = false;
  try {
    setStatus("syncing");
    await request("PUT", JSON.stringify(snapshot()));
    lastSync = Date.now();
    setStatus("synced");
  } catch (e) {
    if (status !== "unauthorized") setStatus("error");
    console.warn("[sync] push failed", e);
  } finally {
    inflight = false;
    if (dirty) schedulePush(500);
  }
}

function schedulePush(delay = 1500) {
  if (!getSyncKey()) return;
  dirty = true;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void push();
  }, delay);
}

/** Start once per page. Safe to call repeatedly. */
export function startSync() {
  if (started || typeof window === "undefined") return;
  started = true;
  // ask the browser to never evict this site's storage under pressure
  try {
    void navigator.storage?.persist?.();
  } catch {}
  // one-tap setup: open https://…/?key=YOUR-KEY once on a device
  try {
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get("key") ?? new URLSearchParams(url.hash.slice(1)).get("key");
    if (fromUrl) {
      key = fromUrl.trim();
      window.localStorage.setItem(KEY_STORAGE, key);
      url.searchParams.delete("key");
      url.hash = "";
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  } catch {}
  if (!getSyncKey()) {
    setStatus("off");
  } else {
    setStatus("syncing");
    void pull();
  }
  // any local write → push soon (not the ones we just pulled in)
  subscribe(() => {
    if (!applying) schedulePush();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void pull();
    else if (dirty || pushTimer) {
      if (pushTimer) clearTimeout(pushTimer);
      pushTimer = null;
      void push();
    }
  });
  window.addEventListener("pagehide", () => {
    if (dirty || pushTimer) {
      if (pushTimer) clearTimeout(pushTimer);
      pushTimer = null;
      void push();
    }
  });
  setInterval(() => void pull(), 60_000);
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

export function lastSyncedAt() {
  return lastSync;
}
