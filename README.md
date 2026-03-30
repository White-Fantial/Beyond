# Beyond — 통합 푸드 비즈니스 운영 SaaS

**Beyond** is an integrated food-business operations platform that unifies POS systems, delivery platforms (Baemin, Coupang Eats, etc.), online ordering, subscription services, and analytics into a single dashboard.

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
│   ├── (auth)/                 # Auth route group (no portal layout)
│   │   └── login/
│   │       ├── LoginForm.tsx   # Client form component
│   │       ├── actions.ts      # Login server action
│   │       └── page.tsx
│   ├── (customer)/             # Customer portal layout group
│   │   ├── app/                # /app — customer-facing pages
│   │   │   ├── page.tsx        # Home / store discovery
│   │   │   ├── orders/
│   │   │   ├── subscriptions/
│   │   │   └── account/
│   │   └── layout.tsx
│   ├── (dashboard)/            # Legacy dashboard route group
│   │   ├── layout.tsx
│   │   └── dashboard/page.tsx
│   ├── admin/                  # /admin — platform admin portal
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── tenants/
│   │   ├── users/
│   │   ├── stores/
│   │   ├── billing/
│   │   ├── integrations/
│   │   ├── jobs/
│   │   └── logs/
│   ├── backoffice/             # /backoffice — store operations portal
│   │   ├── select-store/       # Store picker page
│   │   └── store/[storeId]/    # Per-store operations
│   │       ├── layout.tsx
│   │       ├── dashboard/
│   │       ├── orders/
│   │       ├── operations/
│   │       ├── inventory/
│   │       ├── products/
│   │       ├── categories/
│   │       ├── modifiers/
│   │       └── reports/
│   ├── owner/                  # /owner — multi-store owner portal
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── stores/
│   │   ├── team/
│   │   ├── reports/
│   │   ├── billing/
│   │   ├── integrations/
│   │   └── settings/
│   ├── api/                    # API routes
│   │   ├── auth/logout/        # Logout API route
│   │   └── catalog/            # Catalog API routes
│   │       ├── sync/           # POST /api/catalog/sync
│   │       ├── categories/     # GET + PATCH /api/catalog/categories
│   │       ├── products/       # GET + PATCH /api/catalog/products
│   │       └── modifier-groups/ # GET + PATCH /api/catalog/modifier-groups
│   ├── unauthorized/           # 403 page
│   ├── globals.css
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Landing page
│
├── components/
│   ├── layout/
│   │   ├── AdminSidebar.tsx
│   │   ├── BackofficeSidebar.tsx
│   │   ├── CustomerNav.tsx
│   │   ├── Header.tsx
│   │   ├── OwnerSidebar.tsx
│   │   └── Sidebar.tsx
│   └── ui/
│       ├── Button.tsx
│       └── Card.tsx
│
├── domains/                    # Domain types (DDD-style)
│   ├── analytics/types.ts
│   ├── auth/types.ts
│   ├── catalog/types.ts
│   ├── delivery/types.ts
│   ├── order/types.ts
│   ├── payment/types.ts
│   ├── pos/types.ts
│   ├── store/types.ts
│   ├── subscription/types.ts
│   └── tenant/types.ts
│
├── adapters/                   # External integration adapters
│   ├── delivery/               # Delivery platform adapters
│   ├── payment/                # Payment gateway adapters
│   └── pos/                    # POS system adapters
│
├── services/                   # Application service layer
│   ├── auth.service.ts
│   ├── catalog.service.ts      # Catalog CRUD + resolveExternalId
│   ├── catalog-sync.service.ts # Full Loyverse catalog sync orchestration
│   ├── foundation.service.ts   # Tenant/store/connection bootstrapping
│   └── store.service.ts
│
├── lib/
│   ├── auth/
│   │   ├── constants.ts        # Roles, permissions, static role→permission map
│   │   ├── context.ts          # UserAuthContext builder (DB-backed)
│   │   ├── permissions.ts      # requireAuth / requirePermission helpers
│   │   ├── redirect.ts         # Post-login redirect logic
│   │   └── session.ts          # JWT create / verify / cookie helpers
│   ├── integrations/
│   │   └── loyverse/
│   │       ├── client.ts       # LoyverseClient (paginated fetch helpers)
│   │       ├── parser.ts       # parseLoyverseCategory/Item/ModifierGroup
│   │       └── types.ts        # Loyverse API response types
│   ├── audit.ts                # logAuditEvent helper
│   ├── prisma.ts               # Prisma client singleton
│   └── utils.ts                # Shared utilities
│
├── __tests__/                  # Vitest test suites
│   ├── catalog.test.ts         # Catalog service + sync + parser tests
│   └── foundation.test.ts      # Foundation integrity tests
│
├── middleware.ts               # Edge route protection (JWT, role checks)
├── config/index.ts             # App-wide configuration
├── types/index.ts              # Shared TypeScript types
└── prisma/
    ├── schema.prisma           # Database schema
    └── seed.ts                 # Seed data (roles, permissions, demo users)
