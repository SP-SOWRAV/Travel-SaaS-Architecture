# TASKS.md
## OTA SaaS Management Platform — Development Task Sequence

**Governed by:** MASTER.md (frozen). Every task below complies with its architecture, terminology, module list, and folder strategy. If a task appears to conflict with MASTER.md, MASTER.md wins — stop and flag it rather than improvising.

**Rules for execution:**
- Tasks are strictly sequential. Do not start task N+1 until task N's acceptance criteria pass.
- The project must build and run after every single task.
- No task references a file, entity, or endpoint that a later task creates.
- Each task is scoped to ~15–30 minutes.

---

## PHASE 1 — FOUNDATION

### T01 — Initialize Monorepo & Tooling
**Objective:** Create the root monorepo workspace with package manager workspaces configured for `apps/*` and `packages/*`.
**Why Now:** Nothing can be built without a workspace to build it in.
**Dependencies:** None.
**Files to Create:** `package.json` (root), `pnpm-workspace.yaml` (or npm/yarn workspaces equivalent), `.gitignore`, `.editorconfig`, root `tsconfig.base.json`.
**Files to Update:** None.
**Expected Output:** `apps/` and `packages/` directories exist; `install` runs cleanly at root with zero apps yet.
**Acceptance Criteria:** Root install succeeds; workspace resolves `apps/*` and `packages/*` globs.
**Estimated Time:** 15 min

### T02 — Scaffold NestJS API Application
**Objective:** Generate the base NestJS app inside `apps/api`.
**Why Now:** Backend needs a runnable skeleton before any module is added.
**Dependencies:** T01
**Files to Create:** `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/nest-cli.json`.
**Files to Update:** Root workspace config.
**Expected Output:** `nest start` runs and serves an empty root route.
**Acceptance Criteria:** API boots on a configured port with no errors; root health path returns 200 (basic Nest default).
**Estimated Time:** 20 min

### T03 — Scaffold Next.js Web Application
**Objective:** Generate the base Next.js (App Router, TypeScript, Tailwind) app inside `apps/web`.
**Why Now:** Frontend needs a runnable skeleton before any page is added.
**Dependencies:** T01
**Files to Create:** `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`, `apps/web/tailwind.config.ts`, `apps/web/package.json`, `apps/web/tsconfig.json`.
**Files to Update:** Root workspace config.
**Expected Output:** `next dev` serves a blank Tailwind-styled placeholder page.
**Acceptance Criteria:** Web app builds and runs; Tailwind classes render correctly on the placeholder page.
**Estimated Time:** 20 min

### T04 — Create Shared Types Package
**Objective:** Set up `packages/shared-types` as a workspace package both apps can import.
**Why Now:** Every subsequent schema/DTO decision should be able to land here instead of being duplicated later.
**Dependencies:** T01, T02, T03
**Files to Create:** `packages/shared-types/package.json`, `packages/shared-types/src/index.ts`, `packages/shared-types/tsconfig.json`.
**Files to Update:** `apps/api/package.json`, `apps/web/package.json` (add dependency).
**Expected Output:** An empty typed export importable from both `apps/api` and `apps/web`.
**Acceptance Criteria:** Both apps successfully `import` from `@project/shared-types` with no build errors.
**Estimated Time:** 15 min

### T05 — Local PostgreSQL via Docker Compose
**Objective:** Provide a reproducible local Postgres instance for development.
**Why Now:** Prisma initialization (next task) requires a live database connection.
**Dependencies:** T01
**Files to Create:** `docker-compose.yml`, `.env.example`.
**Files to Update:** None.
**Expected Output:** `docker compose up` starts a Postgres container reachable on a configured port.
**Acceptance Criteria:** `psql`/any client can connect to the container using `.env.example` credentials.
**Estimated Time:** 15 min

### T06 — Initialize Prisma & Agency (Tenant) Core Schema
**Objective:** Add Prisma to the API app and define the first model: `Agency` (the `tenant_id`-bearing root entity), including `status` (active/trial/suspended).
**Why Now:** Every future Agency-scoped table needs this table to reference via `tenant_id`. Must exist before Auth's User model.
**Dependencies:** T02, T05
**Files to Create:** `apps/api/prisma/schema.prisma`, first migration under `apps/api/prisma/migrations/`.
**Files to Update:** `apps/api/.env`.
**Expected Output:** `Agency` table exists in the database with `id`, `name`, `status`, timestamps.
**Acceptance Criteria:** `prisma migrate dev` runs clean; `prisma studio` shows the `Agency` table.
**Estimated Time:** 20 min

