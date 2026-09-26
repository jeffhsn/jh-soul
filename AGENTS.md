<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Daily Aamal (repo, folder and Vercel project: dailyaamal)
Daily checklist of Shia aamal — same structure as ../jh-body and ../jh-mind. All progress lives in
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
When testing in a browser, block `/api/sync` — the sync key is baked in, so a test page reads and writes the owner's real data.
Cloud sync: every `da:` key (except theme/calmode/location, the prayer-time and Quran-text caches, and sync meta) is
mirrored to a private Vercel Blob store through `/api/sync` (src/app/api/sync/route.ts), guarded by the passphrase in env
`DA_SYNC_KEY` sent as `x-da-key` (also baked into the client as NEXT_PUBLIC_DA_SYNC_KEY so sync is automatic — single-user
app, zero setup, deliberately no sync UI). Client engine: src/lib/sync.ts (per-key last-write-wins via `da:meta:updated`
timestamps stamped by store.write/stamp). Env: BLOB_READ_WRITE_TOKEN, BLOB_ACCESS=private, DA_SYNC_KEY — pull with
`vercel env pull .env.local`. Sync starts from pwa.tsx on every load. The service worker never caches /api/.
The owner wants anything worth keeping saved in the cloud this way, never only in the browser.
Old address: the phone PWA was installed from https://dailyaamal.vercel.app (pre-rename). Keep it pointing at production —
if it is not a project domain, run `vercel alias set <new-deployment-url> dailyaamal.vercel.app` after every prod deploy.
