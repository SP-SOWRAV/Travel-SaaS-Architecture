# DATABASE.md
## OTA SaaS Management Platform — Enterprise Database Design

**Status:** Reference document, governed by and subordinate to MASTER.md (frozen) and TASKS.md (frozen). This document describes the data design implied by both; it does not introduce new modules, terminology, or scope. If anything here conflicts with MASTER.md, MASTER.md wins.

**Note on notation:** Data types below are described generically (UUID, VARCHAR, NUMERIC, TIMESTAMPTZ, ENUM, JSONB, BOOLEAN, TEXT) as design specification, not SQL DDL or Prisma schema. No `CREATE TABLE` statements or `schema.prisma` syntax appear in this document by design.

---

## 1. Database Design Principles

1. **UUID primary keys everywhere.** Sequential integer IDs leak record counts across tenants and are guessable; in a multi-tenant SaaS this is a minor but real information-disclosure surface. UUIDs also make future schema-per-tenant migration and eventual data merging/replication safe.
2. **Tenant isolation is structural, not conventional.** Every Agency-scoped table carries `tenant_id`. No table relies on join-time filtering alone — `tenant_id` is denormalized onto every tenant-scoped table directly, even where it's technically derivable through a parent FK, so that the base repository (MASTER.md §11, §13) can filter any table by a single, always-present column.
3. **Money is never a float.** All monetary columns use fixed-precision NUMERIC. No monetary value is ever stored or computed in floating point.
4. **All timestamps are timezone-aware (UTC at rest).** Agencies operate across timezones (Settings → Timezone); display conversion happens at the presentation layer, never at storage.
5. **Status is always a constrained enum, never free-text.** Booking stage, ticket status, invoice status, etc. are enumerated types, matched exactly to the vocabulary frozen in MASTER.md.
6. **Referential integrity is enforced at the database level**, not just application-level checks — every FK relationship described below is a real foreign key constraint.
7. **Financial and audit records are immutable once written.** Tables that represent a historical fact (workflow transitions, transactions, activity log) are append-only: no update, no delete, ever.
8. **Soft delete for business/master data, hard-never-delete for financial/audit history, deactivation (not deletion) for global reference data.** Full rules in §4.
9. **Every table that can be filtered or reported on by tenant is indexed leading with `tenant_id`.** Full rules in §11.

---

## 2. Entity Relationship Overview

```
                          ┌────────────┐
                          │  agencies  │  (tenant root, "Agency" in UI)
                          └─────┬──────┘
                                │ 1:1
                          ┌─────▼──────┐
                          │  settings  │
                          └────────────┘
                                │
              ┌─────────────────┼─────────────────┬───────────────┐
              │                 │                 │               │
        ┌─────▼─────┐    ┌──────▼─────┐    ┌──────▼──────┐  ┌─────▼──────┐
        │  branches  │    │   users    │    │  customers  │  │activity_logs│
        └─────┬──────┘    └──────┬─────┘    └──────┬──────┘  └────────────┘
              │                 │                 │
              └────────┬────────┴────────┬────────┘
                        │                 │
                  ┌─────▼─────┐           │
                  │  bookings │◄──────────┘  (customer_id, branch_id, agent_id → users)
                  └─────┬─────┘
       ┌─────────┬──────┼───────┬──────────┬───────────┐
       │         │      │       │          │           │
 ┌─────▼───┐┌────▼───┐┌─▼────┐┌─▼──────┐┌──▼───────┐┌──▼─────────────────┐
 │passengers││sectors ││tickets││remarks ││  fares   ││workflow_transitions│
 └─────────┘└───┬────┘└──────┘└────────┘└────┬─────┘└─────────────────────┘
                 │(airline_id, origin/dest)         │
           ┌─────▼──────┐  ┌───────────┐      ┌─────▼─────┐
           │  airlines  │  │  airports │      │   taxes   │
           │  (global)  │  │  (global) │      └───────────┘
           └────────────┘  └─────┬─────┘
                                  │
                            ┌─────▼─────┐      ┌────────────┐
                            │   cities  │──────►│ countries  │
                            │  (global) │      │  (global)  │
                            └───────────┘      └────────────┘

  bookings ──► invoices ──► invoice_lines
     │             │
     │             ├──► payments ──► receipts
     │             └──► refunds
     │
     └──────────────────────────────► transactions (logs payments + refunds)
```

Global reference tables (`countries`, `cities`, `airports`, `airlines`) have no `tenant_id` and are shared read-only across every Agency, per MASTER.md §4. Everything under `agencies` is tenant-scoped. `workflow_transitions`, `transactions`, and `activity_logs` are append-only historical logs.

---

## 3. Every Table

