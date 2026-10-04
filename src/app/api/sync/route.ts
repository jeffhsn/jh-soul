import { createHash } from "node:crypto";

/**
 * Each person's cloud copy of everything under `da:` — no accounts.
 * A device makes up a random secret id on first visit and sends it as
 * `x-da-id`; only its hash is used as the storage key, so the store never
 * holds the id itself. Opening the site with `#id=<id>` on another device
 * joins that person's copy.
 *
 * Storage is Upstash Redis over its REST API (free plan, never billed —
 * it throttles instead). One key per person, expiring a year after the
 * last save, so abandoned devices clean themselves up.
 *   GET  → { data, updated }
 *   PUT  → merged into the stored copy per key, newest timestamp wins
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const URL_ = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? "";
const TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
const TTL = 60 * 60 * 24 * 400; // seconds
const BACKUP_TTL = 60 * 60 * 24 * 14;
const MAX_BYTES = 400_000;
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

async function load(key: string): Promise<Snapshot> {
  const [r] = await redis([["GET", key]]);
  if (r.error) throw new Error(r.error);
  if (typeof r.result !== "string") return EMPTY;
  const s = JSON.parse(r.result) as Partial<Snapshot>;
  return { data: s.data ?? {}, updated: s.updated ?? {} };
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
    return Response.json(await load(keyOf(id)), { headers: { "cache-control": "no-store" } });
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
    const merged = merge(await load(key), { data: incoming.data ?? {}, updated: incoming.updated ?? {} });
    const out = JSON.stringify(merged);
    if (out.length > MAX_BYTES) return Response.json({ error: "too large" }, { status: 413 });
    // safety net: the first save of each day also lands in a dated copy kept two weeks
    const day = new Date().toISOString().slice(0, 10);
    const res = await redis([
      ["SET", key, out, "EX", TTL],
      ["SET", `${key}:${day}`, out, "NX", "EX", BACKUP_TTL],
    ]);
    if (res[0].error) throw new Error(res[0].error);
    return Response.json(merged, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
