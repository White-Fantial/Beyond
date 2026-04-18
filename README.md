# Beyond — 통합 푸드 비즈니스 운영 SaaS

**Beyond** is an integrated food-business operations platform that unifies POS systems, delivery platforms (Uber Eats, Doordash, etc.), online ordering, subscription services, and analytics into a single dashboard.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 |
| ORM | Prisma 5 |
| Database | PostgreSQL |
| Auth | JWT sessions via `jose` + `bcryptjs` |
| Runtime | Node.js 20+ |

---

## Project Structure

```
beyond/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Auth route group
│   │   └── login/
│   ├── (customer)/             # Customer portal layout group
│   │   └── app/                # /app — customer-facing pages
│   ├── admin/                  # /admin — PLATFORM_ADMIN only
│   ├── backoffice/             # /backoffice — store operations portal
│   ├── owner/                  # /owner — multi-store owner portal
│   ├── store/[storeSlug]/      # /store — public customer ordering portal
│   └── api/                    # API routes
│
├── components/                 # React components (layout/, order/, ui/, admin/, owner/)
├── domains/                    # Domain types (DDD-style)
├── adapters/                   # External integration adapters (delivery/, payment/, pos/)
├── services/                   # Application service layer
├── lib/                        # Shared utilities (auth/, cart/, integrations/, flags/)
├── types/                      # Shared TypeScript types
├── __tests__/                  # Vitest test suites
├── middleware.ts               # Edge route protection (JWT, role checks)
├── config/index.ts             # App-wide configuration
└── prisma/
    ├── schema.prisma           # Database schema
    └── seed.ts                 # Seed data
```

---

## Portal Access Model

Beyond is organised into four separate portals, each with its own URL namespace, layout, and access rules:

| Portal | URL Prefix | Purpose |
|--------|-----------|---------|
| **Customer App** | `/app` | Order management, subscriptions, account |
| **Back Office** | `/backoffice` | Store operations — orders, inventory, menus |
| **Owner Console** | `/owner` | Multi-store management — team, billing, integrations, customers, subscriptions |
| **Admin Console** | `/admin` | Platform administration |

### Role Hierarchy

| Role | Customer `/app` | Back Office `/backoffice` | Owner `/owner` | Admin `/admin` |
|------|:---:|:---:|:---:|:---:|
| CUSTOMER | ✅ | — | — | — |
| STAFF | ✅ | ✅ | — | — |
| SUPERVISOR | ✅ | ✅ | — | — |
| MANAGER | ✅ | ✅ | ✅ (limited) | — |
| OWNER | ✅ | ✅ | ✅ | — |
| PLATFORM_ADMIN | — | — | — | ✅ |

### Default Post-Login Redirect

| Role | Has `primaryStoreId`? | Redirected to |
|------|----------------------|--------------|
| `PLATFORM_ADMIN` | — | `/admin` |
| OWNER / ADMIN membership | ✅ Yes | `/backoffice/store/{primaryStoreId}/orders` |
| OWNER / ADMIN membership | ❌ No | `/owner/dashboard` |
| MANAGER membership | ✅ Yes | `/backoffice/store/{primaryStoreId}/orders` |
| MANAGER membership | ❌ No | `/owner/dashboard` |
| STAFF / SUPERVISOR | ✅ Yes | `/backoffice/store/{primaryStoreId}/orders` |
| STAFF / SUPERVISOR | ❌ No | `/app` |
| CUSTOMER | — | `/app` |

### Permissions Reference

| Permission | Description |
|------------|-------------|
| `CUSTOMER_APP` | Access to the customer-facing ordering and subscription app (`/app`) |
| `ORDERS` | View and manage incoming orders in the backoffice |
| `OPERATIONS` | Manage daily store operations (floor control, open/close) |
| `INVENTORY` | Manage inventory levels and mark menu items as sold-out |
| `MENU_VIEW` | Read-only access to menu data |
| `MENU_MANAGE` | Create, update, and delete menu items and their pricing |
| `CATEGORY_MANAGE` | Manage product categories and control their visibility |
| `MODIFIER_MANAGE` | Manage option groups and modifiers attached to menu items |
| `REPORTS` | View sales reports and analytics dashboards |
| `STAFF_MANAGE` | Add, remove, and manage store team members |
| `STORE_SETTINGS` | Configure store details, business hours, and operational settings |
| `INTEGRATIONS` | Connect and manage POS system and delivery platform integrations |
| `BILLING` | Manage subscription plans, payment methods, and billing history |
| `PLATFORM_ADMIN` | Full platform-level administration access (`/admin`) |

---

## Design Principles

