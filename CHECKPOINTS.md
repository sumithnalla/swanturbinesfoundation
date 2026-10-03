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

**Status:** NOT_STARTED

## CP-2.2 — User creation + password hashing

**Status:** NOT_STARTED

## CP-2.3 — Login + JWT

**Status:** NOT_STARTED

## CP-2.4 — Logout / session invalidation

**Status:** NOT_STARTED

## CP-2.5 — Role authorization

**Status:** NOT_STARTED

## CP-2.6 — Permission check

**Status:** NOT_STARTED

## CP-2.7 — Unauthorized request rejection

**Status:** NOT_STARTED

## CP-2.8 — Audit log generation

**Status:** NOT_STARTED

## CP-2.9 — GridFS upload

**Status:** NOT_STARTED

## CP-2.10 — GridFS retrieval with authorization

**Status:** NOT_STARTED

---

# Phase 3 Checkpoints

## CP-3.1 — Campaign CRUD

**Status:** NOT_STARTED

## CP-3.2 — Public campaign API

**Status:** NOT_STARTED

## CP-3.3 — Help request submission

**Status:** NOT_STARTED

## CP-3.4 — Request reference generation (STF-YYYY-NNNNNN)

**Status:** NOT_STARTED

## CP-3.5 — Status transitions

**Status:** NOT_STARTED

## CP-3.6 — Document upload + retrieval

**Status:** NOT_STARTED

## CP-3.7 — Contact submission + notification email

**Status:** NOT_STARTED

## CP-3.8 — All Phase 3 automated tests pass

**Status:** NOT_STARTED

---

# Phase 4 Checkpoints

## CP-4.1 — Public campaigns load from database

**Status:** NOT_STARTED

## CP-4.2 — Request Help 3-step works end to end

**Status:** NOT_STARTED

## CP-4.3 — Admin login + dashboard works

**Status:** NOT_STARTED

## CP-4.4 — Admin request management works

**Status:** NOT_STARTED

## CP-4.5 — WEBSITTER manage login + user management works

**Status:** NOT_STARTED

## CP-4.6 — Unauthorized access blocked

**Status:** NOT_STARTED

---

# Phase 5 Checkpoints

## CP-5.1 — Production acceptance test (42-step scenario)

**Status:** NOT_STARTED

## CP-5.2 — Security acceptance criteria

**Status:** NOT_STARTED

## CP-5.3 — No mock data dependency in production

**Status:** NOT_STARTED
