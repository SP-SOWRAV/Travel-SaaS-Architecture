# API_RULES.md
## OTA SaaS Management Platform — REST API Contract Standard

**Status:** Reference document, governed by and subordinate to MASTER.md, TASKS.md, and DATABASE.md (all frozen). This document defines how every endpoint in the system is built; it introduces no new modules, entities, or terminology. Where anything here appears to conflict with MASTER.md or DATABASE.md, those documents win.

**Note on notation:** JSON examples below illustrate wire shape only — they are not controller code, and no NestJS/Prisma syntax appears in this document by design.

---

## 1. REST API Standards

- Resource-oriented REST over HTTPS. Every endpoint operates on a noun (a resource), with the seven action-endpoints of the Workflow Engine (§3) as the sole deliberate exception.
- One consistent response envelope (§6) and one consistent error envelope (§7) across every endpoint — no module invents its own response shape.
- Stateless: no server-side session. The JWT (§12) is the entire authentication context of a request.
- JSON is the only request/response media type (`application/json`), except file upload endpoints (§17), which use `multipart/form-data`.
- The API is the same surface for the web frontend and any future integration (mobile app, partner integration) — nothing about its design assumes a browser client specifically.

---

## 2. URL Naming

- Resources are plural nouns: `/customers`, `/bookings`, `/invoices` — never singular, never verbs.
- Nested resources reflect real ownership per DATABASE.md's FK structure: `/bookings/:bookingId/passengers`, `/bookings/:bookingId/sectors`, `/invoices/:invoiceId/payments`.
- Multi-word resources use kebab-case: `/activity-log`, `/reference-data`.
- No verbs in resource URLs (`/bookings/create` is wrong). The only sanctioned verb-like paths are the Workflow Engine's action endpoints (§3), which represent a state transition, not a CRUD operation, and are always `POST /{resource}/:id/{action}` — e.g. `POST /bookings/:id/reserve`.
- IDs in URLs are always the resource's UUID `id`, never a human-facing number (`bookingReference`, `invoiceNumber`) — those are searchable/filterable fields, not identifiers.

---

## 3. HTTP Methods

| Method | Use |
|---|---|
| `GET` | Read a resource or list — never mutates state. |
| `POST` | Create a resource, **or** execute a Workflow Engine action/transition. |
| `PATCH` | Partial update of a resource's own fields. Never used to change workflow status directly — status only ever changes through a `POST .../{action}` endpoint (§8 of MASTER.md: transitions are engine-mediated, not a raw field write). |
| `DELETE` | Soft-delete, per DATABASE.md §4. Returns `204`. Never used on immutable/financial tables (invoices, payments, refunds, transactions, workflow_transitions, activity_logs) — those have no delete endpoint at all. |

`PUT` is not used anywhere in this API — full-resource replacement doesn't fit any resource in this domain; `PATCH` covers every update case.

---

## 4. HTTP Status Codes

| Code | Meaning | Used for |
|---|---|---|
| 200 | OK | Successful GET, PATCH, or action endpoint |
| 201 | Created | Successful POST that creates a resource |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Malformed request (unparseable JSON, wrong types) |
| 401 | Unauthorized | Missing/invalid/expired JWT |
| 403 | Forbidden | Authenticated, but role lacks permission for this action on a resource that does belong to their Agency |
| 404 | Not Found | Resource doesn't exist, **or** belongs to a different Agency (§20 — never 403 for cross-tenant access) |
| 409 | Conflict | Workflow transition not valid from current state; duplicate unique-constraint violation |
| 422 | Unprocessable Entity | Well-formed request, fails validation rules (§5) |
| 429 | Too Many Requests | Rate limit exceeded (§15) |
| 500 | Internal Server Error | Unhandled server fault — never exposes internal detail to the client (§21) |

`403` vs `404` is a deliberate security boundary, not an inconsistency: within one's own Agency, a role restriction is `403` (you may confirm the resource exists). Across Agencies, it is always `404` (existence itself is not confirmed to an unauthorized caller).

---

## 5. Request Validation

