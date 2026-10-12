# Swan Turbines Foundation — Master Migration Plan

## 1. Objective

Reconstruct the backend and infrastructure of the existing Swan Turbines Foundation application according to `SHIFT.md`, preserving the existing frontend wherever possible.

This is a six-phase migration. Complete each phase, verify its results, and update `MIGRATION_PROGRESS.md` before proceeding.

Read `SHIFT.md` completely before making changes. Treat it as the initial audit, but verify important details against the actual codebase and remote services.

## 2. Final Architecture

- **Cloudflare Pages:** Frontend hosting
- **Supabase PostgreSQL:** All structured application data
- **Supabase Auth:** Staff authentication
- **Supabase Edge Functions:** Backend and API logic
- **Google Drive:** Private document/file storage
- **Resend:** Email delivery

Supabase stores data. Google Drive stores documents. Edge Functions connect everything. Cloudflare serves the website. Resend sends emails.

## 3. Rules That Apply to Every Phase

1. Work through the CLI and repository wherever possible. Do not require manual dashboard work unless unavoidable.
2. Inspect existing code, Git status, configurations and remote resources before changing anything. Preserve unrelated user modifications.
3. Never overwrite, delete or reset existing data without a verified backup and explicit approval.
4. Never expose secrets in frontend code, Git, logs or documentation. Use appropriate environment variables and platform secrets.
5. Maintain `MIGRATION_PROGRESS.md` throughout the work. Record completed tasks, changed files, migrations, test results, blockers and exact next steps.
6. If interrupted, leave the project in a safe state and document where work stopped. A different AI must inspect the actual repository and verify progress before continuing.
7. Run available tests and integration checks. Never claim something works unless it has been verified.
8. Fix discovered issues within the current phase when appropriate. Record unrelated issues for the relevant later phase.
9. Preserve the existing HTML/CSS/JavaScript frontend and API contracts wherever practical.
10. Do not start a later phase while the current phase has unresolved critical issues.
11. After each phase, produce a concise completion report and wait for approval before proceeding to the next phase, except where this plan explicitly authorizes automatic continuation.
12. Do not repeatedly ask the user questions that can be answered by inspecting the repository or CLI. Ask only when a genuine decision, permission or external action is required.

## Phase 1 — Supabase Database Foundation

### Tasks
- Verify the existing linked Supabase project and inspect its current state.
- Design and create version-controlled PostgreSQL migrations.
- Implement these 11 tables:
  `profiles`, `roles`, `permissions`, `user_roles`, `role_permissions`, `campaigns`, `help_requests`, `request_documents`, `request_status_history`, `contact_submissions`, `audit_logs`.
- Configure primary keys, foreign keys, unique constraints, indexes, timestamps and validation rules.
- Preserve campaign fields, request information and existing status workflows.
- Implement a safe, unique `STF-YYYY-NNNNNN` reference generator.
- Configure appropriate Row Level Security (RLS) policies and test access boundaries.
- Keep document records as metadata only; actual files will be integrated with Google Drive in Phase 5.
- Verify migrations and database objects without destroying existing data.

### Completion criteria
The schema, migrations, relationships, reference generation and RLS are implemented and verified to the extent possible. Update `MIGRATION_PROGRESS.md`.

Do not create real admin accounts or migrate/delete existing production data during this phase.

## Phase 2 — Authentication and Authorization

### Tasks
- Configure Supabase Auth for staff login and session management.
- Implement profiles, roles, permissions and server-side authorization.
- Secure protected administrative operations and database access.
- Implement least-privilege access and appropriate RLS policies.
- Address the authentication and security risks documented in `SHIFT.md`.
- Preserve temporary fallback admin credentials for now, as previously agreed, until real users are established. Keep this temporary mechanism isolated, server-side and out of frontend code. Document its removal requirements.
- Test login, logout, session handling, unauthorized access and role restrictions.

### Completion criteria
Staff authentication and authorization are functional and tested. No protected action relies solely on frontend checks.

Do not proceed with insecure fallback authentication merely to make a test pass.

## Phase 3 — Backend, Edge Functions and Email

### Tasks
Implement the backend using Supabase Edge Functions, replacing the relevant FastAPI/MongoDB logic.

Required functionality:

- Campaign retrieval and administrative CRUD
- Charity request submission and reference generation
- Request tracking with appropriate privacy protection
- Administrative request listing, detail views, statistics and status changes
- Contact-form submission
- Staff/user and role administration
- Audit-log retrieval
- Administrative email sending
- Resend integration for applicant acknowledgements, new-request notifications, status changes, contact notifications and administrative emails

Preserve existing frontend API contracts wherever practical, including important request/response shapes, status values and user-visible references.

Use server-side validation, authorization, error handling, idempotency where needed and secure secrets. Implement reliable handling of email failures without unintentionally duplicating messages.

Do not implement Google Drive integration in this phase. Document the temporary document-upload limitation until Phase 5.

### Completion criteria
Required Edge Functions are deployed to the linked Supabase project and tested. Database operations, authorization and email triggers behave correctly. Record function names, endpoints, secrets required and test results.

