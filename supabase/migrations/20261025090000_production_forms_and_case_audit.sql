-- Production fixes. Preserve historical submissions, including legacy formats.
begin;
alter table public.contact_submissions add column full_name text, add column mobile text;
update public.contact_submissions set full_name = btrim(first_name || ' ' || last_name);
alter table public.contact_submissions alter column first_name drop not null, alter column last_name drop not null;
alter table public.help_requests add column submission_key_hash text unique, add column submission_payload_hash text,
  add column document_upload_lock uuid, add column document_upload_lock_until timestamptz;
alter table public.request_status_history add column changed_by_name text, add column changed_by_email text;
update public.request_status_history h set changed_by_name=p.full_name, changed_by_email=p.email
from public.profiles p where p.id=h.changed_by;

-- New inserts and edits to applicant fields must satisfy current rules. Old rows
-- can still be adjudicated without rewriting their originally submitted details.
create function public.validate_production_submission() returns trigger language plpgsql
set search_path=public,pg_temp as $$
begin
  if tg_table_name='contact_submissions' then
    if new.full_name is null or char_length(btrim(new.full_name)) not between 2 and 120
      or new.mobile is null or new.mobile !~ '^[0-9]{10}$'
      or new.email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      or char_length(new.email)>254 or char_length(btrim(new.message)) not between 10 and 1000 then
      raise exception 'Invalid contact fields' using errcode='23514';
    end if;
  else
    if new.applicant_mobile !~ '^[0-9]{10}$' or new.applicant_email is null
      or new.applicant_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      or char_length(new.applicant_email)>254 or char_length(btrim(new.description)) not between 10 and 1000 then
      raise exception 'Invalid applicant fields' using errcode='23514';
    end if;
  end if;
  return new;
end $$;
create trigger contact_validate_submission before insert or update of full_name,mobile,email,message on public.contact_submissions
for each row execute function public.validate_production_submission();
create trigger request_validate_submission before insert or update of applicant_mobile,applicant_email,description on public.help_requests
for each row execute function public.validate_production_submission();
-- Public submissions go through the validated Edge API, not unrestricted REST inserts.
drop policy if exists contact_submissions_public_insert on public.contact_submissions;
drop policy if exists help_requests_public_insert on public.help_requests;

create function public.acquire_document_upload(p_request uuid,p_lock uuid) returns boolean
language plpgsql set search_path=public,pg_temp as $$
begin
  update public.help_requests set document_upload_lock=p_lock,document_upload_lock_until=now()+interval '10 minutes'
  where id=p_request and (document_upload_lock_until is null or document_upload_lock_until<now());
  return found;
end $$;
create function public.release_document_upload(p_request uuid,p_lock uuid) returns void
language sql set search_path=public,pg_temp as $$
  update public.help_requests set document_upload_lock=null,document_upload_lock_until=null
  where id=p_request and document_upload_lock=p_lock;
$$;
create function public.enforce_document_count() returns trigger language plpgsql
set search_path=public,pg_temp as $$
begin
  perform 1 from public.help_requests where id=new.request_id for update;
  if (select count(*) from public.request_documents where request_id=new.request_id and storage_status<>'deleted' and id<>new.id)>=3 then
    raise exception 'At most three documents per request' using errcode='23514';
  end if;
  return new;
end $$;
create trigger request_document_count before insert or update of request_id on public.request_documents
for each row execute function public.enforce_document_count();

create function public.adjudicate_request(p_request uuid,p_actor uuid,p_status text,p_note text) returns jsonb
language plpgsql set search_path=public,pg_temp as $$
declare old_row public.help_requests; new_row public.help_requests; staff public.profiles;
begin
  if not public.has_permission('requests.manage',p_actor) then
    raise exception 'Insufficient permission' using errcode='42501';
  end if;
  select * into strict staff from public.profiles where id=p_actor and is_active;
  select * into strict old_row from public.help_requests where id=p_request for update;
  update public.help_requests set status=p_status,admin_note=coalesce(p_note,admin_note)
  where id=p_request returning * into new_row;
  if old_row.status<>new_row.status then
    insert into public.request_status_history(request_id,from_status,to_status,admin_note,changed_by,changed_by_name,changed_by_email)
    values(p_request,old_row.status,new_row.status,new_row.admin_note,staff.id,staff.full_name,staff.email);
  end if;
  insert into public.audit_logs(actor_id,actor_email,action,resource_type,resource_id,metadata)
  values(staff.id,staff.email,case when old_row.status<>new_row.status then 'request.status_changed' else 'request.note_updated' end,
    'help_request',p_request::text,jsonb_build_object('from',old_row.status,'to',new_row.status));
  return to_jsonb(new_row);
end $$;
revoke all on function public.validate_production_submission(),public.enforce_document_count(),
  public.acquire_document_upload(uuid,uuid),public.release_document_upload(uuid,uuid),
  public.adjudicate_request(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.acquire_document_upload(uuid,uuid),public.release_document_upload(uuid,uuid),
  public.adjudicate_request(uuid,uuid,text,text) to service_role;
grant execute on function public.has_permission(text,uuid) to service_role;
commit;