- Every request body is validated against a defined DTO shape before it reaches business logic (Clean Architecture boundary, per MASTER.md §3 — validation happens at the Controller layer, before the Application/Use-Case Service is invoked).
- Validation failures return `422` with every failing field listed in one response — never one-error-at-a-time round trips.
- `tenant_id`/`agencyId` is **never** accepted as a request body or query field on any endpoint. It is always resolved server-side from the JWT (§20). A client-supplied `agencyId` in a body is ignored, not merely validated — accepting it at all would open a tenant-spoofing vector.
- IDs referenced in a body (`customerId`, `branchId`, etc.) are validated as UUID-shaped, and their existence *and* tenant-membership are checked before use — a reference to another Agency's `customerId` fails as if the ID didn't exist (`422`, not `404`, since it's a body validation failure rather than a resource lookup).
- Enum fields (workflow stage, role, payment method, etc.) are validated against the exact vocabulary frozen in MASTER.md/DATABASE.md — no free-text fallback.

**Validation error shape:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request failed validation",
    "details": [
      { "field": "email", "issue": "must be a valid email address" },
      { "field": "passengers", "issue": "must contain at least 1 item" }
    ]
  }
}
```

---

## 6. Response Format

Every successful response uses one envelope shape, whether the payload is a single resource or a list.

**Single resource:**
```json
{
  "data": { "id": "...", "bookingReference": "BK-0001", "...": "..." },
  "meta": {}
}
```

**List:**
```json
{
  "data": [ { "id": "..." }, { "id": "..." } ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 137, "totalPages": 7 }
}
```

- `meta` is always present, even when empty (`{}`), so client code never branches on its existence.
- Field names in every response are `camelCase` — the DB's `snake_case` (DATABASE.md §10) is a storage-layer convention only and never leaks into the wire format.
- `tenant_id` never appears in any response body under that name — see §20.

---

## 7. Error Format

One error envelope for every non-2xx response, regardless of cause:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Booking not found",
    "details": null
  }
}
```

- `code` is a stable, machine-readable string (`VALIDATION_ERROR`, `RESOURCE_NOT_FOUND`, `INVALID_TRANSITION`, `RATE_LIMITED`, `UNAUTHORIZED`, `FORBIDDEN`, `INTERNAL_ERROR`, …) — frontend code branches on `code`, never on `message` text.
- `message` is human-readable and safe to display directly.
- `details` carries structured context when relevant (validation field list, allowed-transition list on a `409`); `null` otherwise.
- `500` responses always use `code: "INTERNAL_ERROR"` with a generic `message` — the real error is logged server-side (Activity Log / application logs), never echoed to the client (§21).

---

## 8. Pagination

- Offset-based for MVP scale (`page` / `pageSize` query params) — sufficient for the data volumes in play; cursor pagination is a future-expansion item if a table's volume later warrants it (consistent with DATABASE.md §12 partitioning note).
- Defaults: `page=1`, `pageSize=20`. Maximum `pageSize=100` — requests above that are clamped, not rejected.
- Every list endpoint returns the `meta` block shown in §6: `page`, `pageSize`, `totalItems`, `totalPages`.
- Example: `GET /bookings?page=2&pageSize=20`

---

## 9. Filtering

- Plain query parameters, named after the field being filtered: `GET /bookings?status=paid&branchId=<uuid>`.
- Filters combine with implicit AND — there is no OR syntax in MVP.
- Filterable fields are an explicit allow-list per endpoint (documented per-module, not global) — an unrecognized filter param is ignored, not an error, so adding new filters later is non-breaking.
- Date-range filtering uses paired params: `?createdAfter=2026-01-01T00:00:00Z&createdBefore=2026-02-01T00:00:00Z` (see §18 for date format).
- Tenant scoping (§20) is never a filter param — it is implicit and non-overridable on every list endpoint.

---

## 10. Sorting

- Single query param: `?sort=fieldName` (ascending) or `?sort=-fieldName` (descending, leading hyphen).
- Only one sort field per request in MVP — no multi-field sort syntax.
- Each endpoint defines its own sortable-field allow-list; an unrecognized `sort` value falls back to that endpoint's default sort (usually `-createdAt`) rather than erroring.
- Default sort when `sort` is omitted: `-createdAt` (newest first) on every list endpoint, for consistency.

---

## 11. Search

- Free-text search uses a single `q` query param on endpoints where it's meaningful: `GET /customers?q=john`, `GET /bookings?q=BK-0001`.
- Search is scoped to a documented, small set of fields per endpoint (e.g. Customer: `fullName`, `email`, `phone`; Booking: `bookingReference`, customer name) — not a full-text scan of every column.
- `q` combines with filters (§9) as AND — e.g. `?q=john&status=paid`.
- Search is always tenant-scoped (§20); it never searches across Agencies.

