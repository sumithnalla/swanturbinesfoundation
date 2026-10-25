# Known Issues — Swan Turbines Foundation

## OPEN ISSUES

### KI-001 — Campaign financial data inconsistency

**Severity:** Medium
**Phase affected:** 3, 4

**Description:**
The existing frontend shows campaign progress percentages and raised amounts, but:
- Some detail pages show USD amounts while list cards show INR amounts
- Progress values appear hardcoded and may not reflect actual data
- No canonical financial target is defined anywhere

**Decision needed:**
Are campaign progress/raised amounts real data the foundation wants to track? Or are they placeholder marketing values?

**Current approach:**
Campaign model includes optional `target_amount`, `raised_amount`, `currency` fields but does NOT force population. Seed data will use the display values from existing HTML as approximate references, clearly marked as seed/prototype data.

---

### KI-002 — Campaign detail URLs

**Severity:** Low
**Phase affected:** 4

**Description:**
The existing 8 static campaign HTML files will remain. After Phase 4, the canonical route becomes `campaign.html?slug=<slug>`. Existing routes (e.g., `campaign-hunger.html`) should redirect to the new canonical URL or be left as-is for backward compatibility.

**Current approach:**
Implement `campaign.html?slug=<slug>` as the new dynamic page. Existing static pages are left untouched — they will continue to show static content until they are explicitly deprecated.

---

### KI-003 — Session duration for admin

**Severity:** Low
**Phase affected:** 2

**Decision needed:**
How long should admin sessions last? Existing frontend uses 8-hour sessions. Standard recommendation for sensitive admin panels is shorter (1–4 hours with refresh).

**Current approach:**
Default to 8-hour JWT expiry matching existing behavior. Can be changed via `ACCESS_TOKEN_EXPIRE_MINUTES` env variable.

---

### KI-004 — Email notification recipients

**Severity:** Medium
**Phase affected:** 3

**Description:**
When a new help request is submitted, an admin notification email should be sent. But which email address(es)?

**Found in existing code:** `aruna@swanturbinesfoundation.com` (from start.md Resend example)

**Current approach:**
Use `ADMIN_NOTIFICATION_EMAIL` env variable. Default in .env.example to `aruna@swanturbinesfoundation.com`.

---

### KI-005 — Resend sender domain (development only)

**Severity:** Low
**Phase affected:** 1, 2, 3

**Description:**
Resend API key uses `onboarding@resend.dev` as the only authorized sender in sandbox mode. Production domain `swanturbinesfoundation.com` must be verified with Resend before production emails work.

**Current approach:**
Use `onboarding@resend.dev` in development. Production sender configured via `RESEND_FROM` env variable (Phase 5).

---

### KI-006 — Document access authorization policy

**Severity:** High
**Phase affected:** 2, 3

**Description:**
Uploaded applicant documents (Aadhaar, medical records, etc.) are sensitive. The specification requires authorization before download, but does not specify exactly which roles can access documents.

**Decision needed:**
- Can all foundation_admin staff view all documents?
- Is there a need for more granular document access (e.g., only the assigned reviewer)?

**Current approach:**
Implement `requests.view_documents` permission. All users with this permission can download documents for requests they have access to. Role assignment determines access.

---

### KI-007 — Legacy page branding inconsistency

**Severity:** Low
**Phase affected:** None (cosmetic)

**Description:**
Several pages have incorrect titles: some say "Brightaid", some say "Swan Turbans" instead of "Swan Turbines". These should be fixed but are not part of the backend integration scope.

**Current approach:**
Not blocking. Can be corrected incrementally during Phase 4 HTML integration work.
