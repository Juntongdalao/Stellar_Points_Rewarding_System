  7. Cross-cutting Enhancements
      - Navigation: reorganize Navbar into a collapsible drawer on mobile (DaisyUI drawer component) to keep it responsive; include a role switcher and quick links
        grouped by capability.
      - Error/loading UX: create reusable components (<QueryBoundary>, <InlineSpinner>, <ErrorBanner>) so every page handles React Query states consistently.
      - Utilize useMemo/useCallback for derived data (filtered lists, computed stats) and event handlers inside large tables/forms to keep renders fast on mobile.
      - Ensure every list view consumes pagination metadata from the backend, and consider infinite scroll for mobile (React Query’s fetchNextPage) where
        applicable.
  8. Testing & Accessibility
      - Add RTL/unit tests for key components (forms, tables, nav) and smoke-test pages with Cypress or Playwright.
      - Use DaisyUI’s accessible components plus manual checks (keyboard nav, focus styles, contrast) to satisfy the rubric’s A11y expectations.
  9. Deployment & CI/CD
      - Set up environment-specific configs (VITE_API_BASE_URL, staging/prod URLs) and scripts for building + deploying the frontend (e.g., Vercel, Netlify, or a
        static bucket fronted by the backend).
      - Configure CI (GitHub Actions) to run lint/tests, build backend/frontend, and run a basic integration test hitting the Express API; add deployment steps
        (e.g., pushing to Render/Fly.io for backend and Netlify for frontend).
      - Update INSTALL with prerequisites (Node 22 via nvm, SQLite, Prisma migrations, DaisyUI/Tailwind setup), explain how to run the seed script once it’s
        written, and document deployment environment + demo accounts; put the final URL into WEBSITE.
  10. Backend Coordination
      - Fix the small backend issue (prisma import in helpers/clearance.js) so organizer routes function.
      - Keep backend modularity by grouping future helper logic (QR payload builders, pagination utilities, validations) into the existing helpers/ and middleware/
        directories, and expose any new endpoints before wiring the corresponding React pages.


  Backend Completeness

  - Verify all rubric-required endpoints exist and are wired in the frontend: landing dashboards, redemption QR retrieval, manager suspicious flags/
    actions, organizer bulk award, superuser promotions.
  - helpers/clearance.js still imports Prisma dynamically (check backend/src/helpers/clearance.js); that TODO item mentioned earlier (missing
    import) should be confirmed and fixed if not already done.
  - Ensure every list endpoint enforces pagination (some now slice in memory—consider moving the pagination logic into SQL or a helper to keep
    responses scalable).

  Frontend Feature Parity

  - Confirm each role’s required pages (regular/cashier/manager/organizer/superuser) are implemented and reachable from the navbar or switcher.
  - Finish any remaining UI polish for cashiers/managers (e.g., suspicious transaction timelines, guest management, QR displays) per the PDF.
  - Build the mobile drawer navigation with DaisyUI to satisfy “Navigation” under Cross-cutting Enhancements (#7), incorporating role-grouped links
    and the interface switcher.

  Cross-Cutting Enhancements

  - Introduce reusable load/error components (QueryBoundary/InlineSpinner/ErrorBanner) and wrap every React Query consumer with them.
  - Audit list views to ensure they all read pagination metadata (count, page, limit) and consider adding infinite scrolling for mobile (React
    Query’s fetchNextPage).
  - Use useMemo/useCallback consistently in large tables/forms (some pages already do this; double-check others like promotions/events).

  Testing & Accessibility

  - Add React Testing Library unit tests for key components (Navbar, Card, transfer/redeem forms) and keep Cypress smoke tests up to date (login/
    cashier/manager flows).
  - Perform manual accessibility checks (keyboard nav, focus outlines, contrast ratios) and note them for the grading interview.

  Deployment & CI/CD

  - Wire VITE_API_BASE_URL and backend CORS to the eventual deploy URLs; populate WEBSITE with the public frontend link.
  - Add GitHub Actions (or similar) that lint, build both apps, run backend tests (if any), and execute Cypress against a local build or mocked API.
  - Document the deployment target (e.g., backend on Render, frontend on Netlify) and credentials in INSTALL; include how to run npm run seed and
    the final demo accounts.

  Once these are completed—and VERIFIED with the seed data and Cypress suite—you should meet the full CSC309 requirements. Let me know which area
  you want to tackle next (navigation drawer, tests, CI, etc.) and I can help drive it.