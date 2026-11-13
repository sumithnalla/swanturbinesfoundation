# Swan Turbines Foundation – Complete Upload Security Implementation

You are working on the existing Swan Turbines Foundation website and its backend.

Your task is to implement the complete two-phase upload security architecture described below. Work directly with the existing codebase, inspect the current implementation, make the necessary code and database changes, test everything locally, and prepare the system for deployment.

**The objective is to complete as much of this implementation autonomously as possible. Do not ask me to manually write code, SQL, configuration files, or application logic.**

However, do not perform production deployment, enable paid services, create paid resources, or make irreversible changes without my explicit approval.

---

# PART 1 – UNDERSTAND THE EXISTING PROJECT FIRST

Before changing anything:

1. Inspect the entire repository and understand the existing architecture.
2. Identify the frontend, Supabase Edge Functions, database schema, authentication, storage/upload flow, Google Drive integration, and admin panel.
3. Inspect the existing `api` Edge Function and all upload-related code paths.
4. Identify both existing Google Drive upload branches:
   - Apps Script integration.
   - Service-account integration.
5. Inspect the existing capability-token upload mechanism, upload lock, retry-documents flow, and document storage-status field.
6. Inspect the existing RLS policies, database functions, migrations, and relevant permissions.
7. Review existing security audits and implementation documentation if present.

Do not assume that the documentation describes the current code perfectly. Verify everything against the actual repository and database configuration.

Produce a short architecture assessment before implementation, identifying:
- What already exists.
- What needs modification.
- What needs to be created.
- Any existing security issues relevant to this implementation.

Do not stop after producing the assessment. Continue with implementation wherever it is safe to do so.

# PART 2 – NON-NEGOTIABLE RULES

These rules apply throughout the entire project.

1. Do not redesign the website or change the existing form UI unnecessarily.
2. Do not alter existing form functionality.
3. Preserve the existing database structure wherever possible.
4. Preserve request IDs and Google Drive folder naming.
5. Preserve the capability-token upload mechanism.
6. Preserve the upload lock.
7. Preserve the retry-documents flow.
8. Preserve the existing admin panel and its functionality.
9. Do not introduce Oracle Cloud, ClamAV, or an always-on VM. They have been dropped from the architecture.
10. Do not introduce unnecessary services, queues, databases, or architectural layers.
11. Do not expose original uploaded files to foundation staff.
12. Never print secrets in logs or commit secrets to Git.
13. Never accept a document as `ready` unless a rebuilt clean copy exists.
14. Never bypass conversion as a fallback.
15. Each phase must be tested locally before deployment.
16. Never deploy a phase without my explicit approval.

If a requirement cannot be implemented safely without a manual external setup step, implement everything else possible and clearly identify the blocker.

# PART 3 – TARGET ARCHITECTURE

Existing stack:

- Frontend: Vanilla JavaScript, HTML and CSS.
- Hosting: Cloudflare Pages.
- Backend: Supabase Edge Function (`api`).
- Database: Supabase Postgres.
- File storage: Google Drive.
- Existing Drive structure:
  `Swan Turbines Foundation / Charity Requests / STF-2026-xxxxxx`

New components:

- Cloudflare Turnstile for bot protection.
- Rate limiting inside the Supabase Edge Function.
- Google Cloud Run for file rebuilding/conversion.
- A separate locked Google Drive Originals root folder.

Google Cloud configuration specified for this project:

- Project ID: `swan-turbines-foundation-2026`
- Organization: `swanturbinesfoundation.com`
- Intended Cloud Run region: `us-central1`

Cloud Run should scale to zero when idle, have a configured maximum instance count, and use only the required resources.

The converter must not retain uploaded files or hold application secrets.

# PART 4 – PHASE 1: FRONT GATE

Implement the following changes without requiring new infrastructure.

## 4.1 Cloudflare Turnstile

Integrate Cloudflare Turnstile into:

- Help Request creation.
- Contact form submission.

Requirements:

