# FRONTEND_INFO — Swan Turbines Foundation

## Executive summary

**Existing:** a static, multi-page HTML/CSS/vanilla-JavaScript frontend for Swan Turbines Foundation. It has **26 HTML entry points** (including the `admin-login.html` redirect and `adminlogin/index.html`), no package manifest, no build tool, no server/runtime requirement, and no real API, database, or payment integration. It can be served as static files.

Major UI features are public content/campaign pages, a hardcoded campaign catalogue and eight hardcoded detail pages, a local-only donation wizard/dashboard/receipt, local-only donor authentication/profile, a local-only help-request form plus admin request-review screen, and a contact form that only shows an alert. `js/db.js` is a browser `localStorage` mock data layer, not a backend. Campaign content is static markup, not represented in that layer. The request form creates a local request ID and displays it inline; it has no document uploads. The contact form is entirely mock. Authentication and uploaded profile/signature images are browser-local. The required future integration points are campaign read APIs, help-request submission/review plus document storage, contact submission, secure identity/session management, profile and donation/payment/receipt services.

## 1. Project overview

| Item | Observed implementation |
|---|---|
| Project identity | `SWAN TURBINES FOUNDATION` in source, titles, receipt, and `audit.md`; several legacy page titles say “Brightaid” and many say “Swan Turbans”. |
| Framework/language | No framework. HTML5, CSS, ES5/ES6 browser JavaScript. |
| Build/package manager/runtime | No `package.json`, lockfile, Node requirement, build configuration, TypeScript, lint, formatter, or dependency declaration was found. No build step is evidenced. |
| Styling/UI | One global stylesheet: `css/style.css`; inline page styles also occur. No component/UI library. Google-hosted Roboto Flex import; system fonts and Figtree are also named. |
| Routing | Static-file navigation via `window.location.href`, anchors, and page query strings. No router. |
| State/data | `localStorage` mock tables in `js/db.js`; auth session in `localStorage` or `sessionStorage`; DOM state and inline scripts. |
| HTTP/API/auth/upload libraries | None. No `fetch`, Axios, XHR, GraphQL, Supabase, Firebase, Appwrite, or endpoint configuration found. Native `FileReader` is used for profile/signature image previews only. |
| Animation | CSS transitions/keyframes; custom `js/circular-text.js`, `js/text-loop.js`, and `js/circular-gallery.js`. No animation package. |
| Payments | Simulated. The wizard writes a successful local donation before clearing mock card inputs. Modal donation only alerts to connect a gateway. |
| Configuration/deployment | No deployment/configuration file found. `.wrangler` exists but contains no discoverable configuration file. |

## 2. Architecture and directory map

| Path/group | Contents and role | Backend relevance / preserve |
|---|---|---|
| `*.html` at root | Static public, donor, admin, legal, campaign and donation pages. Most share duplicated header/footer/modal markup. | Preserve layout/content; integration should replace data/actions with minimal DOM-contract changes. |
| `adminlogin/index.html` | Separate static administrator login page. `admin-login.html` redirects to it. | Authentication integration point; preserve UI. |
| `js/db.js` | `window.SwanDB`: seeded local mock users, profiles, donations, requests, CRUD/query helpers and analytics. | Primary mock-data replacement target; do not treat its local storage as source of truth. |
| `js/auth.js` | `window.SwanAuth`: local registration/login/reset/session/role guard/header UI. | Replace with real identity/session client; current client-side authorization is not security. |
| `js/admin.js` | `window.SwanAdmin`: request list/search/filter/review/status/note/local CSV export. | Help-request administration integration point. |
| `js/receipt.js` | `window.SwanReceipt`: client-generated printable donation certificate. | Receipts/donation data and authorization integration point. |
| `js/main.js` | Navigation, mobile menu, loaders, donation wizard, modal donation alert, contact alert, utility UI. | Donation/contact actions need replacement; preserve presentation utilities. |
| `js/circular-gallery.js`, `circular-text.js`, `text-loop.js` | Decorative/interactive homepage effects. | No backend need; leave untouched. |
| `css/style.css` | Global design system, layouts, responsive rules, form/admin/receipt styles. | Leave untouched unless an integration needs a new state class. |
| `swan_foundation_img/`, root `.jpeg`/`.png`, `pdf_pages/`, PDF | Local campaign/team/office/logo/registration assets and PDF page images. | Static media now; future campaign/media CMS may supersede selected campaign assets. Preserve. |
| `audit.md` | Audit instructions supplied by user. | Not application code. |
| `.vscode`, `.agent-cache`, `.DS_Store` | Tool/editor/OS artifacts. `.agent-cache/.gitignore` is the only discovered ignore file. | No application integration role. |

