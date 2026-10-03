# Swan Turbines Foundation — Local Testing & Launch Guide

This guide provides instructions to run the entire system locally, test all frontend views, log into both administration portals, and inspect the backend REST API.

---

## 🚀 One-Click Launch (Easiest Method)

You can launch both the **FastAPI Backend** and the **Frontend Web Server** and open all portals in your browser with a single double-click:

- **Windows Double-Click:** Double-click [`start_local.bat`](file:///d:/sumith/swan%202/swan/start_local.bat) in the project folder.
- **Or via PowerShell:**
  ```powershell
  cd "d:\sumith\swan 2\swan"
  .\start_local.ps1
  ```

This automatically:
1. Starts the **FastAPI Backend** on `http://localhost:8000` (with live reload).
2. Starts the **Frontend Web Server** on `http://localhost:5500`.
3. Opens all 4 application windows in your default browser.

---

## 🌐 Local URLs & Portals

| Portal / View | Local URL | Description |
|---|---|---|
| **Public Website** | [http://localhost:5500/index.html](http://localhost:5500/index.html) | Main public landing page, donation modals, impact story |
| **Public Campaigns** | [http://localhost:5500/campaigns.html](http://localhost:5500/campaigns.html) | Live database-driven campaigns with dynamic progress bars |
| **Request Help** | [http://localhost:5500/request-help.html](http://localhost:5500/request-help.html) | 3-step application form with atomic `STF-` reference generation |
| **Contact Us** | [http://localhost:5500/contact.html](http://localhost:5500/contact.html) | Contact form wired to `POST /api/v1/contact` and email |
| **Foundation Admin Login** | [http://localhost:5500/adminlogin/index.html](http://localhost:5500/adminlogin/index.html) | Sign-in page for Foundation staff and reviewers |
| **Foundation Admin Portal** | [http://localhost:5500/admin.html](http://localhost:5500/admin.html) | Case management, review stats, CSV export, status updates |
| **WEBSITTER Super-Admin** | [http://localhost:5500/manage/index.html](http://localhost:5500/manage/index.html) | Super-admin management: user accounts, RBAC, audit telemetry |
| **Backend Swagger API Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive OpenAPI documentation for all 20+ endpoints |
| **Backend API Health** | [http://localhost:8000/health](http://localhost:8000/health) | API health check and database connectivity diagnostic |

---

## 🔑 Test Credentials

Use these pre-configured credentials to access both management platforms:

### 1. Foundation Administrator Portal
> Access: [http://localhost:5500/adminlogin/index.html](http://localhost:5500/adminlogin/index.html) (redirects to [admin.html](http://localhost:5500/admin.html))

| Field | Value |
|---|---|
| **Email** | `admin@swanturbinesfoundation.com` |
| **Password** | `AdminSwan2026!#Secure` |
| **Role** | `foundation_admin` (Campaigns, Requests, Review, Contact, Audit) |

*Alternative Foundation Officer account:*
- **Email:** `aruna@swanturbinesfoundation.com`
- **Password:** `FoundationAdmin2026!`

---

### 2. WEBSITTER Super-Admin Platform
> Access: [http://localhost:5500/manage/index.html](http://localhost:5500/manage/index.html)

| Field | Value |
|---|---|
| **Email** | `websitter@swanturbinesfoundation.com` |
| **Password** | `WebsitterSuperAdmin2026!` |
| **Role** | `super_admin` (Unrestricted `*` master permissions) |

---

## ⚙️ Manual Startup (Terminal Commands)

If you prefer to start the servers manually in separate terminal windows:

### Terminal 1: Backend API
```powershell
cd "d:\sumith\swan 2\swan\backend"
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*The API is now running at `http://localhost:8000`.*

### Terminal 2: Frontend Web Server
```powershell
cd "d:\sumith\swan 2\swan"
.\backend\venv\Scripts\python.exe -m http.server 5500
```
*The frontend is now running at `http://localhost:5500`.*

---

## 🗄️ Database Seeding

To populate initial campaigns, roles, and default users into MongoDB:

```powershell
cd "d:\sumith\swan 2\swan\backend"
.\venv\Scripts\python.exe scripts/seed.py
```

> **Note on Offline / Degraded Mode:**
> If MongoDB is not running locally, the FastAPI backend automatically boots in **resilient degraded mode** without crashing. The frontend also contains an automatic fallback to local mock storage, allowing complete UI inspection even offline!

---

## 🧪 Running the Full Automated Test Suite

To run all 27 unit, integration, and 30-step end-to-end acceptance tests:

```powershell
cd "d:\sumith\swan 2\swan\backend"
.\venv\Scripts\pytest.exe -v
```

**Expected output:**
```text
====================== 27 passed, 15 warnings in 10.80s =======================
```

---

## 📋 Feature Testing Walkthrough

1. **Test Public Campaigns:**
   - Go to [http://localhost:5500/campaigns.html](http://localhost:5500/campaigns.html).
   - Notice the campaigns dynamically query `GET /api/v1/campaigns` and render real-time progress bars and amounts raised.
2. **Submit a Help Request:**
   - Go to [http://localhost:5500/request-help.html](http://localhost:5500/request-help.html).
   - Fill in Step 1 (Applicant Info), Step 2 (Need Details), and check the consent box.
   - Click **Submit Application**.
   - You will see the generated reference code (e.g. `STF-2026-000001`).
3. **Foundation Admin Review:**
   - Go to [http://localhost:5500/adminlogin/index.html](http://localhost:5500/adminlogin/index.html).
   - Sign in using `admin@swanturbinesfoundation.com` / `AdminSwan2026!#Secure`.
   - In [admin.html](http://localhost:5500/admin.html), inspect the real-time request counts and open the submitted application to review details and change the case status.
4. **WEBSITTER Super-Admin Management:**
   - Go to [http://localhost:5500/manage/index.html](http://localhost:5500/manage/index.html).
   - Authorize with `websitter@swanturbinesfoundation.com` / `WebsitterSuperAdmin2026!`.
   - View the live audit log telemetry stream, create new staff accounts, toggle account activation, and inspect the RBAC permissions matrix.
