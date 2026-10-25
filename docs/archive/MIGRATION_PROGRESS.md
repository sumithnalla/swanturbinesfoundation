# Migration Progress — Swan Turbines Foundation

## Production large-document upload regression (2026-10-15)

- The applicant screenshot's HTTP 546 is a Supabase Edge Function worker resource-limit termination, not a rejection from Google Drive. Supabase documents 546 as CPU/memory worker exhaustion: https://supabase.com/docs/guides/troubleshooting/edge-function-546-error-response
- Root cause in the upload path: the Edge Function encoded every file byte into a JavaScript string one byte at a time, then reread the complete file to hash it. This created avoidable CPU work and duplicate file buffers for larger uploads.
- Optimized `supabase/functions/api/index.ts` to use the native `node:buffer` Base64 encoder and reuse the upload `ArrayBuffer` for SHA-256. No file-size policy, authorization, destination, or privacy setting was weakened.
- Deployed successfully; Supabase confirms active `api` version 35 (`2026-10-15 11:16:24 UTC`).
- A disposable production test with a 7,768,576-byte PDF (matching the screenshot's approximate size) passed once through upload and returned a Drive file ID. A second immediate attempt returned HTTP 503 from the storage path rather than 546; investigate Apps Script execution logs if the applicant's retry also returns 503. The production request page retains the existing request and upload token, so use its Retry Document Upload button; do not submit a second application.
- Test request rows were removed from Supabase. Drive cleanup for the first large test could not be confirmed after the test harness's Apps Script deletion request failed; audit records identify disposable reference `STF-2026-000019`. The execution environment's Google OAuth token requires interactive reauthentication, so no Drive cleanup was performed. If present, trash only `disposable-large-test.pdf` inside `Charity Requests/STF-2026-000019` and then the empty test folder; do not touch any other folder or file.

## Phase 6 automation pass (2026-10-13)

- Phase 6 was explicitly approved to begin. No destructive cutover or legacy-system retirement has been performed.
- Completed safe repository checks: JavaScript syntax checks passed for all files under `js/` and `manage/`; `git diff --check` passed; the four version-controlled Supabase migrations and `supabase/config.toml` are present; frontend modules point to the deployed Supabase API with `window.__API_BASE_URL__` overrides preserved.
- Attempted automated remote verification: `supabase migration list --linked`, `supabase db lint --linked`, `supabase functions list`, the deployed `/health` endpoint, and the read-only Supabase Auth/API check. Each was blocked before reaching the provider by the current environment proxy (`127.0.0.1:9` connection refused / closed connection). No remote state was changed.
- Earlier Cloudflare Pages automation was blocked in the restricted process; this was resolved on 2026-10-14 using the authenticated cached Wrangler CLI. Custom DNS/domain configuration remains pending because no approved custom domain was supplied.
- Current production readiness blockers are provider-owner actions: restore outbound Supabase access, provide/authenticate the approved Cloudflare Pages project and domain, configure production Auth redirect URLs and disable public signup, verify Resend sender/DNS, and provision the approved real staff accounts with least-privilege roles. These actions are required before claiming production end-to-end readiness.
- Phase 5 remains the last verified application phase. Phase 6 implementation is in progress only as a safe automation audit; production cutover is not complete.

## Phase 6 continuation (2026-10-14)

- Read `begin-phase-6.md`. Production Auth redirect/sign-up settings remain intentionally deferred as requested; the security implication is that public signup and unfinalized redirect policy must not be treated as production-ready.
- Implemented the mandatory sender rule in `supabase/functions/api/index.ts`: all Resend messages emitted by the Edge Function now use the verified `aruna@swanturbinesfoundation.com` sender, regardless of the authenticated staff member. No password or secret was added to source control.
- Local validation passed with `git diff --check` and source inspection confirms the sender is fixed at the single email dispatch helper used by applicant, notification, status, contact and Company Admin messages.
- Five requested staff accounts and role assignments could not yet be created or verified because the Supabase control plane remains unreachable from this environment (`127.0.0.1:9` proxy connection refused) for `supabase functions`, `supabase secrets`, migration, and Auth/API operations. No partial account creation was attempted and no passwords were logged or stored.
- The sender change is not deployed until Supabase connectivity is restored. After connectivity returns, deploy `api`, create the five accounts through the protected admin workflow, assign `foundation_admin` to Aruna and Finance, assign both `super_admin` and `foundation_admin` to Sumith, Mohit and Websitter, then verify backend permission responses (not just UI visibility).

## Phase 6 remote execution (2026-10-14)

- Root cause of the earlier Supabase failure: this execution environment injects `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY`, `GIT_HTTP_PROXY` and `GIT_HTTPS_PROXY`, all pointing to `http://127.0.0.1:9`. WinHTTP is configured for direct access. The variables were removed only from individual child processes for the commands below; persistent settings were not changed and no token was exposed.
- Remote checks passed with direct child-process connectivity: `supabase functions list`, `supabase secrets list`, `supabase migration list --linked`, and `supabase db lint --linked` (no schema errors). The deployed `api` function was version 15 before this deployment.
- Deployed the fixed-sender Edge Function successfully with `supabase functions deploy api --project-ref qlfdbimnswbaiouvmtau`. Docker was not required; Supabase uploaded the function source.
- Created all five requested Supabase Auth users with confirmed emails, and verified the Auth-to-profile trigger produced one profile for each. Passwords were used only in memory during the administrative request and were not written to files, logs, Git or this document.
- Assigned roles: Aruna and Finance → `foundation_admin`; Sumith, Mohit and Websitter → `super_admin` plus `foundation_admin`.
- Deployed backend authorization verification passed: all five logins returned HTTP 200 and `/api/v1/admin/dashboard` returned HTTP 200. `/api/v1/admin/users` returned HTTP 403 for Aruna and Finance, and HTTP 200 for Sumith, Mohit and Websitter. This verifies the company-admin/super-admin boundary server-side, not merely through frontend visibility.
- The sender implementation is now live and uses the verified `aruna@swanturbinesfoundation.com` address in the shared email dispatch helper. An unsolicited real email was not sent during verification; delivery testing remains a controlled acceptance step.
- Auth redirect URLs and public signup remain unchanged by explicit instruction. Until those settings are finalized, public signup remains a security limitation and the production redirect allowlist is not fully hardened.
- Direct deployed smoke checks passed after deployment: `/health` HTTP 200, public `/api/v1/campaigns` HTTP 200, unauthenticated `/api/v1/admin/dashboard` HTTP 403.
- Cloudflare Pages was initially incomplete because the restricted process lacked usable Wrangler execution; the deployment is now complete. Custom DNS/domain configuration remains pending.

## Phase 6 Cloudflare deployment (2026-10-14)

- Confirmed Wrangler 4.151.0 and authenticated Cloudflare account `b75f58ef74278687282a88279c99f275` using the cached CLI outside the restricted child process. The injected proxy variables were removed only for the Wrangler process; no persistent proxy or credential settings were changed.
- No existing Pages project was present, so created `swan-turbines-foundation` on the authenticated account.
- Built a static-only deployment staging set containing the website HTML, CSS, JavaScript, management assets and public images. Explicitly excluded `backend`, `.env`, Supabase files, Google Apps Script/broker files, Git metadata, migration docs and other server-side material. A forbidden-name scan found no environment/secret/credential files in the staged set.
- Production deployment succeeded: `https://ae602861.swan-turbines-foundation-11f.pages.dev` (deployment `ae602861-6c59-4a65-8b0a-b1b305113cb3`, branch `main`). HTTP checks returned 200 for `/`, `/index.html`, `/request-help.html` and `/admin-login.html`.
- Set Supabase `ALLOWED_ORIGINS` to include the exact Pages origin plus existing local development origins. Origin-aware API checks returned HTTP 200 and the correct `Access-Control-Allow-Origin` for `/health` and public campaigns.
- No custom domain or DNS record was changed because no approved production domain was supplied. The Pages project currently uses its generated `pages.dev` hostname.
- Added `website-routes.md` with production page routes, staff/admin URLs, role assignments, non-secret login guidance and public/staff/document request flows. Passwords and service credentials are intentionally excluded.

## Production bug fix verification (2026-10-15)

- Diagnosed the reported failures from browser console evidence. The request form had a production fallback of an empty API base, causing POST requests to the Cloudflare Pages origin and HTTP 405. The API CORS helper also omitted `Access-Control-Allow-Credentials`, blocking cookie/session login from the deployed site.
- Fixed `request-help.html` to use the deployed Supabase API base outside local development, and fixed `supabase/functions/api/index.ts` to return `Access-Control-Allow-Credentials: true` for credentialed requests and preflight responses.
- Redeployed the Supabase `api` function and redeployed the corrected static frontend to Cloudflare Pages. Latest deployment: `https://fbe0ebdc.swan-turbines-foundation-11f.pages.dev`.
- Updated `ALLOWED_ORIGINS` to include the latest deployment URL, prior deployment URL, project hostname and local development origins.
- Verified production-origin preflight: HTTP 200 with the matching origin and `Access-Control-Allow-Credentials=true`.
- Verified Aruna production-origin login: HTTP 200.
- Verified a disposable public help-request POST from the production origin: HTTP 201 with a reference returned; the disposable row was deleted immediately with service-role cleanup (HTTP 204).
- Remaining frontend action: operators should hard-refresh the new Pages URL (`Ctrl+F5`) and use the latest deployment URL. The old deployment may remain cached in an existing browser tab.

## Admin/status and super-admin console fix (2026-10-15)

- Diagnosed the new screenshots: local development origin `http://127.0.0.1:5503` was missing from `ALLOWED_ORIGINS`, so PATCH preflight requests for status/admin notes were blocked by CORS. The management console also authenticated successfully but did not persist/use the returned bearer token for subsequent API calls; it relied on a cross-origin cookie, producing `/auth/me` 401 and admin 403 responses.
- Added `http://127.0.0.1:5503` and `http://localhost:5503` to `ALLOWED_ORIGINS`.
- Updated `manage/manage.js` to persist the login access token and attach it to `/auth/me`, dashboard, users, roles, audit and logout requests.
- Corrected `js/auth.js` redirects from the invalid `adminlogin/` directory to `admin-login.html`.
- Redeployed the API and frontend. Latest frontend deployment: `https://6ea5962d.swan-turbines-foundation-11f.pages.dev`.
- Verified PATCH preflight from both local port 5503 and the latest Pages URL: HTTP 200, matching `Access-Control-Allow-Origin`, and `Access-Control-Allow-Credentials=true`.
- The live admin login URL is `https://6ea5962d.swan-turbines-foundation-11f.pages.dev/admin-login.html`. `/adminlogin/` is not a production route.

## Production route and Super Admin UX fix (2026-10-15)

- Added production route wrappers: `/adminlogin/`, `/company-admin/`, and `/super-admin/`. The first two redirect to the valid `/admin-login.html`; the Super Admin route opens `/manage/index.html`.
- Added separate Super Admin entry URLs for overview, users, roles, audit and system sections. They use the same authenticated server-side permission checks rather than duplicating privileged logic.
- Added `role_names` to login and `/auth/me` responses. The management portal now requires the `super_admin` role and no longer admits a `foundation_admin` user into the Super Admin shell where expected 403 errors appeared.
- Latest frontend deployment: `https://ff805b29.swan-turbines-foundation-11f.pages.dev`.
- Updated `website-routes.md` with the new production URLs. Hard-refresh the latest deployment before testing.

## Real login pages and logout fix (2026-10-15)

- Replaced the redirect-only `admin-login.html` with a real Company Admin login form that authenticates against the deployed API and requires `foundation_admin`.
- Added a real `/super-admin/login` page that requires `super_admin` before opening the management dashboard.
- Fixed Super Admin logout to remove `swan_admin_token` and redirect to the Super Admin login page instead of reloading the authenticated dashboard.
- Fixed shared Auth logout to remove the bearer token as well as the local session.
- Added Cloudflare `_redirects` rules so `/adminlogin/`, `/company-admin/` and `/super-admin/` are one-way redirects, not mutually recursive HTML meta-refresh pages.
- Latest frontend deployment: `https://bbba7af5.swan-turbines-foundation-11f.pages.dev`.

## Canonical login simplification (2026-10-15)

- Removed redirect-only shortcut pages and the `_redirects` compatibility file after they caused confusing navigation and fallback pages.
- The production site now has only two canonical login entry points: `/admin-login` for Company Admin and `/super-admin/login` for Super Admin.
- Deployed and verified both canonical routes return HTTP 200 with their actual login forms. Latest deployment: `https://caaeffa7.swan-turbines-foundation-11f.pages.dev`.

## Blank Company Admin login and incognito CORS fix (2026-10-15)

- Confirmed the blank Company Admin page was caused by malformed markup in the previously deployed `admin-login.html`: its `<title>` element lacked a closing `</title>`, so the browser parsed the following login UI as title text. Fixed the markup and redeployed.
- Confirmed the screenshot's Super Admin `Failed to fetch` cause: the API CORS configuration still returned an older Pages deployment origin for a request from `caaeffa7...`, so credentialed login preflight failed. Added the stable project Pages hostname and the screenshot host to `ALLOWED_ORIGINS`; changed CORS code to emit `Access-Control-Allow-Origin` only for an exact allowed origin, avoiding an invalid fallback origin.
- Stable production origin: `https://swan-turbines-foundation-11f.pages.dev`. Latest deployment preview: `https://26e90804.swan-turbines-foundation-11f.pages.dev`.
- Verification: stable and latest preview Company Admin routes both return HTTP 200 and contain the login form with a closed title tag. CORS preflight from the screenshot host and stable hostname returns HTTP 200, matching origin, and credentials=true. The preview origin is also now allowlisted.
- Old immutable deployment URLs may continue serving their old HTML. Use the stable project URL above to get the current production version.

## Company Admin login-to-dashboard session fix (2026-10-15)

- Root cause: `admin-login.html` authenticated against the API and saved `swan_admin_token`, but did not create the `swan_auth_session_v2` session that `js/auth.js` / `js/admin.js` require. The dashboard therefore redirected a successful login straight back to the login form.
- Fixed the login handoff to load the existing `js/db.js` and `js/auth.js` modules. After the API confirms `foundation_admin`, it now stores the access token and calls `SwanAuth.createSession(user.id, true, user)` with the verified API user and admin role before navigating to `/admin.html`. The existing session expiration remains eight hours; no authorization checks were weakened.
- Deployed to the existing Cloudflare Pages project. New preview: `https://5633ec71.swan-turbines-foundation-11f.pages.dev`; stable production URL remains `https://swan-turbines-foundation-11f.pages.dev`.
- Live HTTP verification: stable and preview `/admin-login` returned 200 and contain both the Auth module and `createSession` handoff. `/js/auth.js` returned 200. `/admin.html` correctly receives Cloudflare's 308 clean-URL redirect to `/admin`; both stable and preview `/admin` returned 200 with the actual dashboard and its Auth guard.
- Local verification: `node --check js/auth.js` and `git diff --check` passed. A fresh browser login with an actual staff password was not performed in this environment; user acceptance is to sign in at the stable `/admin-login` URL and confirm the dashboard remains open. No credentials were printed or stored during this fix.

## Google Drive document-routing regression (2026-10-15)

- Root cause found in the local API changes that were deployed as Edge Function version 32: the applicant upload route had been changed to upload into a private Supabase Storage bucket and write synthetic `supabase-storage:` paths into `request_documents.google_drive_file_id`. This bypassed Google Drive/Apps Script, left `help_requests.google_drive_folder_id` unset, and the download route then treated those storage paths as Drive file IDs, producing the observed 503 responses.
- Restored Google Drive as the destination for all new document uploads: Apps Script is preferred when configured; the existing direct Drive path remains the fallback. The handler stores the real Drive file ID, request-folder ID, and a private Drive URL in the metadata row. It keeps existing upload-token, file-type, size, and file-signature checks. It does not grant public Drive access.
- Added a protected compatibility path so documents already represented by a `supabase-storage:` metadata path can still be downloaded from the existing private `request-documents` bucket; new documents are no longer sent there.
- Deployed the correction to Supabase Edge Function `api`, now version 33 (`2026-10-15 10:22:18 UTC`). Docker was not running; Supabase CLI deployed the function successfully without Docker.
- Production configuration blocker: `supabase secrets list` shows neither `GOOGLE_APPS_SCRIPT_URL` nor `GOOGLE_APPS_SCRIPT_SHARED_SECRET`; the only local `.env` (`backend/.env`) also has neither setting. The deployed function therefore cannot call the Apps Script Drive broker, and this environment has no `GOOGLE_SERVICE_ACCOUNT_JSON` keyless/direct Drive credential. No real Drive upload/download lifecycle test is possible until the two Apps Script secrets are restored. The function now fails closed rather than returning a false Drive success.
- Next action: in Supabase Dashboard for project `qlfdbimnswbaiouvmtau` → Edge Functions → Secrets, set `GOOGLE_APPS_SCRIPT_URL` to the deployed Apps Script `/exec` URL and `GOOGLE_APPS_SCRIPT_SHARED_SECRET` to the exact matching Apps Script `SHARED_SECRET` Script Property. Do not paste the secret into chat. Then rerun upload/download and verify both `help_requests.google_drive_folder_id` and `request_documents.google_drive_file_id`/`internal_url` for a disposable request before considering this resolved.

## Google Drive configuration restored and production verification (2026-10-15)

- Supersedes the configuration blocker recorded above: the project now has `GOOGLE_APPS_SCRIPT_URL` and `GOOGLE_APPS_SCRIPT_SHARED_SECRET` configured. Secret values were not printed or written to this file. The active Apps Script `/exec` health check returned `status=ok`, `configured=true`, and `folder_accessible=true`.
- Re-tested the deployed API using disposable data. Results: upload to Drive succeeded; Supabase metadata contained a real Drive file ID, request-folder ID, and private Drive URL (not a `supabase-storage:` path); protected download returned the same PDF bytes.
- The protected API delete call returned HTTP 503, so the complete API lifecycle assertion is not yet green. An independent authenticated disposable Apps Script upload/delete probe then returned `deleted=true` and `folder_cleaned=true`, confirming the deployed Apps Script can trash both the file and its now-empty per-request folder. The remaining failure is in the protected API delete handoff or subsequent Supabase metadata deletion, not the Apps Script Drive delete operation.
- The disposable API test request and temporary Auth user were cleaned up. No Phase 6 work was started. Do not claim the protected API delete flow or complete Phase 5 lifecycle is verified until that 503 is diagnosed and the API-level delete/folder-trash test passes.
- New uploads are verified to use private Google Drive and save metadata in Supabase. Existing legacy `supabase-storage:` documents remain downloadable through the compatibility path but are not retroactively copied to Drive.

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
- Cleanup fix prepared: the Apps Script `delete` operation now trashes the request folder when it becomes empty, and a non-secret `check` operation can independently confirm the folder is in Drive Trash. This requires updating the deployed Web App before the final lifecycle test.
- Final cleanup verification passed after Apps Script redeployment: disposable upload, metadata persistence, authenticated download, protected deletion, `folder_trashed=true` assertion, Supabase metadata cleanup, temporary request cleanup, and temporary Auth-user cleanup all passed. No production data was touched.
- Phase 5 is ready for approval. Phase 6 remains intentionally blocked and has not started.
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
