-- Swan Turbines Foundation: Phase 2 authentication and authorization.
-- This migration creates no auth users. Staff accounts must be provisioned through
-- a server-side administrator workflow in Phase 3 or by an explicitly approved
-- operator; direct browser role management remains unavailable.

insert into public.permissions (name, description) values
  ('*', 'Unrestricted system permission; reserved for the super administrator role.'),
  ('audit.read', 'Read audit logs.'),
  ('campaigns.read', 'Read all campaign records.'),
  ('campaigns.manage', 'Create, update, publish, pause, or delete campaigns.'),
  ('contact.read', 'Read contact submissions.'),
  ('documents.read', 'Read request-document metadata.'),
  ('documents.manage', 'Manage request-document metadata.'),
  ('requests.read', 'Read help requests.'),
  ('requests.manage', 'Manage help-request review and status workflow.'),
  ('requests.update_status', 'Update help-request status.'),
  ('requests.view_documents', 'View request documents.'),
  ('roles.read', 'Read role and permission definitions.'),
  ('roles.manage', 'Manage role and permission assignments.'),
  ('users.read', 'Read staff profiles.'),
  ('users.manage', 'Provision and manage staff accounts.')
on conflict (name) do update set description = excluded.description, updated_at = timezone('utc', now());

insert into public.roles (name, description, is_system) values
  ('super_admin', 'WEBSITTER Super Administrator with unrestricted access.', true),
  ('websitter_staff', 'WEBSITTER technical staff with user, role, and audit visibility.', true),
  ('foundation_admin', 'Foundation executive or administrator.', true),
  ('foundation_staff', 'Foundation operations staff with limited request access.', true),
  ('foundation_reviewer', 'Help-request reviewer with read-only access.', true)
on conflict (name) do update set description = excluded.description, is_system = true, updated_at = timezone('utc', now());

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on (
  (r.name = 'super_admin' and p.name = '*')
  or (r.name = 'websitter_staff' and p.name in ('audit.read', 'users.read', 'roles.read'))
  or (r.name = 'foundation_admin' and p.name in ('campaigns.read', 'campaigns.manage', 'requests.read', 'requests.manage', 'requests.update_status', 'requests.view_documents', 'documents.read', 'documents.manage', 'contact.read', 'audit.read'))
  or (r.name = 'foundation_staff' and p.name in ('campaigns.read', 'requests.read', 'requests.manage', 'requests.update_status', 'requests.view_documents', 'documents.read'))
  or (r.name = 'foundation_reviewer' and p.name in ('requests.read', 'requests.view_documents', 'documents.read'))
)
on conflict (role_id, permission_id) do nothing;

-- Auth users receive a matching profile automatically. Their initial role set is
-- deliberately empty: only a server-side privileged workflow may assign roles.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  profile_name text;
begin
  profile_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(split_part(coalesce(new.email, ''), '@', 1)), ''),
    'Staff member'
  );

  insert into public.profiles (id, full_name, email)
  values (new.id, left(profile_name, 120), coalesce(new.email, new.id::text || '@invalid.local'))
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- A signed-in staff member may update their display name only. Email identity and
-- account activation are controlled by Supabase Auth and server-side admin flows.
create or replace function public.protect_profile_system_fields()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if auth.uid() = old.id then
    if new.id <> old.id or new.email is distinct from old.email or new.is_active is distinct from old.is_active then
      raise exception 'Only the display name may be updated directly.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_system_fields on public.profiles;
create trigger profiles_protect_system_fields
  before update on public.profiles
  for each row execute function public.protect_profile_system_fields();

-- Browser/database clients must not perform administrative mutations directly.
-- Future Edge Functions use the service role after independently verifying the
-- caller's JWT and permissions. This removes reliance on frontend-only checks.
drop policy if exists campaigns_staff_all on public.campaigns;
drop policy if exists help_requests_staff_update on public.help_requests;
drop policy if exists request_documents_staff_modify on public.request_documents;
drop policy if exists request_status_history_staff_insert on public.request_status_history;

-- No policy exists for roles, permissions, user_roles, role_permissions, audit
-- writes, or staff provisioning. Those tables are therefore deny-by-default for
-- browser roles. Keep authenticated staff read policies for the future admin UI.

revoke all on function public.handle_new_auth_user() from public;
revoke all on function public.protect_profile_system_fields() from public;

comment on function public.handle_new_auth_user() is 'Supabase Auth trigger: creates an unprivileged public profile. Phase 3 server-side provisioning assigns roles.';
comment on function public.protect_profile_system_fields() is 'Prevents a signed-in user from changing profile email, id, or activation state directly.';