## 3. Route/page inventory

All routes are public by URL; `dashboard.html`, `profile.html`, and `admin.html` run a **client-side** role check after loading. “Protected” below means that UI guard only, not server protection.

| Path | Component/page purpose | Status/data/forms/actions |
|---|---|---|
| `/index.html` | Home: hero, impact pillars, featured campaigns, leadership, CTA, circular gallery. | Public; static content/cards; donation modal. |
| `/about.html` | Foundation/about, legal profile, impact and CTA. | Public; static; donation modal. |
| `/campaigns.html` | Catalogue of eight campaigns. | Public; eight static cards, no filter/sort/pagination; donation modal. |
| `/campaign-{hunger,relief,education,water,medical,women,eco,nutrition}.html` | One static detail page per campaign. | Public; image, status, description, hardcoded progress and three hardcoded impact facts; back and donate buttons. |
| `/how.html` | How-it-works explainer. | Public/static; donation modal. |
| `/resources.html` | Educational resources/stories. | Public/static; donation modal. |
| `/contact.html` | Contact page. | Public; four-field form invokes `submitContact`, alert + reset only. |
| `/request-help.html` | Request assistance. | Public; single-step local help-request submission, inline success/error with local `HELP-*` ID. |
| `/donate.html` | Four-step donation wizard. | UI-gated sign-in, local simulated donation/receipt; no gateway. |
| `/donation-details.html` | Donation allocation informational page. | Public/static; donation modal. |
| `/login.html` | Donor sign-in/register/forgot-password modes. | Public; all identity operations local. |
| `/dashboard.html` | Donor donation totals/history and receipts. | Client-side donor guard; reads local donations; filters history. |
| `/profile.html` | Donor profile and images/signature. | Client-side logged-in guard; edits local user/profile, native image preview/remove. |
| `/adminlogin/index.html` | Administrator sign-in. | Public login form; local admin credentials/role check. |
| `/admin-login.html` | Redirect shim to `/adminlogin/`. | Meta refresh and JavaScript redirect only. |
| `/admin.html` | Help Request Center. | Client-side admin guard; local request stats/table/status filters/search/review/note/CSV export. |
| `/terms-and-conditions.html`, `/privacy-policy.html`, `/refund-policy.html` | Legal pages. | Public/static. |

## 4. Page-by-page UI analysis

**Shared public shell (most public pages):** loader, fixed header/logo/nav, mobile menu, footer, and often a donation modal. `js/main.js` controls the loader, mobile menu and modal; `js/auth.js` updates header login/profile UI when loaded. These sections are static except auth header state.

**Home:** hero → three illustrated focus areas → foundation copy → “Featured Campaigns” static cards → people/leadership cards → CTA/footer → donation modal/circular gallery. Campaign images, copy and links are hardcoded; interaction is navigation or donation modal.

**About:** page heading → contextual image/copy → legal profile → impact/leadership → CTA/footer/modal. All values are static; no backend required for the existing UI unless content becomes managed.

**Campaign listing:** heading → `campaigns-grid` with eight `<article class="campaign">` cards → footer/modal. Each card has image, status/category text, title, description, inline-width progress bar, raised amount/progress text, and hardcoded detail URL. No controls, request, query or dynamic rendering exists.

**Each campaign detail:** back link → two-column image/copy → status/title/description → inline percentage progress → raised value and percentage → Back/Donate buttons → three fact cards → footer. Content differs per file and can be inconsistent with its list card (some details show dollar values while list cards show rupees). No campaign is resolved by ID.

