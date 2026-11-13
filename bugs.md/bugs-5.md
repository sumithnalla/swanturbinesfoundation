

1. **Loading Animation:** Increase the existing logo animation's(while loading pages) maximum size to approximately 2× its current size while preserving the animation style and smooth transitions.

2. **Company Contact Information:** Remove all company phone numbers from the entire public website and replace all company point-of-contact email addresses with `aruna@swanturbinesfoundation.com`. Update the office address everywhere to: `Plot No. 28 & 29, CBCID Officers Colony, Lane-5, Hydernagar, Kukatpally, Hyderabad - 500085, Telangana, India.` Do not remove applicant phone-number fields or internal contact functionality.

3. **Admin Portal Links:** Remove the Admin Portal link from the footer of every public-facing page.

4. **Remove Public Donations:** Remove every public-facing "Donate Now" button, donation CTA, and donation-related action throughout the website, including homepage featured campaign cards and individual campaign pages. Remove associated public donation flows where applicable, without affecting unrelated campaign content, images, layouts, or other functionality.

5. **Refund/Cancellation Policy:** Remove all links to this policy from navigation, footers, and other website sections. Keep `refund-policy.html` intact; do not delete the file.

6. **How It Works:** Remove the How It Works page from public navigation and all internal website links, but preserve its page file for possible future reuse.

7. **Contact Page:** Display the updated company email address and office address, along with working hours: **Monday–Saturday, 10:00 AM–6:00 PM**. Preserve the existing contact form and its functionality.

8. **Homepage Hero:** Hide the entire Funds Raised/Total Raised statistics box from the homepage hero. Prefer a reversible implementation, such as a clearly commented-out component or feature flag, so it can be restored easily without rebuilding it. Do not modify other hero content.

9. **Footer Cleanup:** Remove the entire **Learn** column from every public-facing page footer while keeping the remaining footer columns correctly aligned and responsive.

10. **Resources Rename:** Rename **Resources** to **Our Works** everywhere it appears in public navigation, page headings, buttons, breadcrumbs, and related interface labels. Preserve the existing page functionality and URLs unless a change is genuinely necessary.

11. **Policy Effective Dates:** Update the Effective Date on both the Privacy Policy and Terms & Conditions pages to **November 1, 2026**.

12. **Company Admin Mobile Optimization:** Audit and fix responsiveness throughout the Company Admin panel, particularly the **Administrator Profile** page shown in the supplied screenshot. Fix overflowing email addresses, clipped status badges, oversized cards, button alignment, navigation, spacing, typography, forms, and all other problematic elements. Ensure every page and control remains usable on small phones, modern phones, tablets, and desktops.

13. **Final Consistency Audit:** Search the entire codebase for remaining donation buttons, outdated company contact information, Admin Portal links, Learn footer columns, old Resources labels, and outdated policy dates. Ensure no unintended occurrences remain in the active website.

**Implementation requirements:** Inspect the existing codebase before editing, reuse existing components, preserve unrelated content, and avoid unnecessary redesigns or rewrites. Test all affected pages on desktop and mobile, verify that forms and navigation still work, and report the files changed, tests performed, and any remaining issues.