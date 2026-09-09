import { get, put } from "@vercel/blob";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Cloud copy of everything under `da:` — one private JSON blob.
 * Guarded by a passphrase (DA_SYNC_KEY) sent as `x-da-key`.
 *   GET  → { data, updated }
 *   PUT  → stores the body as-is
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** private store when available; otherwise public with an unguessable, key-derived path */
const ACCESS = (process.env.BLOB_ACCESS === "private" ? "private" : "public") as "private" | "public";
const PATH = `da/${createHash("sha256").update(`state:${process.env.DA_SYNC_KEY ?? ""}`).digest("hex")}.json`;

function authorized(req: Request) {
  const expected = process.env.DA_SYNC_KEY ?? "";
  const given = req.headers.get("x-da-key") ?? "";
  if (!expected || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

const EMPTY = { data: {}, updated: {} };

export async function GET(req: Request) {
  if (!authorized(req)) return Response.json({ error: "unauthorized" }, { status: 401 });
  try {
    const res = await get(PATH, { access: ACCESS, useCache: false });
    if (!res || !res.blob) return Response.json(EMPTY);
    const text = await new Response(res.stream).text();
    return new Response(text || JSON.stringify(EMPTY), {
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  if (!authorized(req)) return Response.json({ error: "unauthorized" }, { status: 401 });
  try {
    const body = await req.text();
    if (body.length > 2_000_000) return Response.json({ error: "too large" }, { status: 413 });
    JSON.parse(body); // reject garbage before it lands in the store
    const opts = {
      access: ACCESS,
      contentType: "application/json",
      allowOverwrite: true,
      addRandomSuffix: false,
    } as const;
    await put(PATH, body, opts);
    // safety net: one dated copy per day, so a bad merge can always be undone
    const day = new Date().toISOString().slice(0, 10);
    await put(PATH.replace(/\.json$/, `-${day}.json`), body, opts).catch(() => {});
    return Response.json({ ok: true, at: Date.now() });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
