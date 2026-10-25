# Swan Turbines Foundation — Platform

A complete charity management platform for **Swan Turbines Foundation**.

## System Architecture

| Layer | Technology |
|---|---|
| Public website | HTML/CSS/Vanilla JS (Cloudflare Pages) |
| Foundation Admin | HTML/CSS/Vanilla JS (Cloudflare Pages) |
| WEBSITTER Manage | HTML/CSS/Vanilla JS (Cloudflare Pages) |
| Backend API | Python (FastAPI) on Render |
| Database | MongoDB Atlas |
| File storage | MongoDB GridFS |
| Email | Resend |
| Version control | GitHub |

## Domains

| Domain | Purpose |
|---|---|
| `swanturbinesfoundation.com` | Public website |
| `admin.swanturbinesfoundation.com` | Foundation admin panel |
| `manage.swanturbinesfoundation.com` | WEBSITTER super-admin |

## Local Development

### Prerequisites
- Python 3.11+
- MongoDB (local: `mongodb://localhost:27017`)
- pip

### Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env         # fill in values
python -m uvicorn app.main:app --reload --port 8000
```

### Serve frontend locally

```bash
# Any static server — e.g.:
python -m http.server 3000
# Open http://localhost:3000
```

### Run tests

```bash
cd backend
pytest
```

## Project structure

```
swan/                        ← project root
├── backend/                 ← Python FastAPI backend
│   ├── app/
│   │   ├── api/             ← route handlers
│   │   ├── core/            ← config, security, middleware
│   │   ├── models/          ← Pydantic schemas
│   │   ├── repositories/    ← data access layer
│   │   ├── services/        ← business logic
│   │   ├── providers/       ← storage, email, auth adapters
│   │   └── main.py          ← FastAPI application entry point
│   ├── tests/               ← automated tests
│   ├── requirements.txt
│   └── .env.example
├── js/api/                  ← frontend API client layer
│   ├── client.js
│   ├── campaigns.js
│   ├── requests.js
│   └── contact.js
├── index.html               ← existing public frontend
├── campaigns.html
├── request-help.html
├── contact.html
├── (other public pages)
├── admin/                   ← Foundation admin SPA pages
└── manage/                  ← WEBSITTER manage SPA pages
```

## Documentation

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — system architecture
- [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) — phased plan
- [`PROJECT_STATE.md`](PROJECT_STATE.md) — current state / resumption
- [`CHECKPOINTS.md`](CHECKPOINTS.md) — per-phase checkpoints
- [`DECISIONS.md`](DECISIONS.md) — architectural decisions
- [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md) — open issues

## Phase model

| Phase | Goal |
|---|---|
| 1 | Foundation, repository, architecture |
| 2 | Database, auth, RBAC, storage, core services |
| 3 | Business features (campaigns, requests, documents, contact, email) |
| 4 | Admin, manage, and public frontend integration |
| 5 | Production deployment, security, QA, handover |
