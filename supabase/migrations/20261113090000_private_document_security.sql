-- Preparation only: do not apply until the clean-copy pipeline and identity setup are verified.
-- Existing documents remain legacy; no historical file or record is moved or deleted.
begin;

alter table public.request_documents
  add column security_state text not null default 'legacy'
    check (security_state in ('legacy', 'processing', 'ready'));

-- The legacy RLS policy exposed original Drive identifiers through PostgREST.
-- Direct staff reads must be restricted too; the service API can list safe metadata.
drop policy if exists request_documents_staff_select on public.request_documents;
create policy request_documents_staff_select on public.request_documents for select to authenticated
  using (security_state = 'ready' and public.has_permission('documents.read'));

-- Originals are never stored on the staff-readable request_documents row.
create table public.private_document_jobs (
  document_id uuid primary key references public.request_documents(id) on delete cascade,
  original_file_id text not null,
  original_folder_id text not null,
  status text not null default 'processing' check (status in ('processing', 'ready')),
  retry_count integer not null default 0 check (retry_count >= 0),
  next_attempt_at timestamptz not null default now(),
  lease_id uuid,
  lease_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index private_document_jobs_retry_idx on public.private_document_jobs(next_attempt_at)
  where status = 'processing';
alter table public.private_document_jobs enable row level security;
revoke all on public.private_document_jobs from public, anon, authenticated;
grant select, insert, update, delete on public.private_document_jobs to service_role;

-- Atomic leases allow multiple retry workers without concurrent processing of one file.
create function public.acquire_document_rebuild(p_document uuid, p_lease uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
  update public.private_document_jobs set lease_id=p_lease, lease_until=now()+interval '2 minutes', updated_at=now()
  where document_id=p_document and status='processing' and next_attempt_at<=now()
    and (lease_until is null or lease_until<now());
  return found;
end $$;
revoke all on function public.acquire_document_rebuild(uuid,uuid) from public,anon,authenticated;
grant execute on function public.acquire_document_rebuild(uuid,uuid) to service_role;

-- Only a leased job can publish a new, distinct clean Drive file to staff.
create function public.finish_document_rebuild(p_document uuid, p_lease uuid, p_clean_file_id text, p_clean_folder_id text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare original_id text; original_folder text;
begin
  if p_clean_file_id is null or p_clean_file_id !~ '^[A-Za-z0-9_-]{10,255}$'
     or p_clean_folder_id is null or p_clean_folder_id !~ '^[A-Za-z0-9_-]{10,255}$' then
    raise exception 'Invalid clean Drive identifier' using errcode='22023';
  end if;
  select original_file_id,original_folder_id into original_id,original_folder from public.private_document_jobs
    where document_id=p_document and status='processing' and lease_id=p_lease and lease_until>now() for update;
  if not found then return false; end if;
  if original_id=p_clean_file_id or original_folder=p_clean_folder_id then raise exception 'Original cannot be published' using errcode='23514'; end if;
  update public.request_documents set google_drive_file_id=p_clean_file_id,
    google_drive_folder_id=p_clean_folder_id,
    internal_url='https://drive.google.com/file/d/'||p_clean_file_id||'/view',
    storage_status='uploaded', security_state='ready', uploaded_at=now(), updated_at=now()
    where id=p_document and security_state='processing';
  if not found then return false; end if;
  update public.private_document_jobs set status='ready',lease_id=null,lease_until=null,updated_at=now()
    where document_id=p_document;
  return true;
end $$;
revoke all on function public.finish_document_rebuild(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.finish_document_rebuild(uuid,uuid,text,text) to service_role;

create function public.defer_document_rebuild(p_document uuid, p_lease uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
  update public.private_document_jobs set retry_count=retry_count+1,
    next_attempt_at=now() + make_interval(secs => least(3600, 30 * power(2,least(retry_count,7)))::integer),
    lease_id=null,lease_until=null,updated_at=now()
  where document_id=p_document and status='processing' and lease_id=p_lease and lease_until>now();
  return found;
end $$;
revoke all on function public.defer_document_rebuild(uuid,uuid) from public,anon,authenticated;
grant execute on function public.defer_document_rebuild(uuid,uuid) to service_role;

-- No plaintext IP addresses are stored. Values are supplied only by a trusted ingress.
create table public.public_request_rate_limits (
  endpoint text not null check (endpoint in ('help','contact','upload')),
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  hit_count integer not null default 0 check (hit_count >= 0),
  primary key(endpoint, ip_hash, window_start)
);
create index public_request_rate_limits_expiry_idx on public.public_request_rate_limits(window_start);
alter table public.public_request_rate_limits enable row level security;
revoke all on public.public_request_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.public_request_rate_limits to service_role;

create function public.take_public_request_rate_limit(p_endpoint text, p_ip_hash text, p_limit integer)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare bucket timestamptz := date_trunc('hour', now()); hits integer;
begin
  if p_endpoint not in ('help','contact','upload') or p_ip_hash !~ '^[0-9a-f]{64}$' or p_limit < 1 or p_limit > 10000 then
    raise exception 'Invalid rate limit parameters' using errcode='22023';
  end if;
  insert into public.public_request_rate_limits(endpoint,ip_hash,window_start,hit_count)
  values(p_endpoint,p_ip_hash,bucket,1)
  on conflict(endpoint,ip_hash,window_start) do update
  set hit_count=least(public.public_request_rate_limits.hit_count+1,p_limit+1)
  returning hit_count into hits;
  -- Bound cleanup work per request; no raw addresses are available in this table.
  delete from public.public_request_rate_limits where ctid in (
    select ctid from public.public_request_rate_limits where window_start < now()-interval '48 hours' limit 100
  );
  return hits <= p_limit;
end $$;
revoke all on function public.take_public_request_rate_limit(text,text,integer) from public,anon,authenticated;
grant execute on function public.take_public_request_rate_limit(text,text,integer) to service_role;
commit;
