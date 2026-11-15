# SEO implementation for swanturbinesfoundation.com (3 small phases, zero visible change)

Use `seo_audit_report.md` as the source of truth. Implement it in the phases below, **one phase per session**, finishing and verifying one before starting the next.

## Decisions already made by the owner

- Canonical site: `https://swanturbinesfoundation.com/` (apex, HTTPS, extensionless routes such as `/about`). Brand name: **Swan Turbines Foundation**. The current logo is the real logo.
- **Indexable pages only:** `/`, `/about`, `/campaigns`, `/contact`, `/resources`, `/privacy-policy`, `/terms-and-conditions`, plus the two switches below.
- **Everything else is noindex and out of the sitemap**, including `/how` and `/refund-policy` (keep the files, do not delete them, do not link them), `/donate`, `/donation-details`, all admin, super-admin, manage, login, dashboard, profile and thank-you pages.
- Search Console and its DNS verification are handled by the owner. Do not touch DNS or Search Console.

```
INDEX_REQUEST_HELP   = yes
INDEX_CAMPAIGN_PAGES = yes    # change to yes only after confirming all 8 /campaign-* pages are real, current programs
```

If `INDEX_CAMPAIGN_PAGES = no`, the eight `/campaign-*` pages get noindex and stay out of the sitemap, but still get their title and brand-spelling fixes in Phase 2.

## Absolute rules (nothing may change for visitors or staff)

1. **No visual or behavioural change.** Do not touch visible text, CSS, fonts, font sizes, spacing, buttons, layout, images shown on pages, JavaScript behaviour, forms, Turnstile, Supabase, Drive or the admin flows.
2. Allowed edits are limited to: `<head>` tags, `_headers`, `robots.txt`, `sitemap.xml`, `404.html`, and the staging script allowlist. Phase 3 items are individually gated (see there).
3. **Before changing anything**, record a snapshot table of every route and alias in the inventory (status code, redirect target, key response headers) from the live site. After each phase, repeat it and show the diff. The only differences allowed are the ones the phase intends.
4. Never print or commit secrets. Do not add dependencies to the site. No new status documents; give one short report per phase.
5. **Approval handoff:** after local checks pass, stop, give the exact deploy and rollback commands, and wait for me to reply `deploy`. Then deploy, verify live, report.
6. Do not rely on `robots.txt` to hide anything. Never list admin or private paths in `robots.txt`. Noindex only works if Google can crawl the page, so do not `Disallow` noindexed pages.
7. Write only facts that already exist on the site. No invented claims, awards, registration numbers, addresses, dates or statistics.

## Phase 1: Index control and crawl files

1. **Real 404.** Cloudflare Pages serves the homepage with HTTP 200 for unknown URLs because there is no top-level `404.html`. Add a simple `404.html` using the site's existing CSS and logo, with `<meta name="robots" content="noindex">`, no redirect script and a link to the homepage. **Before adding it**, list every URL the frontend navigates to (links, `location.href`, JS-built URLs) and confirm each resolves to a real file. If anything relies on the fallback, handle it explicitly first and report it. Then verify: unknown paths return 404, while every real route, `.html` alias (308 as today), `/manage/` and query-string URLs such as `/admin-request-detail?id=...` still behave exactly as in the snapshot. `/adminlogin/` and `/company-admin/` should now return 404.
2. **`robots.txt`** at the root: allow all, plus a `Sitemap: https://swanturbinesfoundation.com/sitemap.xml` line. No `Disallow` lines for private routes.
3. **`sitemap.xml`** at the root: absolute, extensionless, canonical URLs for the approved indexable pages only (respecting the two switches). No `lastmod` unless it can be made accurate. No query strings, no references, no excluded routes.
4. **`_headers`:**
   - `X-Robots-Tag: noindex, nofollow` for all keep-out routes and their `.html` and trailing-slash aliases. Use compact patterns built from the inventory and stay under Pages' 100-rule limit.
   - `X-Robots-Tag: noindex` for the default `*.pages.dev` host using the host-specific rule documented by Cloudflare (verify against current Cloudflare docs).
   - **A header pattern must never match an indexable URL.** After deploy, HEAD every indexable URL on the apex and confirm there is **no** `X-Robots-Tag`. This is the most important test in the whole project, because a wrong pattern would remove the site from Google.
