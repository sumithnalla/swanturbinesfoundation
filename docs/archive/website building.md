# SWAN TURBINES FOUNDATION
## Complete Production Implementation Specification
### Public Website + Foundation Admin + WEBSITTER Management System

---

# 0. ROLE AND MISSION

You are the primary engineering agent responsible for taking the existing SWAN TURBINES FOUNDATION frontend prototype and turning it into a complete production-ready charity management platform.

The system belongs to:

**SWAN TURBINES FOUNDATION**

Public website:

`swanturbinesfoundation.com`

Foundation administration:

`admin.swanturbinesfoundation.com`

WEBSITTER developer/super-admin:

`manage.swanturbinesfoundation.com`

WEBSITTER is the development company responsible for the technical implementation.

The human operator does NOT want to manually perform infrastructure, database, deployment, Git, configuration, migration, or setup work unless absolutely unavoidable.

Your responsibility is therefore to perform as much of the complete implementation as technically possible through:

- Terminal
- CLI
- Git
- GitHub CLI
- Cloudflare CLI/Wrangler
- Render CLI/API where applicable
- MongoDB tooling
- Python tooling
- package managers
- scripts
- automated verification
- automated testing

Do not unnecessarily ask the human to manually configure things that can be performed through CLI/API.

If a provider requires an unavoidable browser authorization, payment activation, identity verification, DNS approval, or other human-only action, stop only at that exact point, document it clearly, and continue automatically once the dependency becomes available.

---

# 1. ABSOLUTE OPERATING RULES

These rules apply throughout the entire project.

## 1.1 Do not blindly modify the existing frontend

The existing frontend has already been designed by another frontend developer.

The frontend audit is available in:

`FRONTEND_INFO.md`

Treat that file as the authoritative technical description of the existing frontend.

Before modifying any frontend code:

1. Inspect the relevant source.
2. Understand the existing DOM structure.
3. Preserve existing IDs/classes where practical.
4. Preserve visual design.
5. Preserve responsive behavior.
6. Preserve existing animations and components unless there is a real reason to change them.
7. Make the smallest integration changes necessary.

Do not redesign the website merely because you would personally implement it differently.

---

# 1.2 Never create two sources of truth

The database must eventually become the authoritative source for dynamic data.

Do NOT permanently maintain:

Frontend hardcoded campaign data
+
Database campaign data

Instead:

Existing hardcoded data should be treated as prototype/reference/seed data.

Once the backend is integrated:

Frontend
→ API
→ backend
→ database

The database becomes the source of truth.

---

# 1.3 Never store business logic directly in the frontend

The frontend must not be trusted for:

- authorization
- role checks
- request approval
- permissions
- document access
- user management
- audit logging
- sensitive status changes
- security decisions

The frontend can hide/show UI.

The backend must enforce every security decision.

---

# 1.4 Build for replacement of infrastructure

The architecture MUST NOT tightly couple business logic to:

- MongoDB
- GridFS
- Render
- Cloudflare Pages
- Resend
- any specific email provider
- any specific storage provider

The current infrastructure is:

Frontend:
HTML/CSS/vanilla JavaScript

Frontend hosting:
Cloudflare Pages

Backend:
Python

Backend hosting:
Render

Database:
MongoDB Atlas

Large-file storage:
MongoDB GridFS

Email:
Resend

Version control:
GitHub

Authentication/password hashing:
secure bcrypt-compatible implementation through Passlib/bcrypt or the currently recommended secure equivalent compatible with the selected Python stack.

However, future migrations may include:

MongoDB
→ Supabase

GridFS
→ Supabase Storage

Render
→ Supabase Edge Functions / another backend provider

Cloudflare Pages
→ Vercel / Netlify / another static frontend provider

HTML/CSS/JS
→ React/Vite

or

HTML/CSS/JS
→ Next.js

The application architecture must make these migrations manageable.

Use appropriate architectural boundaries such as:

- API layer
- service/business layer
- repository/data-access layer
- storage abstraction
- email abstraction
- authentication abstraction
- configuration layer

Business logic must not be scattered throughout MongoDB-specific code.

---

# 1.5 Do not prematurely build future features

The architecture must support future features, but DO NOT implement features that are not currently required.

Future possibilities include:

- Donations
- Payment processing
- Blogs
- Events
- Volunteers
- User request tracking
- Applicant accounts
- Notifications
- SMS
- newsletters
- analytics
- reporting
- additional CMS functionality
- additional foundation programs

Do not build these now unless explicitly required by the current specification.

Build the foundation that makes them easy to add later.

---

# 1.6 Security takes priority over convenience

This system handles potentially sensitive information.

Never treat:

- Aadhaar/ID
- medical documents
- income documents
- bills
- phone numbers
- addresses
- request narratives
- email addresses
- profile information

as public data.

Sensitive data must have appropriate authorization controls.

Never expose private documents through predictable public URLs.

Never trust IDs supplied by the browser.

Never rely on frontend role checks.

---

# 2. EXISTING FRONTEND — AUTHORITATIVE FINDINGS

The current frontend is a static HTML/CSS/vanilla-JavaScript application.

The audit reports:

- 26 HTML entry points
- no framework
- no package.json
- no real backend
- no database
- no API
- localStorage mock database
- local client-side authentication
- static campaign content
- local help-request storage
- simulated donation functionality

