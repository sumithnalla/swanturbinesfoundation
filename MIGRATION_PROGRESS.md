# Migration Progress — Swan Turbines Foundation

## Current phase

Phase 4 — Frontend Integration and Local Testing: **implemented; ready for approval with deployment prerequisites** (2026-10-10, Asia/Kolkata). Phases 1–3 are complete and approved.

## Phase 4 implemented

- Updated frontend API defaults in `js/api/client.js`, `js/auth.js`, `js/admin.js`, `js/campaigns.js`, `js/main.js`, `js/request-detail.js`, `js/requests-page.js`, and `manage/manage.js` to the deployed Edge Function base while preserving `window.__API_BASE_URL__` as a deployment/local override.
- Repaired reusable request-client paths/parameters to use `/requests/admin`, `page_size`, `admin_note`, and multipart field `files`.
- Added the legacy-compatible `/api/v1/auth/login` Edge Function route, returning the frontend-required user/role/token shape. Re-deployed `api` after this change.
- Kept existing HTML/CSS/assets and the donor/donation prototype intact. No FastAPI/Mongo/GridFS files or migration-sensitive data were deleted.
- The document UI remains intentionally limited: the backend reports `501 DOCUMENT_STORAGE_UNAVAILABLE` until Phase 5.

## Phase 4 verification

- JavaScript syntax checks passed for the modified shared client, public scripts, admin scripts, request pages, and manage script.
- Disposable Foundation Admin test passed against the deployed Edge Function: legacy-compatible login returned an access token and authenticated dashboard data. The temporary Auth user and role assignment were permanently deleted afterward.
- Public health/campaign contract and unauthenticated-admin denial had already passed in Phase 3 and remain the active API behavior.

## Mandatory checklist before Phase 5

1. **Explicit user approval is required.** Do not start Google Cloud/Drive setup without it.
2. Set Edge Function secrets: `ALLOWED_ORIGINS` for the actual public/admin/manage domains, plus `RESEND_API_KEY`, `RESEND_FROM`, and `ADMIN_NOTIFICATION_EMAIL`. Email delivery is otherwise intentionally inactive.
3. In Supabase Auth configuration, disable public self-sign-up and set the approved production redirect URLs. Staff must be provisioned/invited through a controlled server-side workflow.
4. Create/assign real staff accounts and verify least-privilege roles before handing the live admin UI to operators. No real staff account exists yet.
5. Run browser-based end-to-end checks from the intended static hosting/origins (public request, contact, staff login, admin list/detail/status). Docker/browser automation was unavailable here; deployed API and syntax tests passed, but full browser UX was not automated.
6. Before any future retirement of MongoDB/GridFS/JSON fallbacks, export and reconcile MongoDB, GridFS, JSON fallback, and browser-local data using immutable ID/reference mappings. Do not delete those sources during Phase 5.
7. Keep the Supabase service-role key server-side only. Rotate/remove legacy FastAPI fallback credentials only after real staff authentication has been operating successfully.

## Exact next step

Stop and request explicit permission to begin Phase 5 — Google Drive Integration. When approved, inventory existing GridFS/disk/fallback documents before creating Google Cloud resources or uploading any file.

## Phase 3 in progress

- Added and deployed `supabase/functions/api/index.ts`: a single contract-compatible Edge Function router for public campaigns, requests, tracking, contact, protected campaign/request/admin/audit/role/user operations, and server-side Resend calls.
- Added `supabase/config.toml` with `verify_jwt = false` because the router has both public endpoints and explicit per-route JWT/RBAC checks.
- Document uploads/downloads deliberately return `501 DOCUMENT_STORAGE_UNAVAILABLE` until Phase 5 Google Drive work; no Drive work was started.
- Required Phase 3 secret names: `RESEND_API_KEY`, `RESEND_FROM`, `ADMIN_NOTIFICATION_EMAIL`, and optional `ALLOWED_ORIGINS`. No values were created or recorded.
- Deployed Edge Function: `api`, active version 3. Requests use `https://qlfdbimnswbaiouvmtau.supabase.co/functions/v1/api/api/v1/...`; Phase 4 will set the frontend API base/proxy without changing page contracts.

## Phase 3 verification

- Public deployed health endpoint returned `status=ok`.
- Public campaign listing returned the established `{campaigns,total,page,page_size}` shape (currently zero records).
- Unauthenticated admin dashboard access was denied with `403`.
- Document upload endpoint returned the intentional `501 DOCUMENT_STORAGE_UNAVAILABLE` response; no document storage was implemented before Phase 5.
- Supabase Functions list confirms `api` is active (version 3). Earlier Phase 2 Auth/RBAC integration tests remain valid for its shared JWT/permission model.
- Email delivery was not live-tested because no Resend secret names are configured in the linked project. The function safely reports `sent:false`/skips trigger delivery until the required secrets are set; no secret values were requested or stored.

## Phase 3 limits / follow-up

- Docker is unavailable locally, so function unit tests cannot be run with `supabase functions serve`; deployed smoke tests above were run instead.
- Phase 4 must wire the existing frontend to the function base URL and run full browser flows.
- Before production, configure Resend secret values, `ALLOWED_ORIGINS`, Auth redirect URLs, and disable public Auth signup. Do not expose the service-role key.

## Verified starting state

- Read `SHIFT.md` and `majorchnage.md` completely; Phase 1 scope is schema, reference generation, RLS, version-controlled migrations, and verification only.
- Repository was already dirty. Existing user changes were not modified. This migration work is confined to `supabase/` and this file.
- Supabase CLI 2.72.7 is linked to project ref `qlfdbimnswbaiouvmtau` (project name `My Project`, Sydney region).
- `supabase migration list --linked` returned no applied/local migrations. A public-schema dump dry-run found no existing application schema. No remote data was changed during inspection.

