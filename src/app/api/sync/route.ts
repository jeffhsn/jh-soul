import { createHash } from "node:crypto";
import { deflateRawSync, inflateRawSync } from "node:zlib";

/**
 * Each person's cloud copy of everything under `da:` — no accounts.
 * A device makes up a random secret id on first visit and sends it as
 * `x-da-id`; only its hash is used as the storage key, so the store never
 * holds the id itself. Opening the site with `#id=<id>` on another device
 * joins that person's copy.
 *
 * Storage is Upstash Redis over its REST API, free plan with no card and
 * auto-upgrade off, so it can never bill. On top of that this route keeps
 * its own budget well under every free limit (commands, bandwidth, storage):
 * past it, cloud saves pause until tomorrow and every device simply keeps
 * working from its own copy — nothing is lost. Copies are stored deflated,
 * one key per person, and never expire: a person's progress is kept for good.
 *   GET  → { data, updated }
 *   PUT  → merged into the stored copy per key, newest timestamp wins
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const URL_ = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? "";
const TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
const BACKUP_TTL = 60 * 60 * 24 * 7; // seconds
const MAX_BYTES = 1_000_000; // uncompressed; years of one person's history
/**
 * Free plan per month: 500K commands, 10 GB bandwidth, 256 MB storage.
 * One daily counter in "units" = commands + bandwidth/20 KB (500K ≈ 10 GB/20 KB),
 * capped so 31 days stay under 90% of both.
 */
const DAY_UNITS = 14_500;
const BYTES_PER_UNIT = 20_000;
/** each person is at most 8 keys (copy + a week of daily backups): room for 1,000 people, well under 256 MB */
const MAX_KEYS = 8_100;
/** per-day caches the client prunes after 45 days — prune them here too so they do not come back */
const PRUNED = /^da:(prayers|count|qtext):(\d{4}-\d{2}-\d{2})/;

type Snapshot = { data: Record<string, unknown>; updated: Record<string, number> };
const EMPTY: Snapshot = { data: {}, updated: {} };

/** 16–64 url-safe characters — what the client generates (22) with room to spare */
function idOf(req: Request) {
  const id = req.headers.get("x-da-id") ?? "";
  return /^[A-Za-z0-9_-]{16,64}$/.test(id) ? id : null;
}

function keyOf(id: string) {
  return `da:u:${createHash("sha256").update(`da-sync:${id}`).digest("hex")}`;
}

async function redis(commands: (string | number)[][]) {
  const res = await fetch(`${URL_}/pipeline`, {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(commands),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  return (await res.json()) as { result?: unknown; error?: string }[];
}

const pack = (json: string) => `z:${deflateRawSync(json).toString("base64")}`;
const unpack = (stored: string) =>
  stored.startsWith("z:") ? inflateRawSync(Buffer.from(stored.slice(2), "base64")).toString() : stored;

const budgetKey = () => `da:budget:${new Date().toISOString().slice(0, 10)}`;

/** The person's copy and today's spend, in one command. */
async function load(key: string) {
  const [r] = await redis([["MGET", key, budgetKey()]]);
  if (r.error) throw new Error(r.error);
  const [stored, spent] = r.result as (string | null)[];
  const s = (stored ? JSON.parse(unpack(stored)) : EMPTY) as Partial<Snapshot>;
  return {
    snap: { data: s.data ?? {}, updated: s.updated ?? {} } as Snapshot,
    exists: !!stored,
    bytes: stored?.length ?? 0,
    spent: Number(spent ?? 0),
  };
}

const units = (commands: number, bytes: number) => commands + Math.ceil(bytes / BYTES_PER_UNIT);

function paused() {
  return Response.json({ error: "daily budget reached" }, { status: 429 });
}

/** Per key, the newer side wins; a key with a timestamp but no value is a deletion. */
function merge(a: Snapshot, b: Snapshot): Snapshot {
  const out: Snapshot = { data: {}, updated: {} };
  const cutoff = new Date(Date.now() - 45 * 864e5).toISOString().slice(0, 10);
  const keys = new Set([...Object.keys(a.data), ...Object.keys(a.updated), ...Object.keys(b.data), ...Object.keys(b.updated)]);
  for (const k of keys) {
    const m = k.match(PRUNED);
    if (m && m[2] < cutoff) continue;
    const at = a.updated[k] ?? 0;
    const bt = b.updated[k] ?? 0;
    // on a tie, a side that still has the value beats one that does not
    const win = bt > at || (bt === at && k in b.data) ? b : a;
    out.updated[k] = Math.max(at, bt);
    if (k in win.data) out.data[k] = win.data[k];
  }
  return out;
}

function unavailable() {
  return Response.json({ error: "sync not configured" }, { status: 503 });
}

export async function GET(req: Request) {
  if (!URL_ || !TOKEN) return unavailable();
  const id = idOf(req);
  if (!id) return Response.json({ error: "bad id" }, { status: 400 });
  try {
    const { snap, bytes, spent } = await load(keyOf(id));
    if (spent >= DAY_UNITS) return paused();
    await redis([
      ["INCRBY", budgetKey(), units(3, bytes)],
      ["EXPIRE", budgetKey(), 172_800],
    ]);
    return Response.json(snap, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  if (!URL_ || !TOKEN) return unavailable();
  const id = idOf(req);
  if (!id) return Response.json({ error: "bad id" }, { status: 400 });
  try {
    const body = await req.text();
    if (body.length > MAX_BYTES) return Response.json({ error: "too large" }, { status: 413 });
    const incoming = JSON.parse(body) as Partial<Snapshot>;
    if (typeof incoming !== "object" || !incoming) throw new Error("bad body");
    const key = keyOf(id);
    const cur = await load(key);
    if (cur.spent >= DAY_UNITS) return paused();
    if (!cur.exists) {
      // a new person's first cloud copy: only while there is room for it
      const [n] = await redis([["DBSIZE"]]);
      if (Number(n.result) >= MAX_KEYS) return Response.json({ error: "full" }, { status: 507 });
    }
    const merged = merge(cur.snap, { data: incoming.data ?? {}, updated: incoming.updated ?? {} });
    const json = JSON.stringify(merged);
    if (json.length > MAX_BYTES) return Response.json({ error: "too large" }, { status: 413 });
    const out = pack(json);
    // safety net: the first save of each day also lands in a dated copy kept a week
    const day = new Date().toISOString().slice(0, 10);
    const res = await redis([
      ["SET", key, out],
      ["SET", `${key}:${day}`, out, "NX", "EX", BACKUP_TTL],
      ["INCRBY", budgetKey(), units(cur.exists ? 6 : 7, cur.bytes + out.length * 2)],
      ["EXPIRE", budgetKey(), 172_800],
    ]);
    if (res[0].error) throw new Error(res[0].error);
    return Response.json(merged, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