The audit also identifies the existing public pages and their responsibilities.

Important existing pages include:

`index.html`

`campaigns.html`

`campaign-hunger.html`

`campaign-relief.html`

`campaign-education.html`

`campaign-water.html`

`campaign-medical.html`

`campaign-women.html`

`campaign-eco.html`

`campaign-nutrition.html`

`request-help.html`

`contact.html`

`donate.html`

`login.html`

`dashboard.html`

`profile.html`

`admin.html`

`adminlogin/index.html`

and static/legal pages.

The current frontend audit must be inspected before making implementation decisions.

---

# 3. PUBLIC WEBSITE SCOPE

## 3.1 Pages that should remain largely untouched

Do not unnecessarily modify:

- About
- How it works
- Resources
- Donation details
- Terms
- Privacy Policy
- Refund Policy
- shared visual system
- decorative animations
- static leadership sections
- general marketing content

unless integration genuinely requires a change.

---

# 3.2 Public pages requiring backend integration

The primary current public integration scope is:

### A. Homepage

`index.html`

The featured campaign section should eventually retrieve campaign data from the backend.

The rest of the homepage should remain static unless specifically required.

---

### B. Campaign listing

`campaigns.html`

Campaigns must come from the backend/database.

The database is authoritative.

Existing campaign markup is prototype/reference content and may be migrated into seed data.

Do not maintain hardcoded campaigns as a second permanent data source.

---

### C. Campaign details

The current frontend contains eight independent campaign detail pages.

The final architecture should support canonical campaign identifiers/slugs.

Prefer a scalable model where future campaigns do not require manually creating a new HTML file.

Possible implementation:

`campaign.html?slug=...`

or another static-compatible parameterized mechanism.

The exact implementation must preserve the existing visual design while allowing an arbitrary number of database-driven campaigns.

---

### D. Request Help

`request-help.html`

This is a core backend integration.

The existing one-step prototype must become the planned three-step workflow.

---

### E. Contact

`contact.html`

The current alert/reset behavior must become real backend submission and notification functionality.

---

# 4. REQUEST HELP — FINAL BUSINESS REQUIREMENT

The public Request Help workflow must contain three steps.

## STEP 1 — Applicant Information

Fields:

- Full Name *
- Mobile Number *
- Email
- Address *
- City *
- State *

Validate appropriately on both frontend and backend.

Never rely only on browser validation.

---

# STEP 2 — Request Information

Support type:

- Medical
- Education
- Food
- Housing
- Emergency
- Community Development
- Other

Fields:

- Support type *
- Description *
- Number of people who will benefit *
- Amount / assistance required *
- Urgency *

Urgency:

- Normal
- Urgent
- Emergency

The exact final database/API enum values should be normalized consistently.

Do not retain inconsistent prototype values such as:

`medium`

`low`

`high`

`critical`

unless there is a documented business reason.

---

# STEP 3 — DOCUMENTS

Applicants must be able to submit whatever documents they have that may help the foundation evaluate their request.

Examples:

- Aadhaar / ID
- Medical documents
- Bills
- Income documents
- Photos
- Supporting documents

Do not force applicants to upload every category.

Documents are optional unless a specific future business rule explicitly requires otherwise.

The system should support multiple uploaded files.

Each file must have metadata such as:

- document ID
- request ID
- original filename
- MIME type
- size
- upload timestamp
- storage reference
- category if supplied
- upload status
- uploader/context metadata where appropriate

Actual file bytes must be stored through the chosen storage abstraction using MongoDB GridFS in the current implementation.

Do not expose GridFS implementation details to the frontend.

---

# 5. REQUEST SUBMISSION

After successful submission:

1. Persist applicant information.
2. Persist request information.
3. Persist document metadata.
4. Store uploaded documents securely.
5. Generate a durable public request reference.
6. Return the reference to the frontend.
7. Display the reference on a dedicated success/thank-you state/page.

Do NOT use:

`Math.random()`

as the authoritative request ID generator.

Separate:

Internal database identifier

from:

Public request reference.

Example format:

`STF-2026-000184`

The exact implementation may differ, but references must be unique and durable.

---

# 6. REQUEST STATUS

Initial request status should be defined centrally.

Use a consistent state machine.

At minimum support:

- Pending
- Accepted
- Rejected

If an internal review state is useful, it may also support:

- Under Review

Do not create arbitrary status values in different parts of the application.

Define them once and use them everywhere.

Document all allowed state transitions.

---

# 7. FOUNDATION ADMIN APPLICATION

Domain:

`admin.swanturbinesfoundation.com`

This application is for SWAN TURBINES FOUNDATION staff.

Expected user count is approximately 6–8 initially, but the architecture must support growth.

---

# 8. ADMIN AUTHENTICATION

Build secure authentication.

Required:

- Login
- Logout
- Session handling
- Password hashing
- Password reset architecture
- Account status
- failed login handling
- appropriate rate limiting
- secure password policies
- secure cookies/tokens according to chosen architecture
- backend authorization

Never store plaintext passwords.

Never store passwords in frontend code.

Never ship demo credentials.

The existing local authentication must be replaced.

---

# 9. ADMIN PROFILE

Admin users should have:

- profile
- name
- email
- role
- account information
- logout
- appropriate account-management functionality

Sensitive account changes should be audited.

---

# 10. ADMIN DASHBOARD

