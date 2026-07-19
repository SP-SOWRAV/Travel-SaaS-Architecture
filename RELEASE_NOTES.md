# Release Notes — v1.0.0

**Release date:** 2026-07-19
**Status:** Production Ready

## What this release is

The first client-deliverable release of the OTA SaaS Platform — a multi-tenant
travel-agency booking, workflow, and finance system. All 50 planned tasks (T01–T50)
are complete, followed by a full production-readiness audit and a hardening pass that
closed every finding the audit rated Critical or High.

## Features (T01–T50)

- **Foundation** — NestJS API + Next.js web app in an npm-workspaces monorepo,
  structural multi-tenant isolation (every Agency-scoped query is tenant-scoped by
  construction, not by convention), environment validation that fails fast on
  misconfiguration, a live-DB health check endpoint.
- **Authentication** — JWT-based login, bcrypt password hashing, role-based access
  control (Agency Admin / Branch Manager / Agent).
- **Agency core** — Agency Settings (branding, currency, timezone, document prefixes),
  Branches, staff Users, My Profile, Customers.
- **Reference data** — Countries, Cities, Airports, Airlines (seeded global data,
  shared across all Agencies).
- **Flight Booking** — full booking aggregate (Passengers, Sectors, Fares, Taxes,
  Tickets, Remarks), a booking-creation wizard, and list/detail pages.
- **Workflow Engine** — a single frozen stage-adjacency map governs every booking's
  lifecycle (Draft → Reserved → Ticket Issued → Invoiced → Paid → Completed, with
  Cancelled/Refunded branches), with a full immutable transition-history audit trail.
- **Finance** — Invoices, Payments + Receipts, Refunds + Transactions, wired to the
  Workflow Engine so a payment or refund correctly drives the booking's own status.
- **Reports** — Sales, Outstanding, and Agent Performance aggregation, with
  date-range/branch filters.
- **Dashboard** — at-a-glance KPIs and recent activity for Agency Admin / Branch
  Manager roles.
- **Activity Log** — an automatic, tamper-evident audit trail of every mutating
  request, queryable per Agency.

## Hardening (this release)

A full production-readiness audit (scored 61/100, "Not Production Ready") identified
5 Critical and 10 High-severity gaps. Every one was fixed, individually verified
against the running application, and committed — re-audit score: **78/100, Production
Ready**.

**Critical fixes:**
- Pagination added to every list endpoint (previously unbounded).
- Persistent Sidebar/TopBar navigation shell added to the web app (previously no
  shared navigation existed at all).
- Crash boundary, 404 page, and global loading fallback added.
- Dockerfiles for both apps + a CI pipeline that builds and tests on every push.
- An automated test suite added (unit tests + a critical-path E2E suite) where none
  existed before.

**High-severity fixes:**
- Idempotency-Key handling on payment/refund/ticket/reservation endpoints — a retried
  request now returns the original result instead of double-charging or
  double-issuing.
- Multi-step Finance/Workflow writes (payment recording, refund processing, ticket
  issuance) now commit as a single atomic database transaction.
- Sub-entity deletes (Passenger/Sector/Fare) that hit a foreign-key conflict now
  return a clear `409 Conflict` instead of an unhandled `500`.
- Rate limiting: per-IP and per-Agency limits on every request, plus a stricter,
  separate limit on login to blunt credential stuffing.
- Security headers (Helmet) on every API response.
- Skeleton loaders replacing blank/bare-text loading states across every list and
  detail page.
- A shared confirmation modal for Cancel Booking and Process Refund, matching the
  pattern already used for Branch deletion.
- Inline, field-specific validation errors (instead of only a generic banner), and
  every data table now scrolls within its own container on narrow screens instead of
  breaking the page layout.
- Sector/Fare/Tax/Ticket/Remark API responses now go through an explicit mapper
  (defense against a future schema change silently leaking a new column), matching
  every other module.
- Structured JSON request logging, correlated by request ID and tenantId/userId.

## Handover verification (this release)

Before tagging v1.0.0, the following were verified directly (not assumed):

- **Production build** — `apps/api` and `apps/web` both build cleanly from a clean
  state with zero errors.
- **Docker deployment** — both Dockerfiles build successfully; the resulting images
  were run together against a live Postgres instance and exercised through a full
  browser session (login → navigate → data renders) with zero console errors.
- **Database migrations** — all 21 migrations apply cleanly to a brand-new, empty
  database with no errors and no drift; the required seed (reference data) runs
  cleanly afterward.
- **Environment variables** — every variable the app reads is documented in
  `ENVIRONMENT_VARIABLES.md`; a missing/malformed `DATABASE_URL` or `JWT_SECRET` was
  confirmed live to fail the container fast with a specific error message, not a
  silent misconfiguration.
- **Production smoke test** — the full critical business path (login → create
  booking → reserve → issue ticket → generate invoice → record payment → booking
  auto-completes) was run end-to-end against the built Docker image with a real
  database, including a cross-tenant isolation check (a second Agency's token
  correctly gets `404`, not `403` or leaked data). Zero errors.

No release-blocking bugs were found during this verification pass.

## Known non-blocking issues

These were identified by the audit, rated Medium or Low severity (explicitly not
launch-blocking), and are unchanged in this release — no code beyond the
Critical/High fixes above was modified:

**Medium:**
- Some enums (staff role, payment method, cabin class, invoice status) are redeclared
  independently in the frontend instead of imported from the shared types package.
- The Agency Logo upload endpoint described in the API spec was never built (logo is
  set via a plain URL field today).
- Foreign-key relations don't yet declare an explicit `onDelete` rule (relies on the
  database's implicit default).
- Password policy is length-only (8 characters minimum, no complexity requirement).
- Focus rings are suppressed platform-wide in favor of a border-color change; modals
  don't trap Tab focus or restore it on close.
- A few secondary UI actions (filter dropdowns, the staff activate/deactivate toggle)
  don't surface a visible error if their request fails.
- Some response-mapping and ID-generation logic is duplicated near-identically across
  several files instead of being extracted into one shared helper.
- One page (`bookings/[id]`) inlines its tables directly instead of delegating to
  components, unlike every other list page.
- The production `start` npm script isn't a true `node dist/main.js` entrypoint (the
  Docker image bypasses this and is unaffected); no deployment runbook/backup
  strategy is documented beyond this release's guides.

**Low:**
- The Next.js root `/` route is an unused placeholder page.
- No OpenAPI/Swagger documentation is generated for the API.
- A handful of foreign-key columns (`Booking.agentId` and four others) lack a
  dedicated index.
- The Activity Log stores each mutating request's full response body as JSONB,
  larger than strictly necessary.
- Component file naming (kebab-case) doesn't match the coding standard's documented
  convention (PascalCase); a few files have grown large.

None of the above require any redesign of what's already built — see
`CLIENT_HANDOVER_CHECKLIST.md` for recommended next steps.