### T07 — Tenant Context Middleware & Base Repository
**Objective:** Build the structural tenant-isolation mechanism: middleware that extracts tenant context per request, and a base repository class that auto-injects `tenant_id` into every query it wraps.
**Why Now:** Per MASTER.md §13, tenant isolation must be structural from the first Agency-scoped module onward — this cannot be retrofitted safely later.
**Dependencies:** T06
**Files to Create:** `apps/api/src/core/tenant/tenant-context.middleware.ts`, `apps/api/src/core/tenant/tenant-context.service.ts`, `apps/api/src/core/repository/base.repository.ts`.
**Files to Update:** `apps/api/src/app.module.ts` (register middleware).
**Expected Output:** A reusable base class that any future module's repository extends to get automatic tenant scoping.
**Acceptance Criteria:** A throwaway test query through the base repository proves tenant filtering is applied without the caller specifying it manually.
**Estimated Time:** 30 min

### T08 — Global Env Config, Validation & Health Check Endpoint
**Objective:** Add typed environment config validation and a `/health` endpoint.
**Why Now:** Every future module relies on config being validated at boot rather than failing at runtime; health check is needed before deployment/CI exists.
**Dependencies:** T02
**Files to Create:** `apps/api/src/core/config/env.validation.ts`, `apps/api/src/modules/health/health.controller.ts`.
**Files to Update:** `apps/api/src/app.module.ts`.
**Expected Output:** App refuses to boot with missing/invalid env vars; `/health` returns 200 with DB connectivity check.
**Acceptance Criteria:** Removing a required env var causes a clear boot-time failure, not a runtime crash later.
**Estimated Time:** 20 min

---

## PHASE 2 — AUTHENTICATION

### T09 — User Schema for Auth
**Objective:** Add the `User` model: email, password hash, role enum, `tenant_id` FK to Agency.
**Why Now:** Minimum schema needed before any login logic can exist. Branch assignment is deliberately deferred to Phase 3 — not needed for login itself.
**Dependencies:** T06, T07
**Files to Create:** New Prisma migration.
**Files to Update:** `apps/api/prisma/schema.prisma`.
**Expected Output:** `User` table exists, FK'd to `Agency`.
**Acceptance Criteria:** Migration applies cleanly; a manually inserted user row respects the `tenant_id` FK constraint.
**Estimated Time:** 15 min

### T10 — Password Hashing & JWT Strategy Core Service
**Objective:** Implement password hashing utility and JWT signing/verification service in `core/auth`.
**Why Now:** Shared infrastructure needed by the login endpoint (next task) and by every guard afterward.
**Dependencies:** T09
**Files to Create:** `apps/api/src/core/auth/hash.service.ts`, `apps/api/src/core/auth/jwt.service.ts`, `apps/api/src/core/auth/jwt.strategy.ts`.
**Files to Update:** `apps/api/src/app.module.ts`.
**Expected Output:** Unit-testable services for hashing a password and signing/verifying a JWT containing `userId`, `tenantId`, `role`.
**Acceptance Criteria:** A hashed password verifies correctly; a signed token decodes back to the original payload.
**Estimated Time:** 25 min

### T11 — Auth Module — Login Endpoint
**Objective:** Implement `POST /api/v1/auth/login` returning a JWT on valid credentials.
**Why Now:** First real, callable API endpoint — proves the full request pipeline (controller → service → repository → DB) end to end.
**Dependencies:** T09, T10
**Files to Create:** `apps/api/src/modules/auth/auth.module.ts`, `auth.controller.ts`, `auth.service.ts`, `dto/login.dto.ts`.
**Files to Update:** `apps/api/src/app.module.ts`.
**Expected Output:** Valid credentials return a JWT; invalid credentials return 401.
**Acceptance Criteria:** Manual request via REST client returns a working token for a seeded test user.
**Estimated Time:** 25 min

### T12 — Auth Guards & Role-Based Access Decorator
**Objective:** Implement `JwtAuthGuard` and a `@Roles()` decorator + `RolesGuard` for endpoint-level authorization.
**Why Now:** Every module from Phase 3 onward needs these guards available to protect its endpoints.
**Dependencies:** T10, T11
**Files to Create:** `apps/api/src/core/auth/jwt-auth.guard.ts`, `apps/api/src/core/auth/roles.decorator.ts`, `apps/api/src/core/auth/roles.guard.ts`.
**Files to Update:** `apps/api/src/modules/auth/auth.module.ts` (export guards).
**Expected Output:** A protected test route rejects unauthenticated/unauthorized requests correctly.
**Acceptance Criteria:** Request without token → 401; request with wrong role → 403; request with valid token+role → 200.
**Estimated Time:** 20 min

### T13 — Frontend Auth — Login Page & Auth Context/Token Storage
**Objective:** Build the login page and a client-side auth context that stores the JWT and exposes the current user.
**Why Now:** Every subsequent frontend page needs an authenticated fetch wrapper and current-user context to exist.
**Dependencies:** T03, T04, T11
**Files to Create:** `apps/web/app/login/page.tsx`, `apps/web/src/lib/auth-context.tsx`, `apps/web/src/lib/api-client.ts`.
**Files to Update:** `apps/web/app/layout.tsx` (wrap with AuthProvider).
**Expected Output:** A working login form that authenticates against the API and stores the resulting token.
**Acceptance Criteria:** Logging in with a seeded user redirects to a placeholder authenticated route; token persists across refresh.
**Estimated Time:** 30 min