## Implemented and deployed

- `supabase/migrations/20261009090000_phase_1_database_foundation.sql`
  - Creates the 11 Phase 1 tables, indexes, constraints, timestamp/status triggers, reference sequence/function, and RLS policies.
  - Does not seed roles, permissions, profiles, campaigns, users, or migrate/delete any data.
  - Document records are metadata-only; no Google Drive integration was started.
  - Applied successfully to linked project `qlfdbimnswbaiouvmtau` using `supabase db push --linked`.
- `supabase/migrations/20261009093000_phase_1_reference_function_access.sql`
  - Applied successfully to linked project `qlfdbimnswbaiouvmtau`. It corrects the anonymous help-request insert path by allowing execution of the fixed-path, security-definer reference function without granting direct sequence access.

## Phase 2 implemented

- `supabase/migrations/20261009100000_phase_2_authentication_authorization.sql` was applied successfully to linked project `qlfdbimnswbaiouvmtau`.
  - Seeds only canonical system roles and permission definitions; creates no staff/auth accounts.
  - Creates a secure `auth.users` → `public.profiles` trigger with empty initial roles.
  - Protects profile identity/activation fields from direct self-service updates.
  - Removes direct browser RLS write paths for privileged administrative data; later Edge Functions must use server-side authorization.
- The system roles are `super_admin`, `websitter_staff`, `foundation_admin`, `foundation_staff`, and `foundation_reviewer`. The permission set mirrors the existing route/operation categories.
- Browser-delivered privileged fallback credentials were removed from `js/db.js` and `manage/manage.js`; `js/auth.js` rejects privileged local fallback users. The donor/demo local store remains untouched in purpose.
- Existing backend fallback accounts were deliberately not changed. They are temporary server-side legacy compatibility only and must be removed/rotated after real Supabase staff accounts and Phase 3 server-side login are in place.

## Safety decisions

- Existing public data was not reset or overwritten.
- The immutable `STF-YYYY-NNNNNN` generator uses an atomic PostgreSQL sequence. The sequence is never reset, avoiding duplicate references across years.
- Anonymous access is limited to active campaign reads and inserts for public help/contact submissions. All sensitive records are RLS-denied unless a future authenticated staff member has mapped permissions.

## Tests and verification

- `supabase migration list --linked`: local and remote both contain `20261009090000` at `2026-10-09 09:00:00 UTC` and `20261009093000` at `2026-10-09 09:30:00 UTC`.
- `supabase db lint --linked`: **No schema errors found** for `extensions` and `public`.
- `supabase inspect db table-stats --linked`: confirmed exactly these empty Phase 1 tables: `profiles`, `roles`, `permissions`, `user_roles`, `role_permissions`, `campaigns`, `help_requests`, `request_documents`, `request_status_history`, `contact_submissions`, and `audit_logs`. Estimated row count was zero for every table; no data was seeded or migrated.
- `supabase inspect db index-stats --linked`: confirmed primary/unique and planned listing/history indexes, including request-reference, campaign-listing, document-request, status-history, and audit indexes.
- Anonymous REST reads using the publishable key held only in memory returned `HTTP 200 []` for `profiles` and `campaigns`. The latter has no active campaigns yet; this is consistent with RLS/default-empty state.
- Full runtime anonymous-write denial, public request insertion/reference generation, and authenticated staff-permission tests are **not yet executable**: no Phase 2 authenticated user/role assignments may be created, and this phase may not create even temporary application records. The installed Windows PowerShell also failed to submit a valid curl JSON POST (`PGRST102` before policy evaluation). No test row was created. The policy definitions and reference-function execution correction are version controlled and remote lint passed.
- `supabase db dump --linked` schema-export verification could not run because local Docker Desktop is not installed; remote lint/inspect did run successfully without Docker.
- Phase 2 integration test used one disposable `@example.invalid` user, then permanently deleted it. Verified: Auth-to-profile trigger, reviewer role assignment, password login, authenticated self-profile read, reviewer campaign-write denial (`403`), direct self activation-state change denial (`403`), and logout (`204`). Cleanup succeeded; no test user remains.
- Final service-role read-only verification: `profiles=0`, `user_roles=0`, disposable Phase 2 Auth users=0, `roles=5`, `permissions=15`, and `role_permissions=23`. Only canonical RBAC configuration remains; no staff/test account or assignment was retained.
- Local checks: `node --check js/db.js`, `node --check js/auth.js`, and `node --check manage/manage.js` passed. Browser credential scan for the former privileged fallback passwords in `js`, `manage`, and `adminlogin` was clean. `git diff --check` completed without whitespace errors.
- Final remote checks: migration history contains all three migrations and `supabase db lint --linked` returned **No schema errors found**.

## Blockers

No Phase 2 implementation blocker. Docker Desktop/`psql` remain unavailable for schema dumps. Before production/frontend cutover, explicitly disable public self-sign-up in the Supabase Auth project configuration (staff accounts should be invite/admin-provisioned only) and configure approved production Auth redirect URLs; this CLI version exposes no project-auth settings command. Do not place the service-role key in frontend code.

## Exact next step

Obtain explicit approval before beginning Phase 4. The next agent must read `SHIFT.md`, `majorchnage.md`, this file, inspect Git status, verify the active `api` Edge Function, then connect only the existing frontend to the new API. Do not begin Google Drive work; Phase 5 remains gated by explicit approval after Phase 4.
