<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Soul Work (repo, folder and Vercel project: jh-soul)
Daily "Soul Work" checklist of Shia aamal — same structure as ../jh-body and ../jh-mind. All progress lives in
localStorage under `da:` keys (`da:done:<date>`, `da:total:<date>`, `da:count:<date>:<amal>`, `da:sadaqa:<date>` = euro
given that day). Deployed to https://jh-soul.vercel.app (Vercel project `jh-soul`, team jeffhsns-projects, git
github.com/jeffhsn/jh-soul). Deploy with `vercel deploy --prod --yes` after pushing.
The owner does the list in one sitting after Maghrib, every day of the week. The list is the ordinary
calendar day's list — do NOT shift it to the Islamic Maghrib-to-Maghrib day; the owner rejected that. The only adjustment
(src/lib/aamal-day.ts) is that the active day turns over at Fajr instead of midnight, so a late sitting and Salat al-Layl are
not split across two dates. That sitting is the owner's only free block
of the day, so never schedule an amal outside it. The few aamal whose blessing is
tied to the morning (`morning` reason set: Friday ghusl, sadaqa, Dua al-Ahd, Friday Dua al-Nudba) are NOT to-dos: they live in
the "In the morning" checklist, ticks go to `da:morning:<date>` (never `da:done`, whose key count is compared with `da:total`)
and count as a bonus in the progress views. Rows there are plain ticks (no reader opens) and are never pre-ticked by code. Keep that set strict (owner: only what is lost if not done in the morning).
Hijri-dated occasion aamal live in src/data/occasions.ts: a `night` one joins the to-dos of the evening BEFORE its Hijri date
(the Islamic night precedes its day), a `day` one joins that date's morning checklist. They carry `steps` plus a verified
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