1. Use the existing Cloudflare Turnstile widget.
2. Use the public Site Key in the frontend.
3. Verify the Turnstile token on the server inside the Supabase Edge Function.
4. Never trust frontend verification alone.
5. Reject invalid, expired, or reused tokens.
6. Do not expose the Turnstile Secret Key in frontend code.
7. Keep the existing upload endpoint's single-use capability-token protection. Do not unnecessarily add Turnstile to that endpoint.

The widget is already created with Managed mode. Its configured hostname is the existing Cloudflare Pages hostname.

If the keys are not available in the local environment, implement the integration using environment variables and provide exact setup instructions. Never invent keys or ask me to paste secrets into source code.

## 4.2 Rate Limiting

Implement rate limiting inside the Supabase Edge Function.

Important: The API is hosted on the Supabase domain, so Cloudflare Pages rules do not protect this endpoint.

Requirements:

1. Implement server-side rate limiting for the relevant public endpoints.
2. Store counters using a salted IP hash.
3. Do not store raw IP addresses unnecessarily.
4. Ensure the rate limit cannot be bypassed by modifying frontend requests.
5. Return appropriate error responses when limits are exceeded.
6. Avoid breaking legitimate users and existing form submissions.

Inspect the existing database and decide whether a small additional table or another existing storage mechanism is appropriate. Add migrations only if genuinely required.

Document the configured limits and why they were chosen. Do not silently invent aggressive limits.

## 4.3 Total Upload Size Limit

The existing backend already enforces:

- Maximum 3 files.
- Maximum 10 MB per file.
- Actual file type validation using magic bytes.

Add a real server-side total-size cap of 30 MB across all uploaded files.

The frontend can provide courtesy checks, but the server must independently enforce every limit.

## 4.4 Random Google Drive Filenames

Replace predictable uploaded filenames with:

`UUID + extension detected from actual file type`

Requirements:

- Generate UUIDs server-side.
- Derive extensions from validated file types, not applicant-provided filenames.
- Keep the original filename in the database.
- Continue showing the original filename in the admin panel.
- Preserve existing request folder names and request IDs.

# PART 5 – PHASE 2: GOOGLE CLOUD RUN PHOTOCOPIER

Build a separate file-rebuilding service on Google Cloud Run.

Do not connect it to the live website until the converter has been built and tested independently.

## 5.1 Converter service

The converter must:

- Accept one file per authenticated request.
- Process files in an isolated, throwaway execution environment.
- Store no uploaded files permanently.
- Release file data and memory when processing finishes.
- Enforce strict file size, page count, pixel dimension, execution time, resolution, and output quality limits.
- Return a rebuilt file to the calling Edge Function.

Do not install ClamAV. Protection is based on rebuilding files rather than virus-signature scanning.

Do not describe the resulting files as virus-scanned.

## 5.2 Image rebuilding

Supported input formats:

- PNG
- JPEG
- WebP

Process:

1. Decode the image.
2. Re-encode it as a completely fresh image.
3. Remove metadata and hidden payloads.
4. Return the rebuilt image.

Preserve the visible image as accurately as possible while ensuring it is newly encoded.

## 5.3 PDF rebuilding

Process PDFs page by page:

1. Render each PDF page into an image.
2. Rebuild the PDF using only the rendered images.
3. Ensure the resulting PDF contains no original embedded scripts, attachments, or interactive PDF content.
4. Preserve the original page order.
5. Enforce a maximum page count.
6. Enforce maximum pixel dimensions.
7. Enforce time limits.
8. Apply resolution and quality caps so output PDFs do not grow uncontrollably.

One uploaded PDF must remain one rebuilt PDF. Do not split it into multiple database records or files.

The output is an image-only PDF. Selectable text is not required.

## 5.4 Cloud Run security and authentication

The Cloud Run converter must accept only authenticated requests from the trusted backend.

Inspect the existing Google Drive service-account integration and Google organization policies before choosing the authentication method.

The intended architecture is:

- If authenticated public Cloud Run invocation is permitted, use a suitable secure authenticated invocation mechanism.
- If Google organization policy blocks public invocation, use the signed-token approach described in the briefing, using the existing Drive service account where technically supported.

