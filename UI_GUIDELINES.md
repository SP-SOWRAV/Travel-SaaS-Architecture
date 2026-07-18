# UI_GUIDELINES.md
## OTA SaaS Management Platform — Design & UI Standard

**Status:** Reference document, governed by and subordinate to MASTER.md, TASKS.md, DATABASE.md, API_RULES.md, and CODING_STANDARDS.md (all frozen). This document defines how the UI looks and behaves; it introduces no new modules, routes, or data. Where anything here appears to conflict with an earlier frozen document, that document wins. Implements CODING_STANDARDS.md §11–§13 (Next.js/React/Tailwind rules) at the design-system level.

**Note on notation:** Tokens below are described as names and representative values for specification purposes — no Tailwind config, CSS, or component code appears in this document by design.

---

## 1. Design Principles

1. **Operator-first, not marketing-first.** This is a tool agency staff use for hours a day to move bookings through a workflow — density and speed of task completion matter more than visual flourish.
2. **One system, not per-module styling.** Every module (Branch, Customer, Booking, Finance, Reports, …) reuses the same table, form, card, and modal patterns (§11–§15) — a user who's learned one screen has learned them all.
3. **Status is always visible.** Given the Workflow Engine (MASTER.md §5) is the spine of the product, booking/invoice/ticket status is never buried — it's a first-class visual element (a colored badge, never plain text) everywhere a record appears.
4. **Trustworthy on financial screens.** Finance module UI (Invoice, Payment, Refund) favors clarity and confirmation over cleverness — no destructive action without an explicit confirm step (§15).
5. **Quiet by default, loud when it matters.** Neutral surfaces and restrained color for everyday CRUD; saturated color is reserved for status, feedback, and action — not decoration.
6. **Multi-tenant-safe by construction.** Every screen implicitly reflects one Agency's data only (API_RULES §20) — the UI never has to display or explain tenant boundaries because the user never sees another Agency's existence.

---

## 2. Color System

Semantic tokens, not raw hex references in components (ties to CODING_STANDARDS §13 — tokens defined once in Tailwind config).

| Token | Purpose | Representative Value |
|---|---|---|
| `primary` | Brand/action color — primary buttons, active nav, links | Blue 600 (`#2563EB`) |
| `primary-hover` | Hover/active state of primary | Blue 700 (`#1D4ED8`) |
| `neutral-50…900` | Backgrounds, borders, body text, a 10-step gray scale | `#FAFAFA` → `#171717` |
| `success` | Paid, Completed, positive confirmations | Green 600 (`#16A34A`) |
| `warning` | Reserved, pending states, non-blocking alerts | Amber 500 (`#F59E0B`) |
| `danger` | Cancelled, Refunded, destructive actions, error states | Red 600 (`#DC2626`) |
| `info` | Draft, informational banners, neutral notices | Sky 500 (`#0EA5E9`) |

- This is the **platform default palette** — a placeholder brand identity, not a fixed permanent brand. Per-Agency visual identity in MVP is limited to the Logo (Settings, MASTER.md §10) placed in the Header (§9) and on generated documents; full per-Agency color theming is a future-expansion item, not built now — Theme (§22) governs light/dark only in this version.
- Status colors (§below) are the one place color carries *meaning*, not just decoration — they must stay consistent platform-wide: `success` always means a positive/completed state, `danger` always means cancelled/refunded/destructive, regardless of module.
- Minimum contrast ratio 4.5:1 for text on any background, enforced by token pairing, not by ad hoc per-component checks (§21).

---

## 3. Typography