Provide an overview containing useful operational information.

At minimum consider:

- total requests
- pending requests
- accepted requests
- rejected requests
- urgent/emergency requests
- active campaigns
- completed campaigns

Counts must come from backend data.

Do not hardcode dashboard statistics.

---

# 11. ADMIN CAMPAIGNS

Foundation staff should be able to:

- view campaigns
- search
- filter
- sort
- create campaigns
- edit campaigns
- change campaign status
- view campaign details
- manage campaign content
- manage campaign images/media
- publish/unpublish where applicable

Campaign architecture must support future expansion.

A campaign should have a stable internal ID and canonical slug.

Do not identify campaigns only by display title.

---

# 12. ADMIN REQUEST MANAGEMENT

Staff must be able to:

- view all requests
- search
- filter
- sort
- view individual request
- view applicant information
- view request information
- view submitted documents
- download authorized documents
- change request status
- add internal notes where appropriate
- see timestamps
- see request reference

All sensitive request access must be authorized server-side.

---

# 13. EMAIL FROM ADMIN

Admin staff must be able to send email to applicants from the application.

Use:

**Resend**

Do not expose Resend API keys to the frontend.

Email functionality must exist behind the backend.

Log important outbound email events appropriately without storing unnecessary sensitive content.

---

# 14. WEBSITTER MANAGEMENT APPLICATION

Domain:

`manage.swanturbinesfoundation.com`

This is not the same thing as the foundation staff admin panel.

It is the technical/super-admin platform used by WEBSITTER.

---

# 15. MANAGEMENT FEATURES

WEBSITTER management users should be able to manage:

- foundation admin users
- WEBSITTER users
- roles
- permissions
- account status
- access
- audit logs
- system-level administration

The management system should inherit appropriate functionality from the foundation admin system where practical.

Do not duplicate business logic.

Use shared backend services.

---

# 16. RBAC

Implement proper Role-Based Access Control.

Do not hardcode:

```text
if email == ...
```

or:

```text
if user == admin
```

throughout the application.

Create a centralized authorization system.

The architecture should support:

Roles

→ Permissions

→ Resources/actions

Examples:

- campaigns.read
- campaigns.create
- campaigns.update
- campaigns.delete
- requests.read
- requests.update_status
- requests.view_documents
- requests.export
- users.create
- users.update
- users.disable
- audit.read

The exact permission set should be designed based on actual features.

Keep the model extensible.

---

# 17. AUDIT LOGGING

The system must maintain audit records.

Record important events such as:

- successful login
- failed login
- logout where useful
- password/account changes
- campaign creation
- campaign update
- campaign deletion
- campaign status change
- request status change
- request note changes
- document access where appropriate
- user creation
- user modification
- permission changes
- account disable/enable
- important administrative actions

Audit entries should include where appropriate:

- timestamp
- actor/user ID
- action
- resource type
- resource ID
- result
- IP address where appropriate
- user agent where appropriate
- metadata necessary for accountability

Do not store passwords or sensitive secrets in audit logs.

Audit logs must be append-oriented and protected from ordinary users.

---

# 18. DATABASE ARCHITECTURE

Use:

**MongoDB Atlas**

MongoDB terminology:

Database
→ collections
→ documents
→ fields

Do not model this as SQL tables/rows unnecessarily.

The exact collection structure must be finalized after analyzing all requirements.

Likely core domains include:

- users
- roles
- permissions
- campaigns
- help_requests
- request_documents
- contact_submissions
- audit_logs
- sessions/tokens where required

Future domains should be easy to add.

---

# 19. DATABASE DESIGN PRINCIPLES

Use:

- stable internal IDs
- appropriate indexes
- timestamps
- schema validation where appropriate
- normalized references where useful
- carefully selected denormalization where it improves performance
- unique constraints where required
- pagination
- search indexes where appropriate
- status indexes
- compound indexes based on actual query patterns

Do not create arbitrary collections just because they sound scalable.

Every collection must have a documented purpose.

---

# 20. DATABASE ABSTRACTION

Do not scatter MongoDB queries throughout route handlers.

Prefer architecture conceptually similar to:

```text
API route
    ↓
Service
    ↓
Repository interface
    ↓
MongoDB repository
```

For example:

```text
CampaignService
      ↓
CampaignRepository
      ↓
MongoCampaignRepository
```

Future:

```text
CampaignService
      ↓
CampaignRepository
      ↓
SupabaseCampaignRepository
```

The business layer should not need to be rewritten merely because the database provider changes.

---

# 21. GRIDFS ARCHITECTURE

Use MongoDB GridFS for the current file-storage implementation.

Do not make frontend code aware of GridFS.

Create a storage abstraction.

Conceptually:

```text
DocumentService
      ↓
StorageProvider
      ↓
GridFSStorageProvider
```

Future:

```text
DocumentService
      ↓
StorageProvider
      ↓
SupabaseStorageProvider
```

The application should not require a major rewrite when storage changes.

---

# 22. FILE SECURITY

Implement appropriate controls for uploaded documents.

At minimum consider:

- file size limits
- allowed MIME types
- extension validation
- filename normalization
- random internal storage names/IDs
- private storage
- authorization before download
- authorization before deletion
- upload validation
- metadata validation
- protection against malicious file names
- content-type spoofing
- malware scanning architecture/extension point
- retention/deletion architecture

