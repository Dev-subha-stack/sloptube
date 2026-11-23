ALTER TABLE public.direct_messages DROP CONSTRAINT direct_messages_body_length;
ALTER TABLE public.direct_messages ADD CONSTRAINT direct_messages_body_length CHECK (
  (deleted_at IS NOT NULL AND body = '')
  OR (char_length(btrim(body)) >= 1 AND char_length(btrim(body)) <= 2000)
);