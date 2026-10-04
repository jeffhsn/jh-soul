/**
 * Upstash archives a free database after 30 days without reads or writes.
 * A daily Vercel cron (vercel.json) touches it so that can never happen,
 * even if nobody opens the site for a month. One command a day.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const URL_ = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? "";
const TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? "";

export async function GET(req: Request) {
  // Vercel sends the CRON_SECRET as a bearer token on cron calls
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!URL_ || !TOKEN) return Response.json({ error: "sync not configured" }, { status: 503 });
  const res = await fetch(URL_, {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(["SET", "da:keepalive", new Date().toISOString()]),
    cache: "no-store",
  });
  return Response.json({ ok: res.ok }, { status: res.ok ? 200 : 502 });
}
