# Swan Turbines Foundation — current website

This is the starting point for anyone working on the website. The public site and staff applications have already been built and deployed. The project is in **production bug-fixing and verification**, not an unfinished migration phase. Do not restart a phase because an older plan says it is pending.

Last documentation review: **2026-10-25**. This file describes the repository and the deployment information recorded during recent production fixes. A successful deployment in an earlier session is not proof that every browser flow works today.

## What is running

| Part | Current implementation | Source of truth |
|---|---|---|
| Public and staff website | Static HTML, CSS and vanilla JavaScript on Cloudflare Pages | Root `*.html`, `css/`, `js/`, `manage/`, `super-admin/` |
| API and staff authorization | Supabase Edge Function `api`; Supabase Auth access/refresh tokens and server-side role checks | `supabase/functions/api/index.ts`, `supabase/config.toml` |
| Application records | Supabase Postgres with migrations and row-level security | `supabase/migrations/` |
| Applicant documents | Private Google Drive folder, accessed by the Edge Function through a Google Apps Script Web App when configured; Supabase stores request/document metadata | `google-apps-script/Code.gs`, Edge Function, `request_documents` |
| Email | Resend from the server-side API, using the foundation's configured sender | Edge Function and provider configuration |

The earlier **FastAPI, MongoDB Atlas, GridFS and Render** design remains in `backend/` and `render.yaml` as legacy code. It is **not the current website API or document store**. Do not run its seed script or use its fallback users to repair production. Its old architecture documents are archived in [docs/archive/INDEX.md](docs/archive/INDEX.md).

## Production entry points

