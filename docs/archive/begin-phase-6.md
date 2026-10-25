Continue Phase 6 using the current repository state.

1. Authentication and domain

I have successfully logged in to both Supabase CLI and Cloudflare Wrangler.

My Resend domain swanturbinesfoundation.com is verified and ready to send emails.

2. Defer Supabase Auth settings
For now, do not change production Auth redirect URLs or disable public signup. These settings are deferred until a later phase/task.
Continue all other independent work, but clearly document any security implications and remaining limitations.

3. Create the five staff accounts
Create the following accounts through Supabase Auth using a secure administrative workflow. Assign the correct application roles and verify access through the actual backend authorization checks.

Company Admin only:

aruna@swanturbinesfoundation.com — Password: [REDACTED; use the approved password manager]

finance@swanturbines.com — Password: [REDACTED; use the approved password manager]

Super Admin AND Company Admin:
3. sumithnalla0607@gmail.com — Password: [REDACTED; use the approved password manager]
4. mohitnagasai19@gmail.com — Password: [REDACTED; use the approved password manager]
5. websitter.in@gmail.com — Password: [REDACTED; use the approved password manager]
 Keep real passwords out of Git, source code, logs and committed documentation.

Verify that the first two users cannot access Super Admin functionality and the other three can access both panels. Do not rely on frontend visibility alone; verify backend authorization too.


4. Fixed email sender — mandatory
Every email sent through the Company Admin panel must use aruna@swanturbinesfoundation.com as the sender, regardless of which of the five users is logged in. This includes emails sent by finance@swanturbines.com and all three Websitter Super Admin users when using the Company Admin panel.


apart frim these whatever phase-6 taskes were there complete them also.