**How/resources/donation-details/legal pages:** headings and sequential informational cards/sections, footer/modal where present. Static source content and external Unsplash images in places; no dynamic action beyond donation/navigation.

**Contact:** page heading → introductory copy → `contact-form` → footer/modal. Fields are First Name, Last Name, Email, Message. Native `required` validation applies. Submit prevents navigation, alerts success, and resets; it has no visible loading/error state or persistence.

**Request Help:** introduction/three explanatory steps → request card/ARIA-live message → single form → minimal footer. Full detail is in section 6.

**Donate:** wizard step 1 amount buttons/custom amount → step 2 name/email/phone → step 3 mock card fields/consent → step 4 thank-you/receipt data and dashboard button. `main.js` validates fields and on step 4 requires local sign-in and creates a local successful donation. `cardNumber`, expiry, CVV, cardholder values are only formatted/validated then cleared; no network payment occurs.

**Login:** dynamically changes one form between sign-in, registration and forgot-password modes; success/error banners are populated by page script/auth module. Password reset only reports simulated email delivery.

**Dashboard:** donor identity/summary cards → donation history filter/table → receipt modal. It calculates statistics and displays only `SwanDB.getDonationsByUserId` values.

**Profile:** profile photo → name/read-only email/phone → address/PAN → signature upload controls → save/banner. It updates local tables. Signature is only persisted for an admin role, although the markup currently renders its upload section regardless.

**Admin:** header/export/refresh → help-request count cards → status filter/search → request table → dynamically generated review dialog. It displays all local help-request properties, writes status/note locally and creates a browser CSV download.

## 5. Campaign system analysis

**Existing data locations and consumers.** `campaigns.html` contains eight static cards. `index.html` contains featured campaign markup; `js/circular-gallery.js` contains two static items (Eco Protection & Energy and Child Growth & Nutrition) with external image URLs/detail URLs. The eight detail HTML files contain independent static campaign versions. `js/main.js` only derives a donation’s `campaign` **name** from `?campaign=` on `donate.html`; detail-page Donate buttons open the modal and do not establish a campaign ID. There is no campaign JS type/interface, array, local-storage campaign data, category filter, sorting, API call, pagination or database lookup.

**Actual card/detail field shape (implicit, markup—not an object):** `image src`, `image alt`, `status` (displayed category/status), `title`, `description`, progress percentage (CSS inline width and displayed `%`), displayed raised amount, detail-page URL, and on a detail page three `{value,label}` facts. Detail pages also present a prominent image. These fields are effectively mandatory to reproduce current cards; statuses/progress/amount/title drive visible output; only the current destination URL drives interaction. The UI has no start/end date, location, target amount, published state, or campaign ID field.

**Observed campaign labels:** Youth In Action Against Hunger; Emergency Relief & Disaster Care; Education For Every Child; Clean Water & Sanitation Initiative; Medical Aid & Elderly Care Fund; Rural Women Skill & Livelihood; Renewable Energy & Eco-Protection; Child Growth & Health Program. Card labels include `ACTIVE`, `HEALTHCARE`, `EMPOWERMENT`, `SUSTAINABILITY`, and `NUTRITION`; these are presentation values, not filters.

**Required later:** database/API campaign records must become authoritative and replace duplicated markup/reference assets. A backend mapping strategy is needed because static route filenames and some detail/list titles, amounts and currencies differ. Do not infer monetary totals or campaign IDs from the display strings.

## 6. Request Help system

### Existing implementation

`request-help.html` is **one step**, not the planned three-step workflow. It posts no request. It constructs `Object.fromEntries(new FormData(form))`, sets `consent`, calls `SwanDB.createHelpRequest`, writes local storage, shows an inline status message containing a generated `HELP-` six-digit-random ID, resets the form, and scrolls to top. Error text comes from `createHelpRequest`.

