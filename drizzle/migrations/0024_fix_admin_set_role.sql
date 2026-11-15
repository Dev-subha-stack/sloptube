CREATE OR REPLACE FUNCTION public.admin_set_role(target uuid, role app_role, enabled boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare
  me uuid := auth.uid();
  want public.app_role := admin_set_role.role;
  who uuid := admin_set_role.target;
  target_email text;
begin
  if not public.is_admin() then raise exception 'not_admin' using errcode = 'P0001'; end if;
  if want not in ('admin', 'moderator') then raise exception 'bad_role' using errcode = 'P0001'; end if;
  select u.email into target_email from auth.users u where u.id = who;
  if target_email is null then raise exception 'not_found' using errcode = 'P0001'; end if;
  if lower(target_email) = public.owner_email() or who = me then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  if admin_set_role.enabled then
    insert into public.user_roles as ur (user_id, role) values (who, want) on conflict on constraint user_roles_user_id_role_key do nothing;
  else
    delete from public.user_roles r where r.user_id = who and r.role = want;
  end if;
  perform public.mod_write_log(me, case when admin_set_role.enabled then 'grant_' else 'revoke_' end || want::text,
    'user', who, coalesce((select p.username from public.profiles p where p.id = who), ''), '');
end;
$function$;