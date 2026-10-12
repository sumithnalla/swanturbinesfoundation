-- Swan Turbines Foundation: Phase 1 database foundation.
-- Additive only. This migration intentionally creates no auth users or application data.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  email text not null check (char_length(btrim(email)) between 3 and 254),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create unique index profiles_email_lower_key on public.profiles (lower(email));

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name ~ '^[a-z][a-z0-9_]{1,79}$'),
  description text not null default '',
  is_system boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$' or name = '*'),
  description text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  assigned_at timestamptz not null default timezone('utc', now()),
  assigned_by uuid references public.profiles(id) on delete set null,
  primary key (user_id, role_id)
);
create index user_roles_role_id_idx on public.user_roles(role_id);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete restrict,
  granted_at timestamptz not null default timezone('utc', now()),
  primary key (role_id, permission_id)
);
create index role_permissions_permission_id_idx on public.role_permissions(permission_id);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 2 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  short_description text not null check (char_length(short_description) <= 300),
  description text not null check (char_length(description) >= 10),
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'completed')),
  category text not null check (char_length(btrim(category)) between 1 and 80),
  featured boolean not null default false,
  display_order integer not null default 0 check (display_order >= 0),
  target_amount numeric(14,2) check (target_amount is null or target_amount >= 0),
  raised_amount numeric(14,2) check (raised_amount is null or raised_amount >= 0),
  currency text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  image_url text,
  facts jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (target_amount is null or raised_amount is null or raised_amount <= target_amount)
);
create index campaigns_public_listing_idx on public.campaigns(status, display_order, created_at desc);
create index campaigns_featured_listing_idx on public.campaigns(featured, display_order) where status = 'active' and featured;

create sequence public.help_request_reference_sequence as bigint minvalue 1 start with 1;

create function public.next_help_request_reference()
returns text
language plpgsql
set search_path = public, pg_temp
as $$
declare
  sequence_value bigint;
begin
  sequence_value := nextval('public.help_request_reference_sequence');
  return format('STF-%s-%s', to_char(timezone('utc', now()), 'YYYY'), lpad(sequence_value::text, 6, '0'));
end;
$$;

create table public.help_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.next_help_request_reference()
    check (reference ~ '^STF-[0-9]{4}-[0-9]{6,}$'),
  applicant_full_name text not null check (char_length(btrim(applicant_full_name)) between 2 and 120),
  applicant_mobile text not null check (char_length(btrim(applicant_mobile)) between 8 and 25),
  applicant_email text check (applicant_email is null or char_length(btrim(applicant_email)) between 3 and 254),
  applicant_address text not null check (char_length(btrim(applicant_address)) between 2 and 300),
  applicant_city text not null check (char_length(btrim(applicant_city)) between 2 and 80),
  applicant_state text not null check (char_length(btrim(applicant_state)) between 2 and 80),
  support_type text not null default 'other' check (support_type in ('medical', 'education', 'food', 'housing', 'emergency', 'community_development', 'other')),
  description text not null check (char_length(description) between 5 and 2500),
  beneficiaries integer not null default 1 check (beneficiaries between 1 and 10000),
  amount_required text not null check (char_length(btrim(amount_required)) between 1 and 100),
  urgency text not null default 'normal' check (urgency in ('normal', 'urgent', 'emergency')),
  consent boolean not null check (consent),
  consent_at timestamptz not null default timezone('utc', now()),
  status text not null default 'pending' check (status in ('pending', 'under_review', 'accepted', 'rejected')),
  admin_note text not null default '' check (char_length(admin_note) <= 1500),
  assigned_reviewer_id uuid references public.profiles(id) on delete set null,
  google_drive_folder_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index help_requests_admin_listing_idx on public.help_requests(status, urgency, created_at desc);
create index help_requests_created_at_idx on public.help_requests(created_at desc);
create index help_requests_assigned_reviewer_idx on public.help_requests(assigned_reviewer_id) where assigned_reviewer_id is not null;

create table public.request_documents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.help_requests(id) on delete cascade,
  google_drive_file_id text unique,
  google_drive_folder_id text,
  internal_url text,
  original_filename text not null check (char_length(btrim(original_filename)) between 1 and 255),
  mime_type text not null check (char_length(btrim(mime_type)) between 3 and 255),
  document_type text not null default 'other' check (document_type in ('identity', 'medical', 'income', 'quote', 'supporting', 'other')),
  size_bytes bigint check (size_bytes is null or size_bytes between 0 and 10485760),
  sha256 text check (sha256 is null or sha256 ~ '^[A-Fa-f0-9]{64}$'),
  storage_status text not null default 'pending' check (storage_status in ('pending', 'uploaded', 'failed', 'deleted')),
  uploaded_by uuid references public.profiles(id) on delete set null,
  uploaded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (storage_status <> 'uploaded' or google_drive_file_id is not null)
);
create index request_documents_request_id_idx on public.request_documents(request_id, created_at);

create table public.request_status_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.help_requests(id) on delete cascade,
  from_status text check (from_status is null or from_status in ('pending', 'under_review', 'accepted', 'rejected')),
  to_status text not null check (to_status in ('pending', 'under_review', 'accepted', 'rejected')),
  admin_note text check (admin_note is null or char_length(admin_note) <= 1500),
  changed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);
create index request_status_history_request_id_idx on public.request_status_history(request_id, created_at desc);

