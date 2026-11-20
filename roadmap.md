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

## Round 3 (Nov 15)
- [x] FIX: home page must show all videos
- [x] FIX: giving someone moderator fails with an error
- [x] Custom emoji per channel
- [x] Suggestions tab (users suggest features, admins see them)
- [x] Share link for unlisted videos with trusted people
- [x] Add-thumbnail button
- [x] Publish button (videos don't auto-publish)
- [ ] Livestreaming + connect YouTube/other apps (do last) — waiting on the user's choice of live video service

## Thumbnail editor (Nov 16)
- [ ] Add thumbnail on the upload page with preview, size, width, height and position

## Round 4 (Nov 17) — do in this order
### Phase 1
- [x] Admin Announcements section; announcements shown to all users (dismissible banner)
### Phase 2
- [x] Support Us / Patreon card in the 3-line drawer (https://www.patreon.com/cw/sloptube, new tab)
### Phase 3
- [x] Custom badges and roles with colour picker, assign to users, granular permissions
- [x] Admin Videos tab: search by title, permanently delete
- [x] Fix mod panel crashes / permission glitches
- [x] Staff can change users' usernames
- [x] FIX: custom badges must show to every user next to names
### Phase 4
- [x] YouTube-style home grid; existing paginated feed includes public ready videos
- [x] Username/profile changes sync immediately in the browser store and channel database triggers
- [x] Mobile fit: clip horizontal overflow and responsive spacing
- [x] Snappy interaction feedback and motion-aware button transitions
- [x] Subscriptions page lists followed channels only
- [x] Studio shortcut in profile menu; video/comment likes trigger notifications and bell refreshes in real time
- [x] Direct messages between users (existing RLS-protected DM system)
- [x] Clickable safe external links in video descriptions
- [x] Secure original-video download; live emoji hover/focus preview
### Phase 5
- [x] Prevent signed-out menu flash while a browser session is being hydrated
- [x] Remove browser PiP; miniplayer restore returns to the watch player
- [x] Remove watch-page auto-play calls that could restart paused videos
- [x] Add unsupported-browser/media error handling for Snips; remove bundled fake demo playlists
- [x] Keep multipart upload progress monotonic across retries; reserve 100% for finalization
- [ ] Performance pass
