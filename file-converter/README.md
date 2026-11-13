# Experimental document rebuilder — not connected or deployment-ready

This independent prototype rebuilds PNG, JPEG, WebP and PDF files in memory. Images are decoded and re-encoded without copying metadata. PDFs are rendered page by page into a new image-only PDF. It uses a short-lived child process, rejects large or multi-frame inputs, limits PDF pages and pixel dimensions, applies a conversion timeout, and caps output. Rebuilding is **not virus scanning**, cannot guarantee a file is harmless, and does not replace sandboxing, dependency updates, resource isolation, or careful handling of untrusted files.

## Security boundary

The Flask app has **no application-level authentication**. It must never be deployed as a publicly invokable service. Any eventual Cloud Run deployment must enforce IAM invocation and accept only a Google-issued ID token for the intended audience from a narrowly authorized caller. No Drive credentials, Supabase keys, or shared application secrets should be provided to this container. Cloud Run concurrency must be one, minimum instances zero, and maximum instances and resource limits explicitly set. No deployment is authorized by this prototype.

The existing Supabase runtime must first be provided a verified secure way to obtain Google-issued ID tokens (for example, a supported workload identity federation setup), and IAM/organization policies must be checked. A signed JWT alone is not an invoker ID token: a supported exchange/identity mechanism is required. See [Google Cloud service-to-service authentication](https://cloud.google.com/run/docs/authenticating/service-to-service). Public invocation has not been enabled or tested.

## Local development

From the repository root, in PowerShell:

```powershell
py -3 -m venv .agent-cache/converter-venv
.\.agent-cache\converter-venv\Scripts\python.exe -m pip install -r file-converter/requirements.txt
Push-Location file-converter
..\.agent-cache\converter-venv\Scripts\python.exe -B -m unittest -v test_converter
Pop-Location
```

Tests exercise the application directly, not Cloud Run IAM. Do not expose a local Flask test server to a network. The Docker image and Cloud Run configuration have not been built or tested; Docker is unavailable in the current environment.

## Integration remains blocked

This prototype is not wired into the website, Drive, retry processing, database, or admin preview. In particular, no new `ready` status exists, the Originals folder has not been created or checked, retry jobs have not been implemented, and existing documents are still original files. Do not treat this prototype or the existing upload route as providing the security described in `bugs.md/bugs-7&security.md`.
