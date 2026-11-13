# Upload security resumed work — 13 November 2026

This is unfinished local preparation, not a production release. Read `IMPLEMENTATION_STATUS.md` for earlier work.

## Verified configuration

- The Organization Policy API is enabled. The effective project-level service-account key-creation rule reports `enforce: false`; no key was created. The existing dedicated Drive service account has no user-managed key. No workload identity pool or Cloud Run service was created.
- The effective legacy domain-restricted-sharing constraint permits one Workspace customer ID. Google's documentation says workload identity pools in the organization can be allowed under this constraint, but this project's actual provider and IAM bindings have not been created or tested. No policy was weakened. [Google domain-restricted sharing](https://cloud.google.com/organization-policy/domain-restricted-sharing).
- Supabase Auth's OIDC discovery and ES256 JWKS URLs respond over HTTPS. Google's documentation permits OIDC ES256 and a custom audience, and requires federation plus service-account ID-token impersonation to invoke private Cloud Run. This project's actual subject token, Google pool, attribute condition, IAM grants and end-to-end exchange remain unverified.
- Supabase lists Apps Script configuration secret names, but no converter or Turnstile configuration secret names were present. No secret values were retrieved or changed.
- `supabase migration list --linked` failed with a database authentication error and requested `SUPABASE_DB_PASSWORD`; no password was retrieved or changed. Read-only checks of the deployed database schema remain outstanding.

## Prepared locally

- `cloud-run-auth.ts` implements a draft STS and service-account ID-token exchange, constrained Cloud Run destination, timeouts, redirect refusal, bounded response streaming, MIME and magic-byte checks. It is not wired to the Edge API, and no trusted OIDC subject-token source is configured.
- `20261113090000_private_document_security.sql` is an **unapplied draft migration** for a private originals-job table, processing/ready/legacy states, job leases, clean-copy publishing, retry scheduling fields, atomic hashed-IP rate counters, and an RLS policy preventing direct staff reads of non-ready documents. An isolated PGlite Postgres test exercises the migration, staff denial, leases, original-ID rejection, simulated converter outage and retry, and basic counter limits; this does not prove compatibility with the linked project's live schema.
- `document-rebuild.ts` and `rate-limit.ts` contain tested orchestration primitives. They are not connected to Drive adapters, the request route, a retry worker, or a verified client-IP source. The rate limiter must never trust arbitrary caller-supplied forwarding headers.
- Apps Script draft supports an `ORIGINALS_ROOT_FOLDER_ID` property, verifies owner/private/root checks before using it, and disallows original deletion or cleanup pending retention approval. These checks have mock tests only: real permissions, inheritance, identity, and web-app deployment remain unverified. No folder was created.
- Draft admin endpoints and UI expose preview/download only for `security_state=ready` and ask for confirmation before opening a Drive viewer. **All existing documents are legacy and will become unavailable in this draft** until rebuilt safely. This breaks historical viewing if deployed alone; a backfill and complete end-to-end rollout plan are required. A mocked local Chrome test covers the confirmation and visible actions; real Drive viewer access remains untested.
- A read-only Drive API lookup using the local legacy `.env` root-folder ID and active Google account returned HTTP 404. A separate name search found one accessible, owner-controlled `Charity Requests` folder whose ID does not match the local `.env` root ID; Drive reports it is shared. The deployed Apps Script property has not been read and might differ from the local `.env`. Verify the actual deployment identity, root property and ACLs without exposing secrets; never place the owner-only Originals root under the shared folder.

## Tests

- Node fixture tests for Google token exchange, rate hash and database-error handling, process retry/failure, clean-only preview and Apps Script owner/access checks.
- PGlite Postgres migration test with isolated fixture schema; no production SQL was applied.
- The existing local help-request and admin regression suites passed with mocked services. A local PNG carrying EICAR test text in metadata was rebuilt without retaining that metadata; this is a rebuilding test, not a virus scan. The EICAR fixture stayed local and was not uploaded.
- Test commands from the repository root after installing `@electric-sql/pglite@0.3.14` in a separate local directory:

```powershell
node tests/cloud-run-auth.test.mjs
node tests/rate-limit.test.mjs
node tests/document-rebuild.test.mjs
node tests/document-access.test.mjs
node tests/apps-script-originals.test.mjs
node tests/document-preview-browser.mjs
$env:PGLITE_TEST_DIR = 'path-to-isolated-pglite-install'
node tests/private-document-migration.test.mjs
```

## Still required

1. Complete both Drive adapters and connect the upload route. Store each original only in a verified owner-only root, create its private job, rebuild, write only clean copies to staff-visible Drive, and publish `ready` atomically. Handle orphaned clean files and errors without deleting originals.
2. Provision and verify WIF with a tightly bound dedicated Supabase identity, service-account impersonation and private Cloud Run IAM, using approved non-production resources first. Determine a secure reliable subject-token source. No real identity exchange or Cloud Run auth test has occurred.
3. Add a durable, authorized background retry trigger/worker and prove lease expiry, concurrent workers, crash recovery, retries, private-folder ACL checks, clean-file cleanup and restart behavior.
4. Verify a non-spoofable client-IP signal from the deployed Supabase ingress, choose and document appropriate limits, and connect the atomic limiter to both form routes and uploads. Counters are not used by current routes.
5. Build, isolate and load-test the container, including all requested PDF/image/EICAR and error cases. Confirm Drive owner-only and clean-viewer access using disposable files. Existing originals must never be exposed by the new routes.
6. Design and test a non-destructive legacy-document rebuild/backfill and preserve access appropriately; the current draft intentionally withholds old originals.
7. Test both forms with real Turnstile test keys, upload both Drive branches, all request/admin workflows, retries and denial cases in an isolated environment. Configure real public site key and Supabase secrets only during approved rollout.
8. Obtain explicit retention-period approval before implementing any original deletion. Obtain explicit approval before enabling Cloud Run, creating any potentially billable resource, applying migrations, or production deployment. No deployable commands should be run against production until the preceding work passes.

No production deployment, database migration, cloud resource creation, or paid API activation was performed during the resumed work.
