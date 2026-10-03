# Architecture — Swan Turbines Foundation

## System Overview

```
                    INTERNET
                       │
             ┌─────────┴─────────┐
             │                   │
             ▼                   ▼
       Public Website       Admin / Manage
       Cloudflare Pages     Cloudflare Pages
       (HTML/CSS/JS)        (HTML/CSS/JS)
             │                   │
             └─────────┬─────────┘
                       │ HTTPS
                       ▼
            api.swanturbinesfoundation.com
                       │
                       ▼
               Python Backend (FastAPI)
                       Render
                       │
          ┌────────────┼─────────────┐
          │            │             │
          ▼            ▼             ▼
       Services    Auth/RBAC      Audit
          │
     ┌────┼───────────┐
     │    │           │
     ▼    ▼           ▼
Repository Storage   Email
     │       │         │
     ▼       ▼         ▼
 MongoDB   GridFS    Resend
 Atlas
```

## Backend Layer Breakdown

```
API Route Handler  (app/api/v1/*)
        ↓
Service Layer      (app/services/*)
        ↓
Repository Layer   (app/repositories/*)
        ↓
MongoDB Provider   (motor AsyncIOMotorClient)
```

### Why this separation?

- **API handlers** only deal with HTTP concerns: parse request, call service, return response.
- **Services** contain business logic. They are provider-agnostic.
- **Repositories** define data-access interfaces. Swapping MongoDB → Supabase means writing a new repository, not rewriting services.
- **Providers** wrap external services (GridFS, Resend) behind abstract interfaces.

## Key Abstractions

### Storage

```python
class StorageProvider(Protocol):
    async def store(self, filename, content, content_type) -> str: ...
    async def retrieve(self, storage_id) -> bytes: ...
    async def delete(self, storage_id) -> None: ...
```

Current implementation: `GridFSStorageProvider`

### Email

```python
class EmailProvider(Protocol):
    async def send(self, to, subject, html, from_addr) -> None: ...
```

Current implementation: `ResendEmailProvider`

### Auth

JWT-based session tokens.  
Passwords hashed with bcrypt via passlib.  
Tokens stored in HTTP-only cookies (admin/manage panels).

## Collections (MongoDB)

| Collection | Purpose |
|---|---|
| `users` | All admin/manage users |
| `roles` | Role definitions |
| `permissions` | Permission definitions |
| `role_permissions` | Many-to-many join |
| `user_roles` | Many-to-many join |
| `campaigns` | Campaign records |
| `help_requests` | Help request records |
| `request_documents` | Document metadata (bytes in GridFS) |
| `contact_submissions` | Contact form records |
| `audit_logs` | Append-only audit trail |
| `sessions` | Admin session tokens |

## Request Status Machine

```
Pending → Under Review → Accepted
                       → Rejected
```

Allowed values: `pending`, `under_review`, `accepted`, `rejected`

## Campaign Status

`draft` → `active` → `completed` | `paused`

## RBAC Model

```
User → UserRole → Role → RolePermission → Permission
```

Permission format: `resource.action`

Examples:
- `campaigns.read`
- `campaigns.create`
- `campaigns.update`
- `campaigns.delete`
- `requests.read`
- `requests.update_status`
- `requests.view_documents`
- `users.create`
- `users.update`
- `users.disable`
- `audit.read`

## Roles (initial)

| Role | Description |
|---|---|
| `super_admin` | WEBSITTER developer/owner - full access |
| `websitter_staff` | WEBSITTER technical staff |
| `foundation_admin` | Foundation staff - campaign/request management |
| `foundation_staff` | Foundation staff - limited read/write |

## Request Reference Format

```
STF-YYYY-NNNNNN
```

Example: `STF-2026-000184`

Generated server-side using atomic counters or padded sequential IDs. Never `Math.random()`.

## API Versioning

All API endpoints are prefixed with `/api/v1/`.

## Security Principles

- All sensitive data access requires server-side authorization
- Documents served only through authorized download endpoints
- No secrets in frontend code
- bcrypt password hashing
- HTTP-only cookies for auth tokens
- Rate limiting on auth endpoints
- Audit logging of all privileged actions
- CORS restricted to known origins in production
