begin;

-- Replace a user's complete role set as one audited, authorized transaction.
create or replace function public.replace_user_roles(
  p_actor uuid,
  p_user uuid,
  p_role_ids uuid[]
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_profile public.profiles;
  target_profile public.profiles;
  old_names text[];
  new_names text[];
begin
  if not public.has_permission('users.manage', p_actor) then
    raise exception 'Insufficient permission' using errcode = '42501';
  end if;
  select * into strict actor_profile from public.profiles where id = p_actor and is_active;
  select * into strict target_profile from public.profiles where id = p_user for update;

  select coalesce(array_agg(r.name order by r.name), '{}'::text[]) into old_names
  from public.user_roles ur join public.roles r on r.id = ur.role_id where ur.user_id = p_user;
  select coalesce(array_agg(r.name order by r.name), '{}'::text[]) into new_names
  from public.roles r where r.id = any(coalesce(p_role_ids, '{}'::uuid[]));
  if cardinality(new_names) <> cardinality(coalesce(p_role_ids, '{}'::uuid[])) then
    raise exception 'One or more selected roles do not exist' using errcode = '22023';
  end if;

  if 'super_admin' = any(old_names) and not ('super_admin' = any(new_names)) and target_profile.is_active then
    perform pg_advisory_xact_lock(hashtext('swan-active-super-admins'));
    if (select count(*) from public.profiles p
        join public.user_roles ur on ur.user_id = p.id
        join public.roles r on r.id = ur.role_id
        where p.is_active and r.name = 'super_admin' and p.id <> p_user) = 0 then
      raise exception 'At least one active super-admin must remain' using errcode = '23514';
    end if;
  end if;

  delete from public.user_roles where user_id = p_user;
  insert into public.user_roles(user_id, role_id, assigned_by)
  select p_user, r.id, p_actor from public.roles r where r.id = any(coalesce(p_role_ids, '{}'::uuid[]));

  insert into public.audit_logs(actor_id, actor_email, action, resource_type, resource_id, metadata)
  values (actor_profile.id, actor_profile.email, 'user.roles_changed', 'user', p_user::text,
    jsonb_build_object('previous_roles', old_names, 'new_roles', new_names));

  return jsonb_build_object('user_id', p_user, 'role_ids', coalesce(p_role_ids, '{}'::uuid[]), 'role_names', new_names);
end;
$$;

revoke all on function public.replace_user_roles(uuid, uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.replace_user_roles(uuid, uuid, uuid[]) to service_role;

-- Profile activity is checked on every protected API request, so changing this
-- value invalidates existing access tokens at the API boundary immediately.
create or replace function public.set_user_active(p_actor uuid, p_user uuid, p_active boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_profile public.profiles;
  target_profile public.profiles;
  target_is_super_admin boolean;
begin
  if not public.has_permission('users.manage', p_actor) then
    raise exception 'Insufficient permission' using errcode = '42501';
  end if;
  select * into strict actor_profile from public.profiles where id = p_actor and is_active;
  select * into strict target_profile from public.profiles where id = p_user for update;
  select exists(select 1 from public.user_roles ur join public.roles r on r.id=ur.role_id
    where ur.user_id=p_user and r.name='super_admin') into target_is_super_admin;
  if not p_active and target_profile.is_active and target_is_super_admin then
    perform pg_advisory_xact_lock(hashtext('swan-active-super-admins'));
    if (select count(*) from public.profiles p
        join public.user_roles ur on ur.user_id=p.id
        join public.roles r on r.id=ur.role_id
        where p.is_active and r.name='super_admin' and p.id<>p_user)=0 then
      raise exception 'At least one active super-admin must remain' using errcode = '23514';
    end if;
  end if;
  update public.profiles set is_active=p_active where id=p_user;
  insert into public.audit_logs(actor_id,actor_email,action,resource_type,resource_id)
  values(actor_profile.id,actor_profile.email,case when p_active then 'user.enabled' else 'user.disabled' end,'user',p_user::text);
  return jsonb_build_object('user_id',p_user,'is_active',p_active);
end;
$$;

revoke all on function public.set_user_active(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.set_user_active(uuid, uuid, boolean) to service_role;

commit;