| Field/name | Type and current required state | Current validation/storage |
|---|---|---|
| `full_name` | text, required | `maxlength=120`; DB requires nonempty. |
| `phone` | tel, required | `maxlength=32`; DB requires nonempty only. |
| `email` | email, optional | `maxlength=254`; browser and DB email regex if supplied. |
| `help_type` | select, required | Medical care; Food or essential supplies; Shelter or emergency relief; Education support; Water or sanitation; Other support. |
| `address` | text, optional | `maxlength=300`; labelled Address/location. No city/state fields. |
| `estimated_amount` | text, optional | `maxlength=40`; no numeric validation. |
| `urgency` | select, required but preselected | values `medium`, `low`, `high`, `critical`; differs from planned Normal/Urgent/Emergency. |
| `description` | textarea, required | `maxlength=2500`; DB requires nonempty. |
| `consent` | checkbox, required | stored boolean. |

Actual local request record: `{id, full_name, phone, email, address, help_type, estimated_amount, urgency, description, consent, status:'new', admin_note:'', created_at, updated_at}`. IDs are `HELP-` + random 100000–999999; collision prevention is not implemented. Admin supports status `new|reviewing|approved|closed`, internal `admin_note` max 1500, date/name/phone/email/help type search, export, and review. There is no applicant tracking page/API.

### Documents/uploads

No request document input, `FileReader`, file state, type/size limit, multiple support, preview, removal, progress, or upload submission exists in the request-help flow. It is not a visual/mock uploader; it is absent. The planned applicant city/state, beneficiaries count, required assistance amount semantics, requested support taxonomy, and three-step UI are also absent.

### Natural future responses

Create-request should return at least durable `id/reference`, `status`, `created_at` and a success message/display-safe data. Admin list/detail needs request records and pagination/filter/search metadata; update needs updated status/note/timestamp. If uploads are added, an upload policy and document metadata/URLs/statuses are needed. Exact field mapping and endpoint shape remain a backend/frontend decision.

## 7. Contact form

Located in `contact.html`, `form.contact-form`, handled by `submitContact` in `js/main.js`. Required: unnamed text inputs for First Name and Last Name, unnamed email input, unnamed message textarea. Native browser validation only; no `name`, max length, custom message, loading, error, durable success UI, API/email invocation, or mock data record. It displays an alert and calls `event.target.reset()`. Future integration must add identifiable payload fields and submit to a contact-submission service; this is necessarily a frontend integration change.

## 8. Mock/hardcoded data audit

| Path | Data | Consumer/future disposition |
|---|---|---|
| `js/db.js` `SEED_USERS` | Admin and donor records, IDs, email/phone, roles, **plaintext password_hash values**. | Auth/profile/header/admin; mock only; remove from client when real auth exists. |
| `js/db.js` `SEED_PROFILES` | One donor address/PAN. | Profile/receipt; mock only. |
| `js/db.js` `SEED_DONATIONS` | Two donations with IDs, campaign strings, payments/receipts/status/timestamps. | Dashboard/receipt/analytics; mock only. |
| `js/db.js` local keys | `swan_db_users_v2`, `swan_db_profiles_v2`, `swan_db_donations_v2`, `swan_db_help_requests_v1`. | Entire local data layer; not permanent data source. |
| `campaigns.html`, `index.html`, eight `campaign-*.html` | Campaign copy/status/amount/progress/facts/links/images. | Public campaign UI; move dynamic campaign fields to API/CMS eventually. |
| `js/circular-gallery.js` | Static external-image campaign-like gallery entries. | Home decorative gallery; decide whether it should consume campaigns. |
| `donation-details.html`, home/about/how/resources/legal | Static organization copy, statistics, claims/contact/legal information. | Static unless business elects managed content. |
| `js/receipt.js` | Organization registration/tax/address/signatory receipt content. | Legal receipt output; requires confirmed authoritative source before production. |
| `admin.html`/`js/admin.js` | UI labels/status set and dynamically calculated local counts. | Needs request API; statuses are currently hardcoded. |

## 9. Data models implied by the frontend

### A. Directly observed

