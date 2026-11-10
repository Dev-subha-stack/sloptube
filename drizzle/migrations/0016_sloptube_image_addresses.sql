-- Profile pictures and banners now live in private storage and are served from
-- this site's /api/public/images/<bucket>/<user id>/<file>; allow that address too.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_avatar_url_https;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_avatar_url_https
  CHECK (avatar_url IS NULL OR avatar_url ~ '^https://' OR avatar_url ~ '^/api/public/images/avatars/[0-9a-f-]{36}/[0-9]{1,16}\.(png|webp)$');

ALTER TABLE public.channels DROP CONSTRAINT IF EXISTS channels_avatar_url_https;
ALTER TABLE public.channels ADD CONSTRAINT channels_avatar_url_https
  CHECK (avatar_url IS NULL OR avatar_url ~ '^https://' OR avatar_url ~ '^/api/public/images/avatars/[0-9a-f-]{36}/[0-9]{1,16}\.(png|webp)$');

ALTER TABLE public.channels DROP CONSTRAINT IF EXISTS channels_banner_url_https;
ALTER TABLE public.channels ADD CONSTRAINT channels_banner_url_https
  CHECK (banner_url IS NULL OR banner_url ~ '^https://' OR banner_url ~ '^/api/public/images/banners/[0-9a-f-]{36}/[0-9]{1,16}\.(png|webp)$');