- **Domain-Driven Structure** — each business domain (order, catalog, payment…) owns its types and logic.
- **Adapter Pattern** — POS, delivery, and payment integrations are isolated behind adapter interfaces.
- **Multi-Tenancy** — every resource is scoped to a `Tenant`, enabling multiple businesses on the same deployment.
- **Role-Based Access Control** — six platform roles each map to a static set of named permissions. Middleware enforces role checks at the edge; server actions call `requirePermission()` for fine-grained store-level checks.
- **JWT Session** — sessions are stored as signed JWTs in an `httpOnly` cookie (`beyond_session`).
- **Multi-Portal Routing** — four separate URL namespaces each have their own layout and sidebar, automatically guarded by `middleware.ts`.
- **Server Components by default** — client components (`"use client"`) are used only where interactivity is required.
- **Internal Catalog Ownership (Phase 1)** — Beyond internal catalog is the canonical operational model. All catalog reads (customer order UI, backoffice, owner console) use only the internal `catalog_*` tables. External POS/delivery data is treated as an import source (provenance), not a live authority.
- **Channel Mapping Layer (Phase 3)** — Internal and external catalog entities are linked via the `channel_entity_mappings` table. Internal UUIDs and external IDs are always strictly separated. Mappings can be AUTO or MANUAL, and may require review before publish/sync.
- **One-way Publish Layer (Phase 4)** — Internal catalog changes are pushed outbound to external channels via `CatalogPublishJob`. Publish is strictly one-way: internal → external.
- **External Change Detection (Phase 5)** — After each successful import, successive import runs are compared and differences are logged as `ExternalCatalogChange` records with field-level diffs. Detected changes are review-only and do not automatically update the internal catalog. Operators can Acknowledge or Ignore changes via the UI. This layer is the precursor to conflict detection (Phase 6) and two-way sync (Phase 7).
- **Conflict Detection & Resolution Foundation (Phase 6)** — Conflicts are derived from comparing internal catalog state against external detected changes. A conflict requires both sides to have changed the same field or structural area differently since the last known baseline. Not every external change becomes a conflict. Conflicts are stored with field-level and structure-level details. Resolution decisions (KEEP_INTERNAL, ACCEPT_EXTERNAL, MERGE_MANUALLY, DEFER, IGNORE) are recorded but not automatically applied. Actual data sync execution is deferred to Phase 7. Phase 6 uses current internal state plus lightweight change cues; richer internal field history will be extended later.
- **Policy-based Controlled Two-way Sync (Phase 7)** — Closes the loop on conflict resolution by actually executing sync decisions via `CatalogSyncPlan` + `CatalogSyncPlanItem` records. Operators define per-field sync policies (`CatalogSyncPolicy`) specifying direction, conflict strategy, and auto-apply mode (NEVER / SAFE_ONLY / ALWAYS). The planner builds sync plans by evaluating open external changes and resolved conflicts against policies. The executor applies READY items by routing each action to the inbound-apply service (external → internal) or the publish service (internal → external). Field-level whitelists prevent external changes from overwriting internal-only fields. Loop guard prevents echo conflicts. All executions are logged in `CatalogSyncExecutionLog`.
- **Advanced Merge Editor & Manual Reconciliation (Phase 8)** — Provides a fully operator-controlled merge layer for fine-grained manual reconciliation. `CatalogMergeDraft` records represent an operator's merge session linked to a conflict. Operators assign field-level choices (TAKE_INTERNAL / TAKE_EXTERNAL / CUSTOM_VALUE) via `CatalogMergeDraftField` and structure-level choices (KEEP_INTERNAL_SET / TAKE_EXTERNAL_SET / MERGE_SELECTED / CUSTOM_STRUCTURE) via `CatalogMergeDraftStructure`. Drafts go through a lifecycle (DRAFT → VALIDATED → PLAN_GENERATED → APPLIED). A validation step checks all choices for business rules (name length, priceAmount ≥ 0, minSelect ≤ maxSelect, boolean field types, CUSTOM_VALUE requires a value). Once validated, a `CatalogSyncPlan` is generated from the draft's resolved values, respecting the draft's `applyTarget` (INTERNAL_ONLY / EXTERNAL_ONLY / INTERNAL_THEN_EXTERNAL). Applying the draft delegates to the Phase 7 executor. Every lifecycle transition is recorded in `CatalogMergeExecutionLog`. Merge Queue UI at `/owner/stores/[storeId]/integrations/[connectionId]/merge`; Merge Editor UI at `.../merge/[draftId]`.
- **Customer Order UI** — the public ordering portal reads only the internal catalog tables. No provider-specific fields, external sync metadata, or source-lock logic are ever exposed to customer-facing code.

