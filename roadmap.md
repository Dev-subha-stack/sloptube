# sloptube roadmap

Source unpacked (no node_modules) at /tmp/src/sloptube (re-extract from user-uploads://sloptube.zip with python zipfile, skipping node_modules/.next/.git/.env*). Comment-stripped SQL at /tmp/mig/s/.

## Migration (done)
- [x] Database 000-023 on Lovable Cloud, ban hook, image addresses
- [x] Every page + API handler ported, auth flows, image proxy, encoder endpoint, tests

## Round 2 requests (Nov 10)
Hosting: stay on the Lovable database for now (user may move to own Supabase later). GitHub: user connects it in Project settings -> Git (agent cannot).
- [x] Owner/admin: romendraroy4@gmail.com (verified email) gets admin + Owner badge
- [x] Bug: uploads credited to the wrong account / channel separation (check)
- [x] Bug: like count drops when clicking like (stale like state after sign-in reload)
- [x] Bug: comment times off by hours
- [x] Bug: views count once per person per video (keep old counts)
- [x] Bug: user lists / elements missing on published site (feature switches on, broken Google pictures fixed; republish needed)
- [x] Faster video loading (player buffering settings, lazy thumbnails)
- [x] Admin: users overview + role management (admin vs moderator powers)
- [x] Badges: blue admin/owner, green moderator, in comments and channel pages
- [x] Bug reports: report-a-bug page for everyone, status tracking, staff replies, admin bugs tab
- [x] Built-in client-side compressor (always on, strong compression)
- [x] Player: loading spinner until playing, draggable miniplayer (keyboard, quality, theater exist)
- [x] Notifications bell: new comments/replies, jump to the comment
- [x] Studio comments (exists: check reply/hide/delete), analytics charts (exists: check)
- [x] Subscriptions feed newest first (exists: check)
- [x] UI customization (appearance settings), like/subscribe animations
- [x] Username change (exists in settings: check)
- [x] NSFW filter: auto-remove video + permanent ban (built; not tried with real explicit content)
- [x] Star ratings: rate videos, top rated page, my ratings history
- [x] Upload limit 50 MB (after compression; compressor targets it)
- [x] Multiple accounts: add several, switch fast from the avatar menu

- [x] PRIORITY: make video uploading work now (user, Nov 14)

## Blocked on user
- [ ] Optional: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, MEDIA_PUBLIC_URL, SITE_URL, YAPIN_CLIENT_ID, YAPIN_CLIENT_SECRET, ENCODER_SECRET (then verify upload, playback, Yapin', encoder)
- [ ] Data export (per-table CSV/JSON) + users export, avatar/banner files
- [x] Feature switches: all on except maintenance, Yapin and the flag panel
- [ ] GitHub: user connects in Project settings -> Git
