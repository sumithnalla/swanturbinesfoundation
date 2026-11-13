-- Release 1 only: public endpoint circuit breaker and best-effort IP buckets.
begin;
create table public.public_endpoint_limits (
  endpoint text not null check(endpoint in ('help','contact','upload')),
  bucket text not null check(bucket='global' or bucket ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key(endpoint,bucket,window_start)
);
alter table public.public_endpoint_limits enable row level security;
revoke all on public.public_endpoint_limits from public, anon, authenticated;
grant select,insert,update,delete on public.public_endpoint_limits to service_role;
create function public.take_public_endpoint_limit(p_endpoint text,p_hash text,p_global_limit integer,p_ip_limit integer)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare bucket_start timestamptz:=date_trunc('hour',now()); global_hits integer; ip_hits integer;
begin
  if p_endpoint is null or p_endpoint not in ('help','contact','upload') or p_global_limit is null or p_ip_limit is null
    or p_global_limit not between 1 and 10000 or p_ip_limit not between 1 and 10000
    or (p_hash is not null and p_hash !~ '^[0-9a-f]{64}$') then
    raise exception 'Invalid rate limit parameters' using errcode='22023';
  end if;
  insert into public.public_endpoint_limits values(p_endpoint,'global',bucket_start,1)
  on conflict(endpoint,bucket,window_start) do update set hits=least(public.public_endpoint_limits.hits+1,p_global_limit+1)
  returning hits into global_hits;
  if p_hash is not null then
    insert into public.public_endpoint_limits values(p_endpoint,p_hash,bucket_start,1)
    on conflict(endpoint,bucket,window_start) do update set hits=least(public.public_endpoint_limits.hits+1,p_ip_limit+1)
    returning hits into ip_hits;
  end if;
  delete from public.public_endpoint_limits where ctid in
    (select ctid from public.public_endpoint_limits where window_start<now()-interval '48 hours' limit 100);
  return global_hits<=p_global_limit and (p_hash is null or ip_hits<=p_ip_limit);
end $$;
revoke all on function public.take_public_endpoint_limit(text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.take_public_endpoint_limit(text,text,integer,integer) to service_role;
commit;
