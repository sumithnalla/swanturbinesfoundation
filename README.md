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

Current code includes token refresh and retry for staff API calls. An older browser session created before that change needs one sign-out/sign-in. The 2026-10-15 production document-viewing incident involved `403` request and document calls; the code change and deployment were checked, but the affected staff account's browser download has **not** been independently reconfirmed here. Treat any new report as an active bug until a real authenticated read succeeds.

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