Do not invent an insecure authentication workaround.

Requirements:

- Cloud Run must not hold Supabase service-role keys, Drive credentials, or other application secrets.
- Validate incoming requests.
- Reject unauthorized requests.
- Limit request sizes.
- Process one file at a time.
- Do not persist originals or converted files to disk or external storage.
- Configure a maximum instance count.
- Allow scale-to-zero.

Document the chosen authentication method and any manual Google Cloud configuration required.

# PART 6 – GOOGLE DRIVE STORAGE ARCHITECTURE

Create a new locked root folder named `Originals`.

Expected structure:

`Originals / STF-2026-xxxxxx / [random original filenames]`

Requirements:

1. Only the owner should be able to access the Originals root folder.
2. Originals must never be linked from the staff admin panel.
3. Use the same existing STF request folder names.
4. Do not change the existing `Charity Requests` structure.
5. Existing `Charity Requests / STF-xxxxxx` folders must contain rebuilt clean copies only after the new flow is activated.
6. Use random UUID-based filenames for originals and rebuilt copies.
7. Preserve original filenames in the existing database records.

Inspect existing Drive permissions carefully before changing anything.

Do not move, delete, or rewrite existing files during implementation.

# PART 7 – CONNECT THE CONVERTER TO THE EXISTING UPLOAD FLOW

Integrate the converter into the existing upload endpoint after existing validation and before the staff-visible Drive write.

This integration must work in both existing Google Drive branches:

1. Apps Script branch.
2. Service-account branch.

Expected processing sequence:

1. Validate the existing capability token.
2. Validate file count.
3. Validate individual file size.
4. Validate the 30 MB total-size limit.
5. Validate actual file type using magic bytes.
6. Save the original file in the locked Originals folder.
7. Send the original file to Cloud Run.
8. Receive the rebuilt clean copy.
9. Save the rebuilt copy in the existing Charity Requests folder.
10. Record the clean-copy storage information and mark the document `ready` only after the clean copy has been successfully stored.
11. Preserve the original filename for display in the admin panel.

Use the existing document storage-status field for `processing` if it supports the required behavior.

If a schema modification is genuinely necessary, create a migration and explain why.

## Failure handling

If Cloud Run fails:

- Retry automatically.
- Do not mark the file as `ready`.
- Do not expose the original to staff.
- If retries fail, keep the file in `processing`.
- Preserve the original in the locked Originals folder.
- Allow a background retry to finish processing.
- Staff must not receive a preview link until a rebuilt clean copy exists.

The visitor should continue seeing the same successful request-submission experience as today when the request itself has been accepted.

Do not accept an unrebuilt file as ready under any circumstances.

# PART 8 – ADMIN PANEL CHANGES

Preserve the current admin panel design and functionality.

Change only the document preview behavior.

Requirements:

1. The Preview button should display a confirmation popup:

   "Open in Google Drive viewer?"

2. If the staff member confirms, open the Google Drive browser preview of the rebuilt clean copy.
3. The API must return a Drive preview link only to authorized staff.
4. Return links only for clean copies.
5. Return links only when the document status is `ready`.
6. Never return an Originals folder link or original file link.
7. Documents in `processing` must not have an accessible Preview action.

Do not make unrelated admin panel changes.

# PART 9 – RETENTION

Original files must be automatically deleted after an agreed retention period.

The briefing suggests 30–90 days, but the final retention period must be confirmed with the foundation owner.

Do not implement automatic deletion until the retention period is explicitly configured and approved.

The deletion process must affect only original files in the private Originals folder, never clean copies or unrelated Drive documents.

# PART 10 – TESTING

Create and run comprehensive local tests.

## Phase 1 tests

Test:

- Valid Turnstile token.
- Invalid Turnstile token.
- Expired/reused Turnstile token.
- Missing Turnstile token.
- Rate-limit enforcement.
- Salted IP hash handling.
- Exactly 3 files.
- 4 files.
- 10 MB per file.
- File larger than 10 MB.
- Exactly 30 MB total.
- Total size above 30 MB.
- Correct magic-byte validation.
- Fake file extensions.
- UUID-based Drive filenames.
- Original filename retained in database.
- Both form submission endpoints.

