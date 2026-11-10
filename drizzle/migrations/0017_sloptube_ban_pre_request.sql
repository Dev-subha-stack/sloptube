-- Banned accounts are refused on every Data API request, as in the original 016_moderation.sql.
ALTER ROLE authenticator SET pgrst.db_pre_request = 'public.moderation_pre_request';
NOTIFY pgrst, 'reload config';