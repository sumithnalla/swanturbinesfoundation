-- Phase 5: short-lived, hashed capability for an applicant's immediate document upload.
-- The raw value is returned once by the Edge Function and is never stored in PostgreSQL.

alter table public.help_requests
  add column if not exists document_upload_token_hash text,
  add column if not exists document_upload_token_expires_at timestamptz;

create index if not exists help_requests_document_upload_token_expiry_idx
  on public.help_requests(document_upload_token_expires_at)
  where document_upload_token_expires_at is not null;

comment on column public.help_requests.document_upload_token_hash is
  'SHA-256 hash of the short-lived applicant document-upload capability; raw token is never persisted.';
comment on column public.help_requests.document_upload_token_expires_at is
  'UTC expiry for the one-time help-request document-upload capability.';
