<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Daily Aamal (repo, folder and Vercel project: dailyaamal)
Daily checklist of Shia aamal. All progress lives in
localStorage under `da:` keys (`da:done:<date>`, `da:total:<date>`, `da:count:<date>:<amal>`, `da:sadaqa:<date>` = euro
given that day). Deployed to https://dailyaamal.vercel.app (Vercel project `dailyaamal`, team jeffhsns-projects, git
github.com/jeffhsn/dailyaamal). Deploy with `vercel deploy --prod --yes` after pushing.
The owner does the day in two sessions, both from this site: a Morning session after Fajr and an Evening session after
Maghrib, every day of the week. The list is the ordinary
calendar day's list — do NOT shift it to the Islamic Maghrib-to-Maghrib day; the owner rejected that. The only adjustment
(src/lib/aamal-day.ts) is that the active day turns over at Fajr instead of midnight, so a late sitting and Salat al-Layl
are not split across two dates. Salat al-Layl follows the seasons (WAKE_AT in src/data/index.ts, owner wakes ~5:30): when that
morning's Fajr is ≥ WAKE_AT + 30 min it opens the Morning list (prayed on waking, before Fajr — in Witten ~Oct→mid-Feb),
otherwise it closes the Evening list (before sleep). On a changeover day both appear; the evening one is `salat-layl-night`. Morning aamal (`morning` reason set, listed by `morningForDay`):
Friday ghusl, sadaqa, Dua al-Ahd, Fatiha, Ayat al-Kursi, the Mu'awwidhat, Tasbihat al-Arba'a, the weekday's Sahifa dua, the
weekday's ziyarat, Ziyarat Ashura, Friday Dua al-Nudba, Friday Surah al-Kahf. Both sessions are real to-dos (same cards,
reader, next-item flow — the reader steps within the open amal's session), ticked into `da:done` and counted in `da:total`.
Old days may still have `da:morning:<date>` bonus ticks (the heatmap reads them); the active day's are absorbed into
`da:done` once. Owner's rule: whatever is a morning amal goes to Morning; night/evening/any-time aamal stay in Evening.
`morning` reasons must be honest — never claim a reward is lost unless the source says so.
Hijri-dated occasion aamal live in src/data/occasions.ts: a `night` one joins the to-dos of the evening BEFORE its Hijri date
(the Islamic night precedes its day), a `day` one joins that date's Morning session. They carry `steps` plus a verified
Duas.org link instead of full text — check every new link returns 200. Quran portions are progress-based (src/lib/khatm.ts): the next unread pages, paced so a khatm completes within a year of
its first day; missed days are made up. `da:quran:<date>` = {from,to} pins a day's portion (written when the day becomes
active or is ticked); ticked days without one count as the old date-derived slice. The Quran panel derives from the same. Counters take Space (count) and Backspace (undo).
Sadaqa amounts are euro to the cent: sum in cents, display €5 or €0.70 (never €0.7), never round the average. Use `aamalDate()`/`aamalKey()` for the active list's "today".
When testing in a browser, set localStorage `da:sync:off` (or block `/api/sync`) unless testing sync itself; never open a page with the owner's `#id=` link.
Shared site, no accounts: every browser makes up a random secret id (`da:sync:id`, 22 chars) on first visit, so each
visitor's progress is their own. Everything lives in localStorage first; the cloud copy is per person in Upstash Redis
(free plan, autoUpgrade off — never billed). Sized for 1,000 people saving daily inside the free plan: one Redis HASH per
person (`da:h:<sha256>`, field per `da:` key = "<updated>|<rev>|v<json>" or "…|d" deletion), and ONE command per sync —
a Lua script via EVALSHA (src/app/api/sync/route.ts) that merges the device's changes (newest `da:meta:updated` stamp wins)
and returns only fields changed since the device's `da:sync:rev`. Client (src/lib/sync.ts) sends only keys stamped since
`da:sync:pushed`; syncs on load, on return after 10+ min, 20 s after a write, on hide. The script enforces a daily budget
(DAY_UNITS, <90% of commands+bandwidth) and measures storage (`da:bytes`, `da:people`): a NEW person is admitted only while
bytes + people × RESERVE < STORAGE_LIMIT (≈1,500 people); past a limit → 429/507, devices keep working locally.
Opening `https://…/#id=<id>` joins a person's copy (no UI for it — the owner rejected the footer link/backup buttons). A daily Vercel cron (vercel.json →
/api/keepalive, CRON_SECRET) stops Upstash archiving after 30 idle days. Env: KV_REST_API_URL / KV_REST_API_TOKEN
(UPSTASH_REDIS_REST_* also accepted). Without them sync answers 503 and the site runs device-only. The old single-user
Vercel Blob copy (DA_SYNC_KEY) is unused, kept only as a backup. The service worker never caches /api/.
Your year (src/lib/year.ts, src/components/year-card.tsx): each Hijri year summed up (days, whole days, longest run,
khatms, Quran pages, qada days, sadaqa, most-kept aamal), on the Progress tab/rail, with a dismissible Muharram nudge.
When a Hijri year ends (1 Muharram) its dated keys are FOLDED into `da:year:<y>` (with `through` and a khatm carry) and
deleted — keeps each person's storage bounded. khatm.ts, computeStreak and the lifetime sadaqa continue from folded
summaries (src/lib/folded.ts); the sync script drops/ignores dated fields ≤ `through`.
Quran catch-up: page ticks in the portion reader (`skip` on `da:quran:<date>`) and optional catch-up readings
(`da:quranx:<date>` = ranges, not in da:done/totals) opened from the Quran panel or under the portion; owedOn() in khatm.ts =
missed-day deficit vs an even monthly pace, or skipped pages. Quran khatm is MONTHLY: portions paced so a khatm completes within 30 days of its first day (~1 juz/day, max 40 pages);
a khatm already running on 2026-10-04 (MONTHLY_FROM) gets its month from that day.
Tend the Soul reading: the three classical al-Mahdi (aj) books (al-Saduq's Kamal al-Din, al-Nu'mani's and al-Tusi's Ghayba)
on Al-Islam.org, the Imams' lives as Sayed Ammar Nakshawani's Thaqlain lecture series on YouTube
(al-islam.org is behind Cloudflare — curl gets 403; verify those links in a real browser), plus Look-up links to Sistani,
Fadlallah (bayynat.org.lb) and Khamenei.ir.
Qada prayers (`qada-salat`, one day = 17 rak'ahs) open the Evening session — an obligation before the recommended aamal.
The owner wants anything worth keeping saved in the cloud this way, never only in the browser.
Old address: the phone PWA was installed from https://dailyaamal.vercel.app (pre-rename). Keep it pointing at production —
if it is not a project domain, run `vercel alias set <new-deployment-url> dailyaamal.vercel.app` after every prod deploy.
Languages: English, Italian, Arabic (RTL) and German. src/lib/i18n.ts (`useT()` → t, locale, intl, rtl; `da:lang`, device-local;
<html lang dir> set before paint by src/lib/locale-boot.ts). Screen text lives in src/i18n/ui/{core,day,reader,calendar}.ts —
every key in all four languages (Arabic gets full plural forms). Content is translated BY ITS ENGLISH TEXT:
src/i18n/content/<locale>/*.json, lazy-loaded (src/lib/content-i18n.ts: useContent().tx, localizeAmal). After adding or
changing any English content string in src/data, run `npx tsx --tsconfig tsconfig.json scripts/i18n-extract.mts` and add
translations for the new strings (read-*.json = translations of recited Arabic, it/de only; Arabic shows the Arabic alone).
Layout uses logical classes only (ps/pe/ms/me/start/end/text-start/border-s) and `rtl:-scale-x-100` on directional icons;
swipe and ←/→ invert in RTL. Quran verse translations: it.piccardo, de.aburida, en.sahih (api.alquran.cloud).
