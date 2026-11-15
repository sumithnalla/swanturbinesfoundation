Task: READ-ONLY SEO and indexability audit of the Swan Turbines Foundation
website, before we submit it to Google Search Console.

Rules
- Do NOT modify, rename or delete any existing file. Do not commit, deploy, or
  change any Cloudflare, Supabase or Google setting.
- Live checks are GET/HEAD requests only. No form submissions, no POSTs, no
  logins.
- Write the report to ONE new file, `seo_audit_report.md`, OUTSIDE the
  site's publish/staging folder (or in a gitignored location) so it can never
  be deployed publicly. Do not commit it.
- No guessing: if something can't be verified, say NOT VERIFIED. Cite file
  paths or URLs for every finding. No secrets in the report.

Audit
1. PAGE INVENTORY: list every page/route in the repo and on the live domain,
   and mark each: public-marketing / form / staff-admin / superadmin / login /
   request-status-or-reference page / thank-you / test / legacy.
2. KEEP OUT OF GOOGLE: confirm which pages must not be indexed (admin,
   superadmin, staff login, anything showing request data or reference IDs,
   thank-you pages, test pages). For each, report whether it is currently
   reachable without login, linked from public pages, in the sitemap, or has
   any noindex protection (meta tag or X-Robots-Tag header). Note: do not rely
   on robots.txt alone to hide them, because it reveals the paths; recommend
   noindex headers via Cloudflare Pages `_headers`, and confirm those pages
   require authentication anyway.
3. DOMAIN HYGIENE: check www vs non-www, http to https redirects, and whether
   the default *.pages.dev domain and preview deployments are publicly
   indexable duplicates of the site.
4. CRAWL FILES: current robots.txt and sitemap.xml (existence, contents,
   only canonical public URLs).
5. PER-PAGE ON-PAGE SEO for each public page: title, meta description, one H1,
   heading order, canonical tag, lang, viewport, Open Graph/Twitter tags,
   image alt text, internal links, favicon, 404 handling and real 404 status.
6. JS-RENDERING: for each public page, is the main content present in the raw
   HTML, or only after JavaScript or a Supabase fetch? Flag content Google may
   miss.
7. STRUCTURED DATA: what exists; what is missing (Organization/NGO, contact
   details, breadcrumbs).
8. PERFORMANCE: heavy images and formats, render-blocking scripts, fonts,
   caching headers. If Lighthouse is already installed, run it on the 5 most
   important public pages; do not install anything in the repo.
9. SEARCH CONSOLE READINESS: recommend the best verification method (DNS TXT
   through Cloudflare preferred) and which property type to use. Do not add
   anything yet.

Output (keep it concise, tables over prose)
A. Summary: top 10 issues
B. Findings table: issue | severity (P0 = fix before Search Console, P1, P2) |
   evidence | exact fix (file and change)
C. Pages to noindex, pages to include in the sitemap
D. Missing content or keyword opportunities for a charity foundation, based
   only on what the site actually offers
E. Decisions I must make (canonical domain, descriptions, organization
   details)