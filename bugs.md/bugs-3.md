Implement the following improvements in the existing **WEBSITTER Manage Super-Admin panel**:

1. **Audit Trail & Telemetry:** Organize logs into separate, filterable sections for login activity (successful and failed), account changes, status changes, help requests submitted, contact messages submitted, and other important events. Investigate why failed logins aren't recorded and implement reliable logging without storing passwords or other secrets.

2. **Password Visibility:** Add an eye-icon toggle to show/hide passwords on the Super-Admin login page and the Create New User form.

3. **Overview:** Remove the Active Campaigns section from the overview dashboard.

4. **User Account Management:** Allow authorized super-admins to change existing users' roles, with proper backend authorization and audit logging.

5. **Critical Security Fix — Immediate Session Revocation:** When a super-admin deactivates a user, that user must immediately lose access to the Super-Admin panel, even if already logged in on another device. Investigate the existing authentication and session architecture, implement secure server-side account-status enforcement and session revocation or equivalent safeguards, and redirect deactivated users to the login page with an appropriate message. Do not rely solely on frontend checks or require users to log out manually.

**Think critically and implement every necessary frontend, backend, Supabase/database, authentication, session-management, and RLS/authorization change.** Test all changes end to end, preserve existing functionality, and report anything blocked or not verified. Never log passwords or expose credentials. Do not deploy to production without my approval.