```

---

## Design Principles

- **Domain-Driven Structure** — each business domain (order, catalog, payment…) owns its types and logic.
- **Adapter Pattern** — POS, delivery, and payment integrations are isolated behind adapter interfaces, making it easy to add new providers without touching core logic.
- **Multi-Tenancy** — every resource is scoped to a `Tenant`, enabling multiple businesses on the same deployment.
- **Role-Based Access Control** — six platform roles (`CUSTOMER`, `STAFF`, `SUPERVISOR`, `MANAGER`, `OWNER`, `ADMIN`) each map to a static set of named permissions. The middleware enforces role checks at the edge (no DB hit); server actions call `requirePermission()` for fine-grained store-level checks.
- **JWT Session** — sessions are stored as signed JWTs in an `httpOnly` cookie (`beyond_session`). Signing uses `jose` with a `SESSION_SECRET` / `NEXTAUTH_SECRET` environment variable.
- **Multi-Portal Routing** — four separate URL namespaces (`/app`, `/backoffice`, `/owner`, `/admin`) each have their own layout and sidebar, automatically guarded by `middleware.ts`.
- **Server Components by default** — client components (`"use client"`) are used only where interactivity is required (sidebars, login form).

---

## Roles & Permissions

### Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `CUSTOMER` | Customer ordering and subscription user | `CUSTOMER_APP` |
| `STAFF` | Handles orders and basic inventory | `ORDERS`, `OPERATIONS`, `INVENTORY`, `MENU_VIEW` |
| `SUPERVISOR` | Operational supervisor with broader daily controls | STAFF + `REPORTS`, `CATEGORY_MANAGE` |
| `MANAGER` | Store manager with full operational management | SUPERVISOR + `MENU_MANAGE`, `MODIFIER_MANAGE` |
| `OWNER` | Business owner managing team, billing, and integrations | MANAGER + `STAFF_MANAGE`, `STORE_SETTINGS`, `INTEGRATIONS`, `BILLING` |
| `ADMIN` | Platform administrator | `PLATFORM_ADMIN` (full platform access) |

### Permissions Reference

| Permission | Name | Description |
|------------|------|-------------|
| `CUSTOMER_APP` | Customer App | Access to the customer-facing ordering and subscription app (`/app`). |
| `ORDERS` | Orders | View and manage incoming orders in the backoffice. |
| `OPERATIONS` | Operations | Manage daily store operations (floor control, open/close, station management). |
| `INVENTORY` | Inventory | Manage inventory levels and mark menu items as sold-out. |
| `MENU_VIEW` | Menu View | Read-only access to menu data — items, prices, and availability. |
| `MENU_MANAGE` | Menu Manage | Create, update, and delete menu items and their pricing. |
| `CATEGORY_MANAGE` | Category Manage | Manage product categories and control their visibility on menus. |
| `MODIFIER_MANAGE` | Modifier Manage | Manage option groups and modifiers (add-ons, choices) attached to menu items. |
| `REPORTS` | Reports | View sales reports and analytics dashboards. |
| `STAFF_MANAGE` | Staff Manage | Add, remove, and manage store team members and their assigned roles. |
| `STORE_SETTINGS` | Store Settings | Configure store details, business hours, and operational settings. |
| `INTEGRATIONS` | Integrations | Connect and manage POS system and delivery platform integrations (e.g., Baemin, Coupang Eats). |
| `BILLING` | Billing | Manage subscription plans, payment methods, and billing history. |
| `PLATFORM_ADMIN` | Platform Admin | Full platform-level administration access, including tenant management, user oversight, and system configuration (`/admin`). |

### Portal Redirects

After login, each role is redirected to its home portal:

| Role | Default Redirect |
|------|-----------------|
| `CUSTOMER` | `/app` |
| `STAFF` / `SUPERVISOR` / `MANAGER` | `/backoffice/store` |
| `OWNER` | `/owner` |
| `ADMIN` | `/admin` |

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
# Edit .env and set DATABASE_URL and SESSION_SECRET

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

## Roadmap

- [x] Project scaffolding (Next.js 14, Prisma, Tailwind)
- [x] Domain types & adapter interfaces
- [x] Database schema (multi-tenant, RBAC)
- [x] JWT session management
- [x] Role & permission system (6 roles, 14 permissions)
- [x] Multi-portal routing & layouts (Customer, Backoffice, Owner, Admin)
- [x] Edge middleware with role-based route protection
- [x] Login page with server action & `LoginForm` client component
- [x] Loyverse POS adapter (categories, items, modifier groups) with `modifier_ids` mirroring
- [x] Full catalog sync service (raw mirror tables → internal catalog → channel mappings)
- [x] Catalog API routes (sync, categories, products, modifier-groups)
- [x] Backoffice catalog pages (categories, products, modifiers) — operational UX
- [x] Channel entity mapping for outbound ID resolution
- [x] Vitest test suite (catalog service, sync, parsers, foundation integrity)
- [ ] POS adapter implementations (Posbank, OKPOS)
- [ ] Delivery platform adapters (Baemin, Coupang Eats)
- [ ] Payment gateway integration (Toss Payments)
- [ ] Real-time order notifications (WebSocket / SSE)
- [ ] Sales analytics charts
- [ ] Subscription billing engine

---

## Troubleshooting

### No active Loyverse connection found (sync returns 404)

The sync endpoint looks up a `Connection` with `type=POS`, `provider=LOYVERSE`, and `status=CONNECTED` for the given `storeId`. If this query returns nothing, check:

1. A `Connection` row exists for the store with the correct type/provider.
2. `connection.status` is `CONNECTED` (not `PENDING`, `DISCONNECTED`, or `ERROR`).
3. You are using the correct `storeId` UUID (not the store `code`).

### No active credential for connection (sync returns 404)

After resolving the connection, the endpoint looks for a `ConnectionCredential` row where `isActive = true`. If missing:

1. Ensure a credential was inserted via `createConnectionCredential()` (or the seed).
2. Check that `isActive` was not accidentally set to `false` during a credential rotation.
3. `configEncrypted` must contain the Loyverse access token.

### Modifier groups not appearing in order UI

The order UI reads modifier groups from `catalog_product_modifier_groups`, which is populated during full catalog sync from Loyverse `item.modifier_ids`. If modifiers are missing, trace the chain:

1. **Loyverse API**: confirm the item returns `modifier_ids` (non-empty array).
2. **External mirror**: check `external_catalog_product_modifier_group_links` for a row with `(connectionId, externalProductId, externalModifierGroupId)`.
3. **Internal link**: check `catalog_product_modifier_groups` for a row with the internal product/modifier-group IDs and `isActive = true`.
4. **API response**: `GET /api/catalog/modifier-groups?storeId=<id>` should return the groups; `listProductModifierGroups(productId)` should return the linked groups.

Run a full sync (`POST /api/catalog/sync`) after confirming the Loyverse data is correct.

### Outbound order fails: mapping missing for entity

`resolveExternalId()` in `catalog.service.ts` returns `null` when no `ChannelEntityMapping` row exists for the requested `(connectionId, entityType, internalEntityId)`. This means:

1. The catalog sync was never run, or the entity appeared after the last sync — run a full sync.
2. The entity was deactivated/deleted in Loyverse but the internal row was not cleaned up — deactivate the internal row and re-sync.
3. The mapping was manually deleted — re-run sync to recreate it.

Never fall back to using internal UUIDs as Loyverse IDs. If the mapping is missing, the order must be blocked until sync is re-run and the mapping is restored.

---

© 2024 Beyond. All rights reserved.

---

## Architecture

### Multi-Tenant Data Model

Beyond uses a three-tier multi-tenant model: **Tenant → Store → User** where access is controlled through two join tables.

```
Tenant (slug: "bagels-beyond")
  │
  ├── Store (code: "addington")   ◄── stores belong to a tenant
  │     └── Connection            ◄── integrations scoped to store + tenant
  │
  ├── Membership (User ↔ Tenant)  ◄── user's role within a tenant
  │     └── StoreMembership       ◄── user's role within a specific store
  │
  └── AuditLog                    ◄── immutable audit trail