- **Typeface:** a single clean, highly-legible sans-serif for the entire product (e.g. Inter or the Next.js-default system font stack) — no secondary display font. Enterprise density benefits from typographic restraint, not variety.
- **Scale** (four steps beyond body is enough for this product — it's a dashboard, not editorial content):

| Token | Use | Size / Weight |
|---|---|---|
| `text-h1` | Page title (one per page, in the Header, §9) | 24px / Semibold |
| `text-h2` | Section headers within a page (e.g. card group titles) | 18px / Semibold |
| `text-h3` | Sub-section / table group headers | 16px / Medium |
| `text-body` | Default body text, table cells, form labels | 14px / Regular |
| `text-small` | Metadata, timestamps, helper text | 12px / Regular |
| `text-mono` | Reference numbers (`bookingReference`, `invoiceNumber`, ticket numbers) | 14px / Regular, monospace — visually distinguishes an identifier from prose |

- Line height: 1.5 for body text, 1.25 for headings — never tighter, for a data-dense, long-session product.
- No more than two font weights on any single screen beyond the scale above (Regular + Semibold is enough; Medium reserved for `text-h3`).

---

## 4. Icons

- One consistent icon library platform-wide (e.g. Lucide) — never mixing icon sets, never using emoji as functional icons.
- Two sizes only: 16px (inline with `text-body`/table rows/buttons) and 20px (standalone — nav items, empty states, page headers). No arbitrary in-between sizes.
- Consistent stroke width across the entire set (the chosen library's default) — never mixing filled and outlined styles.
- Icon-only buttons (e.g. a row's edit/delete action) always carry an accessible label (§21) — the icon is never the only signal of what an action does; a tooltip or `aria-label` is mandatory.
- Status badges (§ below) may pair a small icon with the label (e.g. a check for `Completed`, an X for `Cancelled`) but text is never dropped in favor of icon-only status — status must remain screen-reader- and colorblind-safe.

---

## 5. Spacing

4px base unit, matching Tailwind's default spacing scale — no arbitrary pixel values in component layout (CODING_STANDARDS §13).

| Token | Value | Typical use |
|---|---|---|
| `space-1` | 4px | Icon-to-label gap |
| `space-2` | 8px | Compact internal padding (badge, small button) |
| `space-3` | 12px | Form field internal padding |
| `space-4` | 16px | Standard card/section padding, gap between form fields |
| `space-6` | 24px | Gap between major page sections |
| `space-8` | 32px | Page-level top/bottom margin |

Consistency rule: a given relationship (e.g., "gap between two form fields") uses the same token everywhere it occurs — spacing is not re-decided per screen.

---

## 6. Grid Layout

- 12-column responsive grid, standard Tailwind breakpoints: `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px, `2xl` 1536px.
- Page content max-width: 1280px (`xl`), centered, with `space-6` horizontal gutters below that — prevents line-length/table-width sprawl on large monitors while staying dense.
- Dashboard KPI cards (§10): 4 columns at `lg`+, 2 at `md`, 1 (stacked) below `md`.
- Form layouts: single column below `md` (mobile-first, §20); two-column label/field grid permitted at `md`+ only for short fields (e.g. Settings' Currency/Timezone pair) — never for long fields (addresses, remarks).

---

## 7. Navigation

Two-tier structure: a persistent **Sidebar** (§8) for module-to-module navigation, and a per-page **Header** (§9) for context and page-level actions. No third navigation layer (e.g. no additional top tab bar) — the module list (MASTER.md §6) is flat enough not to need one.

- Active route is always visually distinct in the Sidebar (background + `primary` text/icon), not just an underline — must be glanceable in peripheral vision during fast task-switching.
- Breadcrumbs are used only where a page is nested more than one level below its Sidebar entry (e.g. `Bookings → BK-0001 → Invoice`) — not on flat list pages, where they'd be redundant with the Sidebar's active state.

---

## 8. Sidebar

- Fixed-width (240px expanded, 64px collapsed-to-icons), collapsible, state persisted per user (local storage is sufficient for MVP — no server-side preference storage).
- Groups mirror the MASTER.md §6 module list order, not an alphabetical or ad hoc order: Dashboard, then Flight Booking, then Finance, then Customer/Reference/Agency-Core groups, then Reports, then Settings/Activity Log/My Profile at the bottom (account-level, not day-to-day operational).
- Items are shown or hidden per the user's role (API_RULES §13) — a `branch_manager` never sees a grayed-out Settings link; it's absent, not disabled, since a disabled-but-visible item invites a support question about why it's locked.
- The Agency's Logo (Settings, MASTER.md §10) sits at the top of the Sidebar — this is the primary place the product feels "theirs," not the platform's.

---

## 9. Header

- One Header per authenticated page: page title (`text-h1`) on the left, contextual primary action on the right (e.g. "New Booking" on the Bookings list page) — never more than one primary action in the Header.
- Right-aligned user menu: avatar/initials, name, dropdown with My Profile, Theme toggle (§22), and Logout — consistent across every page, never re-implemented per module.
- The Header does not duplicate Sidebar navigation — it is context (where am I, what can I do here), not a second nav.
- On a resource detail page (e.g. a single Booking), the Header's title is the resource's human identifier (`bookingReference`), not its UUID, with status (§2) shown as a badge immediately beside it.

---

## 10. Dashboard Layout

Per TASKS.md T48 — a thin composition layer, not a new data source:

- Top row: 4 KPI cards (§14) — bookings this period, revenue, outstanding, completed — each showing the current value and a simple delta/trend indicator where the underlying Reports data supports it.
- Second section: a filterable activity/recent-bookings list, reusing the standard Table pattern (§12) rather than inventing a dashboard-specific list style.
- No widget is exclusive to the Dashboard — every number and list shown here is a scoped-down view of a real Reports or Booking-list query (§8 API_RULES pagination/filtering conventions apply identically).
- Empty state (§18) for a brand-new Agency with zero bookings: KPI cards show `—`/`0`, and the activity section shows the standard empty state with a "Create your first booking" primary action.

---

## 11. Forms

- Label above field (not inline-left) for every field — scans faster in a dense multi-field form and works better responsively (§20).
- Required fields are marked with a small asterisk beside the label; there is no "optional" tag — the absence of an asterisk means optional, kept consistent so the eye learns one signal.
- Inline validation errors render directly beneath their field, in `danger` color, sourced from the API_RULES §5/§7 error shape's `details` array — a form never shows a generic "something went wrong" when field-level detail is available.
- Multi-step forms (the Booking Wizard, TASKS.md T34) show a persistent step indicator, allow backward navigation without data loss, and validate each step's fields before advancing — but perform final cross-field/business validation only on submit, matching CODING_STANDARDS §8's DTO-vs-Service validation split.
- Disabled and read-only states are visually distinct from each other: disabled (not editable, grayed) vs. read-only (editable-looking but locked, e.g. a `tenant_id`-derived field that's simply never shown at all per API_RULES §20 rather than shown-disabled).
- Submit buttons show a loading state (§17) and are disabled for the duration of the request — never double-submittable, reinforcing the Idempotency-Key contract at the API layer (API_RULES §16).

---

## 12. Tables

The single most reused pattern in the product — every module's list page (Branches, Users, Customers, Bookings, Invoices, Activity Log, …) is this same component, configured per module.

- Left-align text columns, right-align numeric/money columns, center-align short status/icon columns.
- Status is always a colored badge (§2), never plain text, in its own column.
- Sortable columns show a sort indicator on the active column only (API_RULES §10); clicking a header toggles ascending/descending.
- Row-level actions (view/edit/delete) live in a trailing actions column, icon-only with accessible labels (§4/§21) — never a wall of text buttons per row.
- Pagination controls (API_RULES §8) sit below the table: page number, total items, page-size selector — consistent placement and behavior on every table in the product.
- Filters and search (API_RULES §9/§11) sit above the table in a consistent toolbar row: search input on the left, filter dropdowns to its right, primary action (e.g. "New Customer") on the far right.
- Loading, empty, and error states for a table follow §17–§19 exactly — a table never shows a blank white box during any of these states.

---

## 13. Buttons

| Variant | Use | Visual |
|---|---|---|
| `primary` | The one main action on a page/form (Save, Create, Confirm) | Solid `primary` fill |
| `secondary` | Alternative actions (Cancel, Back) | Neutral outline |
| `destructive` | Irreversible/high-consequence actions (Delete, Void, Cancel Booking) | Solid `danger` fill, always paired with a confirmation Modal (§15) |
| `ghost` | Low-emphasis actions (table row actions, dismiss) | No fill, icon or text only |

- Sizes: `sm` (table rows, compact toolbars), `md` (default, forms), `lg` (empty-state primary actions) — no other sizes.
- Every button has a defined loading state (spinner replaces label or sits inline before it) and disabled state (reduced opacity, no hover response) — both are part of the component, not improvised per usage.
- Never more than one `primary` button visible in the same view — if two actions compete, the second is `secondary`.

---

## 14. Cards

- Standard container for grouped content: Settings sections, Dashboard KPIs, Booking summary panels.
- Fixed padding (`space-4`), consistent border (`neutral-200` light / `neutral-800` dark) and radius (8px) across every card in the product — no per-module card restyling.
- A KPI card (§10) is a specific card variant: large numeric value (`text-h1` scale, but numeric-only), a label beneath (`text-small`), optional trend indicator — never more content than that, to stay scannable.
- Cards do not nest more than one level deep — a card inside a card is a layout smell, restructured into sections within one card instead.

---

## 15. Modals

- Reserved for two purposes only: (1) a **confirmation** step before a destructive/high-consequence action (delete, void invoice, cancel booking, process refund), and (2) a **quick-create** form short enough not to need a full page (e.g. adding a Remark).
- Never used for the primary Booking creation flow — that's a full-page wizard (§11), not a modal, given its length.
- Backdrop click and `Escape` both close a non-destructive modal; a confirmation modal for a destructive action requires an explicit button click (no backdrop/Escape dismiss that could be mistaken for confirming) — and always names the specific record being acted on ("Cancel booking BK-0001?", never a generic "Are you sure?").
- Focus is trapped inside an open modal and returns to the triggering element on close (§21).
- Sizes: `sm` (confirmation), `md` (quick-create form) — no full-screen modals; a screen that needs full-screen real estate is a page, not a modal.

---

## 16. Toast Notifications

- Used for transient feedback on an action's outcome (success/error), never for information the user must act on or reference later (that belongs in-page, e.g. a form's inline error, §11).
- Four variants, matching the semantic palette (§2): `success`, `danger`/error, `warning`, `info`.
- Success toasts auto-dismiss (~4s); error toasts persist until manually dismissed, since a user may be mid-task and miss a fast auto-dismiss on a failure that needs their attention.
- Positioned consistently (top-right) across the entire app — never repositioned per module.
- Error toast copy comes from the API_RULES §7 error envelope's `message` — never a generic fallback when a specific message is available.

---

## 17. Loading States

- **Skeleton loaders** for tables and cards on initial load — a gray placeholder matching the eventual content's shape, not a centered spinner replacing the whole page (avoids layout jump when content arrives).
- **Inline spinners** for button/action-level loading (form submit, row action) — the triggering element shows its own loading state; the rest of the page stays interactive.
- **Full-page loading** is reserved for the very first authenticated load (before the Sidebar/Header can render at all) — used nowhere else.
- No loading state may run indefinitely without feedback — a request that exceeds a reasonable threshold surfaces a retry option rather than spinning forever silently.

---

## 18. Empty States

Every list/table view defines an explicit empty state — never a bare empty table with just headers:

- A short icon or illustration (§4 scale, standalone size), a one-line message specific to that resource ("No bookings yet," not "No data"), and — where the user has permission — a primary action button to create the first record.
- A *filtered-to-empty* result (a search/filter that legitimately returns nothing) uses a distinct, lighter message ("No results match your filters") with a "Clear filters" action instead of a "Create new" action — these are different situations and must read differently.

---

## 19. Error States

- **Inline field errors** (§11) for validation failures — the most common error case, handled without leaving the form.
- **Toast errors** (§16) for action failures that don't map to a specific field (e.g. a `409` invalid workflow transition, a network failure).
- **Page-level error state** for a failed initial data load (e.g. a detail page whose resource fetch fails): replaces the content area with a message and a retry action, while the Sidebar/Header remain functional — a broken data fetch never takes down the whole shell.
- **404 boundary**: a resource that doesn't exist or belongs to another Agency (API_RULES §4/§20 — indistinguishable by design) shows the same "Not found" page state — the UI never implies "this exists but isn't yours."
- **Unhandled/500 boundary**: a generic, branded error page with a "reload"/"go to dashboard" action — never a raw stack trace or technical detail (API_RULES §21) surfaced to the user.

---

## 20. Responsive Rules

Mobile-first (CODING_STANDARDS §13), though this product's primary usage is desktop (agency staff at a workstation) — mobile support targets "usable," not "optimized":

- Sidebar (§8) collapses to an off-canvas drawer, triggered by a header menu icon, below `md`.
- Tables (§12) below `md`: either horizontal scroll within the table container (preferred for data-dense tables like Bookings, Finance) or a stacked-card representation of each row (acceptable for simpler lists like Activity Log) — chosen per-table based on column count, not a single global rule.
- Forms (§11) are always single-column below `md`, regardless of desktop layout.
- KPI cards (§10) stack to a single column below `md`, two columns at `md`.
- Modals (§15) become near-full-width (with margin) rather than a fixed small box, below `sm`.

---

## 21. Accessibility (WCAG)

Target: **WCAG 2.1 AA** across the product — this is an internal-tool product, but agencies may have staff who rely on assistive technology, and AA is the reasonable baseline for a commercial SaaS product.

- **Contrast:** minimum 4.5:1 for body text, 3:1 for large text (`text-h1`/`text-h2`) and meaningful icons, verified against every token pairing in §2, in both themes (§22).
- **Keyboard:** every interactive element (nav item, table row action, form field, modal control) is reachable and operable via keyboard alone, in a logical tab order; no mouse-only interaction anywhere.
- **Focus indicators:** visible on every focusable element — never suppressed for aesthetic reasons.
- **Labels:** every form field has a programmatically associated `<label>` (§11); every icon-only control has an `aria-label` or equivalent (§4).
- **Status/live regions:** toast notifications (§16) are announced via an ARIA live region so a screen-reader user isn't only informed by a visual popup.
- **Modals** (§15) use proper dialog semantics (role, focus trap, labelled by their title) so assistive tech announces them correctly on open.
- **Color is never the only signal:** status badges pair color with text (§2); form errors pair color with icon + message text (§11) — colorblind users must be able to read every state without relying on hue alone.

---

## 22. Theme (Light / Dark)

- Two themes: Light and Dark, plus a `system` option that follows the OS preference — matching the `theme` enum on `settings` (DATABASE.md §3.2: `light`/`dark`/`system`).
- Theme is an **Agency-level default** (Settings, MASTER.md §10), applied to all of that Agency's users on login; a per-user override is a reasonable, low-cost future addition but is not required for MVP — Agency-level is sufficient scope.
- Every token in §2–§5 has both a light and dark value — dark mode is not "invert everything," it's a deliberately designed second palette (e.g. `neutral-900` background with `neutral-50` text, `primary` slightly desaturated to avoid glare) meeting the same §21 contrast minimums independently in both modes.
- Implementation follows CODING_STANDARDS §13: Tailwind's `dark:` variant driven by a `data-theme` attribute, switched at the app shell level — never a second, parallel set of styled components.
- No content, icon, or status meaning changes between themes — only color values change.

---

## 23. Design Tokens

The systematic backing for every section above — tokens are defined once, referenced everywhere, never redeclared per component (CODING_STANDARDS §13):

| Category | Examples | Defined in |
|---|---|---|
| Color | `primary`, `neutral-*`, `success`/`warning`/`danger`/`info`, each with a light and dark value | §2, §22 |
| Typography | `text-h1`…`text-small`, `text-mono` | §3 |
| Spacing | `space-1`…`space-8` | §5 |
| Radius | Single consistent value for cards/buttons/inputs/modals (8px) — no per-component radius | §14 |
| Shadow | One elevation step for cards/dropdowns, one heavier step for modals — no arbitrary shadow values | §14, §15 |
| Breakpoints | `sm`/`md`/`lg`/`xl`/`2xl` (Tailwind defaults) | §6, §20 |
| Z-index | A fixed small scale (dropdown < sticky header < modal < toast) to prevent stacking-context bugs | §8, §9, §15, §16 |

Tokens live in one place in the codebase (Tailwind config + a small theme-variable layer, per CODING_STANDARDS §13) — this document is their specification, not their implementation.

---

*End of UI_GUIDELINES.md. Governed by MASTER.md, TASKS.md, DATABASE.md, API_RULES.md, and CODING_STANDARDS.md (all frozen). This document does not modify any of them.*
