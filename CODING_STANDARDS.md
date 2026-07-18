# CODING_STANDARDS.md
## OTA SaaS Management Platform — Engineering Standards

**Status:** Reference document, governed by and subordinate to MASTER.md, TASKS.md, DATABASE.md, and API_RULES.md (all frozen). This document defines *how code is written*, not what is built — it introduces no new modules, entities, endpoints, or terminology. Where anything here appears to conflict with an earlier frozen document, that document wins.

---

## 1. Folder Structure

Confirms and extends MASTER.md §10 to file-level granularity within a module:

```
apps/api/src/
  core/                     → tenant-context, base repository, auth (hash/JWT/guards), config, filters
  workflow-engine/          → stage enum consumer, transition validator, transition-history service
  modules/
    <module-name>/
      <module-name>.module.ts
      <module-name>.controller.ts
      <module-name>.service.ts
      <module-name>.repository.ts
      dto/
        create-<resource>.dto.ts
        update-<resource>.dto.ts
        <resource>-response.dto.ts

apps/web/
  app/
    (dashboard)/<route>/page.tsx      → mirrors the module list per MASTER.md §10
    login/page.tsx
    layout.tsx
  src/
    components/<module-name>/*.tsx
    lib/api-client.ts, auth-context.tsx

packages/shared-types/src/
  workflow-stage.ts, dto/, enums/
```

