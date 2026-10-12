Phases 1–4 are complete. Now implement Phase 5.
added these three:
- RESEND_API_KEY — Resend API key
- RESEND_FROM — sender address
- ADMIN_NOTIFICATION_EMAIL — recipient for admin notifications
ALLOWED_ORIGINS: We can defer the production domain configuration until the Cloudflare hosting stage, but we shouldn't ignore CORS entirely .
and for phase-5 google drive stuff
- Google Cloud project: swan-turbines-foundation-2026
- Organization: swanturbinesfoundation.com
- Google Drive API (drive.googleapis.com) is enabled.
- Google Cloud CLI is authenticated as aruna@swanturbinesfoundation.com.
1. Complete secure Google Drive integration for document uploads, downloads, and access to documents associated with help requests.
2. Determine the correct authentication method for the deployed Supabase Edge Function. Do not assume local Google CLI authentication is sufficient for production.
Keep the implementation consistent with the existing architecture: Cloudflare frontend → Supabase Edge Functions/PostgreSQL → Google Drive and Resend.


User group	Accounts	Intended access
Company users	2	Company Admin Panel
Websitter / Super Admin users	3	Super Admin Panel + Company Admin Panel


these users i want:

see as of the requiremnt the company users are 2 only now:
user 1:  user id: aruna@swanturbinesfoundation.com
             password: PROVIDED OUT-OF-BAND — DO NOT COMMIT
user 2:  user id: finance@swanturbines.com
             password: PROVIDED OUT-OF-BAND — DO NOT COMMIT
and super admin websitter users who can (access super admin panel as well as company admin panel)
user 1:
      user id: sumithnalla0607@gmail.com
      password: PROVIDED OUT-OF-BAND — DO NOT COMMIT
user 2:
    user id:mohitnagasai19@gmail.com
      password: PROVIDED OUT-OF-BAND — DO NOT COMMIT
user 3:
    user id:websitter.in@gmail.com
      password: PROVIDED OUT-OF-BAND — DO NOT COMMIT
these are the real users i want accounts.

