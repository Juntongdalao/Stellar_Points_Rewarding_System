  - Fix blocking bug: isOrganizer references prisma without importing it, so any call that checks organizer status (e.g., awarding event points or organizer-only
    guest mutations) will throw ReferenceError: prisma is not defined at runtime (backend/src/helpers/clearance.js:3-46). Import the Prisma client there (or pass
    it in) before exercising the organizer-only endpoints.
  - The spec’s “pre-populated database” requirement isn’t met—there’s only a superuser bootstrap script and no seed data for the required 10+ users, 30+
    transactions, 5+ events, and 5+ promotions (backend/prisma/createsu.js:1-63). Add a seeding script plus fake media assets so graders can test pagination-heavy
    pages immediately.

FrontEnd TODO: 
  1. Bootstrap UI Foundation
      - Add Tailwind + DaisyUI to the Vite project (npm install -D tailwindcss postcss autoprefixer daisyui + init config) and wire the CSS imports so every
        component can use DaisyUI classes for responsive layout.
      - Define a global design system (colors, typography, spacing) in tailwind.config.js and create shared layout components (AppShell, Card, DataTable,
        FilterBar) that encapsulate DaisyUI classes; this keeps styling consistent and responsive.
      - Extend apiClient to centralize error handling/toasts/loading indicators so React Query hooks can share the same UX, and ensure the backend remains modular
        by hitting the dedicated Express routers already exposed.
  2. Authentication & Global State
      - Keep Zustand as the single source of truth for user and token, but add derived selectors + actions (e.g., hasRole, logout, refreshProfile) and memoize them
        with useMemo/useCallback inside components to avoid unnecessary rerenders.
      - Build an <AuthGate> component that wraps ProtectedRoute, prefetches /users/me via React Query, and redirects based on role—this guarantees every route has
        the user info needed for nav, landing dashboards, and role switches.
      - Implement a role switcher UI (per the rubric’s “interface switching”) so a manager/cashier can quickly jump between regular/cashier/manager views without
        manually editing URLs.
  3. Regular User Experience
      - Landing/dashboard (/me): show points, recent transactions, upcoming events, promotions via parallel React Query hooks; use DaisyUI cards and responsive
        grids.
      - Points & transactions: polish existing pages with DaisyUI tables, add order-by controls, and use useMemo to derive badge colors and filtered subsets.
      - Transfers, redemption, QR pages: reuse DaisyUI form components, add form validation feedback, and ensure the redemption QR fetches transaction details from
        the backend (handle refresh by retrieving /users/me/transactions/:id if location.state is empty).
      - Events: add list/detail pages with RSVP/leave buttons, pagination, filters (location, started, ended) hitting the /events endpoints; include QR display if
        required and ensure responsive card layout.
      - Promotions: new page calling /promotions (paginated) rather than piggybacking on /users/me, clearly separating automatic vs one-time promos.
  4. Cashier & Manager Workflows
      - Cashier dashboard: combine “create purchase/adjustment” and “process redemption” with quick links to scan QR (manual entry) and show recent transactions
        they created.
      - Manager: expand beyond users/transactions—add full CRUD pages for promotions and events (list, create, edit, publish/delete) using React Query mutations
        and optimistic updates; include organizer/guest management UIs, event points awarding (single + bulk), and suspicious transaction review actions.
      - Transaction detail view already exists; enhance it with DaisyUI tabs, a timeline of related adjustments, and use useCallback for event handlers to keep re-
        renders down.
  5. Event Organizer Portal
      - Build dedicated routes (e.g., /organizer/events, /organizer/events/:id) that call the organizer-specific endpoints (add/remove guests, edit limited fields,
        award points). Surface these only for roles with organizer assignments.
      - Provide responsive list views with search/filter/pagination, and integrate QR or shareable codes for events if needed.
  6. Superuser Tools
      - Extend Manager Users page or add a separate view where superusers can promote/demote managers and fellow superusers while respecting backend constraints;
        include UI cues showing suspicious flags and prevent promoting suspicious users to cashier per backend rules.