---

## Catalog Architecture (Phases 1–8)

Beyond internal catalog is the **only canonical operational model**. External channel data flows through an eight-layer architecture:

| Layer | Tables | Purpose |
|-------|--------|---------|
| **Internal Catalog** | `catalog_categories`, `catalog_products`, `catalog_modifier_groups`, `catalog_modifier_options` | Canonical source of truth. All UI reads from here only. |
| **External Snapshot** | `external_catalog_snapshots` | Immutable append-only raw payload per entity per import run. |
| **External Normalized** | `external_catalog_categories`, `external_catalog_products`, … | Normalized read-only mirror of external channel state. |
| **Channel Mapping** | `channel_entity_mappings` | Links internal UUIDs to external entity IDs. Required for publish/sync. |
| **Publish Layer** | `catalog_publish_jobs` | Per-operation outbound publish history (status, error, payload). |
| **External Change Detection** | `external_catalog_changes`, `external_catalog_change_fields` | Field-level diffs between successive import runs per entity. |
| **Conflict Detection & Resolution** | `catalog_conflicts`, `catalog_conflict_fields`, `catalog_conflict_resolution_logs`, `internal_catalog_changes` | Conflicts between internal changes and external changes. Resolution decision recording. |
| **Advanced Merge Editor** | `catalog_merge_drafts`, `catalog_merge_draft_fields`, `catalog_merge_draft_structures`, `catalog_merge_execution_logs` | Operator-controlled fine-grained merge sessions with field/structure-level choices, validation, plan generation and execution. |

| Concept | Description |
|---------|-------------|
| **originType** | Where a catalog entity ORIGINALLY came from (`BEYOND_CREATED`, `IMPORTED_FROM_POS`, `IMPORTED_FROM_DELIVERY`, `IMPORTED_FROM_OTHER`). Historical metadata only — does not restrict editing. |
| **originConnectionId / originExternalRef** | Which external connection/ID this entity was first imported from. Not the current authority. |
| **Mapping statuses** | `ACTIVE` (safe), `NEEDS_REVIEW` (auto-matched, needs approval), `UNMATCHED` (no candidate), `BROKEN` (entities missing/invalid), `ARCHIVED` (historical). |
| **Editing** | ALL catalog entities (regardless of origin) are fully editable in Beyond. There is no source-lock. |
| **ID separation** | Internal UUIDs and external IDs are always strictly separated. The mapping layer is the only bridge. |
| **Publish flow** | `internal entity → mapping lookup → prerequisite validation → payload builder → provider adapter → CatalogPublishJob`. |
| **Publish does not replace import** | External normalized catalog tables are refreshed via import. Publish success updates `lastPublish*` fields on mappings for tracking only — it does NOT make external tables authoritative. |
| **changed-only publish** | A SHA-256 hash of publish-relevant fields is compared against `lastPublishHash` on the mapping. If equal, the job is SKIPPED. ARCHIVE/UNARCHIVE always run. |

See [doc/architecture.md](./doc/architecture.md) for detailed diagrams and API reference.

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env
# Edit .env and set DATABASE_URL, SESSION_SECRET, INTEGRATIONS_ENCRYPTION_KEY

# 3. Generate Prisma client
npm run prisma:generate

# 4. Run database migrations
npm run prisma:migrate

# 5. Seed initial roles, permissions, and demo users
npm run prisma:seed

# 6. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the landing page.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:seed` | Seed roles, permissions, and demo data |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run test` | Run Vitest test suite |

---

## Documentation

Detailed documentation is in the [`doc/`](./doc/) folder:

| Document | Description |
|----------|-------------|
| [doc/roadmap.md](./doc/roadmap.md) | Development roadmap — all completed phases grouped by area (Core, Catalog, Backoffice, Storefront, Customer Portal, Owner Console, Admin Console, Integrations), and planned work (Customer Portal Phase 3, Lightspeed/Baemin/Coupang Eats adapters, CSV/PDF export, Web Push) |
| [doc/admin-console.md](./doc/admin-console.md) | Admin Console — routes, write actions, impersonation, logs, jobs, billing, feature flags |
| [doc/owner-console.md](./doc/owner-console.md) | Owner Console — dashboard, store settings, staff, catalog, reports & analytics, customer & subscription management (Phase 5), billing deep dive (Phase 6) |
| [doc/architecture.md](./doc/architecture.md) | Architecture — multi-tenant model, order model, catalog layers, channel integrations, customer order UI |
| [doc/troubleshooting.md](./doc/troubleshooting.md) | Troubleshooting common issues (sync, modifiers, order forwarding) |