---

## PHASE 3 — AGENCY CORE

### T14 — Settings Schema (Agency Profile, Currency, Timezone, Prefixes, Theme, Logo, Contact)
**Objective:** Add the `Settings` model per MASTER.md §8: Agency Profile fields, Logo, Theme, Currency, Timezone, Invoice Prefix, Ticket Prefix, Email, Phone, Address — one row per Agency.
**Why Now:** Finance and Flight Booking phases will depend on Invoice/Ticket Prefix and Currency existing; must land early.
**Dependencies:** T06
**Files to Create:** New Prisma migration.
**Files to Update:** `apps/api/prisma/schema.prisma`.
**Expected Output:** `Settings` table, 1:1 with `Agency`.
**Acceptance Criteria:** Migration applies; unique constraint enforces one Settings row per Agency.
**Estimated Time:** 20 min

### T15 — Settings Module Backend
**Objective:** CRUD (effectively read + update, no delete) for Settings, guarded to Agency Admin role.
**Why Now:** Needed before any module that reads Currency/Prefixes can be tested meaningfully.
**Dependencies:** T12, T14
**Files to Create:** `apps/api/src/modules/settings/settings.module.ts`, `.controller.ts`, `.service.ts`, `.repository.ts`, `dto/update-settings.dto.ts`.
**Files to Update:** `apps/api/src/app.module.ts`.
**Expected Output:** `GET/PATCH /api/v1/settings` scoped to the caller's Agency.
**Acceptance Criteria:** Updating settings as one Agency does not affect another Agency's settings (manual two-tenant test).
**Estimated Time:** 25 min

### T16 — Settings Frontend Page
**Objective:** Build the Settings page (form for all fields in T14) under an authenticated layout.
**Why Now:** First real authenticated CRUD page — establishes the pattern every later module's frontend follows.
**Dependencies:** T13, T15
**Files to Create:** `apps/web/app/(dashboard)/settings/page.tsx`, `apps/web/src/components/settings/settings-form.tsx`.
**Files to Update:** `apps/web/src/lib/api-client.ts` (settings endpoints).
**Expected Output:** A working form that loads and saves Agency settings.
**Acceptance Criteria:** Changing and saving a field persists after page reload.
**Estimated Time:** 25 min

