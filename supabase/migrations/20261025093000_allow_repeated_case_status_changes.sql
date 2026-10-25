begin;

-- Case decisions are revisable: authorized admins may move between any of the
-- supported workflow states. Authorization and immutable history remain enforced
-- by adjudicate_request(), which is callable only by service_role.
create or replace function public.enforce_help_request_status_transition()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.status = old.status then
    return new;
  end if;
  if new.status in ('pending', 'under_review', 'accepted', 'rejected') then
    return new;
  end if;
  raise exception 'Invalid help request status: %', new.status using errcode = 'check_violation';
end;
$$;

commit;