| Entity | Fields/relationships |
|---|---|
| User | `id`, `full_name` (120), `email` (254), `phone` (32), current mock `password_hash`, `role` (`admin`/`donor` observed), `created_at`, `updated_at`, optional `profile_image`. User has a Profile and donations. |
| Profile | `id`, `user_id`, `address` (300), `pan_number` (16), optional `profile_image`, optional `signature_image`, timestamps. |
| Donation | `id`, `donor_id`, optional captured donor name/email/phone, `amount` number, `currency` (`INR` seeded/default), `campaign` **name string**, `donation_date`, `payment_method`, `transaction_id`, `payment_status` (`successful|pending|failed|refunded`), `receipt_number`, timestamps. |
| Help request | Exact shape in section 6; one record has local admin workflow fields. |
| Campaign presentation record | The implicit shape in section 5. No actual data model/foreign key exists. |
| Contact submission | Fields implied by UI: first name, last name, email, message. No current model. |

### B. Reasonable backend considerations (not asserted frontend requirements)

Separate immutable payment transaction/receipt and campaign media records, a RequestDocument linked to help request, and role/permission/audit-log records are sensible where the stated future system needs them. They need not dictate public UI redesign.

### C. Unknowns requiring confirmation

Canonical campaign ID/slug and monetary targets; data ownership for static legal/content text; donor/account linking rules for gifts; tax-receipt legality and approval workflow; support-request eligibility and document access; staff roles beyond the observed `admin`/`donor`.

## 10. API/backend expectations

**Implemented:** none. Search found no HTTP call, URL/configuration, API service, environment variable, GraphQL/server action, Firebase/Supabase/Appwrite or serverless function.

### BACKEND INTEGRATION SURFACE

| Feature | Current source | Required later API/service | Entity/storage |
|---|---|---|---|
| Campaign catalogue/detail | Duplicated static HTML | Read campaigns/list/detail/media; possibly CMS publishing | Campaign and media storage |
| Donation/payment/receipt | Local DB + simulated wizard | Authenticated donation initiation, payment provider webhook/status, receipt/history | Donation/payment/receipt; no card details in app DB |
| Help request | Local DB | Create request; staff list/detail/search/update; applicant reference lookup only if chosen | HelpRequest; document storage when added |
| Help-request documents | Absent | Upload/presign/complete/download with authorization | RequestDocument + private object storage |
| Contact | Alert/reset | Create contact submission and notification workflow | ContactSubmission |
| Auth/profile | Local DB/session | Registration/login/password reset/session/user/profile/image service | Identity provider/User/Profile/private image storage |
| Admin CSV | Browser-generated all local rows | Authorized filtered export, or client export of authorized paged data | HelpRequest |

## 11. Forms and validation

| Form | Existing validation/state |
|---|---|
| Donation wizard | Amount ≥1 native/custom check; name min 2, email, phone pattern, mock card number/expiry/CVV/cardholder and mandatory consent. Per-step state; no loading/failure/payment state. Creates local “successful” donation. |
| Modal donation | Custom amount >0 and consent toggle; `processDonation` shows an alert only. |
| Login/register/forgot | See auth module: registration email/phone/terms/password (8+, upper/lower/digit, match); login lockout after five failures for 15 minutes in session storage; forgotten-password success simulation. |
| Admin login | Required email/password then local role-based login. |
| Profile | Native required name/phone; inline success/error; file validation described below; no request. |
| Help request | See section 6. Inline live status success/error; no loading. |
| Contact | See section 7. Alert success/reset only. |

## 12. File upload analysis

Only `profile.html` implements uploads. `#prof_photo` and `#prof_signature` accept `image/jpeg,image/png,image/webp`, one native-selected file each, maximum 1.5 MB in browser. Native `FileReader.readAsDataURL` previews them and supports Remove; profile photo uses a letter fallback, signature uses a placeholder. Data URLs are passed to `SwanDB.updateUser/updateProfile`; `cleanImageData` permits JPEG/PNG/WebP base64 strings ≤2,100,000 characters. No upload progress, network upload, server storage or document uploader exists. Profile signature persistence is conditional on `user.role === 'admin'` in submit logic.

## 13. Authentication and admin UI