Legend for the per-table spec: **PK** primary key · **FK** foreign key · **Unique** unique constraint · **Indexes** beyond PK/unique · **Relationships** cardinality in plain terms.

### 3.1 `agencies`
**Purpose:** The tenant root. One row per Agency (customer of the platform). Internal identifier only — never surfaced in UI as "tenant."

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | No | random | — |
| name | VARCHAR(255) | No | — | Legal/platform name of the Agency |
| status | ENUM(`trial`,`active`,`suspended`) | No | `trial` | Platform-level lifecycle, drives login access |
| created_at | TIMESTAMPTZ | No | now() | |
| updated_at | TIMESTAMPTZ | No | now() | |
| deleted_at | TIMESTAMPTZ | Yes | null | Soft delete — Agency offboarding |

**PK:** id
**FK:** none
**Unique:** none beyond PK
**Indexes:** `status` (Platform Admin filtering); partial index on `deleted_at IS NULL`
**Relationships:** 1:1 → `settings`; 1:N → `branches`, `users`, `customers`, `bookings`, `invoices`, `activity_logs`

---

### 3.2 `settings`
**Purpose:** Per-Agency configuration — profile, branding, currency, timezone, document prefixes, contact details (MASTER.md §8/§10).

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | No | random | |
| tenant_id | UUID | No | — | FK → agencies.id, 1:1 |
| legal_name | VARCHAR(255) | Yes | null | Falls back to agencies.name if null |
| logo_url | VARCHAR(500) | Yes | null | |
| theme | ENUM(`light`,`dark`,`system`) | No | `system` | |
| currency_code | CHAR(3) | No | `USD` | ISO 4217 |
| timezone | VARCHAR(64) | No | `UTC` | IANA timezone name |
| invoice_prefix | VARCHAR(10) | No | `INV-` | Drives Finance document numbering |
| ticket_prefix | VARCHAR(10) | No | `TKT-` | Drives Ticket numbering |
| contact_email | VARCHAR(255) | Yes | null | |
| contact_phone | VARCHAR(30) | Yes | null | |
| address_line1 | VARCHAR(255) | Yes | null | |
| address_line2 | VARCHAR(255) | Yes | null | |
| city_id | UUID | Yes | null | FK → cities.id |
| country_id | UUID | Yes | null | FK → countries.id |
| postal_code | VARCHAR(20) | Yes | null | |
| created_at | TIMESTAMPTZ | No | now() | |
| updated_at | TIMESTAMPTZ | No | now() | |

**PK:** id
**FK:** tenant_id → agencies.id; city_id → cities.id; country_id → countries.id
**Unique:** tenant_id (enforces 1:1)
**Indexes:** tenant_id (unique index doubles as lookup index)
**Relationships:** 1:1 with `agencies`; references global `cities`/`countries`
No soft delete — a Settings row lives and dies with its Agency.

---

### 3.3 `branches`
**Purpose:** Physical/operational branch locations under an Agency.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | No | random | |
| tenant_id | UUID | No | — | FK → agencies.id |
| name | VARCHAR(255) | No | — | |
| code | VARCHAR(20) | No | — | Short code, e.g. for booking reference prefixing |
| address_line1 | VARCHAR(255) | Yes | null | |
| city_id | UUID | Yes | null | FK → cities.id |
| country_id | UUID | Yes | null | FK → countries.id |
| phone | VARCHAR(30) | Yes | null | |
| email | VARCHAR(255) | Yes | null | |
| is_active | BOOLEAN | No | true | |
| created_at / updated_at / deleted_at | TIMESTAMPTZ | see §5 | — | Standard audit set |

**PK:** id
**FK:** tenant_id → agencies.id; city_id → cities.id; country_id → countries.id
**Unique:** (tenant_id, code)
**Indexes:** tenant_id; partial index on `deleted_at IS NULL`
**Relationships:** N:1 → `agencies`; 1:N → `users`, `bookings`

---

### 3.4 `users`
**Purpose:** Staff accounts (and Platform Admins). Auth identity + role + branch assignment.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | No | random | |
| tenant_id | UUID | Yes | null | FK → agencies.id; **null only for Platform Admin** |
| branch_id | UUID | Yes | null | FK → branches.id |
| email | VARCHAR(255) | No | — | Globally unique login identifier |
| password_hash | VARCHAR(255) | No | — | |
| full_name | VARCHAR(255) | No | — | |
| role | ENUM(`platform_admin`,`agency_admin`,`branch_manager`,`agent`) | No | `agent` | Provisional — full matrix is a MASTER.md open item |
| phone | VARCHAR(30) | Yes | null | |
| is_active | BOOLEAN | No | true | |
| last_login_at | TIMESTAMPTZ | Yes | null | |
| created_at / updated_at / deleted_at | TIMESTAMPTZ | see §5 | — | Standard audit set |

