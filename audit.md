You are performing a READ-ONLY technical audit of the existing frontend project for a charity management platform.

IMPORTANT:
- DO NOT modify, delete, rename, move, refactor, reinstall, upgrade, downgrade, or rewrite anything.
- DO NOT change package.json.
- DO NOT change source files.
- DO NOT change environment files.
- DO NOT install dependencies.
- DO NOT run destructive commands.
- DO NOT create a backend.
- DO NOT create a database.
- DO NOT deploy anything.
- DO NOT "fix" anything you find.
- This is ONLY an analysis/audit.
- You may inspect the complete project, source code, configuration files, assets, routes, components, styles, mock/placeholder data, and dependency configuration.
- You may run safe read-only commands necessary to understand the project.

PROJECT CONTEXT

This frontend belongs to:

SWAN TURBINES FOUNDATION

Public website:
https://swanturbinesfoundation.com/

The final system will eventually consist of three applications:

1. Public website
   swanturbinesfoundation.com

2. Foundation administration panel
   admin.swanturbinesfoundation.com

3. WEBSITTER developer/super-admin panel
   manage.swanturbinesfoundation.com

The backend, database, authentication, file storage, email system, audit logging, hosting and deployment architecture will be implemented separately later.

Your job right now is to completely understand the EXISTING FRONTEND so the backend can later be designed around it without unnecessarily disturbing the frontend developer's work.

The frontend is currently incomplete and contains placeholder/mock/hardcoded data in some areas.

We specifically expect the backend to eventually power:

- Campaigns
- Charity/help requests
- Request document uploads
- Contact submissions
- Authentication-related functionality where applicable
- Other dynamic data discovered during your audit

The frontend must NOT be redesigned merely because the backend architecture is different.

==================================================
AUDIT REQUIREMENTS
==================================================

Perform a complete project-wide inspection.

Create a file named:

FRONTEND_INFO.md

at the project root.

This file must be extremely detailed and act as the technical blueprint/reference for the backend developer.

Do not make assumptions when something can be verified from the code.

==================================================
1. PROJECT OVERVIEW
==================================================

Document:

- Project name if available
- Framework
- Library versions
- Programming language
- Build tool
- Package manager
- Node/runtime requirements
- CSS/styling framework
- UI component libraries
- Animation libraries
- Form libraries
- Validation libraries
- State management
- HTTP/API libraries
- Authentication libraries if any
- File upload libraries if any
- Image handling
- Routing system
- Any other important dependencies

Include:

- package.json dependencies
- devDependencies
- scripts
- lockfile/package-manager information
- configuration files
- build configuration
- TypeScript configuration
- linting configuration
- formatting configuration

==================================================
2. COMPLETE DIRECTORY STRUCTURE
==================================================

Map the important project structure.

For every meaningful directory/file, explain:

- What it contains
- Its purpose
- Whether it is important for backend integration
- Whether it should probably remain untouched

Do not merely dump the directory tree.

Explain the architecture.

==================================================
3. ALL ROUTES / PAGES
==================================================

Find every route/page in the application.

For each route document:

- URL/path
- Page/component name
- Purpose
- Whether public or protected
- Main sections
- Components used
- Data displayed
- Whether data is currently hardcoded/mock/API-driven
- Whether backend integration will eventually be required
- Forms present
- Buttons/actions
- Navigation destinations

Create a route table.

==================================================
4. PAGE-BY-PAGE UI ANALYSIS
==================================================

For EVERY page, document the sections in order.

For example:

Page:
Campaigns

Sections:
1. Hero
2. Campaign filters
3. Campaign cards
4. Pagination/load more
5. CTA
6. Footer

For every section explain:

- Component name
- Purpose
- Important fields/content
- Data required
- Current data source
- Dynamic data requirements
- User interactions
- Backend implications

Pay special attention to:

- Campaign pages
- Request Help pages
- Contact page
- Any forms
- Any pages containing dynamic information