## Phase 2 converter tests

Use these exact test cases:

1. A real PDF.
2. A PNG.
3. A JPEG.
4. A fake PNG (a renamed text file).
5. A PDF containing script.
6. A huge PDF.
7. An 11 MB file.
8. Four files.
9. Converter switched off.
10. EICAR test file, which should pass through rebuilding as harmless pixels.

Also test:

- Excessive PDF page count.
- Excessive image dimensions.
- Processing timeout.
- Invalid authentication.
- Cloud Run unavailable.
- Conversion failure.
- Successful retry.
- Failed retry.
- Original file remains private.
- Clean copy becomes available only after successful conversion.
- Admin preview never returns an original-file link.
- Both Drive upload branches.

The EICAR test must be performed only in the isolated local test environment. It should not be treated as a virus-scanning test.

## Regression tests

Verify that:

- Existing Help Request submissions still work.
- Existing Contact submissions still work.
- Existing request IDs are unchanged.
- Existing folder naming is unchanged.
- Capability-token uploads still work.
- Upload locks still work.
- Retry-documents flow still works.
- Admin request management still works.
- Existing contact and request records remain accessible.
- No unrelated website functionality is broken.

# PART 11 – DEPLOYMENT AND MANUAL SETUP BOUNDARIES

You should perform all work possible inside the repository and local development environment.

You may:

- Modify frontend code.
- Modify Supabase Edge Functions.
- Write database migrations.
- Write Cloud Run converter source code.
- Write Dockerfiles and deployment configuration.
- Write test suites.
- Update environment-variable examples without actual secrets.
- Run local tests.
- Prepare deployment commands.
- Prepare documentation.

You must not:

- Deploy to production without my approval.
- Apply destructive database changes.
- Delete existing Drive files.
- Enable paid Google Cloud services without my approval.
- Change billing settings.
- Commit secrets.
- Expose private Drive folders.
- Disable existing security protections.

If a task requires me to access a dashboard, enable an API, approve billing, create a secret, or grant permissions, stop at that boundary and give me precise step-by-step instructions.

Never ask me to perform work that you can safely complete yourself.

# PART 12 – FINAL DELIVERABLES

At the end of the work, provide:

1. Complete architecture assessment.
2. List of files created or modified.
3. Database migrations created and their purpose.
4. Phase 1 implementation summary.
5. Phase 1 test results.
6. Cloud Run converter implementation summary.
7. Phase 2 test results.
8. Google Drive integration changes.
9. Admin preview changes.
10. Security considerations and known limitations.
11. Exact manual actions still required from me.
12. Exact environment variables and secret names required, without displaying secret values.
13. Exact local commands to run the project and tests.
14. Exact deployment commands prepared for my approval.
15. Any items that remain incomplete and why.

Maintain a clear distinction between:
- Implemented.
- Tested locally.
- Awaiting manual configuration.
- Awaiting owner approval.
- Deployed.

Do not claim something works merely because code was written.

---

# EXECUTION INSTRUCTION

Start by inspecting the repository and producing the architecture assessment.

Then implement Phase 1 completely.

Test Phase 1 locally and report the results.

Next, build the Cloud Run converter independently and test it locally.

After that, prepare the Drive integration and admin preview changes, including all necessary migrations.

Do not wait for me to configure Google Cloud before completing work that can be implemented and tested locally.

If an external configuration is required, use safe placeholders and continue with the remaining work.

**Your goal is to deliver a fully implemented, locally tested, deployment-ready solution for both phases while preserving all existing Swan Turbines functionality.**

Do not deploy anything until I explicitly approve it.


i have checked these you can also check if you want.
the initial Google Cloud readiness check.

Verified:

Active Google account: aruna@swanturbinesfoundation.com

Project ID: swan-turbines-foundation-2026

Project status: ACTIVE

My IAM role: roles/owner

Drive API: enabled

Existing service account: swan-foundation-drive@swan-turbines-foundation-2026.iam.gserviceaccount.com

Service account is enabled.