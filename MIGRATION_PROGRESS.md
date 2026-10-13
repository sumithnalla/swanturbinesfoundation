# Migration Progress — Swan Turbines Foundation

## Phase 5 implementation update (2026-10-12)

- Private Google Drive folders `Swan Turbines Foundation` -> `Charity Requests` were created/reused after Drive-scoped OAuth; the dedicated service account was granted Writer access to the private root.
- Applied migration `20261012100000_phase_5_drive_document_security.sql`, adding only a hashed, expiring applicant upload capability.
- Implemented and deployed API version 8: secure token issuance, PDF/Word/Excel/image validation, Drive upload, metadata-only document rows, protected listing, and Drive streaming downloads. Public Drive permissions are not used.
- Schema checks passed: `supabase db lint --linked` reported no errors; all four migrations match remote; `/health` returned `ok`; unauthenticated admin access returned `403`.
- Production blocker: organization policy `constraints/iam.managed.disableServiceAccountKeyCreation` rejected creation of the service-account key. The malformed temporary secret was removed immediately; no key exists locally or in Supabase.
- Full upload/download and disposable-document cleanup testing is blocked. Do not use local gcloud OAuth in the deployed function, commit a key, or begin Phase 6.

Required next action: obtain an approved production authentication path (organization-approved service-account key exception or Workload Identity Federation/token broker), then set the credential in Supabase secrets and rerun end-to-end upload/download tests.

## Apps Script Web App evaluation (2026-10-13)

- Google Apps Script can run a `doPost(e)` web app as the deploying owner and use `DriveApp` to create files in a private folder. Google documents the execution choices (`USER_DEPLOYING` versus `USER_ACCESSING`) and anonymous access mode (`ANYONE_ANONYMOUS`): https://developers.google.com/apps-script/guides/web and https://developers.google.com/apps-script/manifest/web-app-api-executable.
- This is technically simpler, but it is not credential-free. An anonymous deployment requires a bearer-like URL plus an application token/signature; that token must still be protected in Supabase secrets. If deployed as `USER_DEPLOYING`, the script runs with the owner's Drive authority, which is broader than the dedicated service-account folder permission. It must never accept arbitrary folder IDs or return public Drive permissions.
- Apps Script `DriveApp` supports folder creation and blob uploads, but its request/response model is not a drop-in replacement for this API: binary files would need a JSON/base64 envelope, downloads would need a separate base64 response or authenticated Drive URL, and web-app CORS/redirect behavior must be tested. Apps Script quotas and execution limits also apply. https://developers.google.com/apps-script/reference/drive/drive-app
- The common five-minute implementation pattern (anonymous `doPost`, hard-coded folder ID, no request authentication, and a returned `webViewLink`) would violate this project's requirements. It has not been installed, deployed, or tested.
- Simpler and safer for this application is Supabase Storage with a private bucket and signed URLs, optionally followed by a trusted asynchronous export to Drive. That avoids Google authentication and Cloud Run billing, but it changes the requirement from “Drive is the primary store.” It requires explicit approval before changing the storage target.

### Decision

Do not replace the broker yet. No repository code, Supabase schema, Drive permissions, or deployed service was deleted or weakened. Apps Script may be reconsidered only as a separately authenticated owner-run broker after an explicit security decision and a real upload/download/cleanup test. Phase 6 remains blocked.

## Apps Script implementation (2026-10-13)

- Added `google-apps-script/Code.gs` and `appsscript.json`. The script is fixed to the configured private root folder, creates request subfolders, accepts only signed timestamped requests, validates a 10 MiB limit, supports upload/download/delete, and verifies that requested files belong to the request folder. It never creates public Drive permissions.
- Updated and deployed the Supabase API (feature-gated): when `GOOGLE_APPS_SCRIPT_URL` and `GOOGLE_APPS_SCRIPT_SHARED_SECRET` are absent, the existing safe unavailable behavior remains. When both are configured, uploads/downloads use the Apps Script broker and Supabase continues storing document metadata.
- Automatic Apps Script project/deployment was not possible in this environment: `clasp` is unavailable, `npx @google/clasp` is not cached, and the authenticated gcloud session requires interactive reauthentication before enabling/using the Apps Script API.
- No Apps Script project, deployment URL, script properties, shared secret, Drive file, or test request was created. Real end-to-end testing is still pending.