==================================================
5. CAMPAIGN SYSTEM ANALYSIS
==================================================

This is extremely important.

Find EVERYTHING related to campaigns.

Identify:

- Campaign listing page
- Campaign detail page
- Campaign cards
- Campaign components
- Campaign types/interfaces
- Mock campaign data
- Hardcoded campaign data
- Filters
- Sorting
- Categories
- Status
- Dates
- Images
- Amounts
- Descriptions
- Progress indicators
- Location
- Any campaign metadata

Determine exactly what fields the current frontend expects.

For example, if the frontend expects something conceptually like:

{
  id,
  title,
  description,
  image,
  status,
  startDate,
  endDate,
  location,
  targetAmount,
  raisedAmount
}

document the ACTUAL structure found in the project.

Do not invent fields.

Also identify:

- Which fields are mandatory for rendering
- Which fields are optional
- Which fields affect UI behavior
- Which fields affect filtering/sorting
- Which fields appear in listing cards
- Which fields appear in detail pages

IMPORTANT:

The future system must use the database as the source of truth.

The current hardcoded campaign data should therefore be treated as mock/reference data, not as a second permanent data source.

Document exactly where this mock data currently lives and every component consuming it.

==================================================
6. REQUEST HELP SYSTEM ANALYSIS
==================================================

Find everything related to the "Request Help" flow.

The planned backend workflow is:

STEP 1 — Applicant Information

- Full Name *
- Mobile Number *
- Email
- Address *
- City *
- State *

STEP 2 — Request Information

Support type:
- Medical
- Education
- Food
- Housing
- Emergency
- Community Development
- Other

- Description *
- Number of people who will benefit *
- Amount / assistance required *
- Urgency:
  - Normal
  - Urgent
  - Emergency

STEP 3 — Documents

The applicant should be able to upload any useful supporting documents, including but not limited to:

- Aadhaar / ID
- Medical documents
- Bills
- Income documents
- Photos
- Supporting documents

The user may upload whatever documents they have.

After successful submission:

- Show thank-you/success page
- Generate/display a unique request ID/reference
- The applicant should be able to see that request ID

IMPORTANT:

Do not assume the frontend already implements all of this.

Document exactly what currently exists.

For the current frontend request form identify:

- All fields
- Labels
- Input types
- Required/optional status
- Validation
- Error messages
- Multi-step behavior
- State management
- File upload implementation
- Accepted file types
- File size restrictions
- Number of files
- Preview functionality
- Removal functionality
- Submit behavior
- Success behavior
- Error behavior
- Existing mock submission logic
- Existing request ID generation, if any
- Existing API calls, if any

Also document exactly what backend API responses the frontend would naturally need.

==================================================
7. CONTACT FORM
==================================================

Find the contact form.

Document:

- Fields
- Validation
- Required/optional fields
- Current submission mechanism
- Success UI
- Error UI
- Any email/API/mock behavior
- Components involved

Determine what backend integration will eventually be needed.

==================================================
8. MOCK / HARDCODED DATA AUDIT
==================================================

Search the ENTIRE project for:

- Arrays containing data
- Objects representing campaigns
- Placeholder users
- Placeholder requests
- Dummy content
- JSON files
- Mock API files
- Fake API services
- Static constants
- Hardcoded cards
- Hardcoded statistics
- Hardcoded campaign information
- Hardcoded contact information
- Hardcoded status values
- Hardcoded IDs

For every important occurrence document:

- File path
- Variable/function/component
- What it represents
- Which page/component consumes it
- Whether it should eventually become database/API-driven

This section must be detailed enough that a backend developer can understand exactly where the frontend currently gets its data.

==================================================
9. DATA MODELS IMPLIED BY FRONTEND
==================================================

Infer ONLY from actual code what entities/models the backend will need.

Potential examples may include:

- Campaign
- Campaign image/media
- Charity request
- Applicant
- Request document
- Contact submission
- User
- Admin
- Developer
- Role
- Permission