Do not trust client-provided MIME types.

Do not expose raw storage identifiers unnecessarily.

---

# 23. EMAIL ARCHITECTURE

Use:

**Resend**

Create an email abstraction.

Conceptually:

```text
Application
    ↓
EmailService
    ↓
ResendProvider
```

Future provider replacement should be possible.

Email templates should not be scattered across random route handlers.

Potential current emails:

- help request acknowledgement
- admin notification of new request
- status-change notification
- admin-to-applicant email
- contact notification
- password reset
- account invitation

Only implement the currently required emails.

---

# 24. CONTACT SYSTEM

`contact.html` must submit real data.

Store a contact submission.

Send the appropriate notification through Resend.

Provide:

- validation
- success state
- loading state
- failure state
- anti-spam/rate-limit considerations

Do not rely on a JavaScript alert as the actual success mechanism.

---

# 25. PUBLIC CAMPAIGN ARCHITECTURE

Campaigns must be database-driven.

At minimum design support for:

- internal ID
- slug
- title
- description
- short description
- status
- category
- image/media
- display order where needed
- featured flag
- created timestamp
- updated timestamp

Additional fields may be added based on the existing UI and future requirements.

Do not invent financial fields unless the foundation actually needs them.

The current frontend contains progress/amount information, but the audit specifically identifies inconsistencies and missing canonical definitions.

Do not blindly import inconsistent values.

Mark uncertain campaign business fields as requiring confirmation.

---

# 26. CAMPAIGN SEED DATA

The existing eight campaigns may be migrated into development/seed data.

The seed process must be:

- repeatable
- deterministic
- documented
- safe
- environment-aware

Do not manually duplicate campaign information in multiple places.

The frontend's hardcoded campaign markup becomes reference/seed material, not a permanent data source.

---

# 27. FRONTEND INTEGRATION RULES

Use the existing HTML/CSS/JS frontend.

Do NOT migrate it to:

- React
- Vite
- Next.js
- Vue
- Angular

during this implementation.

Use vanilla JavaScript and existing HTML/CSS.

Bootstrap or another lightweight frontend library may be introduced only if there is a concrete reason and it does not unnecessarily disrupt the existing design.

Prefer minimal dependencies.

---

# 28. FRONTEND API CLIENT

Create a clean API client layer.

Do not scatter:

```javascript
fetch(...)
```

through every HTML file.

Prefer a reusable API abstraction.

Conceptually:

```text
js/api/
    client.js
    campaigns.js
    requests.js
    contact.js
    auth.js
```

The exact structure may differ.

The goal is:

Frontend UI
→ API client
→ backend

rather than:

Frontend UI
→ direct implementation details everywhere.

---

# 29. PUBLIC FRONTEND DATA FLOW

Campaign:

```text
Campaign page
    ↓
API client
    ↓
GET /campaigns
    ↓
Python backend
    ↓
Campaign service
    ↓
Campaign repository
    ↓
MongoDB
```

Request:

```text
Request form
    ↓
validation
    ↓
API client
    ↓
POST request
    ↓
Python backend
    ↓
Request service
    ↓
MongoDB
    +
GridFS
```

Contact:

```text
Contact form
    ↓
POST /contact
    ↓
Backend
    ↓
MongoDB
    +
Resend
```

---

# 30. DONATION SYSTEM

The current frontend contains a simulated donation system.

Do NOT implement real payment processing in the current scope unless explicitly activated later.

However:

- do not destroy the existing UI
- keep architecture extensible
- do not store card information
- do not build custom payment processing
- design future donation architecture so a PCI-compliant provider can be integrated later

The backend architecture must not assume that donations will never exist.

---

# 31. FUTURE REQUEST TRACKING

Do not implement a public request-tracking portal now.

However, the request architecture must support it later.

The public request reference should therefore be durable and unique.

Future:

```text
Applicant
   ↓
Enter request reference
   ↓
GET request status
   ↓
Backend
   ↓
HelpRequest
```

Do not expose sensitive applicant information through a simple guessable reference.

Future tracking must include appropriate verification/authentication.

---

# 32. API DESIGN

Build RESTful APIs with consistent conventions.

Use:

- correct HTTP methods
- meaningful status codes
- consistent response structure
- consistent error structure
- validation
- authentication
- authorization
- pagination
- filtering
- sorting
- search
- versioning strategy

Prefer a versioned API boundary such as:

`/api/v1/...`

unless there is a compelling architectural reason not to.

Do not prematurely create dozens of unused endpoints.

---

# 33. ERROR HANDLING

Create consistent backend errors.

Do not return stack traces or internal exceptions to public users.

Errors should distinguish:

- validation failure
- authentication failure
- authorization failure
- not found
- conflict
- rate limited
- internal server error

Log technical details securely on the backend.

Return safe messages to clients.

---

# 34. LOGGING

Create structured application logging.

Log:

- application errors
- important backend events
- authentication events
- integration failures
- storage failures
- email failures
- database failures

Do not log:

- passwords
- tokens
- full sensitive documents
- card information
- unnecessary personal data

---

# 35. ENVIRONMENT CONFIGURATION

Use environment variables for secrets/configuration.

Examples include:

- MongoDB connection string
- Resend API key
- JWT/session secret if applicable
- CORS configuration
- frontend URL
- backend URL
- storage configuration
- environment name

