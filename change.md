We are rebuilding the backend/infrastructure of the **Swan Turbines Foundation** application.

IMPORTANT: Do NOT modify, delete, refactor, or migrate any existing code yet. This phase is ONLY for a complete audit and documentation of the current codebase.

The current planned architecture is changing from:

- MongoDB Atlas → database
- Render/Railway → backend
- Resend → email

to:

- **Supabase PostgreSQL** → database
- **Supabase Edge Functions** → backend/API/server-side logic
- **Google Drive** → uploaded documents/files
- **Resend** → email (free tier)
- **Cloudflare Pages** → frontend hosting

Already approximately 75% complete, so preserving its existing behavior and wiring is extremely important.

### YOUR TASK

Thoroughly inspect the ENTIRE repository, especially everything outside the frontend.

Review:

1. Backend/server code
2. Database models and schemas
3. MongoDB connections and queries
4. GridFS/file-upload logic
5. Authentication and authorization
6. Admin functionality
7. API endpoints/routes
8. Controllers/services/utilities
9. File/document handling
10. Email/Resend integration
11. Environment variables and configuration
12. Frontend API calls and the backend contracts they depend on
13. Campaign management
14. Charity request/help application flow
15. Admin review/approve/reject flow
16. Any dashboards or protected routes
17. Any background jobs or external integrations
18. Error handling and validation
19. Security-sensitive code
20. Anything else that will affect migration to Supabase + Google Drive.

Do not assume the existing implementation is correct. Trace how the pieces are actually connected.

### VERY IMPORTANT

Create ONE detailed file at the project root:

`SHIFT.md`

This file will become the handover/architecture document that another developer/AI can use to understand the existing system and safely perform the migration.

The SHIFT.md must include:

### 1. CURRENT PROJECT STATUS
- What is already implemented
- What is partially implemented
- What is missing
- What appears broken
- What should NOT be touched unnecessarily

### 2. CURRENT ARCHITECTURE
Document the actual architecture currently present in the repository.

Include:

Frontend
→ APIs
→ Backend
→ Database
→ File storage
→ Email
→ Authentication
→ Admin system

Do not describe what we WANT. Describe what currently EXISTS.

### 3. FRONTEND ↔ BACKEND CONTRACT
For every important frontend API call, document:

- endpoint
- HTTP method
- request body
- query/path parameters
- authentication requirements
- response structure
- where it is called from
- what frontend functionality depends on it

This section is extremely important because we will rebuild the backend without breaking the existing frontend.

### 4. DATABASE AUDIT
Document the current MongoDB structure.

For every collection/model, include:

- collection/model name
- fields
- field types
- required/optional fields
- relationships/references
- indexes if any
- where it is used
- important queries
- status fields/enums
- timestamps

Then propose a **Supabase PostgreSQL equivalent**, but clearly mark it as:

`PROPOSED SUPABASE DESIGN`

Do NOT implement it yet.

### 5. FILE/DOCUMENT SYSTEM
Trace exactly how uploaded files currently work.

Document:

- where files originate
- upload endpoint
- validation
- file size/type restrictions
- GridFS usage
- metadata storage
- how files are retrieved
- how files are displayed/downloaded
- which database records reference them

Then propose how this should map to:

`User → Supabase Edge Function → Google Drive → Drive File ID/URL → Supabase`

### 6. AUTHENTICATION & SECURITY
Document the current:

- user authentication
- admin authentication
- sessions/tokens
- password handling
- authorization checks
- protected endpoints
- admin roles
- file access controls
- sensitive data handling

Explicitly identify security risks or missing authorization checks.

### 7. EMAIL SYSTEM
Document:

- every place email is triggered
- email provider
- templates/content
- recipients
- conditions that trigger emails
- frontend/backend dependencies

Then explain what needs to remain functionally identical when moving to Resend.

### 8. API/EDGE FUNCTION MIGRATION MAP

Create a table like:

| Current API | Current Purpose | Current Implementation | Future Supabase Edge Function | DB Tables Used | External Services |
|---|---|---|---|---|---|

Map every important backend endpoint.

### 9. SUPABASE MIGRATION PLAN

Design a proposed architecture using:

- Supabase PostgreSQL
- Supabase Edge Functions
- Supabase Auth if appropriate
- Google Drive API
- Resend
- Cloudflare Pages

Explain which existing components are replaced and which frontend components can remain unchanged.

### 10. GOOGLE DRIVE DESIGN

Propose a clean folder/file structure for charity requests.

For example:

Google Drive
└── Swan Turbines Foundation
    └── Charity Requests
        └── REQUEST-ID
            ├── Applicant Documents
            ├── Medical Documents
            └── Supporting Documents

Also specify what should be stored in Supabase:

- Google Drive folder ID
- Google Drive file ID
- file name
- MIME type
- document type
- URL
- request ID
- upload timestamp

### 11. MIGRATION RISKS

List anything that could break during migration.

Pay special attention to:

- frontend API expectations
- authentication
- file uploads
- admin dashboard
- campaign CRUD
- request approval/rejection
- email triggers
- IDs/references
- environment variables
- CORS
- permissions
- document access

### 12. RECOMMENDED MIGRATION ORDER

Give us a safe phased migration plan.

Prefer something like:

Phase 1 — Supabase schema
Phase 2 — Supabase authentication/security
Phase 3 — Edge Functions/API
Phase 4 — Google Drive document system
Phase 5 — Resend
Phase 6 — Connect/test frontend
Phase 7 — Full local testing
Phase 8 — Deployment

The migration should NOT require rebuilding the frontend unnecessarily.

### 13. ENVIRONMENT VARIABLES

List every environment variable currently used and classify each as:

- KEEP
- REMOVE
- REPLACE
- NEW REQUIRED VARIABLE

Never expose actual secret values in SHIFT.md. Only document variable names and their purpose.

### 14. FILE-BY-FILE INVENTORY

Provide a concise but useful inventory of important files/directories and explain what each one does.

### 15. FINAL RECOMMENDATION

At the end, provide:

- what we should preserve
- what we should rebuild
- what we should delete eventually
- what should be migrated first
- biggest risks
- recommended final architecture

### CRITICAL RULES

- DO NOT modify application code.
- DO NOT install packages.
- DO NOT delete files.
- DO NOT change environment variables.
- DO NOT change database configuration.
- DO NOT migrate anything yet.
- DO NOT make assumptions when the code can be inspected.
- If something cannot be determined, explicitly write `UNKNOWN` and explain what needs verification.
- Distinguish clearly between CURRENT and PROPOSED architecture.
- Trace actual code paths instead of only reading filenames.
- Be especially thorough with backend/database/file-upload code.
- The final `SHIFT.md` should be detailed enough that a new AI/developer can read it and understand the project without having to rediscover the entire codebase.

After creating SHIFT.md, give me a short terminal summary containing:
1. Current backend stack
2. Current database/storage
3. Current API count
4. Current authentication approach
5. Current file-upload approach
6. Major migration risks
7. Recommended first migration phase

Again: **audit and document only. Do not change the existing application.**