Super-Admin Login: Fix the password visibility toggle so the eye icon works immediately on the initial login screen and after logout. Add a proper loading indicator during sign-in.

Multi-Role User Management: Allow super-admins to assign multiple roles to a user simultaneously, when creating users and when editing existing users. Replace single-role selection with an intuitive multi-select UI. Investigate and implement all necessary database, Supabase schema, authorization, RBAC, backend, and session changes. Ensure users receive the correct combined permissions without weakening security.

User Account Management UI: Fix the broken role selector, cramped dropdowns, clipped action buttons, and overflowing user-management table shown in the screenshots. Ensure all controls remain usable and readable.

Complete Responsive Optimization: Properly optimize both admin panels across all screen sizes and device types, including older small-screen phones (such as iPhone 5s), modern iPhones, foldable devices, tablets, laptops, desktops, and ultrawide monitors. Fix navigation, sidebars, tables, forms, dropdowns, modals, dashboards, cards, typography, spacing, and action buttons. Use responsive layouts, mobile navigation, suitable table-to-card transformations where appropriate, and touch-friendly controls. Prevent horizontal overflow, clipped content, overlapping elements, and unusably small controls.

Think critically and inspect before making changes. Identify every necessary frontend, backend, Supabase database, migration, RLS policy, Edge Function, authentication, session-management, and RBAC change. Reuse existing components and preserve desktop styling and existing functionality.

Test multi-role creation and editing, combined permissions, unauthorized access restrictions, login/logout behavior, and responsive layouts at representative viewport sizes, including 320px, 375px, 390px, 430px, 768px, 1024px, 1366px, and 1920px. Also verify intermediate widths and foldable-device layouts.

before making changes. Identify every necessary frontend, backend, Supabase database, migration, RLS policy, Edge Function, authentication, session-management, and RBAC change. Reuse existing components and preserve desktop styling and existing functionality.

Test multi-role creation and editing, combined permissions, unauthorized access restrictions, login/logout behavior, and responsive layouts at representative viewport sizes, including 320px, 375px, 390px, 430px, 768px, 1024px, 1366px, and 1920px. Also verify intermediate widths and foldable-device layouts.