5. Add `<meta name="robots" content="noindex, nofollow">` to keep-out pages that lack it (`admin`, `manage/index`, `login`, `dashboard`, `profile`, `donate`, `donation-details`, `how`, `refund-policy`, and the `/campaign-*` pages if the switch is `no`). Leave existing noindex tags unchanged. This is head-only.
6. Update `scripts/stage-pages.ps1` to copy exactly `_headers`, `robots.txt`, `sitemap.xml` and `404.html`, keeping all existing safeguards (such as rejecting `.env`).
7. **www:** check what `https://www.swanturbinesfoundation.com/` serves now. It should end at the apex via a permanent redirect. If this needs a Cloudflare dashboard Redirect Rule, give me the exact steps instead of attempting it.

**Phase 1 verification:** `robots.txt` is `text/plain`; `sitemap.xml` is XML and every URL in it returns 200 with no noindex; unknown URLs return 404; keep-out routes still serve as before but carry noindex; the pages.dev host is noindex; the apex is not; the before/after route snapshot differs only in those intended ways.

## Phase 2: Metadata (head-only)

For every public page (and for the noindexed `/campaign-*`, `/how`, `/refund-policy` pages, titles and descriptions only):

1. **Title** in the pattern `<Page topic> — Swan Turbines Foundation`, about 60 characters or fewer, unique. Replace every "Brightaid" and "Swan Turbans" in titles and meta descriptions with "Swan Turbines Foundation". Keep the homepage's "— Impact Through Kindness" tagline if it reads well.
2. **Meta description**, unique, about 120 to 155 characters, written only from that page's own existing content.
3. **Canonical** self-referential link (`https://swanturbinesfoundation.com/<route>`, extensionless; `/` for the homepage) on indexable pages only. Do not add canonical to noindexed pages.
4. **Open Graph and Twitter** tags on indexable pages: `og:type`, `og:site_name`, `og:title`, `og:description`, `og:url`, `og:image` (use the existing logo file with an absolute URL for now), `twitter:card=summary`. Flag that a proper 1200x630 share image would be better later.
5. **JSON-LD `Organization`** (schema.org `NGO` if appropriate) on the homepage only, using only name, URL, logo and contact details that already appear on the site. No breadcrumbs (the site has none).
6. Do **not** edit visible text. List any visible "Swan Turbans" or "Brightaid" occurrences in the report for me to decide.

**Gate:** a `git diff` of every changed HTML file must show changes only inside `<head>`; the `<body>` must be byte-identical. Validate the final HTML and the JSON-LD.

## Phase 3: Optional improvements (each item only if it passes its gate, otherwise skip and list it)

1. **Missing H1 on `/about`** (and `/donation-details`, which is noindexed, so skip it). Only if converting the first heading to H1 produces **zero visual difference** (same classes and verified computed styles at desktop and mobile widths). If any style differs, skip it.
2. **Crawlable links.** Navigation uses `<button onclick>` in places (for example `campaigns.html`). Convert to real `<a href>` only where the anchor can carry the same classes with zero visual and behavioural change. Otherwise skip; the sitemap already covers discovery.
3. **Image weight.** Several campaign PNGs are 2.3 to 2.6 MiB. Only recompress with the **same filename, format and dimensions** and no visible quality loss. Do not switch formats or touch references. Do not add long cache rules for unversioned assets.
4. Everything else in the audit (fonts, responsive images, cache tuning) goes into a short "future work" list, not implemented.

For gates that need visual comparison, use screenshots at desktop and mobile widths before and after, or skip the item if no screenshot tool is available.

## Final report per phase (short)

Files changed with one-line reasons; the before/after route snapshot diff; test results with actual outputs; deploy commands; rollback commands; anything skipped and why.