**PK:** id
**FK:** tenant_id → agencies.id (nullable); branch_id → branches.id
**Unique:** email (platform-wide, not per-tenant — see design note below)
**Indexes:** tenant_id; (tenant_id, role); partial index on `deleted_at IS NULL`
**Relationships:** N:1 → `agencies`, `branches`; 1:N → `bookings` (as agent), `activity_logs` (as actor), `workflow_transitions` (as actor)

**Design note:** Email is unique platform-wide rather than per-tenant, so login requires only email + password with no separate "select your Agency" step. This means one email cannot belong to two Agencies simultaneously — acceptable for MVP; revisit if an agency network with shared staff emerges as a real requirement.

---

### 3.5 `customers`
**Purpose:** The Agency's own clients/travelers — distinct from `users` (staff) and from `passengers` (who fly on a specific booking).

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | No | random | |
| tenant_id | UUID | No | — | FK → agencies.id |
| full_name | VARCHAR(255) | No | — | |
| email | VARCHAR(255) | Yes | null | |
| phone | VARCHAR(30) | Yes | null | |
| passport_number | VARCHAR(50) | Yes | null | |
| nationality_country_id | UUID | Yes | null | FK → countries.id |
| date_of_birth | DATE | Yes | null | |
| address_line1 | VARCHAR(255) | Yes | null | |
| created_at / updated_at / deleted_at | TIMESTAMPTZ | see §5 | — | Standard audit set |

**PK:** id
**FK:** tenant_id → agencies.id; nationality_country_id → countries.id
**Unique:** none (passport numbers can repeat across nationalities/data-entry variance; not enforced)
**Indexes:** tenant_id; (tenant_id, email); (tenant_id, phone); partial index on `deleted_at IS NULL`
**Relationships:** N:1 → `agencies`; 1:N → `bookings`

---

### 3.6 Global Reference Tables

#### `countries`
| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | No | random | |
| name | VARCHAR(100) | No | — | |
| iso_code | CHAR(2) | No | — | ISO 3166-1 alpha-2 |
| is_active | BOOLEAN | No | true | |
| created_at / updated_at | TIMESTAMPTZ | No | now() | |

**PK:** id · **Unique:** iso_code · **Indexes:** name (search) · **Relationships:** 1:N → `cities`, referenced by `customers`, `settings`
No `tenant_id`, no `deleted_at` — deactivate via `is_active`, never delete.

#### `cities`
| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | No | random | |
| country_id | UUID | No | — | FK → countries.id |
| name | VARCHAR(100) | No | — | |
| is_active | BOOLEAN | No | true | |
| created_at / updated_at | TIMESTAMPTZ | No | now() | |

**PK:** id · **FK:** country_id → countries.id · **Unique:** (country_id, name) · **Indexes:** country_id; name · **Relationships:** N:1 → `countries`; 1:N → `airports`

#### `airports`
| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | No | random | |
| city_id | UUID | No | — | FK → cities.id |
| iata_code | CHAR(3) | No | — | |
| icao_code | CHAR(4) | Yes | null | |
| name | VARCHAR(255) | No | — | |
| is_active | BOOLEAN | No | true | |
| created_at / updated_at | TIMESTAMPTZ | No | now() | |

**PK:** id · **FK:** city_id → cities.id · **Unique:** iata_code · **Indexes:** city_id; icao_code · **Relationships:** N:1 → `cities`; referenced by `sectors` (origin and destination)

#### `airlines`
| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | No | random | |
| iata_code | CHAR(2) | No | — | |
| icao_code | CHAR(3) | Yes | null | |
| name | VARCHAR(255) | No | — | |
| is_active | BOOLEAN | No | true | |
| created_at / updated_at | TIMESTAMPTZ | No | now() | |

**PK:** id · **Unique:** iata_code · **Indexes:** name · **Relationships:** referenced by `sectors`

All four global tables: no `tenant_id`, no `deleted_at`; writable only by Platform Admin; readable by every Agency.

---

### 3.7 `bookings`
**Purpose:** Root aggregate of the Flight Booking domain and the entity the Workflow Engine operates on.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | No | random | |
| tenant_id | UUID | No | — | FK → agencies.id |
| booking_reference | VARCHAR(30) | No | generated | Human-facing reference |
| customer_id | UUID | No | — | FK → customers.id |
| branch_id | UUID | No | — | FK → branches.id |
| agent_id | UUID | No | — | FK → users.id — staff who created the booking |
| status | ENUM(`draft`,`reserved`,`ticket_issued`,`invoiced`,`paid`,`completed`,`refunded`,`cancelled`) | No | `draft` | Mirrors MASTER.md §5 exactly |
| currency_code | CHAR(3) | No | from Settings | |
| total_amount | NUMERIC(12,2) | No | 0.00 | Sum of fares + taxes |
| created_at / updated_at | TIMESTAMPTZ | No | now() | |
| deleted_at | TIMESTAMPTZ | Yes | null | Administrative correction only — `cancelled` is the business-level terminal state, not deletion |

