# DEVELOPMENT_RULES.md
## OTA SaaS Management Platform — Development & Operations Rules

**Status:** Reference document, governed by and subordinate to MASTER.md, TASKS.md, DATABASE.md, API_RULES.md, CODING_STANDARDS.md, and UI_GUIDELINES.md (all frozen). This document governs *process* — how work moves from task to production — not architecture, schema, contract, code, or design, all of which are already fixed by the six documents above. Where anything here appears to conflict with an earlier frozen document, that document wins.

---

## 1. Development Workflow

The daily loop, for the entire build:

1. Take the next unstarted task from TASKS.md, in order (TASKS.md's standing rule: strictly sequential, no forward dependency).
2. Create a branch per §7.
3. Implement against that task's Objective, Files to Create/Update, and Expected Output.
4. Verify the task's Acceptance Criteria pass, and that CODING_STANDARDS §20's Definition of Done is fully met.
5. Open a PR (§8), pass CI, merge (§9).
6. Confirm the project still builds and runs end-to-end (TASKS.md's standing rule) before starting the next task.

Local development runs three processes: the Postgres container (TASKS.md T05), the NestJS API (`apps/api`), and the Next.js app (`apps/web`) — all three are expected running simultaneously for any meaningful manual verification.

---

## 2. Task Execution Rules

- One TASKS.md task is the unit of work. A task is not split across multiple unrelated branches, and unrelated tasks are not bundled into one.
- A task does not begin until the previous task's Definition of Done (CODING_STANDARDS §20) is fully satisfied — "mostly done" does not unblock the next task.
- If completing a task appears to require changing MASTER.md, TASKS.md, DATABASE.md, API_RULES.md, CODING_STANDARDS.md, or UI_GUIDELINES.md, **stop and flag it** rather than improvising a workaround or silently deviating from the frozen spec (MASTER.md §13 rule 8, restated here as it governs execution, not just design).
- A task's "Files to Create/Update" list in TASKS.md is the expected footprint — a task that touches significantly more files than listed is a signal to pause and check whether scope has silently crept, not necessarily a hard stop.

---

## 3. Environment Setup Rules

- **Three environments:** Local, Staging, Production. Each has its own PostgreSQL database — no environment ever points at another environment's database, under any circumstance, including "just for a quick check."
- Required local tooling is pinned (Node LTS version, package manager version, Docker) so "works on my machine" isn't a variable — a version mismatch is a setup bug, not a code bug.
- `.env.example` (TASKS.md T05) is the single source of truth for which environment variables exist; a new required variable is added there in the same change that introduces the need for it.
- The application fails fast at boot on missing/invalid configuration (TASKS.md T08) in every environment — there is no environment where a misconfigured deploy is allowed to start up in a partially-working state.

---

## 4. Configuration Management

- **Two distinct categories of configuration, never conflated:**
  - **Deployment configuration** (env vars): database URL, JWT signing secret, rate-limit thresholds, log level — differs per environment (§3), never per Agency.
  - **Tenant configuration** (database, Settings module — MASTER.md §8/§10): currency, timezone, Invoice/Ticket Prefix, theme, branding — differs per Agency, never per environment, and is never expressed as an env var.
- Secrets (JWT signing secret, DB credentials, any future third-party API key) are never committed to version control, in any form, including in a "temporary" test commit — `.env` is git-ignored from TASKS.md T01 onward.
- Production configuration values are reviewed distinctly before first go-live (§19) — a dev-convenience default (a weak JWT secret, a permissive CORS origin) reaching Production is a release blocker, not a follow-up item.

---

## 5. Database Migration Rules

- Every schema change ships as a Prisma migration in the same commit as the `schema.prisma` change that produced it (CODING_STANDARDS §9) — schema and migration history are never allowed to drift apart.
- **Local/Staging:** `migrate dev` is fine — a broken migration can be reset against disposable data.
- **Production:** migrations run via a non-interactive `migrate deploy` step in the deploy pipeline (§11), never applied manually against the production database, ever.
- **Forward-only in Production.** Once the platform has any real Agency data, a migration is never rolled back by running a destructive "down" migration against production data — a mistake is corrected by writing and deploying a new forward migration (§12).
- **Pre-launch exception:** before the first real Agency is onboarded (§19), the production database contains no data worth protecting from a hard reset — destructive resets are acceptable during this window only. This permission ends the moment real Agency data exists; there is no ambiguity about when the stricter rule (above) takes over.
- A migration that drops or renames a column/table on a live schema follows a deprecate-then-remove pattern (stop writing to it → confirm nothing reads it → remove it in a later migration) once Production has real data — never a same-release drop.

---

## 6. Seeding Rules

- Seed scripts (TASKS.md T24–T26 global reference data, T50 full demo dataset) are idempotent — safe to re-run without duplicating rows.
- Global reference data (Countries, Cities, Airports, Airlines) is seeded once per environment via its dedicated script — Local, Staging, and Production each get exactly one seeding run of this data, not repeated ad hoc inserts.
- Demo/test Agency data (T50's full seed — sample Agencies, users, bookings across workflow stages) is a Local/Staging-only tool. It is never run against Production, under any circumstance — Production's first Agency row is always a real one.
- Seeding is never wired into the automatic deploy pipeline (§11) for anything beyond the one-time global reference data load — a redeploy never silently reseeds.

---

## 7. Branch Strategy

Confirms CODING_STANDARDS §17: trunk-based, `main` is the only long-lived branch, one short-lived branch per task named `t<NN>-<short-description>`.

- A branch is deleted immediately after merge — no accumulation of stale branches.
- No direct commits to `main`, with one narrow exception: changes to the frozen governance documents themselves (this file and its five predecessors), made only on the user's explicit instruction per the pattern established throughout this project, may be committed directly without a task branch — everything else, including any future documentation that isn't part of this frozen set, follows the normal branch/PR flow.

---

## 8. Pull Request Rules

- Every branch other than the frozen-document exception (§7) is merged via PR, never a direct push to `main`.
- PR description references the TASKS.md task number(s) it implements and explicitly lists which Acceptance Criteria are satisfied — a PR that can't point to a specific Acceptance Criteria line is not ready.
- PR must pass CI (lint, build, and whatever test suite exists per CODING_STANDARDS §16) before it is eligible to merge — a red CI run is never merged "to fix later."
- Self-review against CODING_STANDARDS §19's Code Review Checklist happens before requesting/accepting merge, even for a solo-authored PR — the checklist exists to catch the specific classes of bug (tenant isolation, layering violations) that are easy to miss reviewing one's own code quickly.
- Any PR touching a rendered UI screen includes a screenshot (or short recording) and a one-line note on which UI_GUIDELINES.md patterns it uses — keeps drift from the design system visible at review time, not discovered later.

---

## 9. Merge Rules

- Squash-merge into `main` — one clean commit per task (or tightly related task cluster) on `main`, following CODING_STANDARDS §18's commit convention, regardless of how many commits existed on the feature branch.
- `main` must build and run after every merge (TASKS.md's standing rule) — a merge that breaks the build is reverted immediately, not patched forward under pressure.
- No merge with failing or skipped CI.
- Merging tasks out of TASKS.md's numeric order is avoided; if it happens (e.g. a genuine blocker on the next sequential task), the reason is stated in the PR description so the deviation is traceable, not silent.

---

## 10. Release Process

- A release is tagged at the completion of a TASKS.md **Phase** (§7 of TASKS.md's phase grouping), not after every individual task — Phases are the natural "this is now a coherent, demoable increment" boundary.
- Each release gets a Semantic Version tag (§13) and release notes, mechanically derived from the squashed Conventional Commit messages (§18 of CODING_STANDARDS) accumulated since the previous tag.
- Every release deploys to Staging first (§11); Production deployment is a separate, explicit step taken only after Staging verification, never combined into one action.

---

## 11. Deployment Rules

Standard pipeline shape, identical for Staging and Production (differing only in target environment and approval gate):

1. Build the application (`apps/api`, `apps/web`).
2. Run database migrations (`migrate deploy`, §5) against the target environment's database.
3. Deploy the built application.
4. Run an automated smoke check: the health endpoint (TASKS.md T08) returns healthy, and a login attempt against a known account succeeds — a deploy is not considered complete until both pass.
5. Only after Staging's smoke check passes does the same build get promoted to Production — Production never receives a build that hasn't first run on Staging.

- Staging's environment variable *shape* mirrors Production exactly (same keys, environment-appropriate values) so a Staging pass is a meaningful signal, not a formality.
- No manual, ad hoc edits to the Production database outside of migrations (§5) — if a value needs correcting, it's corrected through the application or a proper migration, never a direct `UPDATE` run by hand.
- Zero-downtime deployment is not a hard MVP requirement given expected scale, but every migration must remain compatible with the *previous* release's code for the brief window both may be running during a deploy — a migration that would break the currently-live code is sequenced across two releases instead of one.

---

## 12. Rollback Strategy

- **Application rollback** is fast and always available: redeploy the previous release's tagged build (§10). This is the default response to a bad release.
- **Database rollback is not symmetric with application rollback.** Per §5, migrations are forward-only once real data exists — "rolling back" a bad migration means writing and deploying a new forward migration that undoes the problematic change, not executing a destructive down-migration against live data.
- Before the first real Agency is onboarded (§19), a full destructive database reset is an acceptable rollback tool — this exception ends permanently at first real onboarding, matching §5's hard boundary.
- A rollback decision is made against the smoke check (§11) — if it fails on Production, the previous build is redeployed immediately rather than attempting a live fix under pressure.

---

## 13. Versioning Strategy

- The application follows **Semantic Versioning** (`MAJOR.MINOR.PATCH`) for its own release tags (§10) — distinct from API_RULES.md §14's `/api/v1` URI versioning, which versions the *API contract*, not the application release.
- **MAJOR**: reserved for a breaking API contract change (a `/api/v2`) or a MASTER.md-level architecture revision — both are rare, explicit, user-approved events per this project's governance model.
- **MINOR**: a new TASKS.md Phase completing (new module functionality shipped).
- **PATCH**: bug fixes and non-breaking changes within an already-shipped Phase.

---

## 14. Documentation Update Rules

- The six frozen documents (MASTER.md, TASKS.md, DATABASE.md, API_RULES.md, CODING_STANDARDS.md, UI_GUIDELINES.md) change **only** on the user's explicit request — never as an incidental side effect of implementing a task, and never "while I'm in there" during unrelated work.
- This document (DEVELOPMENT_RULES.md), once approved, joins that same frozen set and is governed identically — future revisions require the same explicit request pattern already established throughout this project.
- Any future documentation created beyond this seven-document set follows the same principle by default: process/reference docs are stable references, not living scratch notes, unless the user says otherwise.
- When implementation reveals that a frozen document is wrong, incomplete, or in conflict with reality, the correct action is identical to §2's rule: **stop, flag the specific conflict, and let the user decide** — never resolve it unilaterally by editing the document or by quietly coding around it.

---

## 15. Security Checklist

Run before every merge (lightweight, per-PR) and again before every Production release (full pass):

- [ ] Every new query path goes through the tenant-scoped base repository (DATABASE.md §6, CODING_STANDARDS §4) — no raw/unscoped Prisma access.
- [ ] Cross-tenant access returns `404`, never `403` or leaked data (API_RULES §4/§20).
- [ ] No secret, credential, or API key committed to version control (§4).
- [ ] Every non-public route carries the correct auth guard and role check (API_RULES §12–13).
- [ ] Every new endpoint validates its input per API_RULES §5 / CODING_STANDARDS §8.
- [ ] Rate limiting is active, especially on `/auth/login` (API_RULES §15).
- [ ] HTTPS is enforced end-to-end; no security headers regression (API_RULES §21).
- [ ] Passwords remain hashed, never logged, never returned in any response (API_RULES §21, CODING_STANDARDS §15).
- [ ] Dependency audit run, no known-critical vulnerabilities left unaddressed before a Production release.

---

## 16. Performance Checklist

- [ ] Any new query pattern has a supporting index (DATABASE.md §11) — no unindexed filter/sort added to a list endpoint.
- [ ] No N+1 query introduced (CODING_STANDARDS §4/§9) — verified by inspecting the repository's generated queries for any new aggregate read.
- [ ] Every list endpoint enforces pagination (API_RULES §8) — no endpoint capable of returning an unbounded result set.
- [ ] New frontend dependencies are checked for bundle-size impact before adding — no heavy library pulled in for a small UI need.
- [ ] File uploads (Logo, API_RULES §17) remain within their size cap.
- [ ] The Booking Aggregate endpoint (TASKS.md T32) and Reports aggregation endpoints (T46) — the two heaviest query paths in the schema — are specifically profiled before each Production release, not just spot-checked in passing.

---

## 17. Monitoring & Logging

Distinct from the product's own Activity Log feature (DATABASE.md §3.21, MASTER.md module #14) — this section covers **operational** observability, not the business audit trail (CODING_STANDARDS §15's same distinction, applied at the infrastructure level):

- The health endpoint (TASKS.md T08) is polled by an uptime check in Staging and Production; a failure pages/notifies, it doesn't just sit in a dashboard unread.
- Structured application logs (CODING_STANDARDS §15) are shipped to a queryable location in Staging/Production — never left as ephemeral stdout lost on container restart.
- An elevated rate of `500`/`INTERNAL_ERROR` responses (API_RULES §7) triggers an alert — a silent spike in server errors is treated as equivalent in severity to downtime.
- Rate-limit (`429`) volume is watched as a secondary signal — a sudden spike can indicate either abuse or a legitimate integration bug on the client side, either way worth investigating.

---

## 18. Backup & Recovery

- Automated daily backups of the Production PostgreSQL database, with a defined retention window (30 days is a reasonable MVP default).
- A backup that has never been restored is not a verified backup — a restore is test-run periodically (at minimum, before the first real Agency onboarding, §19, and thereafter on a regular cadence).
- Point-in-time recovery capability is a strong recommendation once real Finance module data (invoices, payments, refunds) exists for a real Agency — financial records are exactly the class of data where "restore to yesterday's nightly backup" may not be an acceptable recovery point.
- Per-Agency data export/offboarding is explicitly a future-expansion item (not built in MVP, consistent with MASTER.md's deferred scope) — but the backup strategy above must still be sufficient to reconstruct any single Agency's data from a platform-wide backup if that capability is needed later.

---

## 19. Production Readiness Checklist

Gate before the **first real Agency is onboarded** (this also marks the point where §5/§12's forward-only migration rule and destructive-reset exception permanently switch over):

- [ ] All in-scope TASKS.md phases meet their Definition of Done (CODING_STANDARDS §20).
- [ ] Security Checklist (§15) passed in full, not just the lightweight per-PR pass.
- [ ] Backup automation (§18) is live and has been restore-tested at least once.
- [ ] Monitoring and alerting (§17) are active, not just configured-but-unverified.
- [ ] All demo/seed Agency data (§6) is absent from the Production database.
- [ ] Environment variables reviewed line-by-line for Production-appropriate values — no dev default (weak secret, permissive CORS) carried over.
- [ ] A rollback (§12) has been rehearsed at least once against Staging, so the first time it's needed in Production isn't the first time it's been done at all.
- [ ] Any MASTER.md §14 open item still unresolved (roles matrix, GDS-vs-manual data entry, etc.) has an explicit decision or an explicit, owner-acknowledged deferral — not a silent gap.

---

## 20. Engineering Principles

Closing values, meant to resolve judgment calls this document doesn't explicitly cover:

1. **Documentation is load-bearing, not decorative.** MASTER.md through this document are the actual specification of the system. Code that contradicts them is the bug — not the other way around.
2. **Tenant isolation is never negotiable**, under time pressure, convenience, or any other justification. It is the one property whose violation is a breach, not a bug.
3. **Small, reversible steps beat big-bang changes.** TASKS.md's 15–30 minute task sizing exists specifically so any single step is easy to reason about, review, and revert.
4. **Speed is a pre-launch privilege, not a permanent standing.** The relaxed rules in this document that exist only "before the first real Agency" (§5, §12, §19) are hard boundaries, not soft guidelines — they exist to let the team move fast now precisely because they will stop applying the moment it matters.
5. **When a frozen document doesn't cover a case, ask — don't assume.** Every governance rule in this document series ultimately reduces to this: silent improvisation around a gap is a bigger risk than a short pause to clarify.

---

*End of DEVELOPMENT_RULES.md. Governed by MASTER.md, TASKS.md, DATABASE.md, API_RULES.md, CODING_STANDARDS.md, and UI_GUIDELINES.md (all frozen). This document does not modify any of them.*
