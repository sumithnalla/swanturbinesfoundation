Cloudflare's Turnstile dashboard shows: "Siteverify isn't being called for
Swan Turbines – Help Request Security. Without a server-side siteverify call,
widget tokens aren't validated."

Diagnose first, then fix if needed. Do not write status documents.

1. Check the LIVE production API (not local code): send a help-request
   creation request with (a) no turnstileToken, (b) a fake token. Both must be
   rejected and create nothing. If either creates a request, Turnstile is NOT
   enforced in production: tell me immediately, and list any junk request it
   created so I can delete it. Do the same for the contact form.
2. Find out why. Compare the deployed Edge function version against the repo.
   Check the production secret NAMES (never values) for TURNSTILE_SECRET_KEY.
   Check production function logs for siteverify calls and errors.
3. Check the code path: confirm the server calls Cloudflare siteverify before
   any database write, and that a missing secret, a Cloudflare error, a timeout
   or a failed verification all cause REJECTION (fail closed). If any path
   skips verification when the secret is missing, fix it.
4. Confirm the frontend actually sends the token as `turnstileToken` from the
   live pages, and that the site key and the secret belong to the same widget.
5. If a fix is needed: implement and test it locally, then give me the exact
   deploy and rollback commands and wait for me to reply `deploy`.
6. After deploy, re-run the step 1 tests against production, then tell me what
   to look at in the Cloudflare dashboard to confirm the warning clears.

Never print secrets. Final report: root cause, what you changed, test results.