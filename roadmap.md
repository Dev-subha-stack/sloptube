# sloptube roadmap

Source unpacked (no node_modules) at /tmp/src/sloptube (re-extract from user-uploads://sloptube.zip with python zipfile, skipping node_modules/.next/.git/.env*). Comment-stripped SQL at /tmp/mig/s/.

## Migration (done)
- [x] Database 000-023 on Lovable Cloud, ban hook, image addresses
- [x] Every page + API handler ported, auth flows, image proxy, encoder endpoint, tests

## Round 2 requests (Nov 10)
Hosting: stay on the Lovable database for now (user may move to own Supabase later). GitHub: user connects it in Project settings -> Git (agent cannot).
- [ ] Owner/admin: romendraroy4@gmail.com (verified email) gets admin + Owner badge
- [ ] Bug: uploads credited to the wrong account / channel separation (check)
- [ ] Bug: like count drops when clicking like (stale like state after sign-in reload)
- [ ] Bug: comment times off by hours
- [ ] Bug: views count once per person per video (keep old counts)
- [ ] Bug: user lists / elements missing on published site
- [ ] Faster video loading (player buffering settings, lazy thumbnails)
- [ ] Admin: users overview + role management (admin vs moderator powers)
- [ ] Badges: blue admin/owner, green moderator, in comments and channel pages
- [ ] Bug reports: report-a-bug page for everyone, status tracking, staff replies, admin bugs tab
- [ ] Built-in client-side compressor (always on, strong compression)
- [ ] Player: loading spinner until playing, draggable miniplayer (keyboard, quality, theater exist)
- [ ] Notifications bell: new comments/replies, jump to the comment
- [ ] Studio comments (exists: check reply/hide/delete), analytics charts (exists: check)
- [ ] Subscriptions feed newest first (exists: check)
- [ ] UI customization (appearance settings), like/subscribe animations
- [ ] Username change (exists in settings: check)
- [ ] NSFW filter: auto-remove video + permanent ban
- [ ] Star ratings: rate videos, top rated page, my ratings history
- [ ] Upload limit 50 MB (after compression; compressor targets it)
- [ ] Multiple accounts: add several, switch fast from the avatar menu

## Blocked on user
- [ ] Secrets: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, MEDIA_PUBLIC_URL, SITE_URL, YAPIN_CLIENT_ID, YAPIN_CLIENT_SECRET, ENCODER_SECRET (then verify upload, playback, Yapin', encoder)
- [ ] Data export (per-table CSV/JSON) + users export, avatar/banner files
- [ ] Feature switches: all start off like a fresh install (accounts on); confirm which to turn on
- [ ] GitHub: user connects in Project settings -> Git