**PK:** id
**FK:** tenant_id → agencies.id; customer_id → customers.id; branch_id → branches.id; agent_id → users.id
**Unique:** (tenant_id, booking_reference)
**Indexes:** tenant_id; (tenant_id, status); (tenant_id, customer_id); (tenant_id, created_at)
**Relationships:** N:1 → `agencies`, `customers`, `branches`, `users`; 1:N → `passengers`, `sectors`, `fares`, `tickets`, `remarks`, `workflow_transitions`, `invoices`

---

### 3.8 `passengers`
**Purpose:** Travelers on a booking.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | No | random | |
| booking_id | UUID | No | — | FK → bookings.id |
| first_name | VARCHAR(100) | No | — | |
| last_name | VARCHAR(100) | No | — | |
| date_of_birth | DATE | Yes | null | |
| passport_number | VARCHAR(50) | Yes | null | |
| passenger_type | ENUM(`ADT`,`CHD`,`INF`) | No | `ADT` | Adult / Child / Infant |
| nationality_country_id | UUID | Yes | null | FK → countries.id |
| created_at / updated_at | TIMESTAMPTZ | No | now() | |

**PK:** id · **FK:** booking_id → bookings.id; nationality_country_id → countries.id
**Indexes:** booking_id
**Relationships:** N:1 → `bookings`; 1:N → `fares`, `tickets`
No `tenant_id` column directly — always accessed through `booking_id`, but the base repository join enforces tenant scoping via `bookings.tenant_id`. No soft delete; passengers are removed by hard delete only while the booking is in `draft` (application-enforced, per T29).

---

### 3.9 `sectors`
**Purpose:** Flight segments within a booking (supports one-way, return, multi-city).

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | No | random | |
| booking_id | UUID | No | — | FK → bookings.id |
| airline_id | UUID | No | — | FK → airlines.id |
| origin_airport_id | UUID | No | — | FK → airports.id |
| destination_airport_id | UUID | No | — | FK → airports.id |
| flight_number | VARCHAR(10) | No | — | |
| cabin_class | ENUM(`economy`,`premium_economy`,`business`,`first`) | No | `economy` | |
| departure_at | TIMESTAMPTZ | No | — | |
| arrival_at | TIMESTAMPTZ | No | — | |
| sequence_number | SMALLINT | No | 1 | Ordering for multi-city itineraries |
| created_at / updated_at | TIMESTAMPTZ | No | now() | |

**PK:** id · **FK:** booking_id → bookings.id; airline_id → airlines.id; origin_airport_id / destination_airport_id → airports.id
**Indexes:** booking_id; airline_id; origin_airport_id; destination_airport_id
**Relationships:** N:1 → `bookings`, `airlines`, `airports` (×2); 1:N → `fares`

---

### 3.10 `fares`
**Purpose:** Priced fare per passenger per sector.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | No | random | |
| booking_id | UUID | No | — | FK → bookings.id (denormalized for direct tenant-safe lookup) |
| passenger_id | UUID | No | — | FK → passengers.id |
| sector_id | UUID | No | — | FK → sectors.id |
| base_amount | NUMERIC(12,2) | No | 0.00 | |
| currency_code | CHAR(3) | No | from booking | |
| created_at / updated_at | TIMESTAMPTZ | No | now() | |

**PK:** id · **FK:** booking_id → bookings.id; passenger_id → passengers.id; sector_id → sectors.id
**Unique:** (passenger_id, sector_id)
**Indexes:** booking_id; passenger_id; sector_id
**Relationships:** N:1 → `bookings`, `passengers`, `sectors`; 1:N → `taxes`

---

### 3.11 `taxes`
**Purpose:** Tax line items against a fare.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | No | random | |
| fare_id | UUID | No | — | FK → fares.id |
| tax_code | VARCHAR(10) | No | — | e.g. airport/government tax code |
| description | VARCHAR(255) | Yes | null | |
| amount | NUMERIC(12,2) | No | 0.00 | |
| created_at | TIMESTAMPTZ | No | now() | |

**PK:** id · **FK:** fare_id → fares.id
**Indexes:** fare_id
**Relationships:** N:1 → `fares`

---