- A module never reaches into another module's `repository.ts` — only into its exported `service.ts` (Clean Architecture boundary, §3).
- `flight-booking` and `finance` (MASTER.md's two largest modules) use sub-folders per entity (`flight-booking/passenger/`, `finance/invoice/`), each following the same five-file pattern above.
- No file lives outside this structure "temporarily" — a misplaced file is a review-blocking finding (§19).

---

## 2. Naming Conventions

| Element | Convention | Example |
|---|---|---|
| NestJS files | kebab-case + type suffix | `booking.repository.ts`, `create-booking.dto.ts` |
| NestJS classes | PascalCase + type suffix | `BookingService`, `CreateBookingDto` |
| React component files | PascalCase.tsx | `BookingWizard.tsx` |
| Next.js framework files | lowercase, framework-mandated | `page.tsx`, `layout.tsx` |
| Variables / functions | camelCase | `getBookingById` |
| React hooks | camelCase, `use` prefix | `useAuth`, `useBookingForm` |
| TypeScript types/interfaces | PascalCase | `BookingStatus`, `CreateBookingInput` |
| Enum members | PascalCase in TS, matching DATABASE.md's lower_snake_case DB values via explicit mapping | `WorkflowStage.TicketIssued` ↔ `'ticket_issued'` |
| Constants | UPPER_SNAKE_CASE | `MAX_PAGE_SIZE` |
| Env vars | UPPER_SNAKE_CASE | `DATABASE_URL` |

Database column naming (`snake_case`) and API field naming (`camelCase`) are already fixed by DATABASE.md §10 and API_RULES.md §6 respectively — this section governs code, not the wire/storage layers those documents already own.

---

## 3. Clean Architecture Rules

Per MASTER.md §3 principle 2, layering is fixed: **Controller → Service (use-case) → Repository → Prisma.**

- **Dependency direction is one-way.** A Controller may depend on a Service; a Service may depend on a Repository. Never the reverse, and never skip a layer (a Controller must not inject a Repository or Prisma directly).
- **Controllers contain zero business rules.** A controller's only job: validate input via DTO (§7, §8), call exactly one service method, map the result to the API_RULES §6 response envelope.
- **Business rules live in Services**, not in DTOs, not in the Controller, not in the Repository.
- **Repositories contain zero business rules** — only data access, always scoped through the base repository (§4).
- **Cross-module calls go through the other module's exported Service** — a module's `.module.ts` exports only its Service(s), never its Repository, enforcing the modular-monolith boundary from MASTER.md §3 principle 1 at the compiler level.
- **Workflow-engine calls are a Service-to-Service dependency** — Booking/Finance services call `WorkflowEngineService.transition(...)`, never mutate a `status` field directly (matches API_RULES §3).

---

## 4. Repository Pattern

- Every repository extends the shared base repository (`core/repository/base.repository.ts`, TASKS.md T07), which injects `tenant_id` scoping automatically into every query it exposes.
- One repository per aggregate root, not strictly per table — `BookingRepository` owns `Booking` and its direct sub-entities (`Passenger`, `Sector`, `Fare`, `Tax`, `Ticket`, `Remarks`) as one unit, matching how they're always read/written together (DATABASE.md §3.7–§3.13).
- A repository method returns Prisma-shaped data or a mapped domain object — never an HTTP-shaped DTO. Response-DTO mapping happens in the Service or Controller, not the Repository.
- No repository method accepts a `tenantId`/`agencyId` parameter from its caller for filtering purposes — tenant scope comes only from the request-scoped context the base repository already holds (API_RULES §20). A repository method that took an explicit tenant parameter would be an isolation bug waiting to happen.
- Global reference-data repositories (Airline, Airport, Country, City) do **not** extend the tenant-scoped base repository — they use a separate, explicitly unscoped base, per DATABASE.md §7. This distinction must be visible in the code, not implicit.
- Raw/unscoped Prisma access anywhere outside the repository layer is a hard rule violation, checked explicitly in code review (§19) and audited platform-wide in TASKS.md T50.

---

## 5. Service Rules

- A Service method represents one use case, named for the action, not the CRUD verb where a real business action exists (`issueTicket()`, not `updateStatus()`).
- Services orchestrate: call one or more Repositories, call the Workflow Engine for any status change, call other modules' Services for cross-module reads, and return plain data (not framework-specific response objects) to the Controller.
- Multi-step operations that must be atomic (e.g., Booking Aggregate create, T32; Payment → Transaction write, T42) wrap their repository calls in a single Prisma transaction, initiated at the Service layer.
- A Service never imports another module's Repository — only its Service (§3).
- Validation that is a *business rule* (e.g., "refund only permitted from Paid/Completed," MASTER.md §5) lives in the Service or the Workflow Engine — not in a DTO, which only validates shape (§8).

---

## 6. Controller Rules

- One Controller per module (or per major sub-entity in `flight-booking`/`finance`), routes match API_RULES §2 URL naming exactly.
- Every route handler: (1) declares its DTO for `@Body()`/`@Query()`, (2) applies `JwtAuthGuard` + `@Roles()` (API_RULES §12–13) unless explicitly public (`/auth/login` only), (3) calls one Service method, (4) returns data the global response interceptor wraps into the `{ data, meta }` envelope (API_RULES §6) — the Controller does not hand-construct the envelope itself.
- No `try/catch` in Controllers for expected error paths — thrown typed exceptions are caught by the global exception filter (§14).
- No business conditionals in a Controller (`if user.role === ...`) beyond what a Guard/decorator already expresses — if a Controller needs an `if`, that logic almost always belongs in the Service.

---

## 7. DTO Rules

- Separate DTO per direction and purpose: `Create<Resource>Dto`, `Update<Resource>Dto` (all fields optional — this is the `PATCH` body per API_RULES §3), and a `<Resource>ResponseDto` (or a mapper function) shaping the outbound payload.
- A `Create`/`Update` DTO never includes `tenantId`/`agencyId`, `id`, or any audit field (`createdAt`, `createdBy`, etc.) — those are server-assigned, never client-supplied (API_RULES §5).
- Nested-create DTOs (Booking Aggregate, T32) nest child DTOs (`passengers: CreatePassengerDto[]`) with the same rules applied recursively.
- A Response DTO never exposes a raw Prisma model directly — even when the shape looks identical today, an explicit mapping is required so a future DB-only field never accidentally leaks onto the wire.
- Enum fields on a DTO use the exact TypeScript enum from `packages/shared-types` — never a raw string type — so an invalid value fails to compile in calling code, not just at runtime validation.

---

## 8. Validation Rules

- A global validation pipe is registered once (`main.ts`), applied to every route: `whitelist: true`, `forbidNonWhitelisted: true` — unknown fields are stripped/rejected, never silently accepted (defense against the tenant-spoofing concern in API_RULES §5).
- Every DTO field carries an explicit validation decorator (required/optional, type, format, enum membership) — no field is validated "by convention."
- Cross-field or business-context validation (e.g., a `Tax.amount` must reference a `Fare` within the same `Booking`) is **not** a DTO concern — DTOs validate shape only; relational/business validity is a Service-layer check (§5), consistent with API_RULES §5's distinction between `422` shape failures and `409`/business-rule failures.
- Validation failure response shape is fixed by API_RULES §5 — DTO validation errors are never hand-formatted per module.

---

## 9. Prisma Rules

- `schema.prisma` is the single source of schema truth — one file, evolved incrementally per TASKS.md migration tasks, never hand-edited via raw SQL migrations.
- DB columns are `snake_case` (DATABASE.md §10); Prisma model fields are `camelCase`, connected via explicit `@map`/`@@map` — this mapping is what makes API_RULES §6's camelCase wire format a non-issue at the ORM boundary.
- `PrismaClient` is instantiated once (a Prisma module/service in `core/`) and injected only into the base repository layer (§4) — no module's Service or Controller imports `PrismaClient` directly.
- Raw queries (`$queryRaw`) are avoided by default; if a reporting query genuinely needs one (Phase 8), it is isolated inside that module's Repository, includes an explicit `tenant_id` predicate written by hand (since the base repository's auto-scoping doesn't apply to raw SQL), and is called out in code review as a raw-query exception.
- Every schema change ships with its generated migration in the same commit — schema and migration are never out of sync in version control.

---

## 10. NestJS Rules

- One `Module` per business domain (MASTER.md §6) — a Module's `exports` array contains only its Service(s), enforcing §3/§4's boundary at compile time via TypeScript's module resolution.
- Global concerns (auth guards, validation pipe, exception filter, tenant-context middleware) are registered once in `app.module.ts`/`main.ts` — never re-registered or re-implemented per module.
- Configuration is accessed exclusively through the typed `ConfigService`/env-validation layer from TASKS.md T08 — no direct `process.env` access inside a module.
- `forwardRef()` (circular module dependency) is a last resort, not a pattern — a circular dependency between two business modules is treated as a design smell and restructured (usually by extracting the shared concern into `core/`) rather than resolved with `forwardRef`.
- Guards, interceptors, and pipes that apply to more than one module live in `core/`, not duplicated per module.

---

## 11. Next.js Rules

- App Router only; route structure mirrors the module list, grouped under `(dashboard)` for all authenticated pages (MASTER.md §10).
- Server Components are the default for data-heavy read views (lists, reports, dashboard) — they fetch directly via the typed API client. `"use client"` is added only to the specific component that needs interactivity (a form, a button with local state), not to an entire page.
- A `page.tsx` file contains routing/data-fetching glue only — it delegates rendering to components under `src/components/<module>/`, never inlines a large form or table directly.
- Every authenticated route reads auth state through the shared `auth-context` (T13) — no page re-implements token handling.
- Loading and error states use Next.js's `loading.tsx`/`error.tsx` conventions where the App Router supports them, falling back to explicit component-level states otherwise — never a bare blank screen during a fetch.

---

## 12. React Rules

- Components are typed with explicit `Props` interfaces; shapes shared with the API (DTOs, enums) are imported from `packages/shared-types`, never redeclared locally.
- Props are not drilled more than two levels — a third level reaches for context (e.g., `auth-context`) or component composition instead.
- Form components are controlled, with validation-error display driven directly by the API_RULES §5/§7 error shape (a form doesn't invent its own error format) — a shared form-error-display component is used across modules rather than reimplemented per form.
- `useEffect` is used only for genuine synchronization with an external system (subscriptions, non-React APIs) — not for data fetching that a Server Component or a direct event handler could do instead.
- No component silently swallows a failed API call — every mutating action surfaces its error via the shared error-display pattern.

---

## 13. Tailwind Rules

- Utility-first; no inline `style={}` attributes except for genuinely dynamic values Tailwind can't express statically (e.g., a computed width percentage).
- Design tokens (colors, spacing, font sizes) are defined once in `tailwind.config.ts`, not as ad hoc arbitrary values (`w-[13px]`) scattered through components — arbitrary values are a code-review flag unless justified.
- A small `cn()`/`clsx` helper composes conditional class strings — no manual string concatenation for conditional classes.
- `@apply` is used sparingly, only for a handful of genuinely repeated utility clusters — it is not a substitute for component extraction.
- Mobile-first responsive prefixes (`sm:`, `md:`, `lg:`) — base (unprefixed) classes target the smallest viewport.
- Theme (Settings → Theme, MASTER.md §10) is implemented via Tailwind's `dark:` variant driven by a `data-theme`/class strategy tied to the Agency's saved preference — not a second, parallel styling system.

---

## 14. Error Handling

- A global NestJS exception filter (`core/filters/http-exception.filter.ts`, TASKS.md T50) is the single place that maps any thrown exception to the API_RULES §7 error envelope — no Controller hand-builds an error response.
- Business-rule failures are thrown as typed exceptions (e.g., `InvalidWorkflowTransitionException`, `CrossTenantAccessException`) with an associated HTTP status and `code`, caught generically by the filter — not as ad hoc `throw new Error('...')` with a magic string.
- A `CrossTenantAccessException` always maps to `404`, never `403` (API_RULES §4/§20) — this mapping lives in one place (the filter), so it cannot be gotten wrong per-endpoint.
- Unexpected/unhandled exceptions are caught by the same filter, logged with full detail server-side (§15), and returned to the client as a generic `500`/`INTERNAL_ERROR` with no internal detail (API_RULES §21).
- Frontend: all API calls go through the shared `api-client` (T13), which centrally parses the API_RULES §7 error envelope once — components consume a normalized error object, never parse `response.json().error` themselves.

---

## 15. Logging

- Structured (JSON) application logs, one entry per request at minimum, tagged with a request ID and (when present) `tenantId`/`userId` for correlation — never free-text `console.log` in committed code.
- Standard levels: `error` (failed requests, exceptions), `warn` (rate-limit hits, validation storms), `info` (request summary), `debug` (local development only, stripped/disabled in production).
- Sensitive fields (passwords, full JWTs, payment references) are redacted before any log line is written — same rule as API_RULES §21, enforced at the logging layer so no individual call site has to remember it.
- **Activity Log (DATABASE.md §3.21) is a business audit trail, not an application log** — it records domain events (`booking.created`, `payment.recorded`) for the product's own Activity Log module (MASTER.md #14/#20), and is written via its own interceptor (T49), never conflated with operational request/error logging described above.

---

## 16. Testing Standards

- Unit tests target Services (business logic) with Repositories mocked — this is where Workflow Engine transition rules, fare/tax totals, and refund eligibility logic get verified in isolation.
- Integration tests target Repositories against a real (test) Postgres instance — this is where tenant-scoping behavior itself is verified, since that's precisely the kind of bug a mocked repository can't catch.
- A small set of end-to-end API tests cover the critical path only: login → create booking → reserve → issue ticket → invoice → pay → complete, plus a tenant-isolation smoke test (two Agencies, cross-access attempt) — matching TASKS.md T50's acceptance criteria directly.
- Test files are colocated with source (`*.spec.ts` next to the file under test) rather than in a separate mirrored tree.
- **Scope honesty:** TASKS.md's 50 tasks are scoped at 15–30 minutes each and do not individually budget dedicated test-authoring time; the testing effort above is concentrated in Phase 10 (Hardening) rather than spread per-task. This is a deliberate MVP trade-off, not an oversight — broader test coverage is a natural post-MVP hardening item.

---

## 17. Git Branch Strategy

- Trunk-based, simplified for MVP-speed solo/small-team delivery: `main` is the only long-lived branch.
- One short-lived feature branch per TASKS.md task (or small cluster of adjacent tasks), named `t<NN>-<short-description>` (e.g., `t32-booking-aggregate-endpoint`) — the task number keeps branch history traceable against TASKS.md.
- No long-lived `develop` branch — the project's short horizon doesn't justify the extra merge overhead.
- A branch is merged to `main` only once its task's acceptance criteria (TASKS.md) pass and the project still builds (TASKS.md's standing rule: buildable after every task).

---

## 18. Commit Convention

Conventional Commits, with the TASKS.md task number included for traceability:

```
<type>(<module>): <short description> (T<NN>)

feat(booking): implement booking aggregate endpoint (T32)
fix(finance): correct refund eligibility check (T43)
chore(foundation): configure docker-compose for local postgres (T05)
```

- Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test` — matching standard Conventional Commits, no project-specific types invented.
- One commit generally corresponds to one TASKS.md task; a task that needs multiple commits keeps the task number in each.
- Commits to `MASTER.md`, `TASKS.md`, `DATABASE.md`, `API_RULES.md`, or this file use `docs:` and are expected to be rare, given all five are frozen except by explicit request.

---

## 19. Code Review Checklist

Every PR/change is checked against, in order:

1. **Tenant isolation** — does every new query go through the base repository (§4)? Any raw Prisma/SQL outside a repository?
2. **Layering** — does the Controller stay thin (§6)? Is business logic in the Service, not leaked into the Controller or DTO?
3. **Workflow integrity** — does any status change go through the Workflow Engine, rather than a direct field write (§3, §5)?
4. **DTO correctness** — are `tenantId`/`agencyId`/audit fields absent from Create/Update DTOs (§7, §8)? Is the response shape mapped, not a raw Prisma model?
5. **API contract compliance** — does the endpoint match API_RULES.md exactly (URL shape, status codes, response/error envelope, pagination/filtering conventions)?
6. **Naming** — does every new file/class/variable follow §2?
7. **No hardcoded config** — currency, Invoice/Ticket Prefix, secrets, and URLs are never hardcoded (they come from Settings/env per MASTER.md §8, TASKS.md T08).
8. **Acceptance criteria** — does the change satisfy its TASKS.md task's Acceptance Criteria line-for-line?
9. **Build health** — does the project still build and run per TASKS.md's standing rule?

---

## 20. Definition of Done

A TASKS.md task is Done only when **all** of the following are true:

- [ ] Its Acceptance Criteria (TASKS.md) pass, verified manually or via test.
- [ ] The project builds and runs — both `apps/api` and `apps/web` — with zero new errors.
- [ ] No lint/type errors introduced.
- [ ] Code Review Checklist (§19) passed — including the tenant-isolation and layering checks specifically.
- [ ] Any new/changed endpoint matches API_RULES.md exactly.
- [ ] Any new/changed table matches DATABASE.md exactly — no undocumented column, table, or relationship.
- [ ] Commit(s) follow §18's convention and reference the task number.
- [ ] Nothing in MASTER.md, TASKS.md, DATABASE.md, or API_RULES.md was modified in the process — a task that seems to require changing one of them is stopped and flagged instead (MASTER.md §13 rule 8).

---

*End of CODING_STANDARDS.md. Governed by MASTER.md, TASKS.md, DATABASE.md, and API_RULES.md (all frozen). This document does not modify any of them.*