### T17 — Branch Schema & Branch Module Backend CRUD
**Objective:** Add `Branch` model (`tenant_id` FK'd) and full CRUD endpoints.
**Why Now:** User Management (next) needs Branch to exist for staff assignment.
**Dependencies:** T07, T12
**Files to Create:** New migration; `apps/api/src/modules/branch/branch.module.ts`, `.controller.ts`, `.service.ts`, `.repository.ts`, `dto/*.ts`.
**Files to Update:** `apps/api/prisma/schema.prisma`, `apps/api/src/app.module.ts`.
**Expected Output:** `/api/v1/branches` CRUD, tenant-scoped.
**Acceptance Criteria:** Full CRUD verified via REST client; cross-tenant access attempt returns 404/403.
**Estimated Time:** 30 min

### T18 — Branch Management Frontend Page
**Objective:** List/create/edit/delete UI for Branches.
**Why Now:** Needed before User Management frontend can offer branch assignment as a dropdown.
**Dependencies:** T16, T17
**Files to Create:** `apps/web/app/(dashboard)/branches/page.tsx`, `apps/web/src/components/branches/*.tsx`.
**Files to Update:** `apps/web/src/lib/api-client.ts`.
**Expected Output:** Working Branch CRUD UI.
**Acceptance Criteria:** Create/edit/delete a branch and see it reflected without a manual refresh.
**Estimated Time:** 25 min

### T19 — Extend User Schema & User Management Backend CRUD
**Objective:** Extend `User` (from T09) with `branchId` FK and add full CRUD/invite endpoints for staff management.
**Why Now:** Auth's minimal User model is now extended with the Agency-Core fields it deliberately deferred.
**Dependencies:** T09, T17
**Files to Create:** New migration; `apps/api/src/modules/user/user.module.ts`, `.controller.ts`, `.service.ts`, `.repository.ts`, `dto/*.ts`.
**Files to Update:** `apps/api/prisma/schema.prisma`, `apps/api/src/app.module.ts`.
**Expected Output:** `/api/v1/users` CRUD scoped to Agency, with branch assignment and role.
**Acceptance Criteria:** Admin can create a staff user with a role and branch; user can then log in (T11) successfully.
**Estimated Time:** 30 min

### T20 — User Management Frontend Page
**Objective:** List/create/edit/deactivate UI for staff users.
**Why Now:** Completes the staff-provisioning loop needed before Customer/Booking work assumes real users exist.
**Dependencies:** T18, T19
**Files to Create:** `apps/web/app/(dashboard)/users/page.tsx`, `apps/web/src/components/users/*.tsx`.
**Files to Update:** `apps/web/src/lib/api-client.ts`.
**Expected Output:** Working staff management UI including branch/role assignment.
**Acceptance Criteria:** New staff user created via UI can log in and see a role-appropriate view.
**Estimated Time:** 25 min

### T21 — My Profile Module (Backend + Frontend)
**Objective:** Self-service endpoints (`GET/PATCH /api/v1/me`, password change) and a Profile page for the logged-in user.
**Why Now:** Needs Auth (T11) and User (T19) to exist; simple enough to complete backend+frontend in one task.
**Dependencies:** T13, T19
**Files to Create:** `apps/api/src/modules/my-profile/my-profile.module.ts`, `.controller.ts`, `.service.ts`; `apps/web/app/(dashboard)/profile/page.tsx`.
**Files to Update:** `apps/api/src/app.module.ts`, `apps/web/src/lib/api-client.ts`.
**Expected Output:** Logged-in user can view/edit their own name/contact and change password.
**Acceptance Criteria:** Password change invalidates old credentials and works with new ones on next login.
**Estimated Time:** 25 min

### T22 — Customer Schema & Customer Management Backend CRUD
**Objective:** Add `Customer` model (`tenant_id` FK'd) and full CRUD endpoints.
**Why Now:** Flight Booking (Phase 5) requires a Customer to attach a booking to; must exist before booking work starts.
**Dependencies:** T07, T12
**Files to Create:** New migration; `apps/api/src/modules/customer/customer.module.ts`, `.controller.ts`, `.service.ts`, `.repository.ts`, `dto/*.ts`.
**Files to Update:** `apps/api/prisma/schema.prisma`, `apps/api/src/app.module.ts`.
**Expected Output:** `/api/v1/customers` CRUD, tenant-scoped.
**Acceptance Criteria:** Full CRUD verified; customers created under one Agency are invisible to another.
**Estimated Time:** 25 min

### T23 — Customer Management Frontend Page
**Objective:** List/create/edit UI for Customers, including basic search.
**Why Now:** Completes Agency Core; Booking wizard (Phase 5) needs a customer picker that this page's data model supports.
**Dependencies:** T18, T22
**Files to Create:** `apps/web/app/(dashboard)/customers/page.tsx`, `apps/web/src/components/customers/*.tsx`.
**Files to Update:** `apps/web/src/lib/api-client.ts`.
**Expected Output:** Working Customer CRUD + search UI.
**Acceptance Criteria:** Newly created customer is immediately searchable/selectable.
**Estimated Time:** 25 min

---

## PHASE 4 — REFERENCE DATA

### T24 — Country & City Global Schema + Seed
**Objective:** Add global `Country` and `City` models (no `tenant_id`) and a seed script with a representative dataset.
**Why Now:** Airport (next task) references City/Country; must exist first.
**Dependencies:** T06
**Files to Create:** New migration; `apps/api/prisma/seed/geo.seed.ts`.
**Files to Update:** `apps/api/prisma/schema.prisma`, `apps/api/package.json` (seed script entry).
**Expected Output:** Seeded Country/City tables shared across all Agencies.
**Acceptance Criteria:** Seed runs idempotently; querying returns consistent global data regardless of caller's tenant.
**Estimated Time:** 25 min

### T25 — Airport Global Schema + Seed + Backend CRUD
**Objective:** Add global `Airport` model (FK to City), seed a representative dataset, and add Platform-Admin-only CRUD for maintenance.
**Why Now:** Sector (Phase 5) references Airport; must exist first.
**Dependencies:** T24, T12
**Files to Create:** New migration; `apps/api/src/modules/airport/*`; `apps/api/prisma/seed/airport.seed.ts`.
**Files to Update:** `apps/api/prisma/schema.prisma`, `apps/api/src/app.module.ts`.
**Expected Output:** `/api/v1/airports` — read-only for regular staff, writable for Platform Admin.
**Acceptance Criteria:** Any Agency's staff can read the full airport list; only Platform Admin can mutate it.
**Estimated Time:** 25 min

### T26 — Airline Global Schema + Seed + Backend CRUD
**Objective:** Add global `Airline` model, seed a representative dataset, Platform-Admin-only CRUD.
**Why Now:** Sector (Phase 5) references Airline; must exist first.
**Dependencies:** T24, T12
**Files to Create:** New migration; `apps/api/src/modules/airline/*`; `apps/api/prisma/seed/airline.seed.ts`.
**Files to Update:** `apps/api/prisma/schema.prisma`, `apps/api/src/app.module.ts`.
**Expected Output:** `/api/v1/airlines` — read-only for regular staff, writable for Platform Admin.
**Acceptance Criteria:** Same as T25, applied to Airlines.
**Estimated Time:** 25 min

### T27 — Reference Data Frontend — Airline / Airport / Country / City Browse Pages
**Objective:** Read-only browse/search UI for the four global reference datasets, used later as pickers inside the Booking wizard.
**Why Now:** The Booking wizard (Phase 5) needs a working Sector picker component; building it here as a standalone page first de-risks that integration.
**Dependencies:** T25, T26
**Files to Create:** `apps/web/app/(dashboard)/reference-data/page.tsx`, `apps/web/src/components/reference-data/*.tsx`.
**Files to Update:** `apps/web/src/lib/api-client.ts`.
**Expected Output:** Searchable Airline/Airport lists usable as a reusable picker component.
**Acceptance Criteria:** Typeahead search returns correct results against seeded data.
**Estimated Time:** 25 min

---

## PHASE 5 — FLIGHT BOOKING

### T28 — Booking Root Schema
**Objective:** Add `Booking` model (`tenant_id`, `customerId`, `branchId`, `status` enum defaulted to `Draft`, totals) — status column only, no transition engine yet.
**Why Now:** Root entity every other Flight Booking sub-entity FKs to.
**Dependencies:** T17, T22
**Files to Create:** New migration.
**Files to Update:** `apps/api/prisma/schema.prisma`.
**Expected Output:** `Booking` table with a plain status column.
**Acceptance Criteria:** A manually inserted Booking row defaults to `Draft` status.
**Estimated Time:** 20 min

### T29 — Passenger Schema & Sub-Entity Backend CRUD
**Objective:** Add `Passenger` model (FK `bookingId`, name, DOB, passport, type ADT/CHD/INF) and nested CRUD under a Booking.
**Why Now:** First Booking sub-entity; establishes the "nested under booking" endpoint pattern reused by Sector/Fare/Tax/Ticket/Remarks.
**Dependencies:** T28, T12
**Files to Create:** New migration; `apps/api/src/modules/flight-booking/passenger/*`.
**Files to Update:** `apps/api/prisma/schema.prisma`, `apps/api/src/modules/flight-booking/flight-booking.module.ts`.
**Expected Output:** `/api/v1/bookings/:id/passengers` CRUD.
**Acceptance Criteria:** Passengers can be added/removed from a Draft booking; blocked once booking leaves Draft (soft check, engine enforces properly in Phase 6).
**Estimated Time:** 25 min

### T30 — Sector Schema & Backend CRUD
**Objective:** Add `Sector` model (FK `bookingId`, `airlineId`, origin/destination `airportId`, flight number, datetimes, cabin class) and nested CRUD.
**Why Now:** Depends on Airline/Airport (Phase 4) and Booking (T28); needed before Fare/Tax which price per sector.
**Dependencies:** T28, T25, T26
**Files to Create:** New migration; `apps/api/src/modules/flight-booking/sector/*`.
**Files to Update:** `apps/api/prisma/schema.prisma`, `flight-booking.module.ts`.
**Expected Output:** `/api/v1/bookings/:id/sectors` CRUD.
**Acceptance Criteria:** A sector correctly references seeded Airline/Airport data; invalid IDs are rejected.
**Estimated Time:** 25 min

### T31 — Fare & Tax Schema & Backend CRUD
**Objective:** Add `Fare` (per passenger/sector) and `Tax` (per fare) models and nested CRUD.
**Why Now:** Needed before the Booking Aggregate endpoint (next task) can compute a total.
**Dependencies:** T29, T30
**Files to Create:** New migration; `apps/api/src/modules/flight-booking/fare/*`, `.../tax/*`.
**Files to Update:** `apps/api/prisma/schema.prisma`, `flight-booking.module.ts`.
**Expected Output:** `/api/v1/bookings/:id/fares`, `.../taxes` CRUD.
**Acceptance Criteria:** Fare+Tax sums roll up correctly when queried for a booking.
**Estimated Time:** 25 min

### T32 — Booking Aggregate Backend Endpoint
**Objective:** Add a single `POST /api/v1/bookings` that creates a Booking with nested Passengers/Sectors/Fares/Taxes in one transactional call, and a `GET /api/v1/bookings/:id` that returns the full aggregate.
**Why Now:** Real-world booking creation is one atomic operation, not five sequential calls — needed before a usable frontend wizard can be built.
**Dependencies:** T29, T30, T31
**Files to Create:** `apps/api/src/modules/flight-booking/booking/*`, `dto/create-booking.dto.ts`.
**Files to Update:** `flight-booking.module.ts`.
**Expected Output:** One transactional endpoint producing a fully-formed Draft booking.
**Acceptance Criteria:** A single request creates a booking with 2+ passengers and 2+ sectors correctly linked; partial failure rolls back the whole transaction.
**Estimated Time:** 30 min

### T33 — Ticket & Remarks Schema + Backend CRUD
**Objective:** Add `Ticket` (unissued placeholder until Workflow Engine wires issuance) and `Remarks` (free-text notes) models and CRUD.
**Why Now:** Completes the Flight Booking data model per MASTER.md §6 before the Workflow Engine phase wires real transitions to it.
**Dependencies:** T28
**Files to Create:** New migration; `apps/api/src/modules/flight-booking/ticket/*`, `.../remarks/*`.
**Files to Update:** `apps/api/prisma/schema.prisma`, `flight-booking.module.ts`.
**Expected Output:** `/api/v1/bookings/:id/tickets`, `.../remarks` CRUD (ticket number nullable until Phase 6).
**Acceptance Criteria:** Remarks can be added/edited freely; Ticket rows can be created but ticket number stays null pre-issuance.
**Estimated Time:** 20 min

### T34 — Booking Creation Frontend Wizard
**Objective:** Multi-step form: Customer select → Passengers → Sectors (using T27's picker) → Fare/Tax entry → Review/Submit.
**Why Now:** The most complex UI in the product; needs the Booking Aggregate endpoint (T32) and reference-data picker (T27) both in place first.
**Dependencies:** T23, T27, T32
**Files to Create:** `apps/web/app/(dashboard)/bookings/new/page.tsx`, `apps/web/src/components/bookings/wizard/*.tsx`.
**Files to Update:** `apps/web/src/lib/api-client.ts`.
**Expected Output:** Working end-to-end booking creation flow in the browser.
**Acceptance Criteria:** A full booking with multiple passengers/sectors can be created via UI and matches what T32's endpoint stored.
**Estimated Time:** 30 min

### T35 — Booking List & Detail Frontend Pages
**Objective:** List view (filterable by status/branch) and a read-only detail view showing the full aggregate.
**Why Now:** Closes the loop on Flight Booking phase before Workflow Engine adds status-changing actions to this same detail page.
**Dependencies:** T34
**Files to Create:** `apps/web/app/(dashboard)/bookings/page.tsx`, `apps/web/app/(dashboard)/bookings/[id]/page.tsx`.
**Files to Update:** `apps/web/src/lib/api-client.ts`.
**Expected Output:** Working list + detail views for bookings.
**Acceptance Criteria:** Newly created booking appears in the list and its detail view matches wizard input.
**Estimated Time:** 25 min

---

## PHASE 6 — WORKFLOW ENGINE

### T36 — Workflow Stage Enum & Transition Rules Definition
**Objective:** Define the canonical stage enum (Draft, Reserved, Ticket Issued, Invoiced, Paid, Completed, Refunded, Cancelled) and the allowed-transition map per MASTER.md §5, in the shared types package.
**Why Now:** Single source of truth needed before any validation service or UI action can reference it.
**Dependencies:** T04
**Files to Create:** `packages/shared-types/src/workflow-stage.ts`.
**Files to Update:** `packages/shared-types/src/index.ts`.
**Expected Output:** A typed enum + adjacency map (`Draft -> [Reserved, Cancelled]`, etc.) importable by both apps.
**Acceptance Criteria:** Map exactly matches MASTER.md §5's rules, including the pre/post-payment split for Cancelled/Refunded.
**Estimated Time:** 20 min

### T37 — Workflow Transition History Schema & Audit Service
**Objective:** Add the shared `workflow_transitions` table (bookingId, fromStage, toStage, actorId, timestamp, reason) and a service to write to it.
**Why Now:** Must exist before the validation service (next task) can log the transitions it approves.
**Dependencies:** T28, T36
**Files to Create:** New migration; `apps/api/src/core/workflow-engine/transition-history.service.ts`.
**Files to Update:** `apps/api/prisma/schema.prisma`.
**Expected Output:** A callable service that appends an immutable transition record.
**Acceptance Criteria:** Calling the service produces a correctly ordered, queryable history for a given booking.
**Estimated Time:** 20 min

### T38 — Workflow Transition Validation Service
**Objective:** Build the core `workflow-engine` service: given a booking's current stage and a requested target stage, validate against T36's adjacency map, execute the transition, and write history via T37.
**Why Now:** This is the engine itself — the shared logic every booking- and finance-status change will call through, per MASTER.md §5/§13.
**Dependencies:** T36, T37
**Files to Create:** `apps/api/src/core/workflow-engine/workflow-engine.service.ts`, `workflow-engine.module.ts`.
**Files to Update:** `apps/api/src/app.module.ts`.
**Expected Output:** A single injectable service exposing `transition(bookingId, targetStage, actor, reason)`.
**Acceptance Criteria:** Valid transitions succeed and are logged; invalid transitions (e.g., Draft → Paid directly) are rejected with a clear error.
**Estimated Time:** 30 min

### T39 — Wire Workflow Transitions into Flight Booking
**Objective:** Add real endpoints to the Booking module — `Reserve`, `Issue Ticket`, `Cancel` — that call the Workflow Engine instead of writing `status` directly. Populate Ticket Prefix-based ticket numbers (from Settings) on Issue Ticket.
**Why Now:** This is the retrofit step noted at the top of this document — Flight Booking's plain CRUD from Phase 5 now gets real lifecycle behavior.
**Dependencies:** T33, T38, T15 (Ticket Prefix)
**Files to Create:** None.
**Files to Update:** `apps/api/src/modules/flight-booking/booking/booking.controller.ts`, `booking.service.ts`.
**Expected Output:** `POST /api/v1/bookings/:id/reserve`, `.../issue-ticket`, `.../cancel` — each delegating to the Workflow Engine.
**Acceptance Criteria:** Booking created in Phase 5 can now be moved Draft → Reserved → Ticket Issued, or Cancelled from any pre-payment stage; illegal transitions return a validation error.
**Estimated Time:** 30 min

### T40 — Frontend — Booking Status Actions & Transition History View
**Objective:** Add action buttons (Reserve/Issue Ticket/Cancel) and a transition history timeline to the Booking detail page (T35).
**Why Now:** Makes the Workflow Engine visible and usable to end users; closes this phase.
**Dependencies:** T35, T39
**Files to Create:** `apps/web/src/components/bookings/status-actions.tsx`, `apps/web/src/components/bookings/transition-history.tsx`.
**Files to Update:** `apps/web/app/(dashboard)/bookings/[id]/page.tsx`.
**Expected Output:** Working status-change buttons with a visible audit trail.
**Acceptance Criteria:** Clicking "Reserve" updates the visible status and appends a history entry without a full page reload.
**Estimated Time:** 25 min

---

## PHASE 7 — FINANCE

### T41 — Invoice Schema & Backend
**Objective:** Add `Invoice` model (FK `bookingId`, line items, uses Invoice Prefix from Settings) and an endpoint to generate one from a Ticket-Issued booking.
**Why Now:** First Finance entity; must exist before Receipt/Payment can reference it.
**Dependencies:** T39, T15 (Invoice Prefix)
**Files to Create:** New migration; `apps/api/src/modules/finance/invoice/*`.
**Files to Update:** `apps/api/prisma/schema.prisma`, new `apps/api/src/modules/finance/finance.module.ts`.
**Expected Output:** `POST /api/v1/bookings/:id/invoice` generates an Invoice and transitions the booking to `Invoiced` via the Workflow Engine.
**Acceptance Criteria:** Invoice number correctly uses the Agency's configured prefix; booking status updates and is logged in history.
**Estimated Time:** 30 min

### T42 — Receipt & Payment Schema + Backend
**Objective:** Add `Receipt` and `Payment` models and an endpoint to record a payment against an Invoice.
**Why Now:** Depends on Invoice (T41) existing; drives the `Paid`/`Completed` transitions.
**Dependencies:** T41, T38
**Files to Create:** New migration; `apps/api/src/modules/finance/payment/*`, `.../receipt/*`.
**Files to Update:** `apps/api/prisma/schema.prisma`, `finance.module.ts`.
**Expected Output:** `POST /api/v1/invoices/:id/payments` records payment, issues a Receipt, and transitions booking to `Paid` (and `Completed` once fully settled).
**Acceptance Criteria:** Full payment against an invoice moves the booking through `Paid` to `Completed`; partial payment leaves it at `Paid` only.
**Estimated Time:** 30 min

### T43 — Refund & Transaction Schema + Backend
**Objective:** Add `Refund` and `Transaction` models (per MASTER.md §7 — Transaction is the MVP financial log, not a ledger). Endpoint to process a refund against a Paid/Completed booking.
**Why Now:** Completes the Finance data model; depends on Payment (T42) existing to refund against.
**Dependencies:** T42, T38
**Files to Create:** New migration; `apps/api/src/modules/finance/refund/*`, `.../transaction/*`.
**Files to Update:** `apps/api/prisma/schema.prisma`, `finance.module.ts`.
**Expected Output:** `POST /api/v1/invoices/:id/refunds` records a Refund + Transaction and transitions booking to `Refunded`.
**Acceptance Criteria:** Refund only permitted from Paid/Completed stage per MASTER.md §5; every money movement (payment and refund) produces a Transaction record.
**Estimated Time:** 25 min

### T44 — Wire Finance Transitions Verification & Cross-Module Integration Test
**Objective:** Verify and finalize the full workflow chain Draft → Reserved → Ticket Issued → Invoiced → Paid → Completed → Refunded/Cancelled works end-to-end through real API calls, fixing any gaps found between T39/T41/T42/T43.
**Why Now:** These four tasks were built independently against the Workflow Engine; this task proves they compose correctly before frontend work begins.
**Dependencies:** T39, T41, T42, T43
**Files to Create:** None (fixes only, if needed).
**Files to Update:** Any of the above module files, as gaps are found.
**Expected Output:** A verified, working chain from booking creation through refund.
**Acceptance Criteria:** One booking taken manually through every stage in order, including a Cancel test from Draft and a Refund test from Completed, all correctly logged in transition history.
**Estimated Time:** 30 min

### T45 — Finance Frontend — Invoice / Payment / Refund Pages
**Objective:** Add Invoice view, "Record Payment" action, Receipt display, and "Process Refund" action to the Booking detail page and a standalone Finance list page.
**Why Now:** Makes the Finance module usable by staff; closes the phase.
**Dependencies:** T40, T44
**Files to Create:** `apps/web/app/(dashboard)/finance/page.tsx`, `apps/web/src/components/finance/*.tsx`.
**Files to Update:** `apps/web/app/(dashboard)/bookings/[id]/page.tsx`, `apps/web/src/lib/api-client.ts`.
**Expected Output:** Staff can generate an invoice, record a payment, view a receipt, and process a refund from the UI.
**Acceptance Criteria:** Full flow (invoice → payment → receipt → refund) completed via UI matches backend state.
**Estimated Time:** 30 min

---

## PHASE 8 — REPORTS

### T46 — Reports Backend — Sales, Outstanding, Agent Performance Aggregation Endpoints
**Objective:** Add read-only aggregation endpoints over Booking/Finance data: total sales by period, outstanding invoices, bookings per agent.
**Why Now:** Reports has nothing meaningful to aggregate until Finance (Phase 7) produces real data.
**Dependencies:** T44
**Files to Create:** `apps/api/src/modules/reports/reports.module.ts`, `.controller.ts`, `.service.ts`.
**Files to Update:** `apps/api/src/app.module.ts`.
**Expected Output:** `/api/v1/reports/sales`, `.../outstanding`, `.../agent-performance`, tenant-scoped and date-filterable.
**Acceptance Criteria:** Figures returned match a manual sum over seeded/test data.
**Estimated Time:** 30 min

### T47 — Reports Frontend — Report Pages with Filters
**Objective:** Build report pages with date-range and branch filters, rendering the three T46 endpoints.
**Why Now:** Completes the Reports phase.
**Dependencies:** T46
**Files to Create:** `apps/web/app/(dashboard)/reports/page.tsx`, `apps/web/src/components/reports/*.tsx`.
**Files to Update:** `apps/web/src/lib/api-client.ts`.
**Expected Output:** Working, filterable report views.
**Acceptance Criteria:** Changing a filter updates the displayed figures correctly against known test data.
**Estimated Time:** 25 min

---

## PHASE 9 — DASHBOARD

### T48 — Dashboard Backend + Frontend
**Objective:** Add a lightweight `/api/v1/dashboard/summary` endpoint (reusing Reports' aggregation service) and a Dashboard page showing KPI cards (bookings this month, revenue, outstanding, recent activity).
**Why Now:** Dashboard is intentionally last among the functional modules — it's a thin composition layer over Reports/Finance/Booking, so it has nothing to show until they exist.
**Dependencies:** T46, T47
**Files to Create:** `apps/api/src/modules/dashboard/*`; `apps/web/app/(dashboard)/page.tsx`, `apps/web/src/components/dashboard/*.tsx`.
**Files to Update:** `apps/api/src/app.module.ts`.
**Expected Output:** A working home dashboard with real KPI cards.
**Acceptance Criteria:** KPI values match Reports page figures for the same period.
**Estimated Time:** 30 min

---

## PHASE 10 — HARDENING

### T49 — Activity Log Module
**Objective:** Add an `ActivityLog` model and a NestJS interceptor that records significant mutating actions (create/update/delete, status transitions, payments) across all existing modules, plus a frontend list page.
**Why Now:** Deliberately last-but-one — it observes actions across every module built in Phases 2–9, so it can only be wired meaningfully once they all exist.
**Dependencies:** T44, T48
**Files to Create:** New migration; `apps/api/src/core/activity-log/activity-log.interceptor.ts`, `activity-log.service.ts`; `apps/api/src/modules/activity-log/*`; `apps/web/app/(dashboard)/activity-log/page.tsx`.
**Files to Update:** `apps/api/src/app.module.ts` (register global interceptor).
**Expected Output:** Every mutating action across the app produces a queryable, tenant-scoped log entry.
**Acceptance Criteria:** Performing one action per module (e.g., create customer, issue ticket, record payment) produces a corresponding, correctly attributed log row.
**Estimated Time:** 30 min

### T50 — Tenant Isolation Audit, Global Error Handling & Seed/Smoke-Test Pass
**Objective:** Final hardening pass: (1) audit every repository to confirm it extends the T07 base repository — no raw unscoped Prisma calls anywhere; (2) add a global exception filter for consistent API error shapes; (3) build a full seed script (2+ Agencies, users, customers, bookings through various stages) and manually smoke-test the entire flow per Agency to confirm isolation holds.
**Why Now:** Final task — validates the single most important constraint in MASTER.md (§1, §13) across the finished system, not just in isolation per module.
**Dependencies:** All previous tasks
**Files to Create:** `apps/api/prisma/seed/full.seed.ts`, `apps/api/src/core/filters/http-exception.filter.ts`.
**Files to Update:** Any repository found bypassing the base repository; `apps/api/src/app.module.ts` (register global filter).
**Expected Output:** A fully seeded two-Agency dataset; confirmed zero cross-tenant data leakage; consistent error responses platform-wide.
**Acceptance Criteria:** Logging in as Agency A's user and attempting to access Agency B's booking/customer/invoice IDs (by guessed/known ID) returns 404, never data.
**Estimated Time:** 30 min

---

*End of TASKS.md — 50 tasks, Phase 1 through Phase 10, sequential and non-forward-dependent. Execution begins at T01 only after explicit approval.*