Manual actions required: reauthenticate the Google account, create a standalone Apps Script project, paste/deploy `google-apps-script/Code.gs` as a Web App executing as the owner, set Script Properties `ROOT_FOLDER_ID` to the existing private `Charity Requests` folder and `SHARED_SECRET` to a newly generated value, then set matching Supabase secrets `GOOGLE_APPS_SCRIPT_URL` and `GOOGLE_APPS_SCRIPT_SHARED_SECRET`. Keep access restricted to the minimum supported setting and do not publish the folder or files. After configuration, run real upload/download/delete tests before approving Phase 5 or starting Phase 6.

## Apps Script configuration verification (2026-10-13)

- The local `SHARED_SECRET` digest matches the existing Supabase `SHARED_SECRET` secret. It was copied into the exact Edge Function name `GOOGLE_APPS_SCRIPT_SHARED_SECRET` without exposing its value.
- `GOOGLE_APPS_SCRIPT_URL` is not present in the linked Supabase secrets, and no Apps Script URL is present in the local environment files. The deployed Edge Function therefore remains feature-gated and cannot call Apps Script yet.
- No help request, Drive file, metadata row, download, delete, or cleanup test was created. Phase 5 is not approved and Phase 6 remains blocked.
- Initial disposable lifecycle attempt reached the deployed Edge Function but returned `503 DOCUMENT_STORAGE_UNAVAILABLE`; cleanup removed the temporary Auth user/request in the test harness. The Apps Script verifier had a signed-byte comparison defect in the repository source; it is corrected, but the deployed Web App must be updated before retesting.
- Retest after the Apps Script update still returned `503 DOCUMENT_STORAGE_UNAVAILABLE` during upload. The temporary Auth user/request were cleaned up. The supplied screenshot is a Google Drive folder URL, not the Apps Script Web App `/exec` URL; the folder ID itself appears valid. The Supabase `GOOGLE_APPS_SCRIPT_URL` value must be the deployed Apps Script URL (`https://script.google.com/macros/s/.../exec`), not `https://drive.google.com/drive/folders/...`. No upload, metadata, download, or delete pass is claimed.
- The supplied screenshots now confirm the Supabase URL is the correct `/macros/s/.../exec` Web App URL. Added a non-secret `doGet` diagnostic reporting script-property presence and folder accessibility; the Apps Script deployment must be updated once more before that diagnostic can be checked.
- After the reported redeployment, the complete disposable lifecycle was retried and upload still returned `503 DOCUMENT_STORAGE_UNAVAILABLE`; the temporary user/request were cleaned up. The diagnostic JSON from opening the `/exec` URL directly is now required to distinguish Script Properties from Drive authorization. No lifecycle pass is claimed.
- Final disposable lifecycle test after `folder_accessible=true`: upload passed, Supabase metadata persistence passed, authenticated binary download passed, protected delete passed, and Supabase metadata/test-user/request cleanup passed. The uploaded Drive file was deleted through Apps Script. No production data was touched. The per-request empty folder was not independently verified as trashed; keep Phase 6 blocked until that final folder-cleanup assertion is confirmed.
- Diagnostic response received: `configured=true`, `folder_accessible=false`. This confirms the shared secret is present and the Apps Script deployment is reachable, but its `ROOT_FOLDER_ID` does not resolve for the deploying account. Set the Script Property to the exact existing `Charity Requests` folder ID created during Phase 5, redeploy the same `/exec` URL, and confirm `folder_accessible=true` before retesting.

Required manual action: set the deployed Apps Script `/exec` URL as the Supabase secret `GOOGLE_APPS_SCRIPT_URL`. Then rerun the disposable end-to-end upload/download/delete/cleanup test.

## Cloud Run broker attempt (2026-10-12)

