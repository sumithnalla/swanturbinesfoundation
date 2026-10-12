# Swan Turbines Foundation — Current-System Audit and Supabase Migration Handover

Audit scope: repository state inspected on 2026-10-08. This is an audit only. No application code, configuration, dependencies, or data were changed. “Current” below means observed implementation, which sometimes differs from older project documentation.

## 1. Current project status

### Implemented

- Static public website, static Foundation Admin pages, and a WEBSITTER management page, built with HTML/CSS/vanilla JavaScript.
- Python/FastAPI API under `backend/`, with MongoDB/Motor repositories, Pydantic request schemas, JWT authentication, roles/permissions, campaigns, help requests, documents, contact submissions, audit logging, and Resend adapters.
- Public help-request form submits JSON to the API, then uploads selected files. It also writes a browser-local backup.
- Admin request list/detail/status flows call the actual `/api/v1/requests/admin/*` endpoints and fall back to browser-local data.
- Campaign read and campaign-admin CRUD endpoints exist; eight campaign seed records exist in `backend/scripts/seed.py`.
- Resend sending is implemented for request acknowledgement, new-request notification, status change, contact notification, and admin-composed email.
- Docker/Render deployment artifacts and mocked automated tests exist.

### Partially implemented / non-authoritative

- MongoDB is optional at runtime: help requests have a JSON-file/in-memory fallback. Campaigns, users, roles, contacts, audit logs, and documents do **not** have an equivalent complete fallback.
- The public site has a second, unrelated localStorage data model for accounts, donor profiles, donations, requests, and admin accounts. It is a prototype/demo store, not the FastAPI database.
- Static campaign pages and card content remain alongside API-driven campaign enrichment; they are not one canonical campaign source.
- Audit logging is skipped whenever `is_db_connected()` is false. `AuditRepository.log()` deliberately returns an empty ID rather than failing.
- Tests mock database behavior; they do not demonstrate a MongoDB/Atlas, GridFS, Resend, CORS, or deployed-frontend integration.

### Missing or apparently broken

- No Supabase, Google Drive, Cloudflare Functions/Workers, database migrations, Google OAuth/service-account integration, payment backend, donor API, password reset API, or production rate limiting is present.
- `BaseRepository` has no `update_one`, but `HelpRequestRepository.update_status()` calls it inside a broad `try`. With MongoDB connected that branch raises and is swallowed; the JSON fallback is updated instead. Consequently MongoDB status persistence is likely broken or inconsistent.
- The upload fallback writes bytes to `backend/uploads/` if GridFS fails, but saves no reliable retrieval path and the authorized download route always reads GridFS. Such files cannot be downloaded by that route.
- The generic reusable `js/api/requests.js` calls paths that do not exist (`GET /requests`, `/requests/{id}`, `/requests/{id}/status`, `/notes`) and uploads form field `file`, while the FastAPI endpoint requires `files`. The currently used request/admin scripts use the correct paths/field.
- `ContactApi` documents `phone` and `subject`; `ContactCreate` rejects/ignores neither explicitly (Pydantic defaults ignore extra) and only persists first name, last name, email, message.
- No endpoint lists contact submissions; `contact.read` is seeded but unused.
- Campaign deletion is a hard delete. There is no archive behavior despite frontend API comments.
- No user self-registration, donor authentication/API, donations storage/API, profile API, receipt API, password reset endpoint, or payment-provider integration exists. Those UI functions are localStorage only.
- `secure=False` is hard-coded on the authentication cookie, including production. Logout does not create an audit event and JWTs have no server-side revocation.

### Do not touch unnecessarily

- Public request payload shape, response keys (`reference`, `id`, `request_id`, `status`), reference format, and admin request endpoint shapes; existing pages depend on them.
- Existing static asset paths and static campaign pages until a deliberate compatibility/redirect plan exists.
- Browser-local fallback behavior until its removal has been explicitly designed and communicated; the current UI relies on it when API calls fail.
- Help-request JSON files during migration until data has been exported and reconciled with MongoDB; they contain operational-looking records.
- Existing repository has unrelated working-tree modifications at audit time (including request/auth/admin files and data). They were not changed by this audit.

## 2. Current architecture (observed)

