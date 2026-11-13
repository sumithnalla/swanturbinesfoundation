# Task: Read-only codebase audit for the file-upload security layer

Produce a single file named `claude_security_review.md` in the project root.

## Hard rules

1. **READ-ONLY.** Do not modify, delete, rename, or create any file other than `claude_security_review.md`. Do not run migrations, deploy, push, or change any Supabase / Cloudflare / Google settings.
2. **Never print secret values.** For API keys, tokens, service-account JSON, passwords, and anon/service-role keys, write only the *name* of the variable, *where* it is used, and whether it is exposed to the browser. Write `[REDACTED]` for any value.
3. **No guessing.** If you cannot find something in the code or config, write `NOT FOUND` and say where you looked. Do not describe what "probably" happens. Separate what you *verified in code* from what you *infer*.
4. **Cite evidence.** For every claim, give the file path and line range (or function name), e.g. `supabase/functions/submit-request/index.ts:42-80`.
5. Do not suggest redesigns of the website or admin panel. This audit exists so a security layer can be added without disturbing what already works.

## Context (why this audit exists)

This is the website for **Swan Turbines Foundation**. People submit a **help request** and can upload **up to 3 files** (PNG, JPEG, WebP, PDF, max 10 MB each) as supporting evidence. Foundation staff open these files, so a malicious upload is the main threat.

Known stack (verify and correct if wrong):
- Frontend: Cloudflare Pages
- Backend / database / edge functions: Supabase
- Uploaded file storage: Google Drive

## Target design (for gap analysis only, do not implement)

A new layer, to be built later:
1. Browser: courtesy checks only (type, size, max 3 files).
2. Supabase server side: verify Cloudflare Turnstile, max 3 files, max 10 MB each, real file type via magic bytes, random file names.
3. Files forwarded to a small external "file checker" service (free Oracle Cloud VM, reached via Cloudflare Tunnel + shared secret) which: scans with ClamAV (clamd, Python client, 3 files in parallel), then re-encodes images and flattens PDFs into page images, then deletes originals.
4. Only the clean re-made copies are stored in Google Drive with random names.
5. The form submission is accepted only if the server confirms all files passed (fail closed: if the checker is down or errors, reject).
6. Staff view files through the Google Drive browser preview, never by downloading originals.

Your job is to show **what already exists, what is missing, and where the new layer must plug in**.

## What the audit must cover

### 1. Project map
- Repo structure (folders and what each contains), frameworks, package manager, build and deploy setup.
- All Supabase edge functions: name, path, purpose, how it is triggered, whether JWT verification is on.
- Supabase config: tables involved in help requests and files, storage buckets (if any), RLS policies on those tables/buckets.
- All environment variables and secrets: name, where defined, where used, whether reachable from browser code.

### 2. Help-request flow, end to end
Describe step by step, with file references, exactly what happens from the moment the user opens the help-request form to the moment staff see the request:
- Form fields and validation (client side).
- **When do files get uploaded: on selection, or only on submit?** Is the upload separate from the form data, or one request?
- Where the upload goes first (browser to Supabase function? direct to Drive? Supabase Storage?), and the exact path to Google Drive. How Drive authentication works (service account / OAuth), which Drive folder, and its sharing permissions.
- What is stored in the database for each file (columns, link, original name, mime type, size).
- What the user sees on success and on failure.

### 3. Existing protections (mark each as IMPLEMENTED / PARTIAL / NOT FOUND, with evidence)
- Cloudflare Turnstile: present? Verified on the server or only rendered in the browser?
- File count limit (3): client only, server, or both?
- File size limit (10 MB): client only, server, or both? Any limits set by Supabase/Cloudflare/Drive that apply?
- Allowed types: checked by extension, by browser MIME, or by magic bytes? Client or server?
- File renaming: are original filenames used in paths or Drive names?
- Rate limiting / abuse protection on the form and upload endpoints.
- CORS settings on edge functions.
- Input validation and sanitisation of text fields.
- Any existing virus scanning, image re-encoding, or PDF handling: NOT FOUND is a valid answer.
- Error handling: if something fails mid-upload, what state are the file and the request left in? Is anything "fail open" (continues when a check errors)?

### 4. Admin / staff side
- How staff log in and view help requests.
- **How staff currently open uploaded files**: direct download link, Drive link, embedded preview, something else? Are links public, "anyone with the link", or restricted?
- Which files/components render these links.

### 5. Constraints for the new layer
- Supabase edge function limits relevant here (request size, timeout, memory) and whether the current functions are near them.
- Whether files can realistically pass through an edge function at 3 x 10 MB, or whether a different path (signed upload URLs, a Storage bucket as quarantine) already exists or would be needed.
- Tools available in this environment: `ssh`, `docker`, `oci` CLI, `cloudflared`, `supabase` CLI, `gcloud`, Python version, Node version. Report installed or not, do not install anything.

### 6. Gap analysis
A table: each item of the target design above vs current status (DONE / PARTIAL / MISSING) with the file where it would plug in.

### 7. Risks found
List any security problems you noticed anywhere in the upload flow (for example: public Drive links, service-role key exposed to the browser, missing server-side checks, trusting client-sent MIME types, unrestricted CORS). Rank as High / Medium / Low. Report only, do not fix.

### 8. Open questions
List anything you could not determine from the code that the owner needs to answer (accounts, dashboard-only settings, Drive sharing settings, Turnstile keys, domains).

## Output format

`claude_security_review.md` with exactly these sections, in order:

1. Summary (10 lines max: what exists, what is missing, biggest risks)
2. Project map
3. Help-request flow (numbered steps with file references)
4. Existing protections (table: protection / status / evidence)
5. Admin / staff file viewing
6. Constraints and environment
7. Gap analysis (table)
8. Risks found
9. Open questions for the owner

Be precise and concise. Prefer tables and file references over prose. Before finishing, re-read your own report and remove any claim you cannot back with a file reference.