### 3.12 `tickets`
**Purpose:** Issued (or pending) ticket per passenger, populated with a real number only once the Workflow Engine executes the `Ticket Issued` transition.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | No | random | |
| booking_id | UUID | No | — | FK → bookings.id |
| passenger_id | UUID | No | — | FK → passengers.id |
| ticket_number | VARCHAR(30) | Yes | null | Null until issuance; uses Settings → Ticket Prefix |
| status | ENUM(`unissued`,`issued`,`voided`) | No | `unissued` | |
| issued_at | TIMESTAMPTZ | Yes | null | |
| created_at / updated_at | TIMESTAMPTZ | No | now() | |

**PK:** id · **FK:** booking_id → bookings.id; passenger_id → passengers.id
**Unique:** ticket_number (where not null; partial unique index)
**Indexes:** booking_id; passenger_id
**Relationships:** N:1 → `bookings`, `passengers`

---

### 3.13 `remarks`
**Purpose:** Free-text notes attached to a booking (internal or customer-facing).

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | No | random | |
| booking_id | UUID | No | — | FK → bookings.id |
| remark_type | ENUM(`internal`,`customer_facing`) | No | `internal` | |
| remark_text | TEXT | No | — | |
| created_by | UUID | No | — | FK → users.id |
| created_at | TIMESTAMPTZ | No | now() | Append-oriented; edits create a new remark rather than mutate history |

**PK:** id · **FK:** booking_id → bookings.id; created_by → users.id
**Indexes:** booking_id
**Relationships:** N:1 → `bookings`, `users`

---

### 3.14 `workflow_transitions`
**Purpose:** The Workflow Engine's audit trail (MASTER.md §5) — every stage change on a booking, immutable.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | No | random | |
| booking_id | UUID | No | — | FK → bookings.id |
| from_stage | ENUM(same as bookings.status) | Yes | null | Null for the initial `draft` creation event |
| to_stage | ENUM(same as bookings.status) | No | — | |
| actor_id | UUID | Yes | null | FK → users.id; null for system-initiated transitions |
| reason | TEXT | Yes | null | Required by application logic for Cancelled/Refunded, optional otherwise |
| created_at | TIMESTAMPTZ | No | now() | |

**PK:** id · **FK:** booking_id → bookings.id; actor_id → users.id
**Indexes:** booking_id; (booking_id, created_at) for ordered history retrieval
**Relationships:** N:1 → `bookings`, `users`
**Immutability:** No `updated_at`, no `deleted_at` — rows are never modified or removed once written.

---

### 3.15 `invoices`
**Purpose:** Billing document generated from a booking on the `Invoiced` transition; number driven by Settings → Invoice Prefix.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | No | random | |
| tenant_id | UUID | No | — | FK → agencies.id |
| booking_id | UUID | No | — | FK → bookings.id |
| invoice_number | VARCHAR(30) | No | generated | |
| currency_code | CHAR(3) | No | — | |
| subtotal_amount | NUMERIC(12,2) | No | 0.00 | |
| tax_amount | NUMERIC(12,2) | No | 0.00 | |
| total_amount | NUMERIC(12,2) | No | 0.00 | |
| status | ENUM(`issued`,`partially_paid`,`paid`,`void`) | No | `issued` | |
| issued_at | TIMESTAMPTZ | No | now() | |
| created_at / updated_at | TIMESTAMPTZ | No | now() | |

**PK:** id · **FK:** tenant_id → agencies.id; booking_id → bookings.id
**Unique:** (tenant_id, invoice_number)
**Indexes:** tenant_id; booking_id; (tenant_id, status)
**Relationships:** N:1 → `agencies`, `bookings`; 1:N → `invoice_lines`, `payments`, `refunds`
No soft delete — financial documents are never deleted; `status = void` is the business-level cancellation.

---

### 3.16 `invoice_lines`
**Purpose:** Line items composing an invoice.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | No | random | |
| invoice_id | UUID | No | — | FK → invoices.id |
| description | VARCHAR(255) | No | — | |
| quantity | SMALLINT | No | 1 | |
| unit_amount | NUMERIC(12,2) | No | 0.00 | |
| line_total | NUMERIC(12,2) | No | 0.00 | |
| sort_order | SMALLINT | No | 0 | |

**PK:** id · **FK:** invoice_id → invoices.id
**Indexes:** invoice_id
**Relationships:** N:1 → `invoices`

---

### 3.17 `payments`
**Purpose:** A payment received against an invoice; drives the `Paid`/`Completed` transitions.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | No | random | |
| tenant_id | UUID | No | — | FK → agencies.id |
| invoice_id | UUID | No | — | FK → invoices.id |
| amount | NUMERIC(12,2) | No | — | |
| currency_code | CHAR(3) | No | — | |
| payment_method | ENUM(`cash`,`card`,`bank_transfer`,`other`) | No | — | |
| reference | VARCHAR(100) | Yes | null | External reference (transaction ID, cheque no., etc.) |
| received_by | UUID | No | — | FK → users.id |
| paid_at | TIMESTAMPTZ | No | now() | |
| created_at | TIMESTAMPTZ | No | now() | |

