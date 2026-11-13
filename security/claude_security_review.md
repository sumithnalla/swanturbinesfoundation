# Security review: applicant document upload flow

## 1. Summary

- Verified stack: static HTML/CSS/vanilla JS on Cloudflare Pages, one Supabase Edge API, Postgres/RLS, and Google Drive via Apps Script when configured (otherwise direct Drive API). `README.md:7-17`; `supabase/functions/api/index.ts:144-162`.
- Help requests are written first; files are sent separately to the Edge API and then stored in Drive with metadata in Supabase. `js/help-request.js:114-135`; `supabase/functions/api/index.ts:112-173`.
- The code enforces three files, 10 MiB each, an allowlist, filename extension agreement, and signature checks. `supabase/functions/api/index.ts:119-123,141`.
- Missing from the checked-in upload flow: Turnstile, rate limiting, malware scanning, image re-encoding, PDF flattening, and random Drive filenames. Search of active `supabase/`, `google-apps-script/`, `js/`, and `request-help.html` returned no matching implementation.
- Biggest risks: unchallenged/unthrottled public submissions and unscanned originals reaching staff; session bearer/refresh tokens are held in browser `localStorage`. `production-forms.ts:11-20,70-96`; `index.ts:152-167`; `js/auth.js:150-154`.
- No application/config files or remote settings were changed; this report is the only created file. Repository evidence is distinguished below from remote account settings that source code cannot establish.

## 2. Project map

| Area | Verified contents and setup |
|---|---|
| Public and staff site | Root HTML pages with `css/`, `js/`, `manage/`, and `super-admin/`; vanilla JavaScript, no root package/build manifest. README identifies Cloudflare Pages as host. `README.md:7-17`; root inventory; `scripts/stage-pages.ps1:8-21`. |
| Deploy staging | `scripts/stage-pages.ps1` stages public extensions from root and selected folders, and rejects `.env`, Markdown, SQL, and TOML in the staged output. `scripts/stage-pages.ps1:1-22`. |
| API | `supabase/functions/api/index.ts` is the API entry point and imports `production-forms.ts`; the config disables Supabase gateway JWT verification, so the handler itself performs auth/permission checks for staff routes. `index.ts:4,27-44,88-93`; `supabase/config.toml:1-4`. |
| Functions | Local source contains one Edge Function, `api` at `supabase/functions/api/index.ts`; contact/request submission handlers are in `supabase/functions/api/production-forms.ts`. `index.ts:4,88-93`; `production-forms.ts:11-20,70-110`. A read-only `supabase functions list --project-ref qlfdbimnswbaiouvmtau` on 2026-11-01 returned one active remote function, `api`, version 41 (updated 2026-10-29 10:23:49 UTC); this does not prove deployed bytes match this checkout. |
| Database | Six checked-in SQL migrations define help requests, request-document metadata, status/audit tables, RLS, and staff permission checks. `supabase/migrations/20261009090000_phase_1_database_foundation.sql:87-133,252-288`; `20261025090000_production_forms_and_case_audit.sql:37-63,65-90`. |
| Storage | No migration reference to `storage.buckets`, bucket creation, or `request-documents` was found. Runtime code has a legacy Supabase Storage download compatibility branch named `request-documents`; this is not evidence that a remote bucket exists. `supabase/functions/api/index.ts:83-85,97`. |
| Google Drive | Apps Script project uses Drive scope and reads `ROOT_FOLDER_ID` and `SHARED_SECRET` from Script Properties. `google-apps-script/appsscript.json:1-7`; `Code.gs:8-11,25-34`. The Edge Function can alternatively use a service-account JSON key and Drive folder environment variable. `index.ts:75-82,144-162`. |
| Legacy backend | `backend/` and `render.yaml` contain the older Python/FastAPI/Mongo configuration; README explicitly says it is not the current website API/document store. `README.md:17`; `render.yaml:1-27`. The legacy config contains a development fallback `SECRET_KEY`; do not use that backend as production evidence. `backend/app/core/config.py:33-35`. |
| Framework / package manager | Public app is static/vanilla JS, with no root `package.json`; the repo has a broker-specific `google-drive-broker/package.json` and legacy Python requirements. `README.md:11`; root/package inventory; `backend/requirements.txt`. |

### Environment variable and secret inventory