Existing local auth is `SwanAuth`. It registers only `donor`, compares plaintext password values in the browser, creates an eight-hour `{user_id, logged_at, expires_at}` session in `localStorage` (remember) or `sessionStorage`, offers simulated reset, and checks roles client-side. `dashboard.html` requires donor; `profile.html` only checks logged-in user; `admin.html` requires admin. Admin login redirects from `/admin-login.html` to `/adminlogin/`. There is no token/JWT/cookie/server session, OAuth, email delivery, password-reset token, rate limiter outside current browser, or permission system. The repo contains no separate `manage.swanturbinesfoundation.com` developer/super-admin application; `admin.html` is the only administrator UI observed.

## 14. Design system and responsive design

Defined primarily in `css/style.css`: navy/deep blue (`#051d38`, `#0a3663`), bright blue (`#0066ff`), white/off-white backgrounds, slate/gray text/borders, and occasional warm campaign imagery. Roboto Flex is imported; Figtree/system fonts appear in later admin rules. Repeated shapes use rounded cards (roughly 14–32px and pills at 999px), soft shadows, grid/flex layouts, dark/navy primary buttons, white cards, and inline SVG/icons/text glyphs. Animations are CSS fade/transform/transitions plus custom gallery/text effects. There is no dark-mode mechanism.

Responsive CSS employs media queries including `max-width:1024px` and `max-width:768px` (and additional page-specific responsive rules in the stylesheet). Cards/grids collapse, admin grid becomes one column, the side dock becomes horizontal/scrolled, navigation uses the mobile menu, and form grids/images reflow. Exact behavior is CSS-class/page dependent rather than a tokenized breakpoint system.

## 15. Performance, SEO, accessibility

**SEO/performance existing:** standard viewport meta tags; titles per page (with inconsistent legacy branding); `request-help.html` has a description meta. Favicon is local. No robots.txt, sitemap, Open Graph/Twitter metadata, canonical tags, manifest, image optimization pipeline, lazy-loading attributes, bundling, route/code splitting, preloading or caching headers are present. Local images are direct `<img>` assets and several images are direct Unsplash URLs.

**Accessibility observed:** many meaningful images have `alt`; page headers/nav landmarks and some `aria-label`, `aria-controls`, `aria-expanded`, `aria-live`, dialog `role`/`aria-modal`, required native form controls and associated label wrapping are used. Gaps: duplicated button navigation rather than links, numerous missing explicit accessible labels/semantics in legacy forms, modal focus trapping/return focus not evidenced, alert-based status, dynamically generated content focus behavior, no observed skip link, and no contrast audit/test. Keyboard operability/contrast must be verified in a browser.

## 16. Security-relevant frontend findings

- `js/db.js` ships plaintext mock administrator and donor credentials (`password_hash` is misnamed) to every browser. Treat them as exposed demonstration values; never reuse or ship equivalent production credentials.
- User/profile/donation/help-request records, including address, PAN, phone, email and request narratives, reside in readable/modifiable browser local storage. Client checks do not protect them.
- Authentication/authorization is entirely client-side; roles/session IDs can be altered locally. Admin route hiding is not authorization.
- Request IDs and donation IDs use `Math.random`, lack collision/authorization controls, and are not safe identifiers for backend security.
- Help-request descriptions and profile images are user controlled. Admin/receipt code escapes text before `innerHTML`, a positive local safeguard, but backend must validate/sanitize and authorize all data/objects.
- Payment fields are a demo only. Do not route card data through a custom backend; use a PCI-compliant provider flow.
- Unsplash and Google Fonts are third-party network resources; their privacy/CSP implications need decisions.
- Receipt code embeds organization/tax/registration/signatory details in client source and calls an output “legally compliant”; backend/legal validation is required before production issuance.

## 17. Environment, deployment, and Git

No `.env` file, environment-variable reference, hosting configuration, production command, port, domain deployment config, package scripts, or CI config is present. External/public references include Google Fonts and Unsplash; domain context appears only in `audit.md`, not runtime configuration. The project can be served by any static host, but no host is evidenced.

Git inspection: the working directory is **not a Git repository** (`git status`, history, and remotes all return that error). Therefore branch/history/remote/tracked-env-file questions cannot be determined. No root `.gitignore` was found; only `.agent-cache/.gitignore` exists. No secret values are reproduced in this document beyond the security finding category; inspect source under controlled remediation separately.

## 18. Frontend ↔ backend integration map

