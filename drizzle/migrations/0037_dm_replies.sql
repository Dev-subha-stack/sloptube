ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS reply_to uuid REFERENCES public.direct_messages(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS direct_messages_reply_to_idx ON public.direct_messages(reply_to);

CREATE OR REPLACE FUNCTION public.direct_messages_throttle()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  new.created_at := now();
  new.body := btrim(new.body);
  if (select count(*) from public.direct_messages d
       where d.sender_id = new.sender_id and d.created_at > now() - interval '1 minute') >= 20 then
    raise exception 'dm_rate_limited';
  end if;
  if new.reply_to is not null and not exists (
    select 1 from public.direct_messages o
     where o.id = new.reply_to
       and ((o.sender_id = new.sender_id and o.recipient_id = new.recipient_id)
         or (o.sender_id = new.recipient_id and o.recipient_id = new.sender_id))
  ) then
    raise exception 'dm_bad_reply';
  end if;
  return new;
end;
$function$;