**PK:** id · **FK:** tenant_id → agencies.id; invoice_id → invoices.id; received_by → users.id
**Indexes:** tenant_id; invoice_id
**Relationships:** N:1 → `agencies`, `invoices`, `users`; 1:1 → `receipts`; 1:N → `transactions`, `refunds`

---

### 3.18 `receipts`
**Purpose:** Proof-of-payment document issued to the customer for a payment.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | No | random | |
| tenant_id | UUID | No | — | FK → agencies.id |
| payment_id | UUID | No | — | FK → payments.id, 1:1 |
| receipt_number | VARCHAR(30) | No | generated | |
| issued_at | TIMESTAMPTZ | No | now() | |

**PK:** id · **FK:** tenant_id → agencies.id; payment_id → payments.id
**Unique:** payment_id (1:1); (tenant_id, receipt_number)
**Indexes:** tenant_id
**Relationships:** 1:1 → `payments`

---

### 3.19 `refunds`
**Purpose:** Money returned against an invoice/payment; drives the `Refunded` transition, permitted only from `paid`/`completed` per MASTER.md §5.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | No | random | |
| tenant_id | UUID | No | — | FK → agencies.id |
| invoice_id | UUID | No | — | FK → invoices.id |
| payment_id | UUID | Yes | null | FK → payments.id — which payment is being refunded, if traceable to one |
| amount | NUMERIC(12,2) | No | — | |
| currency_code | CHAR(3) | No | — | |
| reason | TEXT | No | — | |
| processed_by | UUID | No | — | FK → users.id |
| refunded_at | TIMESTAMPTZ | No | now() | |
| created_at | TIMESTAMPTZ | No | now() | |

**PK:** id · **FK:** tenant_id → agencies.id; invoice_id → invoices.id; payment_id → payments.id; processed_by → users.id
**Indexes:** tenant_id; invoice_id
**Relationships:** N:1 → `agencies`, `invoices`, `payments`, `users`; 1:N → `transactions`

---

### 3.20 `transactions`
**Purpose:** The MVP's unified, append-only financial log (MASTER.md §7 — the deliberate stand-in for the deferred double-entry Ledger). Every payment and refund produces exactly one transaction row.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | No | random | |
| tenant_id | UUID | No | — | FK → agencies.id |
| type | ENUM(`payment`,`refund`,`adjustment`) | No | — | |
| reference_table | VARCHAR(30) | No | — | `payments` or `refunds` |
| reference_id | UUID | No | — | Polymorphic pointer, no DB-level FK (spans two tables) |
| amount | NUMERIC(12,2) | No | — | Signed: positive for payment, negative for refund |
| currency_code | CHAR(3) | No | — | |
| created_by | UUID | Yes | null | FK → users.id |
| created_at | TIMESTAMPTZ | No | now() | |

**PK:** id · **FK:** tenant_id → agencies.id; created_by → users.id (reference_id is intentionally not a DB FK — see §9)
**Indexes:** tenant_id; (tenant_id, created_at); (reference_table, reference_id)
**Relationships:** N:1 → `agencies`, `users`; polymorphic reference to `payments` or `refunds`
**Immutability:** No `updated_at`, no `deleted_at`.

---

