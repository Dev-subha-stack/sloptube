# sloptube migration roadmap

Source unpacked (no node_modules) at /tmp/src/sloptube (re-extract from user-uploads://sloptube.zip with python zipfile, skipping node_modules/.next/.git/.env*). Comment-stripped SQL at /tmp/mig/s/.

## Database (Lovable Cloud)
- [x] 000-003 profiles/avatars (bucket rows created by tool, private: workspace blocks public buckets)
- [x] 004 channels (+banners policies)
- [x] 005-006 videos, processing
- [x] 007-009 watch, feed, subscriptions
- [x] 010 search
- [x] 011 engagement (+ pg_cron hourly rollup)
- [x] 012 comments (applied as 012a + 012b)
- [x] 013 shorts
- [x] 014 studio (+ pg_cron daily purge)
- [x] 015 stats
- [x] 016 moderation (016a + 016b; roles moved to user_roles/has_role; profiles.role deprecated; ban enforced in app server since pre-request hook not set; auth.sessions delete dropped)
- [x] 017 launch, 018 yapin, 019 yapin facts, 020 flag panel
- [ ] 021 SKIP (references nonexistent public.accounts) -> instead user_roles table synced to profiles.role
- [ ] 022/023 with grants
- [ ] final: reset default privileges added in first migration
- Each table gets `grant all ... to service_role` explicitly after source revokes.

## App port (Next.js -> TanStack Start)
- [ ] styles: app/globals.css -> src/styles.css (Roboto link in head)
- [ ] lib/ copied to src/lib (supabase shim: server client from bearer header via getRequest; browser = generated client)
- [ ] R2: replace @aws-sdk with aws4fetch (UploadStorage/MediaStorage interfaces)
- [ ] components/ copied to src/components (next/link, next/navigation, next/image shims)
- [ ] server components -> server fns + route loaders
- [ ] app/api/* -> src/routes/api/* server routes (client fetch adds bearer)
- [ ] pages -> src/routes/*, /@handle rewrites, redirects, embed CSP header
- [ ] auth: email/password + Google via Lovable broker; Yapin' OAuth routes preserved
- [ ] avatars/banners served through a public image route (private buckets)
- [ ] encoder worker: /api/public/encoder/* endpoints with ENCODER_SECRET; worker/lib/db.mjs over HTTP; copy worker/ + ops/
- [ ] head() metadata per route
- [ ] verify build, routes, sign-in, CRUD

## Blocked on user
- R2_* secrets, MEDIA_PUBLIC_URL, SITE_URL, YAPIN_CLIENT_ID/SECRET, ENCODER_SECRET
- Data export (per-table CSV/JSON) + users export (id, email)