Never commit real secrets.

Create safe example configuration files such as:

`.env.example`

without real credentials.

---

# 36. CORS

Configure CORS correctly.

The production backend should allow only required origins, including:

`https://swanturbinesfoundation.com`

and appropriate admin/manage origins.

Do not use:

`*`

for authenticated production APIs unless there is a documented reason.

Development origins may be supported through environment-specific configuration.

---

# 37. CLOUDflare FRONTEND

Use Cloudflare Pages for the current frontend hosting architecture.

The frontend should remain deployable as static assets.

Use Wrangler/Cloudflare tooling where appropriate.

The deployment must be reproducible.

Document:

- project
- build/output settings
- domain mapping
- environment variables if any
- production URL
- preview/development workflow

---

# 38. RENDER BACKEND

Deploy the Python backend to Render.

Do not allow frontend code to depend on Render-specific behavior.

The backend should behave as a normal HTTP API.

Document:

- build command
- start command
- environment variables
- health check
- production URL
- deployment configuration

Create a health endpoint such as:

`/health`

that verifies application availability without exposing secrets.

---

# 39. GITHUB

Create/initialize Git repository as necessary.

Use GitHub as the source of truth for source code.

Establish:

- meaningful branch structure
- `.gitignore`
- README
- environment examples
- commit history
- deployment documentation
- architecture documentation

Do not commit:

- `.env`
- passwords
- API keys
- private credentials
- generated sensitive files
- user documents
- production database dumps

---

# 40. TESTING REQUIREMENTS

Testing is mandatory.

At minimum create appropriate tests for:

### Backend

- authentication
- authorization
- user creation
- permissions
- campaigns
- campaign CRUD
- request creation
- request validation
- request status changes
- document authorization
- contact submission
- audit logging
- error handling

### Frontend integration

- campaign retrieval
- campaign rendering
- request multi-step flow
- request submission
- request reference display
- document upload
- contact submission
- authentication flows

### Security

- unauthorized API access
- role escalation attempts
- document access by wrong user
- invalid IDs
- malformed input
- rate limits where implemented
- authentication bypass attempts

---

# 41. FIVE-PHASE IMPLEMENTATION MODEL

The project MUST be completed in exactly five major implementation phases unless a documented engineering reason requires restructuring.

A phase is NOT complete until every checkpoint in that phase passes.

Never proceed to the next phase while required checkpoints are failing.

---

# PHASE 1 — FOUNDATION, REPOSITORY, ARCHITECTURE AND INFRASTRUCTURE

## Objective

Create the engineering foundation without breaking the existing frontend.

### Tasks

1. Inspect complete repository.
2. Read `FRONTEND_INFO.md`.
3. Identify all existing frontend files.
4. Initialize Git if necessary.
5. Create GitHub repository/configuration if credentials/access permit.
6. Establish project structure.
7. Establish Python backend structure.
8. Establish frontend integration structure.
9. Establish configuration/environment system.
10. Establish documentation.
11. Establish architecture boundaries.
12. Establish API versioning.
13. Establish health endpoint.
14. Establish local development workflow.
15. Establish production configuration placeholders.
16. Establish test framework.
17. Establish lint/format tooling where appropriate.
18. Establish state/resume system.

### Architecture requirement

The codebase should clearly separate:

```text
API
Business Services
Repositories
Models/Schemas
Authentication
Authorization
Storage
Email
Audit
Configuration
```

### Phase 1 checkpoints

Do NOT leave Phase 1 until:

- repository is valid
- Git works
- project structure is documented
- frontend still works
- backend starts
- health endpoint works
- tests execute
- configuration works
- no secrets are committed
- architecture documentation exists
- `.env.example` exists
- deployment configuration is documented
- state tracking system exists

Run automated verification.

Record results.

---

# PHASE 2 — DATABASE, AUTHENTICATION, RBAC, STORAGE AND CORE SERVICES

## Objective

Build the secure backend foundation.

### Tasks

1. Connect MongoDB Atlas.
2. Create database configuration.
3. Create collections/models.
4. Create indexes.
5. Create repository layer.
6. Create service layer.
7. Implement authentication.
8. Implement secure password hashing.
9. Implement sessions/tokens.
10. Implement password reset architecture.
11. Implement RBAC.
12. Implement roles.
13. Implement permissions.
14. Implement user management foundation.
15. Implement GridFS abstraction.
16. Implement GridFS storage provider.
17. Implement file metadata.
18. Implement secure file access.
19. Implement audit logging.
20. Implement application logging.
21. Implement validation.
22. Implement consistent API errors.

### Initial user types

Support at least the concepts of:

- foundation admin/staff
- WEBSITTER management/developer

The exact role/permission matrix must be centrally defined.

Do not assume every admin has every permission.

### Phase 2 checkpoints

All of the following must pass:

- MongoDB connection
- repository tests
- database indexes
- user creation
- password hashing
- login
- logout
- invalid login
- session expiration
- role authorization
- permission authorization
- unauthorized request rejection
- audit record generation
- GridFS upload
- GridFS retrieval
- GridFS authorization
- file metadata persistence
- validation
- error handling
- automated tests
- security tests

Only after all pass can Phase 3 begin.

---

# PHASE 3 — BUSINESS FEATURES

## Objective

Build the actual charity management functionality.

This phase includes:

### A. Campaign system

