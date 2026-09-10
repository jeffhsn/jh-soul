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
Cloud sync: every `da:` key (except theme/calmode/location, the prayer-time and Quran-text caches, and sync meta) is
mirrored to a private Vercel Blob store through `/api/sync` (src/app/api/sync/route.ts), guarded by the passphrase in env
`DA_SYNC_KEY` sent as `x-da-key` (also baked into the client as NEXT_PUBLIC_DA_SYNC_KEY so sync is automatic — single-user
app, zero setup, deliberately no sync UI). Client engine: src/lib/sync.ts (per-key last-write-wins via `da:meta:updated`
timestamps stamped by store.write/stamp). Env: BLOB_READ_WRITE_TOKEN, BLOB_ACCESS=private, DA_SYNC_KEY — pull with
`vercel env pull .env.local`. Sync starts from pwa.tsx on every load. The service worker never caches /api/.
The owner wants anything worth keeping saved in the cloud this way, never only in the browser.
Old address: the phone PWA was installed from https://dailyaamal.vercel.app (pre-rename). Keep it pointing at production —
if it is not a project domain, run `vercel alias set <new-deployment-url> dailyaamal.vercel.app` after every prod deploy.