```text
Public/admin/manage HTML pages + vanilla JS
  ├─ direct fetch/API modules → FastAPI `/api/v1/*` (normally localhost:8000 in development)
  └─ `SwanDB` localStorage fallback/demo data
                                  ↓
FastAPI (Render manifest; Python 3.11 Docker image)
  ├─ Pydantic validation, exception envelope, CORS
  ├─ JWT cookie/Bearer authentication and MongoDB role permission lookup
  ├─ repositories/services
  ├─ MongoDB Atlas/local MongoDB through Motor (when reachable)
  ├─ GridFS bucket `request_documents` for request bytes
  ├─ local `app/data/*.json` and `uploads/` degraded-mode fallback
  └─ Resend Python SDK for email, only if `RESEND_API_KEY` is configured
```

Frontend: pages at root plus `manage/`; `admin.html`, `admin-requests.html`, and `admin-request-detail.html` are admin views. Backend: `backend/app/main.py`; all v1 routes prefix `/api/v1`. Database: MongoDB database name defaults to `swanfoundation_dev`, with ObjectIds. File storage: GridFS plus incomplete disk fallback. Email: Resend. Authentication: HS256 JWT issued by FastAPI; browser sends HTTP-only cookie via `credentials: include`; `js/auth.js` additionally writes the returned token to localStorage. Admin: permission dependency reads user roles from MongoDB, or uses hard-coded fallback users if database is unavailable.

`render.yaml` describes a Render Python service. README/ARCHITECTURE describe Cloudflare Pages/Atlas/Render targets, but deployment credentials and a confirmed live topology are UNKNOWN.

## 3. Frontend ↔ backend contract

All API errors are normalized by FastAPI to `{ "error": { "code": string, "message": string } }` for `HTTPException`; unhandled errors return `INTERNAL_ERROR`. JSON client requests include cookies but normally do not add the returned Bearer token.

| Endpoint/method | Request, auth, response | Observed frontend dependency |
|---|---|---|
| `GET /health` | No auth. `{status,version,environment,database}`. | Health/tests; no normal public page dependency found. |
| `POST /api/v1/auth/login` | `{email,password}`; no auth. Sets `access_token` HTTP-only cookie and returns `{user:{id,full_name,email,is_active,role_ids,created_at,updated_at},access_token}`. | `js/auth.js`, `manage/manage.js`, admin login. |
| `POST /api/v1/auth/logout` | No body; clears cookie; `{message}`. | `js/auth.js`, `manage/manage.js`. |
| `GET /api/v1/auth/me` | Cookie or `Authorization: Bearer`; user shape above. | Manage session checking. |
| `GET /api/v1/campaigns?page&page_size` | Public. `{campaigns:[CampaignOut],total,page,page_size}`; only active. | `js/campaigns.js` uses `limit=50` (ignored: backend expects `page_size`) then enriches static cards. `CampaignApi` also exists. |
| `GET /api/v1/campaigns/featured?limit` | Public. Array of active featured `CampaignOut`. | API available; no direct caller confirmed. |
| `GET /api/v1/campaigns/{slug}` | Public; draft hidden. `CampaignOut`. | `CampaignApi.getCampaign`; no dynamic campaign page confirmed. |
| `GET /api/v1/campaigns/admin/all?page&page_size&status` | `campaigns.read`. Paginated campaign response. | No direct caller confirmed. |
| `POST /api/v1/campaigns` | `campaigns.create`; `CampaignCreate`: title, slug, short_description, description, category required; optional status/featured/order/amounts/currency/image/facts. Returns `CampaignOut` (201). | `CampaignApi.createCampaign`; current admin page campaign controls were not confirmed as callers. |
| `PUT /api/v1/campaigns/{id}` | `campaigns.update`; partial `CampaignUpdate`; returns `CampaignOut`. | `CampaignApi.updateCampaign`. |
| `PATCH /api/v1/campaigns/{id}/status?status=` | `campaigns.update`; query parameter, not JSON. `{message}`. | No direct caller confirmed. |
| `DELETE /api/v1/campaigns/{id}` | `campaigns.delete`; 204. | `CampaignApi.deleteCampaign`. |
| `POST /api/v1/requests` | Public JSON: `{applicant:{full_name,mobile,email?,address,city,state},request:{support_type,description,beneficiaries,amount_required,urgency},consent:true}`. Returns 201 `{message,reference,request_id,id,status:"pending"}`. | `request-help.html`, which uses correct shape. |
| `POST /api/v1/requests/{id}/documents` | Public multipart repeated **`files`** field. File MIME allowlist PDF/JPEG/PNG/WebP/GIF; each max 10 MB. `{uploaded:[{doc_id,filename}],count}`. | `request-help.html` correct. `RequestApi.uploadDocument` is incompatible (`file`). |
| `GET /api/v1/requests/track/{reference}` | Public; `{reference,status,support_type,urgency,created_at,updated_at}`. | `RequestApi.trackRequest`; no UI tracking form confirmed. This leaks a status to anyone possessing/guessing reference. |
| `GET /api/v1/requests/admin?page&page_size&status&urgency&search` | `requests.read`; `{requests:[...],total,page,page_size}`. | `js/admin.js`, `js/requests-page.js`. |
| `GET /api/v1/requests/admin/stats` | `requests.read`; `{total,by_status}`. | Same admin scripts. |
| `GET /api/v1/requests/admin/{id-or-reference}` | `requests.read`; full request document incl. applicant/request/admin_note/document_count. | Admin detail scripts. |
| `PATCH /api/v1/requests/admin/{id-or-reference}/status` | `requests.update_status`; `{status,admin_note?}`, permitted state transition only. `{message,reference,status}`. | Admin detail scripts. |
| `GET /api/v1/requests/admin/{id}/documents` | `requests.view_documents`; metadata array without `storage_id`. | Admin detail scripts. |
| `GET /api/v1/requests/admin/{id}/documents/{doc_id}/download` | `requests.view_documents`; binary attachment. Writes audit event. | Admin document links. |
| `POST /api/v1/contact` | Public: `{first_name,last_name,email,message}`. Returns 201 `{message,submission_id}`. | `js/main.js`; `ContactApi` wrapper. |
| `GET /api/v1/admin/dashboard` | `requests.read`; request counts and active/completed campaign counts. | `manage/manage.js`. |
| `POST /api/v1/admin/send-email` | `requests.read`; `{to,subject,message}` then `{sent}`. | Available only; caller UNKNOWN. |
| `GET /api/v1/admin/audit-logs?page&page_size` | `audit.read`; `{logs,total,page,page_size}`. | `manage/manage.js`. |
| `GET/POST /api/v1/admin/users`, `PATCH /api/v1/admin/users/{id}/status` | `users.read` / `users.manage`; list excludes password hashes; creation accepts user data and status patch accepts `{is_active}`. | `manage/manage.js`. |
| `GET /api/v1/admin/roles` | `roles.read`; `{roles}`. | `manage/manage.js`. |

Important incompatibilities: RequestApi's list/detail/status/note methods do not map to implemented routes, use `limit` rather than `page_size`, and use `reason` rather than `admin_note`. CampaignApi uses `limit` not `page_size`. Preserve currently used direct fetch calls first; either repair wrappers and migrate callers or remove them only in a separate frontend release.

## 4. Database audit

### Current MongoDB collections

| Collection | Fields / relationships / use | Indexes |
|---|---|---|
| `users` | `_id` ObjectId, full_name, normalized email, `password_hash` or legacy `hashed_password`, is_active, role_ids (ObjectId list), failed_login_attempts, locked_until, timestamps. Admin/manage identity. Seed script creates `hashed_password`; AuthService accepts either. | unique email; created_at. |
| `roles` | `_id`, name, description, permissions string array, timestamps. `users.role_ids` references roles. | unique name. |
| `campaigns` | `_id`, title, unique slug, short_description, description, status (`draft|active|paused|completed`), category, featured, display_order, target_amount/raised_amount float, currency, image_url, facts JSON array, timestamps. | unique slug; status; `(status,display_order)`; featured. |
| `help_requests` | `_id`, reference, applicant embedded object, request embedded object, consent, status (`pending|under_review|accepted|rejected`), admin_note, document_ids array, timestamps. Application core. | unique reference; status; created_at; `(status,urgency)` but urgency actually lives at `request.urgency`, so this index likely does not support query. |
| `request_documents` | `_id`, request_id string (may be ObjectId string/reference inconsistently), original_filename, content_type, size_bytes, storage_id GridFS ID, category nullable, timestamps. | request_id. |
| GridFS `request_documents.files/chunks` | Native GridFS metadata/file chunks; metadata includes `content_type` and request_id. | GridFS-managed defaults; custom indexes UNKNOWN. |
| `contact_submissions` | `_id`, first_name, last_name, email, message, timestamps. | created_at. |
| `audit_logs` | `_id`, actor_id/email, action, resource_type/id, result, ip_address, user_agent, metadata, timestamps. | created_at, actor_id, action. |
| `counters` | `{name, value}` used for yearly request sequence. | unique name. |

`permissions`, `role_permissions`, `user_roles`, and `sessions` are mentioned by legacy documentation but are not created or used by the inspected backend. Roles embed permission strings; sessions are stateless JWTs.

The JSON fallback `backend/app/data/help_requests.json` replicates help request data; `request_documents.json` exists but current upload code does not reliably write/use it. `js/db.js` localStorage schemas are separate from MongoDB and include users/profiles/donations/help requests.

### PROPOSED SUPABASE DESIGN (do not implement yet)

- `profiles`: `id uuid primary key references auth.users`, full_name, email mirror if needed, is_active, timestamps.
- `roles`, `permissions`, `user_roles`, `role_permissions`: UUID keys and unique constraints; alternately roles/claims in Supabase Auth app metadata, but retain database-side role mapping for auditable administration.
- `campaigns`: UUID primary key; unique slug; numeric(14,2) money; status check; JSONB facts; created/updated timestamps and sorting indexes.
- `help_requests`: UUID primary key plus unique immutable `reference`; applicant fields as columns (or a justified JSONB payload); support_type, description, beneficiaries, amount_required, urgency, consent_at, status, admin_note, assigned_reviewer_id nullable, drive_folder_id, timestamps.
- `request_documents`: UUID primary key; `request_id` FK; Drive file ID, folder ID, web URL, original filename, MIME type, document_type, size_bytes, checksum, uploaded_by/at, scan/status. Do not store raw file bytes in PostgreSQL.
- `request_status_history`: append-only request_id, from/to status, note, actor profile, created_at; preserves current audit intent more reliably.
- `contact_submissions`, `audit_logs`, and optionally `request_reference_counters` (or PostgreSQL sequence/function). Restrict PII tables with Row Level Security (RLS).

Use a database function/transaction to atomically generate `STF-YYYY-NNNNNN`; never retain random fallback references. Map ObjectIds to new UUIDs in an explicit import map so documents/audits retain relationships.

## 5. File/document system

Current path: user selects documents in `request-help.html` → request JSON is created first → browser sends multipart `files` to `/requests/{request_id}/documents` → backend buffers each complete upload in memory → checks declared MIME and 10 MB size → `GridFSStorageProvider.store()` writes to bucket `request_documents` with filename/content_type/request_id metadata → metadata record is inserted to `request_documents`, and ID is pushed to request document_ids. Admin list hides `storage_id`; authorized admin download retrieves raw bytes from GridFS and serves an attachment.

Allowed declared content types: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`, `image/gif`; no filename extension check, magic-byte validation, malware scan, per-request count limit, rate limit, or public download is implemented. Any unauthenticated person who knows a request ID can upload documents to it. On GridFS error, bytes are written under relative `uploads/`, but download cannot read them. Database failures can leave blobs without metadata or metadata without linkage. There is no delete/replace workflow or documented retention policy.

### PROPOSED Google Drive mapping (do not implement yet)

```text
Swan Turbines Foundation (restricted service-account-managed root)
└── Charity Requests
    └── STF-YYYY-NNNNNN__<request-uuid>
        ├── Applicant Documents
        ├── Medical Documents
        └── Supporting Documents
```

Flow: browser → authenticated/abuse-protected Edge Function multipart endpoint → validate streaming size, MIME/signature, category and request entitlement → service account uploads into request folder → store Drive folder ID/file ID and metadata in Supabase in one recoverable workflow → return sanitized metadata. Downloads should go through an Edge Function that verifies Supabase JWT/RBAC and either streams Drive content or gives a very short-lived, authorized access mechanism. Keep Drive links private; never expose service-account credentials or broadly shared URLs.

Store: Drive root/request-folder/file IDs, request UUID/reference, document type/category, original and sanitized filename, MIME type, byte size, SHA-256, Drive web/view URL (internal metadata, not automatically public), upload timestamp/actor, and lifecycle/scanning state.

## 6. Authentication and security

Current authentication is email/password for staff only. Passwords are bcrypt hashed for database accounts; JWT HS256 tokens carry a `sub` and expiry (default eight hours), are accepted from Bearer header or cookie, and user activity is checked in MongoDB. Permission evaluator supports `*`, exact permission, `resource.*`, and `resource.manage`. User roles are ObjectIds and roles embed permissions. Seeded role permission names do not entirely match route checks: for example foundation_admin has `requests.manage`/`documents.read`, while routes require `requests.update_status`/`requests.view_documents`; wildcard fallback users hide that mismatch when DB is down.

Critical security risks:

- `FALLBACK_USERS` embeds real-looking admin emails and plaintext passwords in source, accepts additional common passwords, grants `*`, and permits login when MongoDB is down. `js/db.js` also embeds plaintext demo/admin credentials in browser-delivered JavaScript. Remove/rotate these during a controlled migration.
- Cookie is `secure=False`; returned access token is written to localStorage by `js/auth.js`, increasing XSS impact. JWT secret defaults to an unsafe literal if missing. No refresh, revocation, CSRF design, or server session list exists.
- No rate limiting despite older docs claiming it, and no auth/abuse protection on request creation, tracking, or document upload. Request references are enumerable enough to warrant additional verification for public tracking.
- Help-request PII and sensitive documents are held in local JSON/localStorage/disk fallbacks with unclear permissions/retention. `uploads/` access behavior depends on deployment working directory.
- HTML email templates interpolate applicant/admin supplied strings without escaping; admin custom message is wrapped as HTML, creating email-content injection risk.
- User creation accepts raw dict input, admin custom email requires only `requests.read`, and status patch lacks strict boolean Pydantic validation. No audit log exists for logout/user status update.
- Mongo connection log prints the full MongoDB URI, which can expose credentials in logs.

Proposed: Supabase Auth for staff with short-lived JWTs, MFA for super-admins, RLS keyed to `auth.uid()`, Edge Function authorization that looks up server-side roles, no client-stored access token beyond Supabase's supported mechanism, strict CORS/CSRF strategy, rate limiting/CAPTCHA for public forms, and private Drive access only through policy-enforcing functions.

## 7. Email system

Provider is `ResendEmailProvider`; it sets module-global `resend.api_key` and sends synchronously in an executor. Email is skipped when `RESEND_API_KEY` is empty. Templates and triggers:

- request acknowledgement to applicant after successful submission when applicant email exists; includes reference and stated 3–5 business-day review period;
- new request notification to `ADMIN_NOTIFICATION_EMAIL` after submission;
- status-change email to applicant after successful admin update;
- contact notification to admin after persisted contact form;
- admin custom email via `/admin/send-email`.

Acknowledgement and custom-email outcomes attempt audit logging; other sends do not consistently audit. Sending is awaited, not queued/retried, but most sending failure returns `false` and does not fail the business action. Preserve trigger timing, recipient logic, subjects, reference/status/note content, and non-blocking business outcome when moving to Resend in Edge Functions. Add escaping, idempotency/outbox records, delivery/error fields, retry policy, verified sender domain, and a test/sandbox mode.

## 8. API / Edge Function migration map

| Current API group | Purpose/current implementation | Future Edge Function | Tables/services |
|---|---|---|---|
| `/health`, `/` | FastAPI health/version | `health` or Pages health response | Supabase health check only |
| `/auth/*` | bcrypt/JWT login/cookie/me | Prefer Supabase Auth; thin `auth-profile` only if needed | auth.users, profiles, roles |
| `/campaigns` public/admin CRUD | Motor CampaignRepository; RBAC routes | `campaigns` (GET/POST/PUT/status/delete) preserving paths | campaigns, audit_logs |
| `/requests` submit/track | Pydantic + RequestService/counter + email | `requests-submit`, `requests-track` | help_requests, counters/history, Resend |
| `/requests/{id}/documents` | GridFS write | `request-documents-upload` | request_documents, Drive API |
| `/requests/admin/*` | list/review/status/doc access | `admin-requests`, `admin-request-status`, `admin-document-download` | requests/documents/history/audit, Drive |
| `/contact` | insert + Resend notification | `contact-submit` | contact_submissions, Resend |
| `/admin/dashboard` | aggregate counts | `admin-dashboard` | campaigns/help_requests |
| `/admin/users`, `/roles` | staff identity/RBAC management | `admin-users`, `admin-roles` | Auth Admin API + profiles/roles |
| `/admin/audit-logs`, `/send-email` | audit browse/custom email | `admin-audit-logs`, `admin-send-email` | audit_logs, Resend |

Use compatibility paths first (Cloudflare redirect/proxy or frontend base URL), then move clients to a versioned Edge Function base URL. Do not expose Supabase service-role or Google Drive credentials to static pages.

## 9. Proposed Supabase migration architecture

Cloudflare Pages hosts the existing static frontend. A single configurable API base points to Supabase Edge Functions (or a narrow Cloudflare proxy to them). Supabase Auth owns staff identity; PostgreSQL/RLS owns records; service-role access is confined to Edge Functions. Drive is a private document system accessed by a service account; Resend is called from Edge Functions; a durable email/outbox/audit path records effects. The static frontend can remain mostly unchanged if functions maintain the contracts in section 3. Replace Motor/FastAPI/GridFS/Render and JSON runtime fallback; keep HTML/CSS/assets and selected API shapes.

## 10. Google Drive design

Use one least-privilege service account granted access only to the Foundation root folder (or a Shared Drive). Do not create publicly shared folders. Create request folders after database request creation with idempotency keys. File name convention: `<document-type>__<UTC timestamp>__<sanitized original filename>`. Document categories should be explicit (`identity`, `medical`, `income`, `quote`, `supporting`, `other`) instead of current nullable category. Reconciliation job: list DB file IDs, confirm Drive existence/parent/request metadata, flag orphans; it must be a separately authorized scheduled function—no background job currently exists.

## 11. Migration risks

- Existing browser localStorage and backend JSON fallback can diverge from MongoDB; data export needs source-of-truth reconciliation.
- ObjectId, locally generated `HELP-*`, and `STF-*` references are all used; preserve user-visible references and build an ID mapping.
- API wrapper/route drift and inconsistent parameter names will break frontend if paths are changed blindly.
- Request status vocabulary differs between FastAPI (`pending`, `under_review`, `accepted`, `rejected`) and localStorage (`new`, `reviewing`, `approved`, `closed`).
- Roles/permission names differ from endpoint requirements, and fallback super permissions mask production authorization defects.
- Current documents may be in GridFS, disk fallback, local JSON, or not correctly linked; migration requires inventory/checksum and manual exception handling.
- Admin dashboard and campaign CRUD rely on Mongo indexes/query sort behavior; reimplement pagination/order exactly before switching.
- Email sends are synchronous and may duplicate during retry; introduction of queues/outbox must be idempotent.
- Cloudflare Pages CORS, cookies across admin/public domains, Supabase Auth redirect URLs, Drive sharing, and Resend sender verification require production configuration validation.

## 12. Recommended migration order

1. Inventory/export: freeze a copy of MongoDB, GridFS, `app/data`, local demo-data decision, and audit ID/reference mappings; rotate exposed credentials.
2. Supabase schema/import rehearsal: build PostgreSQL tables, RLS, reference generator, import mapping, and compare row/document counts without switching reads.
3. Authentication/RBAC: Supabase Auth profiles/roles, MFA/least privilege, route authorization tests; remove fallback credentials only after staff accounts are validated.
4. Edge Functions: implement contract-compatible read/write endpoints and integration tests for campaign, request, contact, admin/status paths.
5. Google Drive document system: private folders, upload/download authorization, metadata, migration copy/checksum/reconciliation.
6. Resend/outbox: recreate templates and events; verify sender/domain and idempotency.
7. Frontend connection: set API base, repair wrapper drift, test each public/admin/manage flow while retaining static pages/assets.
8. Cutover/deployment: Cloudflare Pages/edge CORS/domain configuration, staged production validation, backups, monitoring, then decommission Render/Mongo/GridFS/fallback files only after retention approval.

## 13. Environment variables

Never copy values from `.env` into this document.

| Variable | Current purpose | Migration classification |
|---|---|---|
| `APP_ENV`, `APP_VERSION`, `DEBUG` | FastAPI runtime metadata/logging/docs | REPLACE with Edge/Pages deployment configuration as needed |
| `MONGODB_URI`, `DATABASE_NAME` | Motor MongoDB | REMOVE after verified export/cutover |
| `SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES` | FastAPI HS256 JWT | REPLACE by Supabase Auth configuration; keep only if temporary compatibility JWT layer is approved |
| `CORS_ORIGINS` | FastAPI origin allowlist | REPLACE with Edge/Cloudflare CORS allowlist |
| `RESEND_API_KEY`, `RESEND_FROM`, `ADMIN_NOTIFICATION_EMAIL` | Resend and recipient | KEEP (stored as Edge secrets; values revalidated) |
| `PUBLIC_FRONTEND_URL`, `ADMIN_FRONTEND_URL`, `MANAGE_FRONTEND_URL` | email/front-end configuration, currently not materially used in inspected handlers | REPLACE/KEEP only where new redirect/email links require them |
| `MAX_FILE_SIZE_MB`, `ALLOWED_FILE_TYPES` | upload validation | KEEP or replace with Edge config with equivalent policy |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Not present | NEW REQUIRED (service role Edge secret only) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` or secret reference, `GOOGLE_DRIVE_ROOT_FOLDER_ID`, `GOOGLE_DRIVE_SHARED_DRIVE_ID` | Not present | NEW REQUIRED for Drive; choose secret storage approach |
| `TURNSTILE_SECRET_KEY` / public site key | Not present | NEW RECOMMENDED for public abuse prevention |

## 14. File-by-file inventory

| Path | Purpose |
|---|---|
| `backend/app/main.py` | FastAPI app, startup/shutdown, CORS, exception envelope, router inclusion. |
| `backend/app/core/{config,database,security,dependencies}.py` | settings, Motor/GridFS connection/indexes, bcrypt/JWT, auth/RBAC dependencies. |
| `backend/app/api/v1/{auth,requests,campaigns,contact,admin}.py` | all v1 HTTP routes. |
| `backend/app/models/*.py` | Pydantic schemas/enums for users/auth, requests, campaigns, contact, audit. |
| `backend/app/repositories/*.py` | Mongo CRUD and domain access; request repository also JSON degraded mode. |
| `backend/app/services/*.py` | login, request workflow/reference generation, email templates/triggers. |
| `backend/app/providers/{storage,email}.py` | GridFS and Resend abstractions/providers. |
| `backend/app/data/*.json`, `backend/uploads/` | fallback help-request/document metadata and disk upload location; migration-sensitive data. |
| `backend/scripts/seed.py` | roles, real-looking default accounts, eight campaign seed data. |
| `backend/tests/` | mocked unit/API/E2E scenarios; not deployed integration proof. |
| `backend/Dockerfile`, `render.yaml` | Render-oriented backend deployment. |
| `js/api/` | API client wrappers; request wrapper has endpoint mismatch. |
| `js/auth.js`, `js/db.js` | browser auth/localStorage demo database; contains sensitive-looking demo credentials. |
| `js/admin.js`, `js/requests-page.js`, `js/request-detail.js` | actual admin list/detail/status/document requests with local fallback. |
| `js/campaigns.js`, `js/main.js` | campaign enrichment, public contact submission, donation/local UI behavior. |
| `request-help.html` | critical public help request + document upload flow. |
| `admin*.html`, `manage/` | staff/admin interfaces. |
| `dashboard.html`, `profile.html`, `donate.html`, `donation-details.html`, `js/receipt.js` | browser-local donor/donation prototype, no matching backend. |
| `README.md`, `ARCHITECTURE.md`, `PROJECT_STATE.md`, `KNOWN_ISSUES.md` | useful historical plans; some claims conflict with inspected implementation. |

## 15. Final recommendation

Preserve the public HTML/CSS/assets, public request payload/reference behavior, meaningful campaign seed content, actual admin endpoint contracts, and Resend message behavior. Rebuild the stateful backend: database, authentication/RBAC, request/document pipeline, email delivery/audit reliability, and admin/user controls. Eventually delete Render/FastAPI/Motor/GridFS, hard-coded fallback users, plaintext browser demo credentials, local JSON/disk fallbacks, and duplicate localStorage business data—only after import/cutover validation and retention approval.

Start with a data/integration inventory plus Supabase schema and RBAC design. The largest risks are data divergence, leaked/fallback credentials, document migration/authorization, status/ID vocabulary mismatch, and frontend wrapper drift. Recommended final architecture: Cloudflare Pages static frontend → Supabase Edge Functions → Supabase Auth/PostgreSQL (RLS) + private Google Drive service account + Resend, with auditable request/status/document/email events.
