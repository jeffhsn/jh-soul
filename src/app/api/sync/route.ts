import { createHash } from "node:crypto";

/**
 * Each person's cloud copy of everything under `da:` — no accounts.
 * A device makes up a random secret id on first visit and sends it as
 * `x-da-id`; only its hash names the storage, so the store never holds the id
 * itself. Opening the site with `#id=<id>` on another device joins that copy.
 *
 * Storage is Upstash Redis (free plan, no card, auto-upgrade off — it can
 * never bill). Built to keep 1,000 people saving every day inside that plan:
 *  - one Redis hash per person, one field per `da:` key:
 *    "<updated>|<rev>|v<json>" or "<updated>|<rev>|d" for a deletion;
 *  - one sync = ONE command: a Lua script (billed as a single command) that
 *    merges the device's changes (newest `updated` wins) and answers with
 *    every field changed since the device's last `rev` — so only what changed
 *    travels, both ways;
 *  - a daily budget (DAY_UNITS) under 90% of the plan's commands and
 *    bandwidth, and room for at most MAX_PEOPLE people, both checked inside
 *    the script. Past either the device keeps working from its own copy and
 *    tries again later (429 / 507); nothing is lost.
 * Nothing ever expires. A `da:year:<y>` summary carrying `"through":"<date>"`
 * folds that Hijri year: the script drops every dated field up to it and
 * ignores any that arrive later (src/lib/year.ts).
 *
 *   POST { since, changes: [[key, updated, json | null], …] }
 *     → { rev, reset, changes: [[key, updated, json | null], …] }
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const URL_ = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? "";
const TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
const MAX_BYTES = 400_000;
/**
 * Free plan per month: 500K commands, 10 GB bandwidth, 256 MB storage.
 * One daily counter in "units" = commands + bandwidth/20 KB (500K ≈ 10 GB/20 KB):
 * 31 days × 14,500 stays under 90% of both. A person syncs ~8 times a day → ~1,800 a day fit.
 */
const DAY_UNITS = 14_500;
/** ≤ ~230 KB each with a year and four months of detail at most: 1,000 people stay under 256 MB */
const MAX_PEOPLE = 1_000;
/** keys that are not people: two daily budget counters and the keep-alive */
const OTHER_KEYS = 3;

const SCRIPT = `
local h, b = KEYS[1], KEYS[2]
local since = tonumber(ARGV[1])
if tonumber(redis.call('GET', b) or '0') >= tonumber(ARGV[2]) then return {'paused'} end
local n = (#ARGV - 4) / 3
if redis.call('EXISTS', h) == 0 then
  if n == 0 then
    redis.call('INCRBY', b, 1)
    redis.call('EXPIRE', b, 172800)
    return {'ok', '0', '0'}
  end
  if redis.call('DBSIZE') >= tonumber(ARGV[3]) then return {'full'} end
end
local through = redis.call('HGET', h, '~through') or ''
local rev = tonumber(redis.call('HGET', h, '~rev') or '0')
local reset = '0'
if since > rev then since = 0; reset = '1' end
local mine = {}
local function dated(k) return string.match(k, '^da:%l+:(%d%d%d%d%-%d%d%-%d%d)') end
for i = 0, n - 1 do
  local k, t, v = ARGV[5 + i * 3], tonumber(ARGV[6 + i * 3]), ARGV[7 + i * 3]
  local d = dated(k)
  if not (d and d <= through) then
    local cur = redis.call('HGET', h, k)
    local ct = cur and tonumber(string.match(cur, '^(%d+)|')) or -1
    if t > ct then
      rev = rev + 1
      redis.call('HSET', h, k, t .. '|' .. rev .. '|' .. v)
      mine[k] = true
      local upto = string.match(k, '^da:year:') and string.match(v, '"through":"(%d%d%d%d%-%d%d%-%d%d)"')
      if upto and upto > through then
        through = upto
        redis.call('HSET', h, '~through', through)
        for _, f in ipairs(redis.call('HKEYS', h)) do
          local fd = dated(f)
          if fd and fd <= through then redis.call('HDEL', h, f) end
        end
      end
    end
  end
end
redis.call('HSET', h, '~rev', rev)
local out = {'ok', tostring(rev), reset}
local bytes = tonumber(ARGV[4])
if since < rev then
  local all = redis.call('HGETALL', h)
  for i = 1, #all, 2 do
    local k, v = all[i], all[i + 1]
    if string.sub(k, 1, 1) ~= '~' and not mine[k] then
      local t, r, val = string.match(v, '^(%d+)|(%d+)|(.*)$')
      if tonumber(r) > since then
        out[#out + 1] = k
        out[#out + 1] = t
        out[#out + 1] = val
        bytes = bytes + #k + #v
      end
    end
  end
end
redis.call('INCRBY', b, 1 + math.floor(bytes / 20000))
redis.call('EXPIRE', b, 172800)
return out
`;
const SHA = createHash("sha1").update(SCRIPT).digest("hex");

