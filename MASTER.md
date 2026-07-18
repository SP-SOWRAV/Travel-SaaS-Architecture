# MASTER.md
## OTA SaaS Management Platform — Project Constitution

**Status:** FROZEN
**Applies to:** All future development, design, and code generation tasks on this project.

> This document is the single source of truth for architecture, scope, terminology, and structure. Every future task — coding, schema design, API design, UI work — must comply with this document. **Do not deviate from it. Do not silently reinterpret it. If a future request conflicts with this document, stop and flag the conflict instead of resolving it unilaterally.** Changes to this document only happen when the project owner explicitly requests a change to MASTER.md itself.

---

## 1. Product Definition

A multi-tenant B2B SaaS platform sold to travel agencies. Each tenant is a **travel agency**, referred to as **"Agency"** everywhere business-facing (UI, documentation, API responses, support). The internal database identifier for a tenant remains `tenant_id` — this is an implementation detail and must never surface in the UI or in outward-facing API field names.

Each Agency operates independently within the platform with its own branches, staff, customers, bookings, and financial records. Strict data isolation between Agencies is a non-negotiable requirement — not a feature, a constraint that every module must satisfy by construction.

---

## 2. Technology Stack (Frozen)

| Layer | Technology |
|---|---|
| Frontend | Next.js, TypeScript, Tailwind CSS |
| Backend | NestJS |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT |
| API Style | REST, versioned (`/api/v1/...`) |

No substitution of any item in this table without explicit approval.

---

## 3. Architectural Principles (Frozen)

1. **Modular Monolith** — one deployable NestJS backend, organized into strictly bounded modules per business domain. No module reaches directly into another module's data layer; cross-module access goes through the owning module's service interface.
2. **Clean Architecture per module** — layering is: `Controller → Application/Use-Case Service → Domain Logic → Repository (Prisma)`. Controllers contain no business rules. Repositories are the only layer that touches Prisma directly.
3. **Multi-Tenant SaaS, shared schema** — one PostgreSQL database, one schema, every Agency-scoped table carries `tenant_id`. Tenant scoping is enforced structurally through a shared base-repository pattern — never left to individual services to remember to filter by tenant.
4. **REST API**, versioned from the first endpoint.
5. **Terminology boundary**: `tenant_id` is a DB/internal-only term. The API response/DTO layer maps it to `agencyId` at the boundary. UI and documentation say "Agency" exclusively. This mapping happens in one place, not ad hoc per endpoint.

---

## 4. Global vs. Agency-Scoped Data (Frozen)

**Global shared reference tables (no `tenant_id`, shared read-only across all Agencies):**
- Airlines
- Airports
- Countries
- Cities

These are platform-maintained reference data, seeded once. Agencies do not each maintain their own copy.

**Agency-scoped (carries `tenant_id`):** everything else — Branches, Users, Customers, Bookings and all their sub-entities, Finance records, Settings, Activity Log entries.

---

## 5. The Travel Workflow Engine (Frozen)

A shared core service (`workflow-engine`), not owned by any single business module. Flight Booking and Finance modules are *consumers* of it, not independent owners of their own status logic.

**Canonical stages, in order:**

```
Draft → Reserved → Ticket Issued → Invoiced → Paid → Completed
                                                    ↘ Refunded
Draft / Reserved / Ticket Issued ────────────────→ Cancelled
```

Rules:
- The primary path is strictly linear: Draft → Reserved → Ticket Issued → Invoiced → Paid → Completed.
- **Cancelled** is reachable only from a pre-payment stage (Draft, Reserved, or Ticket Issued).
- **Refunded** is reachable only from a post-payment stage (Paid or Completed).
- Every transition is recorded in a single shared audit table (`workflow_transitions` or equivalent): stage-from, stage-to, actor, timestamp, reason. This table is what makes the engine reusable rather than each module rolling its own status history.
- No module implements its own parallel status enum for booking lifecycle. If a module needs booking state, it reads it through the Workflow Engine.

---

## 6. Final Module List (Frozen)

| # | Module | Scope |
|---|---|---|
| 1 | **Auth** | Login, JWT issuance/refresh, role & permission guards |
| 2 | **Dashboard** | Agency-level KPI summary |
| 3 | **Settings** | Agency Profile, Logo, Theme, Currency, Timezone, Invoice Prefix, Ticket Prefix, Email, Phone, Address |
| 4 | **Branch Management** | CRUD branches under an Agency |
| 5 | **User Management** | Staff accounts, roles, branch assignment |
| 6 | **My Profile** | Self-service profile for the logged-in user (own details, password, preferences) |
| 7 | **Customer Management** | The Agency's own customers/travelers |
| 8 | **Airline Management** | Global reference data (see §4) |
| 9 | **Airport Management** | Global reference data (see §4) |
| 10 | **Country / City Management** | Global reference data (see §4) |
| 11 | **Flight Booking** | Booking, Passenger, Sector, Fare, Tax, Ticket, Remarks — driven by the Workflow Engine |
| 12 | **Finance** | Invoice, Receipt, Payment, Refund, Transaction |
| 13 | **Reports** | Cross-module reporting (sales, outstanding, agent performance) |
| 14 | **Activity Log** | Audit trail of user/system actions across the Agency |
| — | **Workflow Engine** *(shared core, not a standalone business module)* | Stage definitions, transition validation, transition history |