| Frontend feature | Current implementation/source | Future backend requirement/API | Entity/storage | Notes |
|---|---|---|---|---|
| Campaigns | Static HTML, duplicate detail pages | `GET` list/detail/media | Campaign/media | Need canonical ID/slug mapping before replacing routes. |
| Donation | Local wizard + `SwanDB` | Donation checkout/payment status/webhook/history/receipt | Donation/payment/receipt | Current campaign association is a name string only. |
| Help | Local `SwanDB.createHelpRequest` | Create/list/detail/update/export APIs | HelpRequest | Keep success reference behavior. |
| Request documents | Not implemented | Authorized private upload/read APIs | RequestDocument/private object storage | Requires frontend fields/step design. |
| Contact | Alert + reset | Create contact submission/notify | ContactSubmission | Inputs need names/clear payload contract. |
| Donor auth/profile | Local records/session/data URLs | Secure identity/session/profile/image APIs | User/Profile/storage | Replace all local auth guards. |
| Admin help center | Local filters/modals/CSV | Staff RBAC, query/update/export | HelpRequest/audit log | Current UI supports four status strings. |

## 19. Do-not-touch list for backend work

- `css/style.css`, `js/circular-gallery.js`, `js/circular-text.js`, `js/text-loop.js` and static visual assets.
- Shared headers, mobile menus, footers, hero/CTA/marketing/leadership/legal content in public HTML.
- Campaign page visual layout, card classes, detail-page structure, donation/receipt presentation and admin dashboard presentation.

Modify `js/db.js`, `js/auth.js`, `js/admin.js`, `js/main.js` action handlers and narrowly targeted page scripts/forms only when integration necessitates it; preserve their DOM IDs/classes where practical.

## 20. Frontend changes eventually required (do not implement now)

### Required for backend integration

- Replace `SwanDB` reads/writes and local auth/session mechanics with authenticated API calls/state handling.
- Replace hardcoded campaign catalogue/detail data with API data while maintaining current card/detail UI; introduce a canonical campaign identifier.
- Connect help-request create/admin list/detail/status/note flows; retain returned request ID in success UI.
- Add the planned help fields and document-upload UI/API if the stated workflow is adopted.
- Connect contact form and add stable field names, submit/loading/error/success handling.
- Replace simulated donation/payment/receipt flow with provider-safe checkout/status/receipt data.
- Wire profile media to authorized storage and remove browser data URLs/local PAN storage.

### Optional improvements

- Add campaign filters/sort/pagination only if product requires them; current UI has none.
- Add SEO metadata/sitemap/robots, managed content, better accessible modal focus/error descriptions, and consistency cleanup of legacy branding/currency/content.

### Not necessary solely for backend integration

- Redesign the global CSS, campaign visual design, marketing-page structure, decorative animations, or static legal pages.

## 21. UNKNOWN_OR_REQUIRES_DECISION

- Canonical campaign IDs, slugs, source of truth, target amounts, dates, locations, categories and which current display values are accurate.
- Whether campaign details remain eight static routes or become one parameterized route.
- Required help-request fields versus the planned workflow; city/state, beneficiary count, assistance amount format and final support/urgency enums.
- Storage provider, allowed types/count/size, malware scanning, retention, privacy/access policy and staff authorization for sensitive request documents/PAN/profile images.
- Identity provider, admin/developer roles/permissions, approval/audit requirements, session duration and password/reset/notification policy.
- Payment provider, payment state lifecycle, webhook ownership, donor anonymity/guest policy, refund process and authoritative receipt/tax/legal requirements.
- Email/SMS provider, notifications/SLAs for help/contact/donation, request reference lookup rules, and data retention/deletion obligations.
- Hosting, domains, CDN/CSP, environment/secrets management, analytics, backups and deployment workflow.

## 22. Audit conclusion

The codebase is a static UI prototype with a reasonably extensive browser-local simulation for donor, donation, profile and help-request experiences. Backend work can preserve the current interface if it first establishes canonical data contracts—especially campaigns, request/document workflow, identity/RBAC and payment/receipt lifecycle—and replaces the local-only data/auth modules incrementally. No backend/database integration currently exists.
