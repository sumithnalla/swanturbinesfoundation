# Upload security implementation status

Date: 2026-11-13. This is unfinished local work, not a production release.

## Architecture assessment

The website is static HTML/JavaScript on Cloudflare Pages. Applicant requests are submitted to the Supabase `api` function and stored in `help_requests`. Files are sent separately with a per-request capability, checked for file type and per-file size, and serialized by the existing database upload lock. The API uses either Apps Script or a service account to write the original bytes into the existing request's Google Drive folder, then stores metadata in `request_documents`. The admin panel fetches these originals via an authorized API download. See `js/help-request.js`, `supabase/functions/api/index.ts`, `google-apps-script/Code.gs`, and `js/request-detail.js`.

The target requires Turnstile for both forms, abuse rate limiting, a reliable Google identity from Supabase to a private converter, an owner-only Originals root, durable retry state/worker, a migration for processing/ready status, and an authorized preview of only rebuilt documents. None of those features is completed by this prototype. In particular, current documents are not rebuilt, and the current admin UI can still download originals.

## Implemented in the working tree

- Added a Turnstile widget to both forms and server-side Siteverify checks for both submission routes. Missing configuration, invalid/expired/reused tokens and verification outages fail closed. A fresh widget response is required after an attempted submission. Staging reads the public `TURNSTILE_SITE_KEY`; the API requires `TURNSTILE_SECRET_KEY` and comma-separated `TURNSTILE_ALLOWED_HOSTNAMES`. These changes are not deployed and are not yet browser/end-to-end verified.
- Added a server-side sum limit of 30 MiB, checked from actual file sizes. Existing three-file and per-file limits remain.
- Created server-side random UUID filenames with extensions from the validated MIME type for both Drive branches. The existing database field retains the original display name; request IDs, folder names, upload capabilities, and the retry lock remain unchanged.
- Added an **independent** experimental file rebuilder and its local unit tests in this folder. It has no application authentication and relies on Cloud Run IAM if ever deployed. It is not attached to the upload flow.

## Verified locally

- `node --test tests/turnstile.test.mjs tests/upload-security.test.mjs`: local mocked checks cover missing configuration/token, successful, invalid/duplicate and wrong-host challenge responses, verification outages, form-route rejection, 30 MiB boundary, random filename and supported MIME extensions. These do not verify a real Cloudflare widget or full browser submission.
- `python -B -m unittest -v test_converter` from `file-converter/`: five tests passed, covering image rebuilding/metadata stripping, image-only PDF/page order/script removal, fake file, 11 MiB input, excess page count, dimension rejection, timeout handling, and Flask handler behavior. The environment used PyMuPDF 1.26.5; Cloud Run, Docker, IAM, request concurrency, Drive, and production have not been tested.
- `deno check supabase/functions/api/index.ts`: passed using the repository's existing local Deno installation. The existing browser regression suite passed locally with a simulated Turnstile widget; this is not a real Cloudflare validation test.
- Read-only `gcloud` checks found the dedicated Drive service account and confirmed the Drive API is enabled. `run.googleapis.com` and `orgpolicy.googleapis.com` were not listed as enabled. Effective organization-policy inspection returned `SERVICE_DISABLED` for the Organization Policy API; no service was enabled.

## Incomplete and required before deployment

1. Test Turnstile end-to-end in both forms and verify fresh challenges after failed/retried submissions. Configure the existing real public site key in `TURNSTILE_SITE_KEY` during staging and `TURNSTILE_SECRET_KEY` plus `TURNSTILE_ALLOWED_HOSTNAMES` in the API environment. Do not ship an unconfigured or bypassable challenge. For isolated development, Cloudflare provides documented test keys; production must use the existing real widget keys.
2. Implement atomic, bounded and salted-IP-hash rate limiting. First verify which ingress-provided client IP is authoritative and cannot be supplied or modified by callers; do not trust an arbitrary forwarded header. A migration and tests for concurrent requests, retention and `429` responses will be needed. Exact limits require a practical selection and documentation.
3. Validate the converter's resource limits, dependency versions, container build, access control and load behavior. Cloud Run must be private with IAM invocation enforced and a narrowly scoped caller. Determine a supported Google-issued ID token exchange from Supabase without weakening org policy or inventing credentials.
4. Design and implement owner-only Originals storage and verify the Apps Script identity, service-account identity, folder ACLs and separate access for both Drive branches. Never assume a folder inherited from a staff-visible parent is private.
5. Add durable `processing`/`ready` state, original identifiers protected from staff, atomic retry/locking, a safe background retry mechanism, and migrations preserving all existing rows. Ensure all admin list/preview/download endpoints deny originals and processing documents. Decide explicitly how legacy documents that are currently originals are handled without moving or exposing them.
6. Implement and test the authorized clean-only Drive preview UX, preserving the existing request-management features. A Drive viewer also requires correct Google account access to clean copies; an API authorization check alone does not give or restrict Drive access.
7. Obtain explicit owner approval for the original-file retention period before implementing deletion. No originals folder or retention job has been created.
8. Run all requested end-to-end, abuse, capability-token, retry, authentication, privacy, browser and regression tests using isolated fixtures; independently verify the exact running source and configuration. No production deployment or database migration has occurred.

## Manual actions and deployment

No dashboard action is needed to inspect the local prototype. Before a future controlled rollout, the owner will need to confirm the private Drive ownership/access model, retention period and any required paid service/billing approval. Turnstile public and secret keys, Google IAM, service identity and authorized project settings must be configured through supported secure tooling. Exact final deployment commands depend on the verified identity, database migration and rollout design; they are intentionally not provided as a ready-to-run production deployment for this incomplete implementation.

To allow a future read-only check of effective Google organization policies, a Google Cloud administrator may enable the Organization Policy API at `https://console.cloud.google.com/apis/library/orgpolicy.googleapis.com?project=swan-turbines-foundation-2026`. The API activation is an external configuration change and was not performed here. Enabling Cloud Run or any billable services also requires the owner's explicit approval.
