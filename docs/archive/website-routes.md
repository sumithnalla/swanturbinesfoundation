# Swan Turbines Foundation — Website Routes and Access Guide

Production frontend:

`https://swan-turbines-foundation-11f.pages.dev`

Production API:

`https://qlfdbimnswbaiouvmtau.supabase.co/functions/v1/api`

## Public website pages

| Page | URL |
|---|---|
| Home | `/index.html` |
| About | `/about.html` |
| How it works | `/how.html` |
| Campaigns | `/campaigns.html` |
| Eco campaign | `/campaign-eco.html` |
| Education campaign | `/campaign-education.html` |
| Hunger campaign | `/campaign-hunger.html` |
| Medical campaign | `/campaign-medical.html` |
| Nutrition campaign | `/campaign-nutrition.html` |
| Relief campaign | `/campaign-relief.html` |
| Water campaign | `/campaign-water.html` |
| Women campaign | `/campaign-women.html` |
| Resources | `/resources.html` |
| Contact | `/contact.html` |
| Help request | `/request-help.html` |
| Login | `/login.html` |
| Dashboard | `/dashboard.html` |
| Profile | `/profile.html` |
| Donate | `/donate.html` |
| Donation details | `/donation-details.html` |
| Privacy policy | `/privacy-policy.html` |
| Terms | `/terms-and-conditions.html` |
| Refund policy | `/refund-policy.html` |

## Staff and administration pages

| Area | URL | Access |
|---|---|---|
| Staff/admin login | `/admin-login` (source file `/admin-login.html`) | Approved staff accounts only |
| Admin dashboard | `/admin.html` | Authenticated staff; permissions are enforced by the API |
| Admin requests list | `/admin-requests.html` | Staff with request-read permission |
| Request review | `/admin-request-detail.html?id=<request-id-or-reference>` | Staff with request-read permission |
| Admin profile | `/admin-profile.html` | Authenticated staff |
| Management portal login/dashboard | `/manage/index.html` | Authenticated staff; same backend session/roles |
| Super Admin login | `/super-admin/login` | Super Admin accounts only |

The three Websitter super administrators use the same staff login route. There is no separate insecure “super-admin password” page; super-admin access comes from the server-side role assignment.

## Current staff accounts

Passwords are deliberately **not stored in this file, Git, or chat**. Use the passwords provided through your secure password manager, and rotate them after first login. If a password is lost, use the approved Supabase Auth administrative reset workflow.

| Account email | Assigned roles | Expected access |
|---|---|---|
| `aruna@swanturbinesfoundation.com` | `foundation_admin` | Company Admin only |
| `finance@swanturbines.com` | `foundation_admin` | Company Admin only |
| `sumithnalla0607@gmail.com` | `super_admin`, `foundation_admin` | Super Admin + Company Admin |
| `mohitnagasai19@gmail.com` | `super_admin`, `foundation_admin` | Super Admin + Company Admin |
| `websitter.in@gmail.com` | `super_admin`, `foundation_admin` | Super Admin + Company Admin |

Disposable test users used during migration verification were deleted. They are not valid login credentials and must not be recreated for production use.

## User flows

### Public help request

1. Open `/request-help.html`.
2. Complete applicant and request information and submit consent.
3. The API creates the request and returns an `STF-YYYY-NNNNNN` reference plus a short-lived document-upload token.
4. Upload supported documents during the authorized window.
5. The applicant receives an acknowledgement if email is configured.
6. Staff review the request from the admin requests list.

### Staff login and request review

1. Open `/admin-login.html` or `/manage/index.html`.
2. Sign in with an approved staff email and its privately stored password.
3. The backend validates the Supabase session and role permissions.
4. Open the request list, select a request, review metadata/documents, and apply an allowed status transition.
5. Status changes are recorded in request history and may send an applicant notification.

### Company Admin flow

Aruna and Finance can access foundation request/campaign operations permitted by `foundation_admin`. They cannot access the super-admin user-management endpoint; the backend returns `403` for that operation.

### Super Admin flow

Sumith, Mohit and Websitter can use both the foundation operations and super-admin operations, including staff/user administration permitted by `super_admin`. The server—not only the page UI—enforces this boundary.

### Document flow

1. Applicant receives a short-lived upload authorization from the public request response.
2. The API validates size, MIME type, file signature and request association.
3. Files are stored in the private Google Drive request folder; Supabase stores metadata only.
4. Authorized staff download through the protected API route.
5. Deletion removes the Drive file and metadata; an empty request folder is moved to Trash.

### Contact flow

1. Open `/contact.html` and submit the form.
2. The API stores the submission and sends configured notifications.
3. All application emails use `aruna@swanturbinesfoundation.com` as the sender.

## Important security notes

- Do not place passwords, Supabase service-role keys, Apps Script shared secrets or Resend API keys in this file.
- Do not use browser-local demo accounts for administration.
- Keep public signup/redirect settings under the approved Auth configuration process; those settings were intentionally deferred.
- If a staff account is compromised, disable it and rotate its password immediately through Supabase Auth administration.