- Added `google-drive-broker/`, a least-privilege Node service intended for Cloud Run. It uses the attached dedicated service account through Application Default Credentials, restricts operations to upload/download, enforces HMAC request authentication with a five-minute replay window, sanitizes names, and caps payloads at 10 MiB. No service-account key is used.
- Local validation passed: `node --check server.js` and `npm audit --omit=dev --audit-level=high` reported no issues.
- Deployment was not attempted further because Google rejected enabling Cloud Run, Cloud Build, Artifact Registry, and Secret Manager: billing is not enabled for project `swan-turbines-foundation-2026`. No HMAC secret, broker URL, Cloud Run service, or Supabase broker secret was created.
- The existing Edge Function remains in its safe unavailable state until a broker is actually deployed and authenticated; no upload/download success is claimed.

Manual action required: attach an approved billing account to Google project `swan-turbines-foundation-2026` (or provide a pre-approved billed project for the broker). Then enable the required APIs, deploy `google-drive-broker` with the dedicated service account, create/store the HMAC secret in Secret Manager and Supabase, configure authenticated broker invocation, and run real upload/download/cleanup tests. Do not begin Phase 6 before those tests pass.

## Authentication investigation (2026-10-12)

- Google Workload Identity Federation is supported for external workloads, but it requires a credential source that can continuously provide an OIDC/SAML/AWS/Azure/etc. subject token. Supabase Edge Functions do not expose a Google workload identity, metadata server, or built-in WIF credential supplier for the running function. A static WIF configuration file alone is not an authentication credential.
- Therefore, direct Supabase Edge Function -> Google Drive WIF is **not verified as a supported deployment path** for this project. Trusting an end-user Supabase JWT as the WIF subject would incorrectly bind Drive access to user identity and is not an acceptable server identity design.
- Recommended keyless design: deploy a small Google Cloud Run Drive broker with the dedicated service account as its attached service identity. Cloud Run obtains short-lived access tokens from its metadata server; the broker performs Drive operations and exposes only narrowly scoped upload/download endpoints. The Supabase Edge Function calls the broker using a separately rotated service-to-service authentication mechanism (for example, an authenticated Cloud Run invocation plus a short-lived signed request or an approved gateway), and stores only the broker URL/configuration in Supabase secrets. No downloadable service-account key is required.
- Alternative: a dedicated Google Workspace OAuth client with an offline refresh token can work from an Edge Function, but it is a long-lived user credential, requires Workspace admin/user consent, and is less desirable than the Cloud Run service identity. It must not be implemented without explicit security approval.
- Google documentation confirms WIF exchanges external credentials for short-lived tokens and may impersonate a service account; Supabase documentation confirms Edge Functions can read secrets but does not provide a Google identity: https://cloud.google.com/iam/docs/workload-identity-federation and https://supabase.com/docs/guides/functions/secrets.

### Exact manual action required

Choose and approve the Cloud Run broker design (recommended), then provision: Cloud Run service, attached dedicated service account, Drive API access, private-folder permission, ingress/auth policy, and a rotated broker authentication secret. Provide the broker URL and authentication contract. Do not create a service-account key, upload a key to Supabase, or begin Phase 6 until the broker is deployed and a real upload/download plus cleanup test passes.

## Current phase

Phase 5 — Google Drive Integration: **blocked on Google Drive OAuth authorization** (2026-10-12, Asia/Kolkata). Phases 1–4 are complete and approved.

## Phase 5 status

- Verified Google Cloud project `swan-turbines-foundation-2026` and enabled `drive.googleapis.com`.
- Created dedicated service account `swan-foundation-drive@swan-turbines-foundation-2026.iam.gserviceaccount.com`; it has private root-folder Writer access and no broader project role. Key creation is blocked by organization policy.
- Verified Supabase has `RESEND_API_KEY`, `RESEND_FROM`, and `ADMIN_NOTIFICATION_EMAIL` configured by name/digest only.
- Drive-scoped OAuth successfully created/reused the private Foundation folders and shared the root with the dedicated service account. Local CLI OAuth remains non-production and is not used by the Edge Function.

## Required user action to unblock production document storage

Obtain an approved production authentication path compatible with Supabase Edge Functions (organization-approved service-account key exception or Workload Identity Federation/token broker). Do not use local gcloud OAuth in production, commit a key, or send a key in chat.

## Exact next step

After Drive access is confirmed, create a service-account key directly into Supabase secrets, create/share the private request-folder root, add the Drive metadata/upload/download implementation, deploy it, and test with disposable documents. Do not begin Phase 6.

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
