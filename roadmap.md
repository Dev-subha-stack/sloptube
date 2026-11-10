# sloptube migration roadmap

Source unpacked (no node_modules) at /tmp/src/sloptube (re-extract from user-uploads://sloptube.zip with python zipfile, skipping node_modules/.next/.git/.env*). Comment-stripped SQL at /tmp/mig/s/.

## Database (Lovable Cloud)
- [x] 000-020, 022, 023 applied (016 split; roles in user_roles/has_role; profiles.role deprecated)
- [x] 021 skipped (references nonexistent public.accounts; superseded by user_roles)
- [x] ban pre-request hook on the Data API (moderation_pre_request), verified with a banned test account
- [x] avatar/banner URL constraints allow /api/public/images/... addresses

## App port (Next.js -> TanStack Start)
- [x] styles, lib, components, shims (next/link, next/navigation, next/image, next/server)
- [x] R2 via aws4fetch (not yet tested against R2: needs secrets)
- [x] every page as a route with server-fn loaders + head(); /@handle via router rewrite; /history, /subscriptions redirects; embed CSP header
- [x] API handlers as server routes (bearer from browser fetch wrapper)
- [x] auth: email/password + Google (Lovable broker) + /auth/callback; Yapin' callback -> /yapin-finish one-time token
- [x] avatars/banners served by /api/public/images (private buckets), verified upload + display
- [x] encoder worker talks to /api/public/encoder/rpc with ENCODER_SECRET (worker/test/db.test.mjs)
- [x] verified: typecheck clean, all pages render, sign in, onboarding write, studio/channel owner view

## Blocked on user
- [ ] Secrets: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, MEDIA_PUBLIC_URL, SITE_URL, YAPIN_CLIENT_ID, YAPIN_CLIENT_SECRET, ENCODER_SECRET (then verify upload, playback, Yapin', encoder)
- [ ] Data export (per-table CSV/JSON) + users export (id, email, profile fields, roles), avatar/banner files
- [ ] Feature switches: all start off like a fresh install (accounts on); confirm which to turn on