Values are intentionally omitted. `backend/.env` is local legacy configuration; its presence does not establish deployed Supabase/Cloudflare values. Key names and locations only:

| Names | Defined/used | Browser exposure |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `ALLOWED_ORIGINS` | Edge Function environment; client construction and CORS in `supabase/functions/api/index.ts:6-20`. | Not embedded as secret values in checked-in browser code. `SUPABASE_URL` is a public endpoint; the frontend hardcodes the API base URL in `js/help-request.js:4` and `js/auth.js:30`. Service-role key is server-only in source. |
| `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_DRIVE_CHARITY_REQUESTS_FOLDER_ID`, `GOOGLE_APPS_SCRIPT_URL`, `GOOGLE_APPS_SCRIPT_SHARED_SECRET`, `ADMIN_NOTIFICATION_EMAIL`, `RESEND_API_KEY` | Edge Function environment, referenced by the Drive, Apps Script, mail, and notification code. `supabase/functions/api/index.ts:75-82,147-159`; `production-forms.ts:18-20,92-94`. | Not exposed in checked-in browser JS. |
| `ROOT_FOLDER_ID`, `SHARED_SECRET` | Apps Script Properties read by `google-apps-script/Code.gs:8-10,25-34`; values are not in the checked-in script. | Not read by browser code. |
| `APP_ENV`, `APP_VERSION`, `DEBUG`, `MONGODB_URI`, `DATABASE_NAME`, `SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `CORS_ORIGINS`, `RESEND_API_KEY`, `RESEND_FROM`, `ADMIN_NOTIFICATION_EMAIL`, `PUBLIC_FRONTEND_URL`, `ADMIN_FRONTEND_URL`, `MANAGE_FRONTEND_URL`, `MAX_FILE_SIZE_MB`, `ALLOWED_FILE_TYPES`, `SHARED_SECRET`, `ROOT_FOLDER_ID` | Names found in `backend/.env:6-41`; legacy Python config and/or deployment template in `backend/app/core/config.py:25-42` and `render.yaml:11-27`. Values withheld. | Not part of current browser code. |
| Cloud Run broker settings | `google-drive-broker/` exists, but no use of its runtime settings was found in the active Edge Function path documented above; active broker status is not established. `README.md:14,17`; `index.ts:144-162`. | Not found in browser source. |

## 3. Help-request flow

1. User opens `request-help.html`. The form collects name, 10-digit mobile, email, address, city, state, support type, beneficiary count, amount, urgency, narrative, optional documents, and consent. `request-help.html:283-384`.
2. Browser validation checks required fields, amount/narrative/mobile/email formats, up to three non-empty files, 10 MiB per file, MIME plus matching extension. Files are retained in JS memory; the file input selection handler does not upload them. `js/help-request.js:13,25-34,46-57`; `request-help.html:351-379`.
3. On submit, the browser sends JSON to `POST /api/v1/requests`. The API validates fields, creates a request row, hashes a submission capability, stores the hash and a 24-hour expiry, then returns the raw capability once. `js/help-request.js:111-121`; `supabase/functions/api/production-forms.ts:70-96`; migration `supabase/migrations/20261012100000_phase_5_drive_document_security.sql:1-15`.
4. If files were selected, the browser makes a separate `multipart/form-data` `POST /api/v1/requests/{id}/documents` with `X-Request-Upload-Token`. The Edge Function verifies the capability hash/expiry and validates count, size, MIME, extension, and file signature. `js/help-request.js:122-127`; `supabase/functions/api/index.ts:112-127`.
5. The Edge Function acquires a database upload lock, deduplicates same-content/name retries, and enforces the remaining three-file cap. If `GOOGLE_APPS_SCRIPT_URL` is set, it calls Apps Script; otherwise it uses a service-account OAuth JWT and `GOOGLE_DRIVE_CHARITY_REQUESTS_FOLDER_ID`. `index.ts:124-162`.
6. Apps Script stores each file under a per-request folder beneath the configured root Drive folder. In the direct API branch, the Edge Function creates a folder named from the request reference beneath the configured Drive parent. `google-apps-script/Code.gs:34-44,61-67`; `supabase/functions/api/index.ts:77-78,146-162`. The actual folder ID and external sharing/ACL settings are not verifiable from source.
7. Supabase stores a Drive file ID, folder ID, internal Drive URL, original filename, MIME, size, SHA-256, storage status, and upload timestamp in `request_documents`; the request row also receives its Drive folder ID. `supabase/migrations/20261009090000_phase_1_database_foundation.sql:107-131`; `index.ts:163-168`.
8. The API returns upload confirmation only after metadata insert succeeds. Drive failure returns 503. If a folder metadata update or document-row insert fails, it attempts to trash the just-uploaded file. Previously completed files from the same batch are not transactionally rolled back. `index.ts:163-173`.
9. On confirmed success, browser clears its draft and redirects to the reference page. On upload failure it retains pending request/token/draft and instructs the user to retry documents rather than create a second request. `js/help-request.js:127-140`.
10. Staff sign in using Supabase Auth; the API validates the bearer token, active profile and permission before request/document endpoints. `supabase/functions/api/index.ts:27-44,98-100,177`. The admin UI fetches document metadata and provides preview/download actions through the API. `js/request-detail.js:414-443,471-535`.

## 4. Existing protections

| Protection | Status | Evidence |
|---|---|---|
| Cloudflare Turnstile | NOT FOUND | Search of active source/config in `supabase/`, `js/`, `request-help.html`, and `google-apps-script/` returned no Turnstile reference. No server verification found in `production-forms.ts:11-20,70-96`. |
| Three-document cap | IMPLEMENTED | Browser and API enforce the limit; database trigger also checks current count. `js/help-request.js:46-50`; `index.ts:119-121,141`; migration `20261025090000_production_forms_and_case_audit.sql:53-63`. |
| 10 MiB/file | IMPLEMENTED | Browser and server limit; DB metadata constraint caps size. `js/help-request.js:49-50`; `index.ts:121`; `google-apps-script/Code.gs:1,63-67`; migration `20261009090000_phase_1_database_foundation.sql:121-125`. |
| Aggregate upload size | PARTIAL | Edge checks `Content-Length` only when present and rejects above 32 MiB. No aggregate per-file sum limit is applied to applicant documents. `index.ts:118-123`. |
| Allowed file formats | IMPLEMENTED | API allowlist plus extension agreement and signature/magic-byte checks. `index.ts:86,121-123`; browser courtesy checks `js/help-request.js:13,46-50`. |
| Filename handling | PARTIAL | Unsafe path/control characters are replaced and length capped, but sanitized original names are retained and used as Drive names; names are not randomized. `index.ts:77-78,158,166`; `Code.gs:14-16,66`. |
| Rate limiting / abuse protection | NOT FOUND | No request/upload throttling or CAPTCHA in active API handlers; per-request idempotency and upload lock prevent duplicate/racing writes but are not source/IP rate limits. `production-forms.ts:70-96`; `index.ts:124-127`; migration `20261025090000_production_forms_and_case_audit.sql:41-63`. |
| CORS | PARTIAL | Exact allowlist comparison is implemented, but the deployed `ALLOWED_ORIGINS` value is not available in source. `index.ts:10-20`. |
| Input validation / sanitization | PARTIAL | Request/contact fields are validated and trimmed; HTML escaping exists for staff email attachment message rendering. `production-forms.ts:11-20,70-80,62-65`. `safe_` sanitizes Drive names; this is not a malware/content sanitizer. `Code.gs:14-16`. |
| RLS / DB access | IMPLEMENTED in checked-in migrations | RLS enabled on help requests, documents, contacts, roles and audit tables; staff policies are permission-gated. Public direct insert policies are dropped in production migration, with submissions routed through validated Edge API. `20261009090000_phase_1_database_foundation.sql:252-288`; `20261009100000_phase_2_authentication_authorization.sql:96-106`; `20261025090000_production_forms_and_case_audit.sql:37-39`. Remote policy state was not independently linted in this audit. |
| Supabase Storage bucket and RLS | NOT FOUND in repository migrations | No migration references `storage.buckets`, creates `request-documents`, or defines bucket RLS. Runtime only contains a compatibility download branch. `index.ts:83-85,97`; searched `supabase/migrations/`. Remote Storage dashboard state is unknown. |
| Virus scanning / image re-encoding / PDF flattening | NOT FOUND | No ClamAV, scanner, image re-encoding, or PDF flattening integration found in active upload path; original bytes are uploaded. `index.ts:152-167`; `Code.gs:61-67`. |
| Failure handling | PARTIAL / mostly fail-closed for storage | Applicant request row is saved before file upload; file failure returns an error and does not send success redirect. A failure later in a multi-file batch can leave earlier files stored. `production-forms.ts:80-96`; `index.ts:152-173`; `js/help-request.js:127-135`. |

## 5. Admin / staff file viewing

- Staff authenticate through Supabase Auth; the Edge Function verifies bearer tokens, active profiles, roles, and named permissions. `supabase/functions/api/index.ts:27-44,98-100`.
- Listing request documents requires `requests.view_documents`; the API returns metadata but removes `google_drive_file_id`. `supabase/functions/api/index.ts:177`.
- Preview and download are not Google Drive browser previews. The UI creates a protected API download URL; preview fetches bytes with the staff API token and opens a Blob URL. A separate Download button saves the fetched Blob. `js/request-detail.js:471-535`.
- API download response is permission-checked and sets `Content-Disposition: attachment`, private/no-store cache policy, and `nosniff` on the explicit download route. `supabase/functions/api/index.ts:97`.
- Drive URLs are stored in `internal_url`, but the document listing response does not select or return that field. `index.ts:165-166,177`; migration `20261009090000_phase_1_database_foundation.sql:115-131`.
- Checked-in code does not set Drive sharing permissions. Apps Script calls `DriveApp` and creates files without a `setSharing` call; service-account Drive calls likewise do not create permissions. `google-apps-script/Code.gs:34-67`; `index.ts:75-80`. Therefore whether the folder/files are public, organization-only, or private cannot be determined from repository code.

## 6. Constraints and environment

- Supabase's current Edge Functions limits documentation lists 256 MB memory, 2 seconds CPU time per request, wall-clock maximum 150 seconds on Free / 400 seconds on paid, and a 150-second idle timeout. The cited page does not specify an Edge Function request-body size cap: [Supabase Edge Functions Limits](https://supabase.com/docs/guides/functions/limits) (checked 2026-11-01).
- Applicant uploads pass through `req.formData()`, file arrays, SHA-256 reads and then either Drive multipart upload or base64 encoding for Apps Script; the app permits three files at 10 MiB each. `index.ts:118-123,134-162`; `Code.gs:61-67`. This is memory/latency pressure near the configured maximum (inference from these code paths and the platform limits), not evidence that production currently exceeds a limit.
- A 32 MiB `Content-Length` check exists, but it is conditional; the code does not calculate and cap total actual bytes across the applicant's uploaded files. `index.ts:118-123`.
- Verified local tools: `ssh`, `gcloud`, `supabase`, `python`, `node`, and `npm` installed; `docker`, `oci`, `cloudflared`, `deno`, and `wrangler` not found on PATH. Versions observed: Python 3.13.7, Node v24.21.0, npm 11.19.0, Supabase CLI 2.72.7. No tools were installed.
- Static deploy staging is available via PowerShell script; legacy `render.yaml` deploys the old Python backend and is not evidence of current site/API hosting. `scripts/stage-pages.ps1:1-22`; `render.yaml:1-27`; `README.md:11-17`.
- No signed-upload URL or quarantine Storage bucket path was found in the active applicant upload flow. Current maximum path through Edge is up to three 10 MiB files, but operational reliability at this size must be measured on the deployed project; source inspection cannot establish real runtime margins.

## 7. Gap analysis

| Target design item | Current status | Evidence / insertion point |
|---|---|---|
| Browser courtesy checks: type, size, max 3 | DONE | `js/help-request.js:13,46-53`; preserve as convenience only. |
| Supabase-side Turnstile verification | MISSING | No Turnstile code found; add verification to the public submission path before request creation in `supabase/functions/api/production-forms.ts:70-96`. |
| Supabase-side count, 10 MiB, real-type checks | DONE | `supabase/functions/api/index.ts:119-123,141`; DB cap in migration `20261025090000_production_forms_and_case_audit.sql:53-63`. |
| Randomized filenames | MISSING | Original sanitized names are used in both Drive branches; file-name construction in `index.ts:77-78,158,166` and `Code.gs:14-16,66`. |
| External file checker + ClamAV | MISSING | No active checker call or scanner found. The plug point is after server validation and before either Drive write at `index.ts:152-162`. |
| Re-encode images, flatten PDFs, delete originals | MISSING | No active image/PDF transformation found; current upload writes the submitted bytes `index.ts:78,152-162`; Apps Script writes decoded submitted bytes `Code.gs:61-67`. |
| Store only clean remade copies; reject if checker fails | MISSING | No checker gate exists. Current storage errors fail the file request, but there is no scan result to gate acceptance. `index.ts:152-173`. |
| Staff open Drive browser preview, never download original | MISSING | Current preview/download both fetch original stored bytes through API; explicit Download action exists. `js/request-detail.js:490-535`; `index.ts:97`. |

## 8. Risks found

| Severity | Risk | Evidence |
|---|---|---|
| HIGH | Public contact and help-request submissions have no Turnstile or rate limiter found, enabling automated spam/resource abuse. | `production-forms.ts:11-20,70-96`; no Turnstile/rate-limit code found in active source. |
| HIGH | Allowed files are validated by signatures but not malware-scanned or transformed before staff access them; malicious content embedded in PDFs/images may reach staff. | `index.ts:119-123,152-167`; `Code.gs:61-67`; no scanner/re-encoding found. |
| MEDIUM | Supabase access and refresh tokens are stored in `localStorage`; any successful same-origin script injection could read them. | `js/auth.js:150-154,204-222`; super-admin stores tokens in `super-admin/login.html:40-53`; `manage/manage.js:163-167`. |
| MEDIUM | User-provided filenames are sanitized but retained as Drive names, potentially exposing applicant-identifying details in Drive metadata to any Drive user who can see the folder. | `index.ts:77-78,158,166`; `Code.gs:14-16,66`. Actual Drive audience is unknown. |
| MEDIUM | Optional `Content-Length` enforcement and buffering/base64 conversion leave resource-exhaustion pressure for maximum-size multipart requests; no measured production margin established. | `index.ts:118-123,152-162`; `Code.gs:63-67`. Risk of pressure is an inference; no production failure is asserted. |
| LOW | Apps Script HMAC timestamp/signature are query parameters and accepted within a five-minute window. No nonce/replay store is present in this code; an observed signed URL/request could be replayed within that window if captured. | `google-apps-script/Code.gs:25-31`; caller puts timestamp/signature in query string at `index.ts:81-82`. |
| LOW | Apps Script public `doGet` reports whether configured and whether the root folder is accessible. It does not disclose the folder ID or secret value, but reveals limited deployment state. | `google-apps-script/Code.gs:100-104`. |
| MEDIUM (legacy only) | If the historical FastAPI backend were accidentally reused, its development settings include a fixed fallback secret key. Current README says it is not the production backend; risk applies only if that legacy service is redeployed without explicit configuration. | `backend/app/core/config.py:33-35`; `README.md:17,68`. |

## 9. Open questions for the owner

- What are the deployed Supabase `ALLOWED_ORIGINS` values, and are production, preview, and custom domains intentionally included? Source uses the variable but cannot show its deployed value. `supabase/functions/api/index.ts:10-20`.
- Which Drive integration is currently active in Supabase: Apps Script (`GOOGLE_APPS_SCRIPT_URL`) or service-account fallback? The source supports both branches. `index.ts:144-162`.
- Who owns and can access the configured root Drive folder and per-request folders? Are files/folders shared with “anyone with link,” organization users, or specific accounts? The code does not configure or reveal ACLs. `Code.gs:34-44,61-67`; `index.ts:77-80`.
- Is the Apps Script Web App deployed to execute as its owner, and who is allowed to call the web app? Is its deployed version the same as checked-in `google-apps-script/Code.gs`? Repository files cannot establish deployment settings/version.
- What is the live Supabase Edge Function version/source, environment configuration, project plan, and current resource usage? CLI confirmed function name/version/updated time only; it does not prove source parity or expose limits/usage configuration.
- Does the remote Supabase Storage project contain any bucket or policies? No bucket creation is present in checked-in migrations, and this audit did not infer dashboard state. `supabase/migrations/`; runtime compatibility path `index.ts:83-85,97`.
- Are Cloudflare rate limiting/WAF rules active for `/api/v1/requests`, `/api/v1/requests/*/documents`, and `/api/v1/contact`? Repository code cannot inspect those dashboard rules.
- Are there currently provisioned Turnstile site/secret keys or an external scanner host/tunnel? No integration was found in active source; deployed account secrets/settings are not readable from this checkout.