### 3.21 `activity_logs`
**Purpose:** Cross-cutting audit trail of mutating actions across every module (MASTER.md module #14).

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | No | random | |
| tenant_id | UUID | Yes | null | FK → agencies.id; null for platform-level actions |
| actor_id | UUID | Yes | null | FK → users.id; null for system-initiated actions |
| action | VARCHAR(100) | No | — | e.g. `booking.created`, `payment.recorded` |
| entity_type | VARCHAR(50) | No | — | e.g. `booking`, `invoice` |
| entity_id | UUID | No | — | No DB-level FK — spans every entity type |
| metadata | JSONB | Yes | null | Before/after diff or contextual payload |
| ip_address | VARCHAR(45) | Yes | null | |
| created_at | TIMESTAMPTZ | No | now() | |

**PK:** id · **FK:** tenant_id → agencies.id; actor_id → users.id
**Indexes:** tenant_id; (tenant_id, entity_type, entity_id); (tenant_id, created_at); GIN index on `metadata`
**Relationships:** N:1 → `agencies`, `users`; polymorphic reference to any entity
**Immutability:** No `updated_at`, no `deleted_at`.

---

## 4. Soft Delete Strategy

Three distinct patterns are used, chosen per table's actual lifecycle semantics — not applied uniformly:

| Pattern | Applies to | Mechanism |
|---|---|---|
| **Soft delete (`deleted_at`)** | `agencies`, `branches`, `users`, `customers`, `bookings` (admin correction only) | Row remains in place, `deleted_at` timestamp set. All base-repository queries filter `deleted_at IS NULL` by default. |
| **Deactivation (`is_active`)** | `countries`, `cities`, `airports`, `airlines`, `branches` | Global reference and organizational data is never truly "deleted" — it's retired from active use while historical bookings that reference it remain valid. |
| **Immutable / never deleted** | `workflow_transitions`, `transactions`, `activity_logs`, `receipts`, `invoices`, `payments`, `refunds` | Financial and audit records are permanent. Business-level cancellation is represented by a status value (`void`, `cancelled`, `refunded`), never by removing the row. |

**Rule:** a booking's business-level "delete" is the `cancelled` workflow stage, not a row deletion. `deleted_at` on `bookings` exists only for genuine data-entry error correction by an administrator, and is a distinct action from cancellation.

---

## 5. Audit Fields

Standard field set, applied by category:

| Category | Fields |
|---|---|
| **Mutable business tables** (agencies, branches, users, customers, bookings, passengers, sectors, fares, tickets, remarks, invoices, invoice_lines) | `created_at`, `updated_at`, plus `deleted_at` where §4 specifies soft delete |
| **Immutable log tables** (workflow_transitions, transactions, activity_logs) | `created_at` only — no `updated_at`, no `deleted_at`, by design |
| **Global reference tables** | `created_at`, `updated_at`, `is_active` — no `deleted_at` |

`created_by` / `updated_by` (or equivalent actor columns, e.g. `agent_id`, `created_by`, `processed_by`, `received_by`) are included wherever a table represents an action a specific user took, per-table as documented in §3, rather than as a blanket pair on every table — a global reference row, for instance, has no meaningful "created_by" beyond the seed process.

---

## 6. Multi-Tenant Strategy

Reiterating and grounding MASTER.md §3/§11/§13 at the schema level:

- Every Agency-scoped table carries `tenant_id` as a direct column (denormalized, not derived through joins), FK'd to `agencies.id`.
- `tenant_id` is the leading column of every composite index on a tenant-scoped table (§11).
- `users.tenant_id` and `activity_logs.tenant_id` are the only nullable `tenant_id` columns in the schema — both accommodate Platform Admin / platform-level actions that sit outside any single Agency.
- No table relies on inferring tenant scope purely from a parent's FK chain (e.g. `fares` is scoped through `booking_id`, but the schema still expects the base repository to join through `bookings.tenant_id` for filtering rather than trusting `passenger_id`/`sector_id` alone) — the closer `tenant_id` is denormalized onto the queried table itself, the harder it is to accidentally leak data; sub-entities of `bookings` (`passengers`, `sectors`, `fares`, `taxes`, `tickets`, `remarks`) are the deliberate exception, scoped via `booking_id` join since they are never queried independently of their parent booking.
- Cross-tenant uniqueness is never assumed: document numbers (`invoice_number`, `booking_reference`, `receipt_number`) are unique per-tenant, not globally.

---

## 7. Global Tables

`countries`, `cities`, `airports`, `airlines` — per MASTER.md §4 and §13 rule 4:

- No `tenant_id` column, ever, without an explicit architecture change approved against MASTER.md.
- Seeded once by the platform; read access is open to all authenticated Agency staff; write access is restricted to Platform Admin.
- Referenced by tenant-scoped tables (`settings`, `customers`, `passengers`, `sectors`) via ordinary FK — a tenant-scoped row pointing at a global row is normal and does not compromise isolation, since the global row carries no tenant-specific data.
- Deactivation (`is_active = false`), never deletion — historical bookings must continue to resolve a sector's airport/airline even if that reference is later retired from active selection.

---

## 8. Workflow Tables

`bookings.status` (current state) + `workflow_transitions` (history) together implement the Workflow Engine from MASTER.md §5:

- `bookings.status` is always the single source of truth for "what stage is this booking in right now."
- `workflow_transitions` is the append-only ledger of how it got there — never queried for current state, only for history/audit.
- The enum vocabulary in both `bookings.status` and `workflow_transitions.from_stage`/`to_stage` must stay byte-identical to MASTER.md §5's eight stages. No table anywhere else in the schema defines a parallel or competing status enum for booking lifecycle (per MASTER.md §13 rule 2) — `invoices.status` and `tickets.status` are document-level states, not booking-lifecycle states, and are intentionally distinct enums.

---

## 9. Finance Tables

`invoices`, `invoice_lines`, `payments`, `receipts`, `refunds`, `transactions` — MVP scope per MASTER.md §7. Explicitly, **no `ledger_entries` / double-entry accounting table exists in this schema** — that is Version 2 scope and must not be added without an explicit MASTER.md revision.

`transactions` is the MVP stand-in: a flat, signed, append-only log of every money movement (`payment` = positive, `refund` = negative), sufficient to answer "what happened financially and when" for Reports, without implementing balanced-account bookkeeping. Its `reference_id`/`reference_table` pair is intentionally not a database-level foreign key, since it polymorphically points at either `payments` or `refunds` — integrity here is an application-layer responsibility (enforced at the point `transactions` rows are written, always inside the same DB transaction as the `payments`/`refunds` row per T42/T43).

---

## 10. Naming Conventions

- **Tables:** plural, `snake_case` — e.g. `bookings`, `workflow_transitions`.
- **Columns:** `snake_case` — e.g. `booking_reference`, `created_at`.
- **Primary keys:** always `id`.
- **Foreign keys:** `<referenced_singular>_id` — e.g. `booking_id`, `tenant_id` (the one deliberate exception to `agency_id`, retained per MASTER.md §3/§6/§11 as the frozen internal term), `country_id`.
- **Booleans:** `is_` / `has_` prefix — e.g. `is_active`.
- **Timestamps:** `_at` suffix, always `TIMESTAMPTZ` — e.g. `issued_at`, `refunded_at`.
- **Enums:** singular, lower_snake_case values — e.g. `ticket_issued`, `bank_transfer`.
- **Junction/log tables:** named for the event or relationship they represent, not a mechanical concatenation of the two table names — e.g. `workflow_transitions`, not `booking_status_log`.

---

## 11. Performance Considerations

- **`tenant_id`-leading composite indexes** on every tenant-scoped table used in list/filter views: `bookings(tenant_id, status)`, `invoices(tenant_id, status)`, `activity_logs(tenant_id, created_at)`, etc. This is both a performance measure and a query-plan-level reinforcement of tenant isolation.
- **Partial indexes** on `deleted_at IS NULL` for every soft-deletable table, since virtually all application queries exclude soft-deleted rows — keeps the common-case index small.
- **Booking aggregate reads** (`GET /bookings/:id`, per T32) touch six related tables (`passengers`, `sectors`, `fares`, `taxes`, `tickets`, `remarks`) — all are indexed on `booking_id` specifically to keep this a set of indexed lookups, not sequential scans.
- **`activity_logs.metadata`** uses a GIN index to support querying inside the JSONB payload without forcing every consumer to know its shape in advance.
- **Reports/Dashboard aggregation** (T46/T48) reads across `bookings` + `invoices` + `payments` filtered by date range and tenant — `(tenant_id, created_at)` / `(tenant_id, paid_at)` indexes on the relevant tables directly support this without a separate materialized reporting table in MVP.
- **High-growth append-only tables** (`activity_logs`, `workflow_transitions`, `transactions`) are the ones most likely to need partitioning first as data accumulates — flagged in §12, not implemented in MVP.
- **No N+1 by construction**: every FK column in this schema has a supporting index, so joining a child table by its parent (the dominant access pattern in this domain) is always index-backed.

---

## 12. Future Expansion

Explicitly anticipated, explicitly **not** built now — each of these requires a MASTER.md revision before implementation, per its governance rule:

- **Ledger / double-entry accounting** (`ledger_entries`, chart of accounts) — V2, deferred per MASTER.md §7. `transactions` is structured so a future Ledger can be derived from it without re-deriving history.
- **Role/Permission tables** — `users.role` is a fixed enum for MVP; a full RBAC model (`roles`, `permissions`, `role_permissions`, `user_roles`) is a natural extension once the MASTER.md §14 open item on the permission matrix is resolved.
- **Multi-currency conversion** — `currency_code` is stored per Agency/document today with no FX table; a future `exchange_rates` table would slot in without touching existing monetary columns.
- **Schema-per-tenant / database-per-tenant migration path** — the shared-schema, `tenant_id`-scoped design (§6) is a strict subset of a dedicated-schema design; an individual enterprise Agency can be migrated out without redesigning the model, only extracting it.
- **Platform subscription/billing tables** — `agencies.status` (trial/active/suspended) is the only hook present today; a `subscriptions`/`plans` table set is a self-contained future addition.
- **GDS/live flight integration** — `sectors`/`fares`/`airlines`/`airports` are modeled generically enough to accept either manual entry (current) or a future API-sourced booking without a schema change, only a new ingestion path.
- **Table partitioning** — `activity_logs`, `workflow_transitions`, and `transactions` are the first candidates for time-based or tenant-based partitioning once volume warrants it (§11).
- **Soft-delete restore workflows** — `deleted_at` is currently a one-way flag in application logic; a formal restore/undo flow is a V2 UX feature, not a schema change.

---

*End of DATABASE.md. Governed by MASTER.md and TASKS.md (both frozen). This document does not modify either.*