create table public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (char_length(btrim(first_name)) between 1 and 80),
  last_name text not null check (char_length(btrim(last_name)) between 1 and 80),
  email text not null check (char_length(btrim(email)) between 3 and 254),
  message text not null check (char_length(message) between 10 and 2000),
  created_at timestamptz not null default timezone('utc', now())
);
create index contact_submissions_created_at_idx on public.contact_submissions(created_at desc);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_email text,
  action text not null check (char_length(btrim(action)) between 1 and 160),
  resource_type text check (resource_type is null or char_length(resource_type) <= 80),
  resource_id text check (resource_id is null or char_length(resource_id) <= 255),
  result text not null default 'success' check (result in ('success', 'failure')),
  ip_address inet,
  user_agent text,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now())
);
create index audit_logs_created_at_idx on public.audit_logs(created_at desc);
create index audit_logs_actor_id_idx on public.audit_logs(actor_id, created_at desc) where actor_id is not null;
create index audit_logs_action_idx on public.audit_logs(action, created_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger roles_set_updated_at before update on public.roles for each row execute function public.set_updated_at();
create trigger permissions_set_updated_at before update on public.permissions for each row execute function public.set_updated_at();
create trigger campaigns_set_updated_at before update on public.campaigns for each row execute function public.set_updated_at();
create trigger help_requests_set_updated_at before update on public.help_requests for each row execute function public.set_updated_at();
create trigger request_documents_set_updated_at before update on public.request_documents for each row execute function public.set_updated_at();

-- App-side updates may only use the existing workflow. A later Edge Function owns
-- privileged transitions and inserts a matching immutable history row.
create function public.enforce_help_request_status_transition()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.status = old.status then
    return new;
  end if;
  if old.status = 'pending' and new.status in ('under_review', 'accepted', 'rejected') then
    return new;
  elsif old.status = 'under_review' and new.status in ('pending', 'accepted', 'rejected') then
    return new;
  end if;
  raise exception 'Invalid help request status transition from % to %', old.status, new.status using errcode = 'check_violation';
end;
$$;
create trigger help_requests_enforce_status_transition before update of status on public.help_requests for each row execute function public.enforce_help_request_status_transition();

-- Security-definer helpers are used only by RLS policies. The fixed search path
-- prevents callers from injecting object names through search_path.
create function public.is_active_staff(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p where p.id = check_user_id and p.is_active
  );
$$;

create function public.has_permission(required_permission text, check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    join public.user_roles ur on ur.user_id = p.id
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions perm on perm.id = rp.permission_id
    where p.id = check_user_id
      and p.is_active
      and (perm.name = '*' or perm.name = required_permission
           or perm.name = split_part(required_permission, '.', 1) || '.*'
           or perm.name = split_part(required_permission, '.', 1) || '.manage')
  );
$$;

revoke all on function public.next_help_request_reference() from public;
revoke all on function public.is_active_staff(uuid) from public;
revoke all on function public.has_permission(text, uuid) from public;
grant execute on function public.is_active_staff(uuid), public.has_permission(text, uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.campaigns enable row level security;
alter table public.help_requests enable row level security;
alter table public.request_documents enable row level security;
alter table public.request_status_history enable row level security;
alter table public.contact_submissions enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_select_self on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_staff_select on public.profiles for select to authenticated using (public.has_permission('users.read'));

create policy roles_staff_select on public.roles for select to authenticated using (public.has_permission('roles.read'));
create policy permissions_staff_select on public.permissions for select to authenticated using (public.has_permission('roles.read'));
create policy user_roles_staff_select on public.user_roles for select to authenticated using (public.has_permission('roles.read'));
create policy role_permissions_staff_select on public.role_permissions for select to authenticated using (public.has_permission('roles.read'));

create policy campaigns_public_select_active on public.campaigns for select to anon, authenticated using (status = 'active');
create policy campaigns_staff_all on public.campaigns for all to authenticated using (public.has_permission('campaigns.manage')) with check (public.has_permission('campaigns.manage'));

create policy help_requests_public_insert on public.help_requests for insert to anon, authenticated with check (consent and status = 'pending');
create policy help_requests_staff_select on public.help_requests for select to authenticated using (public.has_permission('requests.read'));
create policy help_requests_staff_update on public.help_requests for update to authenticated using (public.has_permission('requests.manage')) with check (public.has_permission('requests.manage'));

create policy request_documents_staff_select on public.request_documents for select to authenticated using (public.has_permission('documents.read'));
create policy request_documents_staff_modify on public.request_documents for all to authenticated using (public.has_permission('documents.manage')) with check (public.has_permission('documents.manage'));
create policy request_status_history_staff_select on public.request_status_history for select to authenticated using (public.has_permission('requests.read'));
create policy request_status_history_staff_insert on public.request_status_history for insert to authenticated with check (public.has_permission('requests.manage'));

create policy contact_submissions_public_insert on public.contact_submissions for insert to anon, authenticated with check (true);
create policy contact_submissions_staff_select on public.contact_submissions for select to authenticated using (public.has_permission('contact.read'));

create policy audit_logs_staff_select on public.audit_logs for select to authenticated using (public.has_permission('audit.read'));

comment on table public.request_documents is 'Metadata only. Phase 5 will persist Google Drive file identifiers; no document bytes belong in PostgreSQL.';
comment on function public.next_help_request_reference() is 'Atomic, globally unique help-request reference generator. The sequence is intentionally never reset.';
