# Architectural Decisions — Swan Turbines Foundation

## ADR-001 — Backend framework: FastAPI (Python)

**Date:** 2026-10-03
**Status:** Accepted

**Context:**
Specification requires Python backend on Render.

**Decision:**
Use FastAPI with uvicorn/gunicorn.

**Rationale:**
- Modern async Python framework
- Automatic OpenAPI docs (development aid)
- Native Pydantic validation
- Easy to test
- Works well with motor (async MongoDB driver)
- Production-ready on Render

---

## ADR-002 — Database: MongoDB with motor (async)

**Date:** 2026-10-03
**Status:** Accepted

**Context:**
Specification requires MongoDB Atlas.

**Decision:**
Use `motor` (AsyncIOMotorClient) for async MongoDB access.

**Rationale:**
- Async compatible with FastAPI
- Official async MongoDB driver
- GridFS support via AsyncIOMotorGridFSBucket

---

## ADR-003 — Authentication: JWT tokens in HTTP-only cookies

**Date:** 2026-10-03
**Status:** Accepted

**Context:**
Need secure session handling for admin and manage panels.

**Decision:**
Issue JWT tokens, store in HTTP-only cookies for admin/manage panels.

**Rationale:**
- HTTP-only cookies prevent XSS token theft
- JWT is stateless, easy to validate
- Works across Cloudflare Pages → Render API
- Can be invalidated via a blocklist or short expiry

**Note:**
Public API calls (campaigns, request submission, contact) do NOT require authentication.

---

## ADR-004 — Password hashing: passlib + bcrypt

**Date:** 2026-10-03
**Status:** Accepted

**Decision:**
Use `passlib[bcrypt]` for password hashing.

**Rationale:**
- Specification explicitly requires bcrypt-compatible implementation
- passlib is the standard Python recommendation
- Never store plaintext passwords

---

## ADR-005 — File storage: MongoDB GridFS

**Date:** 2026-10-03
**Status:** Accepted

**Context:**
Specification requires GridFS for the current implementation.

**Decision:**
Use `AsyncIOMotorGridFSBucket` with a `StorageProvider` abstraction.

**Rationale:**
- Keeps file bytes out of MongoDB documents (no 16MB BSON limit)
- Abstraction layer allows future migration to Supabase Storage or S3
- Frontend never receives raw GridFS IDs — only opaque download URLs

---

## ADR-006 — Email: Resend

**Date:** 2026-10-03
**Status:** Accepted

**Context:**
Resend API key provided. Domain verification pending (Phase 5).

**Decision:**
Use Resend Python SDK behind an `EmailProvider` abstraction.

**Development note:**
During local development use `onboarding@resend.dev` as sender (Resend sandbox).
Production sender will be `noreply@swanturbinesfoundation.com` after domain verification.

**API key:** stored in .env only, never committed.

---

## ADR-007 — Request reference format: STF-YYYY-NNNNNN

**Date:** 2026-10-03
**Status:** Accepted

**Decision:**
Generate public request references as `STF-YYYY-NNNNNN` where NNNNNN is a zero-padded sequential counter per year.

**Rationale:**
- Human-readable for applicants and staff
- Year-scoped prevents unbounded counter growth
- Sequential makes admin easy to discuss references verbally
- Counter stored in a `counters` collection in MongoDB (atomic increment)

---

## ADR-008 — Campaign detail pages: parameterized single page

**Date:** 2026-10-03
**Status:** Accepted

**Context:**
Currently 8 static campaign detail HTML files. Specification requires database-driven campaigns without manually creating a new HTML file for each.

**Decision:**
Create `campaign.html?slug=<slug>` as the single canonical campaign detail page. Existing static pages are kept temporarily as redirects or deprecated.

**Rationale:**
- No breaking changes to existing URLs immediately
- Backend drives content for any slug
- Scales to unlimited campaigns

---

## ADR-009 — Frontend: no framework migration now

**Date:** 2026-10-03
**Status:** Accepted

**Context:**
Specification explicitly prohibits React/Vite/Next.js migration during this implementation.

**Decision:**
Keep HTML/CSS/vanilla JS. Create `js/api/` client layer for API abstraction.

---

## ADR-010 — CORS: environment-specific

**Date:** 2026-10-03
**Status:** Accepted

**Decision:**
- Development: allow localhost:3000, localhost:5500, 127.0.0.1:*
- Production: allow only swanturbinesfoundation.com, admin.swanturbinesfoundation.com, manage.swanturbinesfoundation.com

Configured via `CORS_ORIGINS` environment variable (comma-separated).

---

## PENDING DECISIONS

These require confirmation before implementation:

| # | Decision needed | Recorded in |
|---|---|---|
| P1 | Financial target amounts for campaigns — consistent values? | KNOWN_ISSUES |
| P2 | Exact document access policy — which staff roles can download? | KNOWN_ISSUES |
| P3 | Session duration — how long should admin sessions last? | KNOWN_ISSUES |
| P4 | Email notification recipients for new requests — specific admin email? | KNOWN_ISSUES |