Build:

- campaign model
- campaign CRUD
- slug
- status
- category
- featured
- media
- public read API
- admin management
- search
- filtering
- sorting
- pagination

### B. Help Request system

Build:

- applicant
- request
- status
- request reference
- notes
- search
- filtering
- sorting
- pagination
- admin review
- status updates
- document association

### C. Document system

Build:

- multiple files
- GridFS storage
- metadata
- authorization
- download
- appropriate deletion rules
- secure references

### D. Contact system

Build:

- contact submission
- database persistence
- validation
- Resend integration
- admin notification

### E. Email system

Implement required current emails.

### Phase 3 checkpoints

Campaign:

- create
- read
- update
- status
- search
- filter
- sort
- pagination
- public API

Requests:

- submit
- validation
- request ID
- status
- notes
- admin retrieval
- filtering
- searching
- sorting
- pagination

Documents:

- upload
- metadata
- authorization
- download
- multiple files

Contact:

- submission
- persistence
- notification
- error handling

Email:

- successful delivery invocation
- failure handling
- no exposed API key

Every important action generates the appropriate audit event.

Only after all business-feature tests pass may Phase 4 begin.

---

# PHASE 4 — ADMIN, MANAGE AND PUBLIC FRONTEND INTEGRATION

## Objective

Connect all interfaces to the production backend.

## A. Public website

Integrate:

### Homepage

Dynamic featured campaigns.

### Campaign listing

Dynamic campaign API.

### Campaign details

Dynamic canonical campaign retrieval.

### Request Help

Three-step workflow.

### Documents

Real upload.

### Success

Real durable request reference.

### Contact

Real API submission and notification.

Preserve visual design.

### Do not implement now

Real donations/payment processing unless explicitly activated.

---

# B. Foundation Admin

Build:

- login
- dashboard
- campaigns
- campaign CRUD
- requests
- request details
- documents
- status changes
- notes
- filtering
- sorting
- searching
- pagination
- email applicant
- profile
- logout

All backend authorization must be enforced.

---

# C. WEBSITTER Manage

Build:

- login
- dashboard
- foundation-admin management
- developer management
- role management
- permission management
- account status
- audit logs
- system overview
- secure logout

Do not duplicate backend business logic from Admin.

---

# Phase 4 checkpoints

Public:

- campaigns load from database
- campaign detail works
- homepage featured campaigns work
- help workflow works
- document upload works
- request reference appears
- contact works
- responsive UI still works

Admin:

- login
- authorization
- dashboard
- campaign management
- request management
- document access
- applicant email
- profile/logout

Manage:

- user management
- developer management
- RBAC
- audit logs

Security:

- unauthorized users blocked
- wrong roles blocked
- documents protected
- admin endpoints protected
- manage endpoints protected

Do not proceed until all pass.

---

# PHASE 5 — PRODUCTION, DEPLOYMENT, SECURITY, QA AND HANDOVER

## Objective

Move the entire platform into a verified production-ready state.

### Tasks

1. Configure production MongoDB Atlas.
2. Verify indexes.
3. Configure GridFS.
4. Configure Resend.
5. Configure Render.
6. Configure Cloudflare Pages.
7. Configure domains/subdomains.
8. Configure HTTPS.
9. Configure CORS.
10. Configure environment variables.
11. Configure GitHub.
12. Configure deployment.
13. Configure health checks.
14. Run full automated test suite.
15. Run security tests.
16. Run frontend integration tests.
17. Run manual browser smoke tests if browser tooling is available.
18. Verify mobile.
19. Verify desktop.
20. Verify document access.
21. Verify email.
22. Verify audit logs.
23. Verify database indexes.
24. Verify backup/recovery strategy.
25. Verify production logs.
26. Verify error handling.
27. Verify no secrets in repository.
28. Verify no mock/localStorage production dependency remains for integrated functionality.
29. Verify campaign database is authoritative.
30. Verify request database is authoritative.
31. Verify production deployment.

---

# 42. FINAL PRODUCTION ACCEPTANCE TEST

The project is NOT complete until this end-to-end scenario works.

## Scenario

1. Open public website.
2. Open campaigns.
3. Campaigns load from MongoDB.
4. Open campaign detail.
5. Detail loads dynamically.
6. Open Request Help.
7. Complete Step 1.
8. Complete Step 2.
9. Upload multiple documents.
10. Submit.
11. Backend validates.
12. Request stored.
13. Documents stored in GridFS.
14. Unique request reference generated.
15. Thank-you page displays request reference.
16. Appropriate email notification is triggered.
17. Foundation admin logs in.
18. Admin sees new request.
19. Admin opens request.
20. Admin sees applicant details.
21. Admin sees request details.
22. Admin accesses authorized documents.
23. Admin changes request status.
24. Audit log is created.
25. Applicant notification is triggered if configured.
26. WEBSITTER manager logs in.
27. Manager sees audit event.
28. Manager can manage appropriate users.
29. Unauthorized account cannot perform privileged actions.
30. No sensitive information is publicly exposed.

This complete scenario must pass before declaring the project production-ready.

---

# 43. RESUMABILITY / AGENT HANDOFF SYSTEM

THIS IS MANDATORY.

The project must be designed so that if the current agent stops unexpectedly, another agent can continue without guessing.

Create and maintain:

`PROJECT_STATE.md`

