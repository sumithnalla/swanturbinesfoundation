# Swan Google Drive broker

This service is designed for Cloud Run with the dedicated service account
`swan-foundation-drive@swan-turbines-foundation-2026.iam.gserviceaccount.com`
attached as its runtime identity. It uses Application Default Credentials from
the Cloud Run metadata server and never needs a downloadable service-account
key.

The broker exposes only `/health`, `/v1/upload`, and `/v1/download`. Upload and
download requests require a five-minute timestamp window and an HMAC-SHA256
signature over `timestamp.body`. The HMAC value belongs in Secret Manager and
the Supabase Edge Function secret store; it is never committed or returned.
Drive access is restricted by the existing private-folder permission on the
dedicated service account. The service enforces a 10 MiB payload limit and
sanitizes filenames.

Deployment prerequisites (manual because this project currently has no billing
account): enable billing, then enable Cloud Run, Cloud Build, Artifact Registry,
Secret Manager, and Service Account Credentials APIs. Deploy this directory to
Cloud Run with the dedicated service account, grant it Secret Manager accessor
on the broker HMAC secret, require authenticated ingress where the chosen
Supabase-to-Cloud-Run gateway supports it, and configure the broker URL and HMAC
secret in Supabase. Run real upload/download/cleanup tests before approval.
