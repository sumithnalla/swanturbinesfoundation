# IMPORTANT — LOCAL-FIRST BUILD EXECUTION

The infrastructure accounts and production deployment plan have already been prepared conceptually. However, **do NOT spend the initial development phases setting up production deployment, domains, DNS, subdomains, Render production services, Cloudflare production hosting, Resend domain verification, or GitHub-to-Render deployment connections.**

Our immediate priority is to **BUILD THE COMPLETE APPLICATION AND MAKE IT WORK END-TO-END ON LOCALHOST FIRST.**

Follow this execution order:

1. Analyze the existing frontend and all provided project documentation.
2. Preserve the existing frontend design and structure wherever possible.
3. Build the backend architecture, authentication, authorization, database layer, GridFS/file handling, APIs, validation, request management, campaign management, email abstraction, audit logging, and all required business logic.
4. Build and integrate the public website functionality.
5. Build the Admin panel.
6. Build the Manage/Super-Admin panel.
7. Use local development configuration/environment variables so the complete system can run locally.
8. Create the local database structure and seed only the necessary development/test data.
9. Test the complete application locally from beginning to end:
   - Public campaign viewing
   - Request Help flow
   - Document uploads
   - Request ID / unique ID generation
   - Admin login
   - Campaign management
   - Request management
   - Status changes
   - Email functionality using a development-safe configuration
   - Manage/Super-Admin functions
   - User management
   - Permissions
   - Audit logs
   - Authentication/security
   - Error handling
10. Fix all discovered issues before moving forward.

## PRODUCTION DEPLOYMENT IS A LATER PHASE

Once the complete application is working correctly on localhost and the previous development checkpoints are verified, THEN proceed with production infrastructure.

Only at that point configure:

- MongoDB Atlas
- MongoDB production database
- GridFS production storage
- Render backend
- Cloudflare Pages frontend
- `swanturbinesfoundation.com`
- `admin.swanturbinesfoundation.com`
- `manage.swanturbinesfoundation.com`
- API/backend production configuration
- Resend production domain verification
- Production Resend API key
- GitHub → Render deployment connection
- Cloudflare production deployment
- Production environment variables/secrets
- DNS
- SSL
- Production security configuration

## CRITICAL ARCHITECTURE REQUIREMENT

Even though we are building locally first, **do not create a throwaway local architecture.**

The application must be designed so that moving from:

Local MongoDB → MongoDB Atlas

Local backend → Render

Local frontend → Cloudflare Pages

Development email → Resend production domain

requires configuration/deployment changes rather than rewriting the application.

Keep all infrastructure-specific configuration in environment variables/configuration layers.

Keep the application/business logic independent from the hosting provider wherever reasonably possible.

The database access layer must be sufficiently abstracted that a future migration from MongoDB to another database platform such as Supabase/PostgreSQL can be performed without rewriting the entire application.

The same principle applies to:

- Storage
- Email provider
- Authentication implementation
- Backend hosting
- Frontend hosting

## DO NOT WAIT FOR PRODUCTION CREDENTIALS

If a production credential, domain, DNS record, API key, or hosting configuration is not yet available, **do not stop development because of it.**

Use an appropriate local development implementation or clearly defined environment-variable placeholder.

Continue building and testing the actual application.

When a production dependency becomes necessary, record it clearly in the project checkpoint/state documentation and continue with everything that can be completed independently.

## STATE/PICKUP REQUIREMENT

After every meaningful task/checkpoint, update the project's state documentation so that if this agent stops unexpectedly, another agent can continue from the exact point reached.

Record:

- Current phase
- Completed tasks
- Verification results
- Current implementation status
- Remaining tasks
- Known issues
- Blocked tasks
- Required credentials/configuration
- Important architectural decisions
- Commands needed to continue
- Files/components modified
- Database changes
- Migration/seed status
- Tests performed and results

**Never mark a phase complete unless all of its required tasks have actually been implemented and verified.**

The project should always be left in a recoverable state.

## FINAL PRIORITY

For now:

**BUILD FIRST → TEST LOCALLY → VERIFY EVERYTHING → DEPLOY AFTERWARD.**

Do not let production infrastructure setup distract from completing the actual application.

and this is the resend for you:
import resend

resend.api_key = "re_PLACEHOLDER_KEY"

r = resend.Emails.send({
  "from": "onboarding@resend.dev",
  "to": "aruna@swanturbinesfoundation.com",
  "subject": "Hello World",
  "html": "<p>Congrats on sending your <strong>first email</strong>!</p>"
})