This is the primary continuation document.

Also create:

`IMPLEMENTATION_PLAN.md`

`ARCHITECTURE.md`

`DECISIONS.md`

`CHECKPOINTS.md`

`KNOWN_ISSUES.md`

---

# 44. PROJECT_STATE.md REQUIREMENTS

After every meaningful task/checkpoint, update:

- Current phase
- Current checkpoint
- Completed tasks
- Tasks in progress
- Tasks remaining
- Last successful verification
- Last command executed
- Current blocker
- Files changed
- Database migrations performed
- Environment requirements
- Tests passed
- Tests failing
- Next exact action

Example:

```text
CURRENT PHASE:
Phase 3

CURRENT CHECKPOINT:
3.4 Help Request API

STATUS:
IN PROGRESS

COMPLETED:
- Request model
- Request repository
- Validation

IN PROGRESS:
- POST /api/v1/requests

REMAINING:
- integration test
- document association

LAST VERIFIED:
2026-10-03 21:42 IST

LAST SUCCESSFUL COMMAND:
pytest tests/requests/

RESULT:
18 passed

NEXT ACTION:
Implement request creation endpoint and rerun request test suite.

BLOCKERS:
None
```

---

# 45. CHECKPOINT DISCIPLINE

Every checkpoint must have:

- objective
- tasks
- verification commands
- expected result
- actual result
- status

Statuses:

`NOT_STARTED`

`IN_PROGRESS`

`BLOCKED`

`VERIFIED`

`FAILED`

Do not mark something VERIFIED because the code "looks correct."

Verification must actually run.

---

# 46. AGENT STARTUP PROCEDURE

EVERY TIME YOU START WORK:

1. Read `PROJECT_STATE.md`.
2. Read `CHECKPOINTS.md`.
3. Read `IMPLEMENTATION_PLAN.md`.
4. Read `ARCHITECTURE.md`.
5. Read `DECISIONS.md`.
6. Inspect Git status.
7. Inspect recent commits.
8. Inspect current tests.
9. Determine the last verified checkpoint.
10. Inspect the repository to confirm the state is consistent.
11. Resume from the exact unfinished checkpoint.

Do NOT restart a completed phase.

Do NOT assume previous work was correct merely because the state file says it was complete.

Verify the last checkpoint if necessary.

---

# 47. AGENT STOP PROCEDURE

Before stopping voluntarily:

1. Update `PROJECT_STATE.md`.
2. Update checkpoint status.
3. Record tests.
4. Record failures.
5. Record blockers.
6. Record next command/action.
7. Commit completed work if appropriate.
8. Ensure no half-finished destructive operation is left undocumented.

If interrupted unexpectedly, the next agent must recover using repository state + project state.

---

# 48. NO PHASE SKIPPING

Rules:

```text
Phase 1
   ↓
ALL CHECKPOINTS VERIFIED
   ↓
Phase 2
   ↓
ALL CHECKPOINTS VERIFIED
   ↓
Phase 3
   ↓
ALL CHECKPOINTS VERIFIED
   ↓
Phase 4
   ↓
ALL CHECKPOINTS VERIFIED
   ↓
Phase 5
```

If one checkpoint fails:

STOP ADVANCEMENT.

Fix it.

Retest it.

Then continue.

---

# 49. GIT COMMIT STRATEGY

Create meaningful commits.

Examples:

```text
chore: initialize project architecture

feat: add MongoDB repository layer

feat: implement authentication

feat: implement RBAC

feat: implement campaign service

feat: implement help request workflow

feat: add GridFS document storage

feat: integrate Resend

feat: integrate public campaigns

feat: integrate request help form

feat: add foundation admin

feat: add management console

test: add production acceptance tests

chore: configure production deployment
```

Do not create meaningless commits such as:

`changes`

`stuff`

`final`

`done`

---

# 50. MIGRATION STRATEGY

Database changes must be reproducible.

Do not manually modify production database structure without documentation.

Any schema/index/seed change must be recorded.

Seed data must be separate from production operational data.

Never blindly wipe production data.

---

# 51. SECURITY ACCEPTANCE CRITERIA

Before production:

- no plaintext passwords
- no production credentials in frontend
- no API keys in frontend
- no secrets in Git
- no unauthenticated admin API
- no client-only authorization
- no unauthorized document download
- no public sensitive request data
- no unrestricted CORS
- no raw exception leakage
- no insecure predictable resource authorization
- no card data storage
- no production dependency on localStorage mock database
- no production dependency on local demo credentials

---

# 52. PERFORMANCE REQUIREMENTS

Use pagination for potentially large datasets.

Do not load every request into the browser.

Do not load every audit log into the browser.

Do not load every document.

Use server-side:

- pagination
- filtering
- sorting
- search

where appropriate.

Campaign listing may be cached where useful.

Do not prematurely introduce complicated infrastructure.

---

# 53. OBSERVABILITY

Production should have:

- application logs
- error logs
- health check
- audit logs
- deployment visibility
- database monitoring where available

Sensitive information must not leak into logs.

---

# 54. DOCUMENTATION REQUIREMENTS

At completion, documentation must include:

`README.md`

`ARCHITECTURE.md`

`IMPLEMENTATION_PLAN.md`

`PROJECT_STATE.md`

`CHECKPOINTS.md`

`DECISIONS.md`

`KNOWN_ISSUES.md`