## Phase 4 — Frontend Integration and Local Testing

### Tasks
- Connect the existing website to the new Supabase backend.
- Repair API wrapper/route mismatches and align request parameters and response formats.
- Preserve HTML/CSS, static assets, campaign presentation and working page behavior.
- Verify public charity requests, document-form behavior as far as the temporary implementation permits, contact forms, campaigns, staff login, admin dashboards, request review and status updates.
- Keep the donation, donor-profile and receipt prototype untouched; these features are not required for the current release.
- Remove obsolete MongoDB/FastAPI dependencies only when they are no longer required by the active frontend or tests. Do not delete migration-sensitive data or fallback files prematurely.
- Run local end-to-end tests, validate responsive behavior and check browser/CLI errors.
- Document remaining Google Drive-dependent functionality and any deployment-only checks.

### Completion criteria
The existing frontend works with the new Supabase backend locally, all critical flows are verified, and remaining issues are documented.

### MANDATORY STOP BEFORE PHASE 5

After Phase 4, update `MIGRATION_PROGRESS.md` and produce a clear report of completed work, test results and remaining tasks.

**STOP HERE. DO NOT START PHASE 5.**

Ask the user explicitly for permission to begin Phase 5 — Google Drive Integration. Do not create Google Cloud projects, enable Drive APIs, create service accounts, request new Drive credentials or implement Drive integration before approval.

Continue only after the user explicitly approves Phase 5.

## Phase 5 — Google Drive Integration

Start only after explicit user approval.

### Tasks
- Set up or verify the Google Cloud project and enable the Google Drive API.
- Configure a dedicated service account with least-privilege access to the Foundation's private Drive folder or Shared Drive.
- Store credentials securely as Supabase Edge Function secrets.
- Create a consistent folder structure for charity requests and document categories.
- Implement secure document upload, metadata persistence and authorized download/retrieval.
- Validate file size, MIME type, file signatures, document category and request association.
- Store Drive file IDs, folder IDs, filenames, MIME types, sizes, checksums, categories, timestamps and internal URLs in Supabase.
- Keep files private. Never make applicant documents publicly accessible by default.
- Prevent unauthorized uploads to another applicant's request.
- Implement safe retry/reconciliation behavior for partial failures and orphaned files.
- Test PDFs, Word documents, Excel files and supported image formats.
- If existing documents exist in GridFS, disk storage or fallback files, inventory them before any migration. Copy and verify files before changing or deleting originals.
- Connect the frontend document flow to the completed implementation.

### Completion criteria
Upload, metadata storage, authorized retrieval and privacy controls work end-to-end. Verify file-to-request relationships and failure handling. Record all required production secrets without recording their values.

If Google Cloud account permissions, Terms of Service, billing requirements or other external setup blocks progress, document the exact blocker and request only the necessary user action.

## Phase 6 — Hosting and Deployment

### Tasks
- Deploy the frontend to Cloudflare Pages.
- Configure the production API base URL, environment variables and necessary secrets.
- Configure custom domains, HTTPS, CORS, authentication redirects and cookies/session behavior as appropriate.
- Verify Resend sender-domain configuration and email delivery.
- Verify production Supabase functions, RLS, database access and private Drive permissions.
- Run production end-to-end tests for public requests, staff login, campaign management, document uploads/downloads, status changes and emails.
- Verify backups, logs, error handling and recovery procedures.
- Remove obsolete Render/FastAPI/MongoDB/GridFS infrastructure only after data reconciliation, successful cutover and explicit approval.
- Document the final architecture, deployment configuration and recovery steps.

### Completion criteria
The deployed website and backend pass critical production checks. Provide the final deployment report, outstanding risks and maintenance instructions.

## 4. Handover and Resume Protocol

Maintain `MIGRATION_PROGRESS.md` at the project root. Include:

- Current phase and status
- Completed and incomplete tasks
- Files created or modified
- Database migrations and Edge Functions deployed
- Tests run, with actual results
- Current architecture and configuration
- Secrets required, by variable name only
- Known bugs, security risks and blockers
- Pending manual actions
- Exact next steps
- Whether the current phase is verified
- Whether explicit user approval is required before continuing

When another AI takes over:

1. Read `SHIFT.md`, this master plan and `MIGRATION_PROGRESS.md`.
2. Inspect Git status and the actual codebase.
3. Verify remote Supabase resources and deployment state before repeating operations.
4. Continue from the first genuinely incomplete task.
5. Avoid duplicate migrations, duplicate records, repeated uploads and destructive changes.
6. Respect all approval gates, especially the mandatory stop before Phase 5.

## 5. Final Operating Instruction

Execute the phases in order. Do not attempt the entire migration in one uncontrolled operation. Maintain a working, testable project at each stage, preserve existing frontend functionality and document every important architectural decision.

**Complete Phases 1–4 in order, stopping for approval between phases. After Phase 4, mandatory explicit user approval is required before any Phase 5 work. Phase 6 must wait until Phase 5 is verified. Never bypass this gate.**