Implement the following additional changes across the Swan Turbines Foundation website:

1. **Terms & Conditions:** Remove points 5 through 11 entirely from the Terms & Conditions page. Ensure the remaining sections are properly numbered and the layout remains clean.

2. **Campaigns Page:** Remove all fundraising progress information from campaign cards, including the progress bars, amount raised, and percentage indicators. Preserve campaign images, descriptions, categories, buttons, card dimensions, and overall design.

3. **Request Help Form:**
   - In Step 2 (Request Details), the **Estimated Assistance Amount** field must strictly accept numeric input only. Prevent alphabets and other invalid characters, and implement proper frontend and backend validation.
   - Add the missing website footer to the Request Help page, matching the existing global footer design and functionality.

4. **Company Admin – Pending Requests Counter:** Currently, the Help Requests badge in the sidebar incorrectly displays `0` when navigating to Contact Messages or Administrator Profile, even when pending requests exist. Fix the underlying data-fetching/state-management issue so the actual pending request count is displayed consistently across every Company Admin page and updates correctly when request statuses change.

**Important:** Inspect the existing implementation before making changes. Preserve all unrelated functionality and designs. Verify each change across desktop and mobile, and test the actual database-backed pending count rather than using hardcoded values.