```

#### Entity Relationship Diagram (ASCII)

```
┌────────────┐        ┌─────────────┐        ┌────────┐
│   Tenant   │──────<│ Membership  │>────────│  User  │
│            │        │             │         │        │
│  slug (UK) │        │ role        │         │ email  │
│  timezone  │        │ status      │         │ pwHash │
│  currency  │        └──────┬──────┘         │ plRole │
└─────┬──────┘               │                └────────┘
      │                      │
      │        ┌─────────────▼──────────┐
      └──────<│    StoreMembership      │
      │        │  membershipId (FK)      │
      │        │  storeId     (FK)       │
      │        │  tenantId    (FK)       │
      │        │  role  status           │
      │        └────────────────────────┘
      │
      └──────<│    Store                │
               │  tenantId (FK)          │
               │  code (UK per tenant)   │
               │  name  status           │
               └──────┬──────────────────┘
                      │
               ┌──────▼──────┐
               │ Connection  │
               │ type        │
               │ provider    │
               │ status      │
               └──────┬──────┘
                      │
               ┌──────▼────────────────┐
               │ ConnectionCredential  │
               │ configEncrypted       │
               │ isActive              │
               └───────────────────────┘
```

#### Key Design Decisions

| Concept | Decision |
|---------|----------|
| **Tenant isolation** | Every `Store`, `Membership`, `StoreMembership`, and `Connection` carries a `tenantId` FK. All service functions validate cross-tenant access before write. |
| **Two-level membership** | `Membership` (User ↔ Tenant, carries `MembershipRole`) and `StoreMembership` (Membership ↔ Store, carries `StoreRole`) allow a user to have different roles in different stores of the same tenant. |
| **Connection credentials** | `ConnectionCredential` stores encrypted config separately from `Connection` metadata, enabling credential rotation without changing the connection record. |
| **Audit trail** | `AuditLog` is append-only. `logAuditEvent()` swallows errors so audit failures never block business operations. |
| **JWT sessions** | The session cookie embeds `primaryTenantId`, `primaryMembershipRole`, `primaryStoreId`, `primaryStoreRole` to allow middleware to make routing decisions without a DB hit. |

#### Portal Routing (post-login)

| Platform Role / Membership Role | Redirect |
|--------------------------------|----------|
| `PLATFORM_ADMIN` | `/admin` |
| Membership `OWNER` or `ADMIN` | `/owner` |
| Has `primaryStoreId` in session | `/backoffice/store/:id/orders` |
| No store access | `/app` |

---

### Running Migration & Seed

#### Apply the migration (fresh database)

```bash
# Option A — Prisma managed migrations (recommended for dev)
npx prisma migrate dev --name add_foundation_multi_tenant_schema

