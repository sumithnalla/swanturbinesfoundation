# Phase 6 — Production Hosting, Deployment and Cutover Runbook

Status: **In progress — safe automation audit. Production cutover is not complete.**

This runbook follows `majorchnage.md` and `SHIFT.md`. Phase 6 work is proceeding only through safe, non-destructive automation until provider-owner configuration is available. The current Phase 5 disposable lifecycle test passed, including authenticated upload/download, protected deletion, and the `folder_trashed=true` cleanup assertion.

## 1. Scope and order

### Gate 0 — Confirm readiness

1. Confirm Phase 5 is approved and the Apps Script Web App remains deployed at the configured `/exec` URL.
2. Confirm the current Git working tree, Supabase migration history, deployed `api` function, RLS policies and required secret names.
3. Freeze production data changes during the cutover window and agree on a rollback point.

### Gate 1 — Inventory and reconcile existing data

1. Export and reconcile MongoDB, GridFS, JSON fallback files, browser-local operational records and any existing campaign/request data.
2. Produce immutable mappings from legacy identifiers/references to Supabase identifiers.
3. Verify document counts and checksums before any source is retired.
4. Do **not** delete or overwrite legacy data in this phase without a verified backup and explicit approval.

### Gate 2 — Provision controlled staff access

1. Confirm each real operator’s approved email, role and least-privilege permissions.
2. Create or invite staff accounts through the controlled Supabase Auth workflow; never commit passwords or place them in frontend code.
3. Require password reset and MFA for super administrators where the organization supports it.
4. Verify login, logout, session expiry, role restrictions and audit behavior for every approved role.

### Gate 3 — Configure production services

1. Deploy the static frontend to Cloudflare Pages (or confirm the approved existing production site).
2. Configure the production API base URL and frontend environment/configuration override.
3. Configure Supabase Auth redirect URLs, cookie/session behavior, CORS/`ALLOWED_ORIGINS`, and disable public self-sign-up.
4. Verify Resend sender-domain authentication, sender address and delivery configuration.
5. Verify Apps Script URL/shared-secret configuration and private Drive-folder access by name only; never record secret values.
6. Confirm backups, logging, alerting, rate limits and error reporting.

### Gate 4 — Production end-to-end verification

Run these checks from the real production origin and record actual results:

- Public campaign retrieval and public help-request submission/reference generation.
- Contact submission and acknowledgement/notification email behavior.
- Approved staff login/logout, session refresh and unauthorized-access denial.
- Campaign administration with role restrictions.
- Request list/detail, status transitions, notes/audit behavior and tracking privacy.
- Document upload for supported PDF, Word, Excel and image types; metadata persistence; authorized download; unauthorized denial; deletion; empty-folder cleanup.
- Email delivery for acknowledgement, new-request, status-change, contact and administrative messages.
- Browser console/network checks on public, admin and management pages.

Use disposable test data where possible. Do not claim production success from mocked tests or local-only tests.

### Gate 5 — Cutover and handover

1. Compare production counts and mappings against the reconciliation report.
2. Announce the cutover and monitor health, logs, email delivery and Drive operations.
3. Keep the rollback path available until the agreed observation period completes.
4. Only after successful cutover and explicit approval, retire obsolete Render/FastAPI/MongoDB/GridFS or fallback paths that are no longer needed.
5. Publish the final architecture, secret-name inventory, backup/restore procedure, maintenance owner and outstanding risks.

## 2. What I will do

- Inspect the repository and deployed Supabase resources before each change.
- Create version-controlled configuration/migrations or code changes that are required for the approved deployment.
- Configure and verify frontend/API wiring, CORS, Auth redirect handling and production-safe error behavior.
- Run non-destructive CLI checks and disposable end-to-end tests, including authorization and Drive lifecycle tests.
- Document changed files, deployed function versions, test evidence, blockers and rollback steps in `MIGRATION_PROGRESS.md`.
- Preserve existing data and legacy sources until reconciliation and explicit retirement approval.
- Report any permission, billing, domain, DNS, Auth, email or browser action that cannot be completed through the available CLI.

## 3. What you must do

- Explicitly approve starting Phase 6 and identify the production domain(s) and Cloudflare account/site.
- Confirm the five real staff identities, their approved roles and who is allowed to be a super administrator.
- Complete organization-owned Auth/domain actions that require dashboard or owner approval: disable public signup, set redirect URLs, enforce MFA/password policy, verify Resend sender domain and configure DNS/Cloudflare.
- Provide credentials only through the relevant provider’s secure dashboard/CLI flow; never send passwords, service keys or Drive secrets in chat or commit them.
- Perform browser acceptance checks using the real domains and operator accounts.
- Approve the data-reconciliation report, cutover window, retention period and any retirement of legacy infrastructure.
- Rotate temporary/test credentials and confirm the production support/backup owner.

## 4. Stop conditions

Stop Phase 6 and report a blocker if any of these occur:

- Phase 5 upload/download/delete/cleanup no longer passes.
- A production request, document or user cannot be mapped to its source record.
- RLS or role checks permit an unauthorized read/write.
- Auth redirect/CORS/cookie behavior is insecure or inconsistent.
- Resend or Drive permissions are unverified.
- A required provider permission, billing approval, DNS change or organization policy cannot be obtained.
- A destructive migration or legacy-system retirement lacks backup evidence and explicit approval.

## 5. Acceptance criteria

Phase 6 is ready for completion only when the deployed website and backend pass the production checks above, approved staff can operate the system with least privilege, documents remain private, email delivery is verified, backups/rollback are documented, reconciliation is signed off, and no critical blocker remains. Phase 6 completion does not authorize deleting legacy data by itself.

## 6. Current account-status note

The five real user accounts mentioned during the earlier migration were **not created**. The migration record says no real staff account was provisioned; disposable test accounts were created only for verification and then deleted. Therefore those five people cannot currently log in with those credentials. Account creation belongs in Gate 2 and must be done through a controlled, approved workflow.
