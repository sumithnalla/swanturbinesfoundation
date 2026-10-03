The local startup documentation, one-click launcher scripts, and test credentials have been set up.

1. One-Click Launcher (start_local.bat)
You can launch both the FastAPI Backend and the Frontend Server and open all portals in your browser with a single double-click:

Double-click: 

start_local.bat
Or via PowerShell:
powershell
cd "d:\sumith\swan 2\swan"
.\start_local.ps1
This automatically:

Boots the FastAPI Backend on http://localhost:8000 with live reload.
Boots the Frontend Web Server on http://localhost:5500.
Opens all 4 application windows in your default browser.
2. Guide & Local URLs (localhost.md)
A guide has been created in 

localhost.md
. Here are your local URLs:

Portal / View	Local URL	Description
Public Website	http://localhost:5500/index.html	Main public landing page, donation modals, impact story
Public Campaigns	http://localhost:5500/campaigns.html	Live database-driven campaigns with dynamic progress bars
Request Help	http://localhost:5500/request-help.html	3-step application form with atomic STF- reference generation
Contact Us	http://localhost:5500/contact.html	Contact form wired to POST /api/v1/contact and email
Foundation Admin Login	http://localhost:5500/adminlogin/index.html	Sign-in page for Foundation staff and reviewers
Foundation Admin Portal	http://localhost:5500/admin.html	Case management, review stats, CSV export, status updates
WEBSITTER Super-Admin	http://localhost:5500/manage/index.html	Super-admin management: user accounts, RBAC, audit telemetry
Backend Swagger API Docs	http://localhost:8000/docs	Interactive OpenAPI documentation for all 20+ endpoints
Backend API Health	http://localhost:8000/health	API health check and database connectivity diagnostic
3. How to Open Both Admin Panels & Test Credentials
Platform A: Foundation Staff Admin Portal
Where to open: http://localhost:5500/adminlogin/index.html (redirects to admin.html)
Credentials:
Email: admin@swanturbinesfoundation.com
Password: AdminSwan2026!#Secure
(Alternative Officer: aruna@swanturbinesfoundation.com / FoundationAdmin2026!)
What it does: Allows foundation staff to inspect incoming help requests, change request statuses (e.g. from pending to under_review), view uploaded applicant documents, and export CSV reports.
Platform B: WEBSITTER Super-Admin Management Application
Where to open: http://localhost:5500/manage/index.html
Credentials:
Email: websitter@swanturbinesfoundation.com
Password: WebsitterSuperAdmin2026!
What it does: The dedicated technical management console to:
Create and manage user accounts (Foundations Admins, Staff, Reviewers).
Activate or deactivate accounts.
Inspect system roles & RBAC permission assignments.
Stream live audit logs and security telemetry (auth.login, request.status_changed, user.created).
4. Database Seeding & Resilience
To seed the initial 8 campaigns, roles, and default accounts into MongoDB, run:

powershell
cd "d:\sumith\swan 2\swan\backend"
.\venv\Scripts\python.exe scripts/seed.py
Resilience Note: If MongoDB is offline on your local machine, the backend runs gracefully in degraded mode, and the frontend automatically falls back to local storage so you can test all views, forms, and pages without interruption.