/** 16–64 url-safe characters — what the client generates (22) with room to spare */
function idOf(req: Request) {
  const id = req.headers.get("x-da-id") ?? "";
  return /^[A-Za-z0-9_-]{16,64}$/.test(id) ? id : null;
}

const keyOf = (id: string) => `da:h:${createHash("sha256").update(`da-sync:${id}`).digest("hex")}`;
const budgetKey = () => `da:budget:${new Date().toISOString().slice(0, 10)}`;

async function call(command: (string | number)[]) {
  const res = await fetch(URL_, {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as { result?: unknown; error?: string };
  if (body.error) throw new Error(body.error);
  if (!res.ok) throw new Error(`redis ${res.status}`);
  return body.result;
}

/** EVALSHA, loading the script on first use (EVAL) — either way one command. */
async function run(keys: string[], args: (string | number)[]) {
  try {
    return await call(["EVALSHA", SHA, keys.length, ...keys, ...args]);
  } catch (e) {
    if (!String(e).includes("NOSCRIPT")) throw e;
    return await call(["EVAL", SCRIPT, keys.length, ...keys, ...args]);
  }
}

type Change = [string, number, string | null];

export async function POST(req: Request) {
  if (!URL_ || !TOKEN) return Response.json({ error: "sync not configured" }, { status: 503 });
  const id = idOf(req);
  if (!id) return Response.json({ error: "bad id" }, { status: 400 });
  try {
    const body = await req.text();
    if (body.length > MAX_BYTES) return Response.json({ error: "too large" }, { status: 413 });
    const { since, changes } = JSON.parse(body) as { since?: number; changes?: Change[] };
    const args: (string | number)[] = [
      Math.max(0, Math.floor(Number(since) || 0)),
      DAY_UNITS,
      MAX_PEOPLE + OTHER_KEYS,
      body.length,
    ];
    for (const c of changes ?? []) {
      if (!Array.isArray(c) || typeof c[0] !== "string" || !c[0].startsWith("da:")) continue;
      const t = Math.floor(Number(c[1]));
      if (!Number.isFinite(t) || t < 0) continue;
      args.push(c[0], t, c[2] === null ? "d" : `v${c[2]}`);
    }
    const out = (await run([keyOf(id), budgetKey()], args)) as string[];
    if (out[0] === "paused") return Response.json({ error: "daily budget reached" }, { status: 429 });
    if (out[0] === "full") return Response.json({ error: "full" }, { status: 507 });
    const back: Change[] = [];
    for (let i = 3; i < out.length; i += 3)
      back.push([out[i], Number(out[i + 1]), out[i + 2] === "d" ? null : out[i + 2].slice(1)]);
    return Response.json(
      { rev: Number(out[1]), reset: out[2] === "1", changes: back },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