But do NOT automatically create all of these.

Only list entities supported by actual frontend requirements or the stated project requirements.

For each entity document:

- Fields
- Data types
- Required/optional
- Relationships
- IDs/references
- Status values
- Enums
- Any frontend assumptions

Clearly separate:

A. Directly observed frontend requirements
B. Reasonable backend considerations
C. Unknowns requiring confirmation

==================================================
10. API / BACKEND EXPECTATIONS
==================================================

Find any existing:

- fetch()
- axios
- API clients
- service files
- API URLs
- environment variables
- REST endpoints
- GraphQL
- Supabase
- Firebase
- Appwrite
- custom backend references
- server actions
- serverless functions
- mock APIs

Document every occurrence.

If there is currently NO backend, explicitly state that.

Then create a section called:

"BACKEND INTEGRATION SURFACE"

List what APIs the frontend will eventually need based on the current UI.

For example, conceptually:

GET campaigns
GET campaign by ID
POST help request
POST request documents
POST contact submission

But distinguish clearly between:

- APIs already implemented
- APIs referenced but unavailable
- APIs that will need to be created later

Do not implement anything.

==================================================
11. FORMS AND VALIDATION
==================================================

Audit every form.

For each form document:

- Fields
- Input types
- Validation rules
- Required fields
- Error states
- Submission state
- Loading state
- Success state
- Failure state
- Reset behavior
- Multi-step state
- Browser-side validation
- Libraries involved

==================================================
12. FILE UPLOAD ANALYSIS
==================================================

This is especially important for the Request Help system.

Determine:

- Whether file uploads are currently implemented
- Components involved
- Accepted MIME types/extensions
- Maximum file size
- Number of files
- Multiple upload support
- Preview
- File removal
- Upload progress
- State representation
- Submission behavior

If file uploads are only visual/mock UI, explicitly state that.

==================================================
13. AUTHENTICATION / ADMIN UI
==================================================

Search for anything related to:

- Login
- Logout
- Session
- Token
- JWT
- Cookies
- Roles
- Permissions
- Protected routes
- Admin
- User management
- Profile
- Password reset
- Authentication state

Document what exists and what does not.

Do NOT assume the public website frontend contains the admin application.

If admin/manage applications are not present in this repository, explicitly state that.

==================================================
14. DESIGN SYSTEM
==================================================

Document:

- Primary colors
- Secondary colors
- Background colors
- Text colors
- Fonts
- Font sizes
- Font weights
- Border radius
- Shadows
- Spacing system
- Buttons
- Cards
- Inputs
- Modals
- Tables
- Responsive breakpoints
- Dark/light mode if present
- Icons
- Image treatment
- Animation style

Identify where these are defined.

==================================================
15. RESPONSIVE DESIGN
==================================================

Explain how the frontend handles:

- Desktop
- Tablet
- Mobile

Identify:

- Breakpoints
- Responsive components
- Mobile navigation
- Grid changes
- Typography scaling
- Image behavior
- Form behavior

==================================================
16. PERFORMANCE / SEO
==================================================

Audit existing:

- SEO metadata
- Titles
- Descriptions
- Open Graph
- robots.txt
- sitemap
- image optimization
- lazy loading
- code splitting
- route splitting
- caching
- preloading
- performance techniques

Document what exists and what does not.

==================================================
17. ACCESSIBILITY
==================================================

Audit:

- Labels
- Alt text
- Keyboard navigation
- Focus states
- Semantic HTML
- ARIA
- Form accessibility
- Error accessibility
- Color contrast considerations

Do not modify anything.

==================================================
18. SECURITY-RELEVANT FRONTEND FINDINGS
==================================================

Identify anything backend developers must know about:

- Sensitive information exposed in frontend
- API keys
- Environment variables
- Secrets
- Public credentials
- Authentication assumptions
- File upload assumptions
- User-controlled values
- URL parameters
- IDs
- Unsafe HTML rendering
- External resources