# Option B — Apply the raw SQL directly (CI / production)
psql $DATABASE_URL -f prisma/migrations/20260330000000_add_foundation_multi_tenant_schema/migration.sql
```

#### Generate the Prisma client after schema changes

```bash
npx prisma generate
```

#### Seed demo data (Bagels Beyond tenant)

```bash
npm run prisma:seed
```

This creates:
- **Tenant**: `bagels-beyond` (Bagels Beyond Ltd, NZD, Pacific/Auckland)
- **Store**: `addington` (Addington Store)
- **User**: `owner@bagelsbeyond.local` / `password123` with `OWNER` membership + store membership

#### Run tests

```bash
npm run test
```

---

## Catalog Architecture

### Overview

The catalog system is organized into three layers:

```
┌──────────────────────────────────────────────────────────────────────┐
│  1. Internal Catalog Tables                                           │
│     catalog_categories, catalog_products, catalog_modifier_groups,   │
│     catalog_modifier_options, catalog_product_categories,            │
│     catalog_product_modifier_groups                                  │
├──────────────────────────────────────────────────────────────────────┤
│  2. External Raw Mirror Tables                                        │
│     external_catalog_categories, external_catalog_products,          │
│     external_catalog_modifier_groups, external_catalog_modifier_options│
│     external_catalog_product_modifier_group_links                    │
├──────────────────────────────────────────────────────────────────────┤
│  3. Channel Mapping Table                                             │
│     channel_entity_mappings                                          │
└──────────────────────────────────────────────────────────────────────┘
```

### Internal Catalog vs External Mirror vs Channel Mapping

| Layer | Purpose | Key fields |
|-------|---------|------------|
| **Internal catalog** | Single normalized source of truth for all catalog reads (UI, order UI, subscriptions). IDs are internal UUIDs only. | `id`, `tenantId`, `storeId`, `sourceType`, `sourceOfTruthConnectionId`, `source*Ref` |
| **External mirror** | Raw, unmodified copy of each record fetched from Loyverse (or any channel). Used for debugging, diffing, and re-syncing. | `connectionId`, `externalId`, `rawPayload`, `lastSyncedAt` |
| **Channel mapping** | Bidirectional lookup table between internal IDs and external channel IDs. Used when sending orders outbound to Loyverse or any channel. | `internalEntityId`, `externalEntityId`, `connectionId`, `entityType` |

### sourceOfTruthConnectionId and source*Ref fields

Every internal catalog entity that was imported from a POS has two source-key fields:
- `sourceOfTruthConnectionId` — the `Connection.id` of the POS connection that owns this entity.
- `source*Ref` (e.g. `sourceCategoryRef`, `sourceProductRef`) — the external ID on the POS side (e.g. a Loyverse category UUID).

**These two fields together form the stable natural key used during sync.** If Loyverse renames a category, the sync finds the existing row by `(connectionId, sourceCategoryRef)` and updates it — it does not create a duplicate row.

### Why internal and external IDs must never be mixed

Loyverse IDs are UUIDs specific to a Loyverse account. Internal Beyond IDs are UUIDs specific to a tenant/store. They have no relationship to each other. Mixing them would:
- Break sync idempotency (renamed entities would create duplicate rows)
- Cause outbound API calls to Loyverse to fail (wrong ID format/namespace)
- Make it impossible to support multiple channels for the same internal entity

All outbound Loyverse API calls **must** first look up the external ID via `channel_entity_mappings`. See `resolveExternalId()` in `services/catalog.service.ts`.

### Full Sync Philosophy

Beyond uses **full catalog sync** rather than incremental/partial sync. On each sync run:
1. All categories, modifier groups, modifier options, and items are fetched from Loyverse.
2. Raw mirror rows are upserted (one per external entity).
3. Internal catalog rows are upserted using source keys (never names).
4. Product–category and product–modifier-group links are reconciled (missing links deactivated, new links created).
5. Channel mapping rows are upserted.

Full sync is simpler to reason about and avoids edge cases with partial updates.

### Why Loyverse item modifier-ids are mirrored into catalog_product_modifier_groups

Loyverse items have a `modifier_ids` array that lists which modifier groups apply to the item. Beyond mirrors these into `external_catalog_product_modifier_group_links` (raw) and then into `catalog_product_modifier_groups` (internal). This:
- Enables the order UI to know which modifier groups to show for each product without calling Loyverse at runtime.
- Allows Beyond to detect when a modifier group link is removed in Loyverse and deactivate it internally.

### Source-locked vs locally editable product fields

| Field | Editable locally? | Notes |
|-------|------------------|-------|
| `name` | ❌ Source-locked (POS) | Updated only via sync |
| `basePriceAmount` | ❌ Source-locked (POS) | Updated only via sync |
| `displayOrder` | ✅ Local | Reorder categories/products in the backoffice |
| `isVisibleOnOnlineOrder` | ✅ Local | Toggle visibility on online ordering channel |
| `isVisibleOnSubscription` | ✅ Local | Toggle visibility on subscription channel |
| `isFeatured` | ✅ Local | Mark products as featured on the menu |
| `onlineName` | ✅ Local | Override display name for online ordering |
| `subscriptionName` | ✅ Local | Override display name for subscriptions |
| `internalNote` | ✅ Local | Internal staff notes |
| `imageUrl` | ✅ Local | Upload a custom image (POS images are imported but can be overridden) |
| `CatalogModifierOption.isSoldOut` | ✅ Local | Mark option as sold out (blocks selection in order UI) |

### Category visibility, display order, and modifier option sold-out

- **Category visibility** (`isVisibleOnOnlineOrder`, `isVisibleOnSubscription`): Toggled via the backoffice categories page or the `/api/catalog/categories` PATCH endpoint.
- **Display order**: Reordered via the `/api/catalog/categories` PATCH reorder endpoint (accepts `orderedIds` array).
- **Modifier option sold-out**: Toggled via the backoffice modifiers page or the `/api/catalog/modifier-groups` PATCH endpoint. Sold-out options are not selectable in the order UI.

### Catalog API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/catalog/categories?storeId=` | List catalog categories |
| `PATCH` | `/api/catalog/categories` | Reorder or update category visibility |
| `GET` | `/api/catalog/products?storeId=` | List catalog products (optionally by categoryId) |
| `PATCH` | `/api/catalog/products` | Update allowed local merchandising fields |
| `GET` | `/api/catalog/modifier-groups?storeId=` | List modifier groups with nested options |
| `PATCH` | `/api/catalog/modifier-groups` | Toggle modifier option sold-out |
| `POST` | `/api/catalog/sync` | Trigger full Loyverse catalog sync for a store |

### Loyverse Full Catalog Sync

Trigger a full sync for a store:

```bash
POST /api/catalog/sync
Content-Type: application/json

{
  "tenantId": "<tenant-uuid>",
  "storeId": "<store-uuid>"
}
```

The endpoint:
1. Looks up the active Loyverse POS connection for the store.
2. Reads the active credential (access token).
3. Runs `runLoyverseFullCatalogSync()` which fetches all catalog data from Loyverse and persists it.
4. Updates `Connection.lastSyncAt` and `lastSyncStatus`.

Returns sync result counts on success.