There is no standalone "Company Management" module — a company profile is 1:1 with an Agency and lives under **Settings → Agency Profile**.

---

## 7. Finance Module — MVP Scope (Frozen)

**In MVP:** Invoice, Receipt, Payment, Refund, Transaction.

**Explicitly deferred to Version 2:** Ledger (double-entry accounting). The Transaction record is the MVP's financial log; it is intentionally *not* a double-entry ledger. Do not implement double-entry bookkeeping logic in this version — it is a distinct, larger domain reserved for a future phase.

---

## 8. Settings Module — Scope (Frozen)

Per Agency: Agency Profile, Logo, Theme, Currency, Timezone, Invoice Prefix, Ticket Prefix, Email, Phone, Address.

Invoice Prefix and Ticket Prefix drive document numbering for the Finance and Flight Booking modules respectively — document numbering must read from Settings, never be hardcoded per module.

---

## 9. Module Dependencies

```
Auth ──────────────┐
                    ├──> required by every module (tenant/user context)
Settings ───────────┘
   │
   ├──> Finance (Invoice/Ticket Prefix → numbering, Currency → money fields)
   │
Branch ──> User ──> My Profile
   │
Customer ───────────────┐
Airline (global) ───┐    │
Airport (global) ───┤    │
Country/City ────────┘    ▼
   (feeds Sector)     Flight Booking (Booking→Passenger→Sector→Fare→Tax→Ticket→Remarks)
                            │
                            ▼ (Workflow Engine drives transitions)
                        Finance (Invoice→Receipt→Payment→Refund→Transaction)
                            │
                            ▼
                    Reports / Dashboard / Activity Log
                    (read/observe across all modules above)
```

Activity Log is a cross-cutting observer of actions in every other module — it does not sit in the linear booking-to-finance chain but must be wired to log significant state changes across all of them.

---

## 10. Folder Strategy

Monorepo, two deployable apps, one shared types package:

```
apps/
  api/
    src/
      core/                → tenant-context middleware, JWT guards, base repository (auto tenant scoping)
      workflow-engine/      → stage enum, transition validator, transition-history service
      modules/
        auth/
        settings/
        branch/
        user/
        my-profile/
        customer/
        airline/
        airport/
        geo/                → country/city
        flight-booking/      → passenger/, sector/, fare/, tax/, ticket/, remarks/
        finance/              → invoice/, receipt/, payment/, refund/, transaction/
        reports/
        dashboard/
        activity-log/
  web/
    (Next.js app; route groups mirror the module list)
packages/
  shared-types/            → workflow stage enum, role enum, shared DTOs
```

---

## 11. Database Strategy

- Shared schema, shared database. Every Agency-scoped table carries `tenant_id`, indexed as the leading column of its composite indexes.
- `tenant_id` is never renamed at the DB level. The API boundary maps it to `agencyId` in requests/responses.
- Global reference tables (Airlines, Airports, Countries, Cities) carry no `tenant_id`.
- Document numbering (Invoice Prefix, Ticket Prefix) is implemented via a per-Agency sequence table, incremented inside a DB transaction to remain safe under concurrent bookings.
- All tenant-scoped data access goes through the shared base-repository — no module queries Prisma directly without going through it.

---

## 12. SaaS Strategy

- Agency provisioning in MVP is performed by a **Platform Admin** role — no self-service signup in this version.
- Isolation is enforced at the repository layer for every code path, including reports and background jobs — never solely at the controller/API layer.
- Shared schema now; any Agency later requiring physical data isolation can be migrated to a dedicated schema without redesign, since the row-level model is a strict subset of that architecture.
- Agency branding (Logo, Theme, Invoice Prefix) from the Settings module is the basis for white-labeling generated documents.
- Subscription billing of Agencies themselves is out of scope for MVP; the Agency record should carry a `status` (active/trial/suspended) field to avoid a future migration, but no billing logic is implemented now.

---

## 13. Governing Rules for All Future Work

1. **Terminology**: UI, docs, and API DTOs say "Agency." Only raw DB columns say `tenant_id`.
2. **No parallel status logic**: booking/document lifecycle state always flows through the Workflow Engine, never a module-local enum.
3. **No Ledger in MVP**: do not add double-entry accounting structures until explicitly instructed for V2.
4. **Global reference data stays global**: Airlines, Airports, Countries, Cities are never given a `tenant_id` column without an explicit architecture change request.
5. **Settings is the source of truth for numbering, currency, and branding** — never hardcode prefixes, currency symbols, or branding elsewhere.
6. **Clean Architecture layering is mandatory** in every module: no business logic in controllers, no Prisma calls outside repositories.
7. **Tenant isolation is structural, not conventional**: every new module must use the shared base-repository, not write its own tenant-filtering logic.
8. **This document is frozen.** Any future instruction that contradicts it must be flagged back to the project owner before acting on it, not silently reconciled.

---

## 14. Open Items Carried Forward (Not Yet Decided — Not Blocking, Tracked)

- Roles/permission matrix (exact list of roles beyond Platform Admin and Agency-level staff) — not yet finalized.
- Whether Flight Booking assumes manual data entry only, or a future GDS integration — not yet finalized, does not block current schema design since Sector references global Airline/Airport tables either way.
- Multi-currency: Currency is stored per Agency (Settings); cross-currency conversion logic is not in scope for MVP.

---

*End of MASTER.md — this document governs all subsequent design and implementation work on this project.*