Do not fix anything.

Only report findings.

==================================================
19. ENVIRONMENT / DEPLOYMENT
==================================================

Document:

- Environment variable names
- Which are public/client-side
- Which appear to be server-only
- Build command
- Development command
- Production command
- Expected port
- Hosting assumptions
- Existing deployment configuration
- Cloudflare/Vercel/Netlify/etc references
- Domain references

Never expose actual secret values in FRONTEND_INFO.md.

Only document variable names and whether they appear sensitive.

==================================================
20. GIT / VERSION CONTROL
==================================================

Inspect safely:

- Git status
- Current branch
- Recent commit history
- Remote repository URL if available
- .gitignore
- Tracked environment files
- Potentially sensitive files accidentally tracked

Do not modify git history or configuration.

Do not push anything.

==================================================
21. FRONTEND ↔ BACKEND INTEGRATION MAP
==================================================

Create a clear table:

Frontend feature
→ Current implementation
→ Current data source
→ Future backend requirement
→ Required API
→ Required database entity
→ Required file storage
→ Notes

Focus especially on:

- Campaigns
- Request Help
- Documents
- Contact
- Authentication-related UI

==================================================
22. DO NOT TOUCH LIST
==================================================

Create a list of frontend files/components that should preferably NOT be modified during backend development unless integration requires it.

Examples:

- Design system
- Shared UI components
- Layout
- Header
- Footer
- Hero
- Static content pages

Base this on actual project structure.

==================================================
23. FRONTEND CHANGES THAT WILL EVENTUALLY BE REQUIRED
==================================================

Do NOT implement them.

Simply identify likely integration changes such as:

- Replace hardcoded campaigns with API calls
- Replace mock submission with POST request
- Add request ID handling
- Connect file upload
- Connect contact form
- Add loading/error states
- Connect authentication

Separate:

A. Required backend integration changes
B. Optional improvements
C. Changes that are NOT necessary

==================================================
24. UNKNOWN / QUESTIONS
==================================================

Create a final section:

UNKNOWN_OR_REQUIRES_DECISION

List anything that cannot be determined from the code and should be decided before backend architecture is finalized.

Examples:

- Exact campaign fields not represented in UI
- Email provider
- File storage provider
- Authentication strategy
- Admin roles
- Permission model
- Request retention policy
- Maximum upload size
- Notification requirements

Do not invent answers.

==================================================
25. FINAL EXECUTIVE SUMMARY
==================================================

At the very top of FRONTEND_INFO.md provide a concise summary containing:

- Frontend technology
- Number of routes/pages
- Major features
- Current backend status
- Current database status
- Current mock data status
- Campaign architecture
- Request-help architecture
- Contact architecture
- Authentication status
- File upload status
- Major backend integration requirements

Then provide the detailed sections described above.

==================================================
IMPORTANT OUTPUT RULES
==================================================

1. FRONTEND_INFO.md must be based on actual inspection of the repository.

2. Do not guess.

3. Whenever possible include exact file paths.

4. When documenting a component, mention the component's actual name.

5. When documenting data structures, show the actual fields/types found in code.

6. Clearly distinguish:
   - EXISTING
   - MOCK/PLACEHOLDER
   - REQUIRED LATER
   - UNKNOWN

7. Do not make any source-code changes.

8. Do not install packages.

9. Do not create backend code.

10. Do not create database code.

11. Do not deploy.

12. Do not modify the existing UI.

13. Do not "clean up" unrelated code.

14. The goal is to produce an accurate technical map of the frontend for a separate backend/database architect.

After completing the audit, print a concise terminal summary containing:

- Frontend framework
- Build tool
- Package manager
- Number of routes
- Major dynamic features
- Campaign data source
- Request Help implementation status
- File upload implementation status
- Contact form implementation status
- Existing API/backend status
- Most important backend integration points
- Path of the generated FRONTEND_INFO.md

Again: READ ONLY. Do not modify the existing application.