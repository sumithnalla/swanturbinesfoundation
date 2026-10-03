# Implementation Plan — Swan Turbines Foundation

## Overview

Five-phase implementation. Build locally first, deploy to production in Phase 5.

---

## PHASE 1 — Foundation, Repository, Architecture and Infrastructure

**Goal:** Create engineering foundation without breaking the existing frontend.

| # | Task | Status |
|---|---|---|
| 1.1 | Inspect complete repository | ✅ DONE |
| 1.2 | Read FRONTEND_INFO.md | ✅ DONE |
| 1.3 | Identify all frontend files | ✅ DONE |
| 1.4 | Initialize Git repository | ✅ DONE |
| 1.5 | Set GitHub remote | ✅ DONE |
| 1.6 | Create project documentation (README, ARCHITECTURE, etc.) | ✅ DONE |
| 1.7 | Create Python backend directory structure | ✅ DONE |
| 1.8 | Create FastAPI application skeleton | ✅ DONE |
| 1.9 | Create configuration/environment system | ✅ DONE |
| 1.10 | Create architecture layer stubs (API, service, repo, providers) | ✅ DONE |
| 1.11 | Create health endpoint | ✅ DONE |
| 1.12 | Create test framework | ✅ DONE |
| 1.13 | Create frontend API client layer skeleton | ✅ DONE |
| 1.14 | Create .env.example | ✅ DONE |
| 1.15 | Install Python dependencies | 🔄 IN PROGRESS |
| 1.16 | Verify backend starts | ⬜ TODO |
| 1.17 | Verify health endpoint | ⬜ TODO |
| 1.18 | Verify tests run | ⬜ TODO |
| 1.19 | Initial git commit | ⬜ TODO |

---

## PHASE 2 — Database, Authentication, RBAC, Storage and Core Services

**Goal:** Build secure backend foundation.

| # | Task | Status |
|---|---|---|
| 2.1 | Connect local MongoDB | ⬜ TODO |
| 2.2 | Create collections and indexes | ⬜ TODO |
| 2.3 | Create repository layer (MongoDB implementations) | ⬜ TODO |
| 2.4 | Implement authentication (login, logout, session) | ⬜ TODO |
| 2.5 | Implement bcrypt password hashing | ⬜ TODO |
| 2.6 | Implement JWT session tokens | ⬜ TODO |
| 2.7 | Implement password reset architecture | ⬜ TODO |
| 2.8 | Implement RBAC (roles, permissions) | ⬜ TODO |
| 2.9 | Implement user management | ⬜ TODO |
| 2.10 | Implement GridFS storage abstraction | ⬜ TODO |
| 2.11 | Implement file metadata | ⬜ TODO |
| 2.12 | Implement secure file access | ⬜ TODO |
| 2.13 | Implement audit logging | ⬜ TODO |
| 2.14 | Implement structured application logging | ⬜ TODO |
| 2.15 | Implement input validation | ⬜ TODO |
| 2.16 | Implement consistent API error responses | ⬜ TODO |
| 2.17 | Seed initial admin user | ⬜ TODO |
| 2.18 | Run Phase 2 tests | ⬜ TODO |

---

## PHASE 3 — Business Features

**Goal:** Campaign, Help Request, Document, Contact, Email systems.

| # | Task | Status |
|---|---|---|
| 3.1 | Campaign model, CRUD, slug, status, category, media | ⬜ TODO |
| 3.2 | Public campaign API (list, detail) | ⬜ TODO |
| 3.3 | Admin campaign management API | ⬜ TODO |
| 3.4 | Campaign seed data (8 existing campaigns) | ⬜ TODO |
| 3.5 | Help request model (applicant info + request info) | ⬜ TODO |
| 3.6 | Help request submission API (three-step) | ⬜ TODO |
| 3.7 | Request reference generator (STF-YYYY-NNNNNN) | ⬜ TODO |
| 3.8 | Request status state machine | ⬜ TODO |
| 3.9 | Admin request management API | ⬜ TODO |
| 3.10 | Document upload API (GridFS) | ⬜ TODO |
| 3.11 | Document metadata persistence | ⬜ TODO |
| 3.12 | Authorized document download | ⬜ TODO |
| 3.13 | Contact submission API | ⬜ TODO |
| 3.14 | Contact notification email (Resend) | ⬜ TODO |
| 3.15 | Request acknowledgement email | ⬜ TODO |
| 3.16 | Admin new-request notification email | ⬜ TODO |
| 3.17 | Status-change notification email | ⬜ TODO |
| 3.18 | Run Phase 3 tests | ⬜ TODO |

---

## PHASE 4 — Admin, Manage and Public Frontend Integration

**Goal:** Connect all UIs to production backend.

| # | Task | Status |
|---|---|---|
| 4.1 | Public: campaigns list → API | ⬜ TODO |
| 4.2 | Public: campaign detail → dynamic | ⬜ TODO |
| 4.3 | Public: homepage featured campaigns → API | ⬜ TODO |
| 4.4 | Public: request-help 3-step form → API | ⬜ TODO |
| 4.5 | Public: document upload step | ⬜ TODO |
| 4.6 | Public: success screen with request reference | ⬜ TODO |
| 4.7 | Public: contact form → API | ⬜ TODO |
| 4.8 | Foundation Admin: login page | ⬜ TODO |
| 4.9 | Foundation Admin: dashboard | ⬜ TODO |
| 4.10 | Foundation Admin: campaign management | ⬜ TODO |
| 4.11 | Foundation Admin: request list + detail + status | ⬜ TODO |
| 4.12 | Foundation Admin: document viewer | ⬜ TODO |
| 4.13 | Foundation Admin: send email to applicant | ⬜ TODO |
| 4.14 | Foundation Admin: profile/logout | ⬜ TODO |
| 4.15 | WEBSITTER Manage: login | ⬜ TODO |
| 4.16 | WEBSITTER Manage: dashboard | ⬜ TODO |
| 4.17 | WEBSITTER Manage: user management | ⬜ TODO |
| 4.18 | WEBSITTER Manage: role/permission management | ⬜ TODO |
| 4.19 | WEBSITTER Manage: audit logs | ⬜ TODO |
| 4.20 | Run Phase 4 integration tests | ⬜ TODO |

---

## PHASE 5 — Production, Deployment, Security, QA and Handover

**Goal:** Production-ready platform.

| # | Task | Status |
|---|---|---|
| 5.1 | Configure MongoDB Atlas production | ⬜ TODO |
| 5.2 | Configure Resend production domain | ⬜ TODO |
| 5.3 | Configure Render deployment | ⬜ TODO |
| 5.4 | Configure Cloudflare Pages (3 sites) | ⬜ TODO |
| 5.5 | Configure DNS / domains | ⬜ TODO |
| 5.6 | Configure HTTPS | ⬜ TODO |
| 5.7 | Configure production CORS | ⬜ TODO |
| 5.8 | Configure production environment variables | ⬜ TODO |
| 5.9 | Run full test suite against production | ⬜ TODO |
| 5.10 | Security acceptance criteria verification | ⬜ TODO |
| 5.11 | Production acceptance test (42-step scenario) | ⬜ TODO |
| 5.12 | Final documentation review | ⬜ TODO |