`.env.example`

Deployment documentation.

Database documentation.

API documentation.

Authentication/RBAC documentation.

Storage documentation.

Email documentation.

Recovery/troubleshooting documentation.

---

# 55. FINAL ARCHITECTURE TARGET

The final architecture should conceptually resemble:

```text
                    INTERNET
                       │
             ┌─────────┴─────────┐
             │                   │
             ▼                   ▼
       Public Website       Admin / Manage
       Cloudflare Pages      Cloudflare Pages
             │                   │
             └─────────┬─────────┘
                       │
                       │ HTTPS
                       ▼
             api.swanturbinesfoundation.com
                       │
                       ▼
                 Python Backend
                    Render
                       │
          ┌────────────┼─────────────┐
          │            │             │
          ▼            ▼             ▼
       Services     Auth/RBAC     Audit
          │
     ┌────┼───────────┐
     │    │           │
     ▼    ▼           ▼
Repository Storage   Email
     │       │         │
     ▼       ▼         ▼
 MongoDB   GridFS    Resend
 Atlas
```

The important architectural property is:

```text
UI
 ↓
API
 ↓
Business logic
 ↓
Abstractions
 ↓
Providers
```

not:

```text
UI
 ↓
MongoDB-specific code
 ↓
random external services
```

---

# 56. FUTURE MIGRATION TARGET

The architecture should make this possible:

CURRENT:

```text
HTML/CSS/JS
     ↓
Python API / Render
     ↓
MongoDB Atlas
     ↓
GridFS
     ↓
Resend
```

FUTURE:

```text
React/Vite
     ↓
Python API / another API platform
     ↓
Supabase
     ↓
Supabase Storage
     ↓
another email provider
```

or:

```text
Next.js
     ↓
Supabase Edge Functions
     ↓
Supabase
```

The business/domain logic should remain conceptually stable.

The goal is NOT zero code changes during migration.

The goal is to ensure infrastructure replacement does NOT require rewriting the entire application.

---

# 57. IMPORTANT DESIGN PRINCIPLE

Do not over-engineer.

Scalable does NOT mean:

- hundreds of unused tables
- hundreds of unused endpoints
- microservices
- Kubernetes
- unnecessary queues
- unnecessary caching systems
- unnecessary abstractions
- complicated infrastructure

For the current scale, a modular monolithic Python backend is preferred.

It should be:

- modular
- testable
- secure
- maintainable
- provider-independent
- horizontally scalable later
- easy to migrate
- easy for another developer to understand

Do not introduce microservices unless an actual requirement appears.

---

# 58. FINAL DEFINITION OF DONE

The system is complete only when:

### Public website

- existing design preserved
- campaigns database-driven
- campaign details dynamic
- featured campaigns dynamic
- Request Help is functional
- three-step workflow works
- multiple documents work
- GridFS works
- request reference works
- thank-you flow works
- contact works

### Foundation Admin

- secure login
- dashboard
- campaigns
- campaign CRUD
- requests
- search
- filtering
- sorting
- pagination
- request details
- document access
- status management
- email
- profile
- logout

### WEBSITTER Manage

- secure login
- users
- admins
- developers
- roles
- permissions
- audit logs
- account management

### Backend

- Python
- REST API
- MongoDB Atlas
- repository abstraction
- service layer
- authentication
- RBAC
- GridFS
- Resend
- validation
- error handling
- logging
- tests

### Infrastructure

- GitHub
- Cloudflare Pages
- Render
- production environment
- domains
- HTTPS
- environment variables
- deployment documentation

### Quality

- automated tests
- security verification
- production acceptance test
- responsive verification
- no secrets committed
- no mock database dependency
- no production client-side authorization
- documentation complete

---

# 59. FINAL INSTRUCTION TO THE AGENT

Do not rush.

Do not skip checkpoints.

Do not mark tasks complete without verification.

Do not redesign the frontend unnecessarily.

Do not invent business requirements.

Do not expose sensitive data.

Do not hardcode production credentials.

Do not tightly couple the application to MongoDB, Render, GridFS, Resend, Cloudflare Pages, or the current frontend framework.

Do not build future features prematurely.

Build the current required product on an architecture that can support the future.

If uncertain about a business rule:

1. inspect existing requirements;
2. inspect `FRONTEND_INFO.md`;
3. inspect existing implementation;
4. record the uncertainty in `DECISIONS.md` or `KNOWN_ISSUES.md`;
5. choose the safest reversible implementation where possible;
6. do not silently invent a business rule.

If a decision materially affects data integrity, security, privacy, payment, document handling, or irreversible migration, stop at that checkpoint and request clarification rather than guessing.

The objective is not merely to produce working code.

The objective is to produce a **production-ready, secure, maintainable, extensible charity management platform whose infrastructure can evolve without forcing a rewrite of the entire application.**

Begin with Phase 1.

Before writing implementation code, inspect the repository and verify the current state against `FRONTEND_INFO.md`.

Then create/update:

- `PROJECT_STATE.md`
- `IMPLEMENTATION_PLAN.md`
- `ARCHITECTURE.md`
- `CHECKPOINTS.md`
- `DECISIONS.md`
- `KNOWN_ISSUES.md`

Then execute Phase 1 checkpoint by checkpoint.

Do not begin Phase 2 until every Phase 1 checkpoint is actually verified.