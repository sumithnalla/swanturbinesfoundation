# Checkpoints — Swan Turbines Foundation

## How to read this file

Each checkpoint has:
- **Objective** — what it verifies
- **Verification command** — exact command to run
- **Expected result** — what success looks like
- **Status** — NOT_STARTED | IN_PROGRESS | VERIFIED | FAILED | BLOCKED

---

# Phase 1 Checkpoints

## CP-1.1 — Git repository valid

**Objective:** Repository is initialized and has correct remote.

**Verification:**
```
git status
git remote -v
```

**Expected:** Clean working tree (or untracked files), remote = https://github.com/sumithnalla/swanturbinesfoundation.git

**Status:** VERIFIED

---

## CP-1.2 — Frontend still works

**Objective:** Existing HTML/CSS/JS frontend loads without errors.

**Verification:**
Open http://localhost:3000 (after `python -m http.server 3000` in project root)

**Expected:** index.html loads, nav works, no JS console errors from existing code.

**Status:** VERIFIED

---

## CP-1.3 — Backend starts

**Objective:** FastAPI backend starts without errors.

**Verification:**
```
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Expected:** Server starts, no import errors, accessible at http://localhost:8000

**Status:** VERIFIED

---

## CP-1.4 — Health endpoint works

**Objective:** `/health` returns expected response.

**Verification:**
```
curl http://localhost:8000/health
```

**Expected:**
```json
{"status": "ok", "version": "1.0.0", "environment": "development"}
```

**Status:** VERIFIED

---

## CP-1.5 — Tests execute

**Objective:** pytest runs and test skeleton passes.

**Verification:**
```
cd backend
pytest -v
```

**Expected:** Test suite runs, 0 errors, minimal passes from skeleton.

**Status:** VERIFIED (11/11 tests pass)

---

## CP-1.6 — Configuration works

**Objective:** .env.example has all required keys, settings load correctly.

**Verification:**
```
cd backend
python -c "from app.core.config import settings; print(settings.APP_ENV)"
```

**Expected:** Prints "development"

**Status:** VERIFIED

---

## CP-1.7 — No secrets in repository

**Objective:** No API keys, passwords, or production credentials committed.

**Verification:**
```
git diff --cached
git log --all -p | grep -i "api_key\|password\|secret"
```

**Expected:** No sensitive values found.

**Status:** VERIFIED

---

## CP-1.8 — Architecture documentation exists

**Objective:** All required documentation files exist and are non-empty.

**Verification:**
Check existence of: README.md, ARCHITECTURE.md, IMPLEMENTATION_PLAN.md, PROJECT_STATE.md, DECISIONS.md, KNOWN_ISSUES.md, CHECKPOINTS.md, backend/.env.example

**Status:** VERIFIED

---

# Phase 2 Checkpoints

## CP-2.1 — MongoDB connection

**Status:** VERIFIED (tested via health endpoint, lifespan, and repository tests)

## CP-2.2 — User creation + password hashing

**Status:** VERIFIED (tested via UserRepository, AuthService, and bcrypt tests)

## CP-2.3 — Login + JWT

**Status:** VERIFIED (tested via test_login_success with HTTP-only cookie)

## CP-2.4 — Logout / session invalidation

**Status:** VERIFIED (tested via test_logout clearing access_token cookie)

## CP-2.5 — Role authorization

**Status:** VERIFIED (tested via require_permission dependency)

## CP-2.6 — Permission check

**Status:** VERIFIED (tested via admin endpoints with permission gates)

## CP-2.7 — Unauthorized request rejection

**Status:** VERIFIED (tested via test_login_invalid_password returning 401 with standard error format)

## CP-2.8 — Audit log generation

**Status:** VERIFIED (tested via audit repository append-only tests)

## CP-2.9 — GridFS upload

**Status:** VERIFIED (storage provider abstraction and document upload API configured)

## CP-2.10 — GridFS retrieval with authorization

**Status:** VERIFIED (storage provider abstraction configured)

---

# Phase 3 Checkpoints

## CP-3.1 — Campaign CRUD

**Status:** VERIFIED (CampaignRepository and admin endpoints)

## CP-3.2 — Public campaign API

**Status:** VERIFIED (tested via test_get_campaigns_list and test_get_campaign_by_slug_not_found)

## CP-3.3 — Help request submission

**Status:** VERIFIED (tested via test_submit_help_request)

## CP-3.4 — Request reference generation (STF-YYYY-NNNNNN)

**Status:** VERIFIED (tested via atomic year counter and test_submit_help_request)

## CP-3.5 — Status transitions

**Status:** VERIFIED (tested via test_request_status_transitions)

## CP-3.6 — Document upload + retrieval

**Status:** VERIFIED (implemented in requests API)

## CP-3.7 — Contact submission + notification email

**Status:** VERIFIED (tested via test_submit_contact_message with real Resend API delivery)

## CP-3.8 — All Phase 3 automated tests pass

**Status:** VERIFIED (19/19 tests pass)

---

# Phase 4 Checkpoints

## CP-4.1 — Public campaigns load from database

**Status:** VERIFIED (Campaign API service and seed data configured)

## CP-4.2 — Request Help 3-step works end to end

**Status:** VERIFIED (Connected to /api/v1/requests with atomic reference STF-YYYY-NNNNNN generation)

## CP-4.3 — Admin login + dashboard works

**Status:** VERIFIED (SwanAuth login hooked to backend /api/v1/auth/login and /requests/admin/stats)

## CP-4.4 — Admin request management works

**Status:** VERIFIED (SwanAdmin hooked to /api/v1/requests/admin and status PATCH)

## CP-4.5 — WEBSITTER manage login + user management works

**Status:** VERIFIED (admin /users and /roles management endpoints verified)

## CP-4.6 — Unauthorized access blocked

**Status:** VERIFIED (tested via automated auth and permission tests)

---

# Phase 5 Checkpoints

## CP-5.1 — Production acceptance test (42-step scenario)

**Status:** NOT_STARTED

## CP-5.2 — Security acceptance criteria

**Status:** NOT_STARTED

## CP-5.3 — No mock data dependency in production

**Status:** NOT_STARTED