- Website: [swan-turbines-foundation-11f.pages.dev](https://swan-turbines-foundation-11f.pages.dev/)
- Help request: [request-help](https://swan-turbines-foundation-11f.pages.dev/request-help)
- Company Admin login: [admin-login](https://swan-turbines-foundation-11f.pages.dev/admin-login), then `/admin.html`, `/admin-requests.html`, and `/admin-request-detail.html?id=<request-id-or-reference>`
- Super Admin login: [super-admin/login](https://swan-turbines-foundation-11f.pages.dev/super-admin/login), then `/manage/index.html`
- API: `https://qlfdbimnswbaiouvmtau.supabase.co/functions/v1/api`
- Supabase project ref: `qlfdbimnswbaiouvmtau`

These are the stable Pages and API URLs used by the current source. On 2026-10-25, the website, both login pages and API health endpoint each returned HTTP 200. That reachability check does not establish that login or document flows pass. Random eight-character Pages preview subdomains are deployment previews; use the stable URL when reproducing a production bug. Custom-domain/DNS status must be checked in Cloudflare before documenting a custom domain as live.

Staff accounts are in Supabase Auth. Company Admin requires the `foundation_admin` role; Super Admin requires `super_admin`. The current project has five named staff accounts recorded in the archived [website-routes.md](docs/archive/website-routes.md), but passwords, access tokens, shared secrets and service keys must never be copied into Markdown or Git. The API enforces permissions; a visible page or a local browser session alone is not proof of authorization.

## Actual request and document flow

1. `request-help.html` submits the applicant's form to `POST /api/v1/requests`. Supabase creates the `help_requests` row and returns a reference and a short-lived upload token.
2. The form uploads selected files to `POST /api/v1/requests/{id}/documents` with that token. The Edge Function validates each file and calls the configured private Drive integration. It writes the Drive file ID, folder ID and metadata to `request_documents`.
3. Staff sign in through Supabase Auth. The admin request list/detail and document-list calls use a bearer token. Staff view or download files through protected API endpoints; a Drive URL in the database does not grant public access.
4. Staff status changes and internal notes go through the authorized API. If the API fails, the browser must show an error, not claim the update succeeded or that zero documents exist.
5. Document deletion and empty-folder cleanup are server-side operations. Verify Drive and Supabase separately when investigating storage bugs.

Current code includes token refresh and retry for staff API calls. On 2026-10-25, a disposable production staff account successfully opened a request, downloaded its private document, changed its status and note, and saw its own status audit entry. This verifies the current production browser flow; it does not retroactively establish that every earlier account or browser session is healthy.

## Production fixes verified on 2026-10-25

The fixes in `bugs.md/bugs-1.md` are deployed to the stable Pages domain above. Foundation Admin has a paged contact inbox at `/admin-contacts` and a separate message detail route at `/admin-contact-detail?id=<message-id>`. New contact submissions require a full name, exactly ten mobile digits, a valid email, and a 10-1,000 character message. Help requests enforce the same mobile/email rules, a 10-1,000 character description, and zero to three PDF/JPG/PNG/WEBP files of at most 10 MB each. The API and database validate these values; database policies deny direct public inserts.

Help-request submissions use a browser-held idempotency key so retrying after a network interruption does not make a duplicate request. Uploads use a per-request lock, server-side count/type/signature/size checks, and retry deduplication. An unfinished wizard draft survives Back navigation; after a successful submission, returning to the form clears it. The admin request table shows the stored submission date and time in Asia/Kolkata. Case status updates and their status-history/audit rows are atomic, and the API takes administrator identity from the verified Supabase token. The detail page displays the latest administrator and status-change timestamp.

Migration `20261025090000_production_forms_and_case_audit.sql` is applied to the linked Supabase project. It adds contact full-name/mobile fields, validation triggers, upload idempotency/locking fields, a three-document database cap, and an atomic adjudication function. Historical contact and request rows were preserved; old contact rows show that mobile was not collected at the time.

Verification completed: Deno type-check and three validation tests; Chromium form tests for validation, counters, file limits, duplicate submission, retry, unfinished-draft retention, and post-success reset; linked Supabase schema lint; and disposable production tests for anonymous/unauthorized access, real contact and zero-document request submissions, concurrent idempotent retry, three actual Drive uploads including an exactly 10 MB PDF, protected byte-for-byte downloads, upload rejection boundaries, status/history/audit identity, and production Admin contact/request pages. The disposable files and folders were verified deleted/trashed, and test messages, requests, audit entries, and staff accounts were cleaned up. The live production browser test reported no JavaScript exceptions.

The detailed reproducible suites are `tests/form-validation.test.ts`, `tests/browser-bugs.mjs`, and the explicitly opt-in `tests/production-bugs.mjs --live`. The production suite creates temporary accounts and records and cleans them up in a `finally` block; do not run it against a project unless disposable production verification is intended.

## How to investigate the next production bug

1. Record the stable page URL, time, request reference, browser Network **status code and response error code**. Never collect the applicant's document, a staff password, bearer/refresh token or secret in an issue or chat.
2. Check the current Git worktree and the exact frontend call in `js/` or `request-help.html`. Check the matching route, permission and storage code in `supabase/functions/api/index.ts`.
3. Check the relevant Supabase row and, for documents, the private Drive file/folder. A metadata row, successful upload response and successful authorized download are separate assertions.
4. Fix the narrow cause, run syntax/static checks and a real production-origin test appropriate to the change. For protected flows, test with an authorized account and verify the unauthorized case is still denied. Report clearly what could not be tested.
5. Keep existing applicant records and Drive files intact. Use disposable references for lifecycle tests and confirm cleanup. Deploy only the intended website assets or Edge Function files; never deploy `backend/.env` or the archive as public assets.

Useful local checks: `git status --short`, `git diff --check`, `node --check js/auth.js`, `node --check js/request-detail.js`, and `supabase functions list --project-ref qlfdbimnswbaiouvmtau`. Supabase CLI and Wrangler access depend on the operator's authenticated environment.

## Known constraints and history

- The project has had production CORS, login handoff, stale-token, document upload and document-listing regressions. Read [MIGRATION_PROGRESS.md](docs/archive/MIGRATION_PROGRESS.md) for dated evidence, not for a current-phase instruction.
- A disposable large-file test may have left a Drive file/folder under reference `STF-2026-000019`; the archived migration log records the exact cleanup caveat. Confirm before deleting anything.
- Old files in `backend/` still contain legacy fallback credentials. They are not Supabase staff credentials. Treat that code as historical and audit it before any reuse or deployment.
- Supabase Auth signup/redirect settings were previously deferred by the owner. Check their current provider settings directly; do not infer the live setting from an archived plan.
- Local demo data and legacy FastAPI tests do not establish that the Supabase/Drive production flow works.

## Documentation rule

This root README is the current handoff. All other Markdown, including the original MongoDB architecture and phase prompts, lives in `docs/archive/` for context only. When a historical statement conflicts with the current code or a verified production observation, update this README with the evidence. Do not treat a phase gate or a claimed test result from the archive as a fresh instruction.