---

## 12. Authentication

- Bearer JWT in the `Authorization` header: `Authorization: Bearer <token>`, on every endpoint except `POST /auth/login`.
- JWT claims: `userId`, `tenantId` (matches the DB/internal term directly, per MASTER.md §3 — the JWT is a backend security artifact, not a public-facing DTO, so it is exempt from the `agencyId` boundary rule that applies to response bodies), `role`, `exp`.
- `tenantId` is absent from the JWT only for a Platform Admin session (matches `users.tenant_id` nullability, DATABASE.md §3.4).
- Tokens are short-lived (access token only in MVP — no refresh-token table, per TASKS.md Phase 2 scope; re-login is required on expiry). A refresh-token flow is a future-expansion item, not built now.
- `401` is returned for: missing header, malformed token, expired token, signature mismatch — no distinction is given between these in the response body (avoids leaking which specific check failed).

---

## 13. Authorization

- Role-based, using the `role` enum frozen in DATABASE.md §3.4 (`platform_admin`, `agency_admin`, `branch_manager`, `agent`) — the exact permission matrix per endpoint is a MASTER.md §14 open item and is documented per-module as it's resolved, not invented here.
- Authorization is checked in two layers, always in this order: (1) tenant-membership of the target resource — cross-tenant is `404` (§4, §20); (2) role sufficiency for the action — insufficient role on an in-tenant resource is `403`.
- Global reference data (§4 of DATABASE.md — Airlines, Airports, Countries, Cities) is readable by any authenticated role, writable only by `platform_admin`.
- A user can always read/update their own `My Profile` record regardless of role (MASTER.md module #12) — this is an identity check (`userId` in JWT matches resource), not a role check.

---

## 14. Versioning

- URI versioning: every route is prefixed `/api/v1/...` (MASTER.md §3), set from the very first endpoint.
- A breaking change to an existing endpoint's contract requires a new version prefix (`/api/v2/...`) for that route — it is never silently changed in place once any client depends on it.
- Additive, backward-compatible changes (new optional field, new endpoint) do not require a version bump.
- No version is deprecated/removed in MVP; a deprecation policy (sunset headers, notice period) is a future-expansion concern once a `v2` actually exists.

---

## 15. Rate Limiting

- Applied per-Agency (via `tenantId`) and per-IP, whichever limit is hit first — protects both a single noisy tenant and the platform from a single bad actor regardless of auth state.
- Exceeding the limit returns `429` with the standard error envelope (`code: "RATE_LIMITED"`) and a `Retry-After` header (seconds).
- Login (`POST /auth/login`) has a stricter, separate, per-IP-and-per-email limit to blunt credential-stuffing attempts — distinct from the general API limit.
- Limits are enforced at the application/gateway layer, not per-endpoint hardcoded — configurable without a code change per module.

---

## 16. Idempotency

- Required via an `Idempotency-Key` request header on every state-changing `POST` that has real-world financial or document-issuance consequences: Workflow Engine action endpoints (`reserve`, `issue-ticket`, `cancel`), and Finance endpoints (`invoice`, `payments`, `refunds`).
- The server stores the key against the resulting resource; a retried request with the same key returns the original `201`/`200` response instead of re-executing the action — prevents duplicate tickets, duplicate invoices, or double-charging a payment on network retry.
- Idempotency keys are scoped per-Agency and expire after a bounded window (recommendation: 24 hours) — not retained indefinitely.
- Plain reads (`GET`) and simple field updates (`PATCH` on Settings/Branch/Customer/etc.) are naturally idempotent by HTTP semantics and do not require the header.

---

## 17. File Upload Rules

- The only MVP file upload is the Agency Logo (Settings module, MASTER.md §10).
- `multipart/form-data`, single field, max size 2 MB, restricted to `image/png`, `image/jpeg`, `image/svg+xml`.
- The API stores a reference URL (`logoUrl` on `settings`, per DATABASE.md §3.2), never the binary in the database — upload endpoint returns the stored URL, which is then `PATCH`ed onto Settings like any other field.
- Uploaded files are validated by actual content type (magic-byte sniffing), not by trusting the client-supplied `Content-Type` header or file extension.
- Future document generation (invoice/ticket PDFs, per MASTER.md open items) is out of scope for this rule set until that feature is scoped.

---

## 18. Date & Time Rules

- Every date/time on the wire is ISO 8601 with an explicit UTC offset: `2026-07-17T14:32:00Z`. No naive (offset-less) timestamps are ever sent or accepted.
- The server stores and computes exclusively in UTC (DATABASE.md §1 principle 4); conversion to the Agency's configured Timezone (Settings, MASTER.md §10) happens client-side for display only.
- Date-only fields (e.g. `dateOfBirth`) use `YYYY-MM-DD` with no time or offset component — they are calendar dates, not instants.
- Date-range filters (§9) require both bounds to be full ISO 8601 timestamps, not bare dates, to avoid timezone-boundary ambiguity.

---

## 19. Money Rules

- Every monetary amount is serialized as a **string**, not a JSON number — e.g. `"totalAmount": "1250.00"` — to preserve the exact precision of the underlying `NUMERIC(12,2)` column (DATABASE.md §1 principle 3) and avoid IEEE-754 float rounding on the wire.
- Every amount field is always accompanied by its `currencyCode` (ISO 4217) — an amount is never sent or interpreted without its currency alongside it.
- No client-side arithmetic is trusted: totals (`invoice.totalAmount`, `booking.totalAmount`) are always server-computed from their line items/fares/taxes, never accepted as a client-supplied value on create.
- Currency conversion is out of scope for MVP (MASTER.md §14) — an amount is always in the Agency's single configured currency; multi-currency arithmetic is a future-expansion concern (DATABASE.md §12).

---

## 20. Multi-Tenant API Rules

- Tenant context is resolved exactly once per request, from the JWT's `tenantId` claim (§12), by the same tenant-context middleware described in DATABASE.md/TASKS.md T07 — every downstream layer reads it from request context, never re-derives it.
- No endpoint accepts a tenant/agency identifier from the client (body, query, header, or URL segment) — this is absolute, with zero exceptions, including for `platform_admin` (who instead uses dedicated `/platform/agencies/:id/...` routes where the target Agency is an explicit resource being administered, not an ambient context override).
- API responses that do expose the Agency relationship use `agencyId` (§6 terminology boundary, MASTER.md §3) — mapped at the response-serialization layer from the DB's `tenant_id`, in one place, per DATABASE.md §6.
- Cross-tenant access to any resource returns `404` (§4) — this is enforced by the same base-repository scoping used at the data layer (DATABASE.md §1 principle 2), so a controller bug cannot bypass it by constructing a raw query.
- List endpoints never require or accept a tenant filter param — the implicit scope from the JWT is the entire filter; there is no "view all Agencies" mode on any Agency-scoped endpoint (that capability, where it exists at all, lives only under `/platform/...` routes for `platform_admin`).

---

## 21. API Security Best Practices

- **Transport:** HTTPS only, everywhere, no exceptions, including local development against a self-signed cert where practical.
- **Headers:** standard hardening headers on every response (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`), CORS restricted to known frontend origins — not `*`.
- **Password handling:** hashed (never reversible encryption) at rest per DATABASE.md §3.4; never returned in any response body, ever, including to the owning user.
- **Logging:** request/response logs and Activity Log entries (DATABASE.md §3.21) never contain raw passwords, full JWTs, or full payment card/bank references — sensitive fields are redacted before logging.
- **Least privilege:** Platform Admin routes (`/platform/...`) are a distinct route namespace with their own guard, never reachable via an Agency-scoped role regardless of claimed permissions — defense in depth against a role-check bug.
- **Input handling:** all input is treated as untrusted regardless of source (authenticated or not) — validation (§5) applies uniformly; no endpoint trusts client-computed values for anything security- or money-relevant (§19).
- **Error responses never leak internals:** stack traces, SQL fragments, and internal file paths never appear in any `4xx`/`5xx` body (§7) — full detail goes to server-side logs only.
- **Dependency/token hygiene:** JWT signing secret and DB credentials are environment-configured (per TASKS.md T08's env validation) and never hardcoded or logged.

---

*End of API_RULES.md. Governed by MASTER.md, TASKS.md, and DATABASE.md (all frozen). This document does not modify any of them.*
