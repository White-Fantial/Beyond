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
│   ├── admin/                  # /admin — PLATFORM_ADMIN only, read-only console
│   │   ├── layout.tsx          # Auth guard (PLATFORM_ADMIN only) + mobile nav
│   │   ├── page.tsx            # Dashboard: KPI + recent tenants/users/stores
│   │   ├── system/
│   │   │   └── page.tsx        # System Monitoring / Health Dashboard (Phase 8)
│   │   ├── tenants/
│   │   │   ├── page.tsx        # Tenant list (search, status filter, pagination)
│   │   │   └── [tenantId]/     # Tenant detail (stores, memberships, connections)
│   │   ├── users/
│   │   │   ├── page.tsx        # User list (search, status filter, pagination)
│   │   │   └── [userId]/       # User detail (tenant+store memberships)
│   │   └── stores/
│   │       ├── page.tsx        # Store list (search, status filter, pagination)
│   │       └── [storeId]/      # Store detail (memberships, connections)
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
│   ├── store/[storeSlug]/      # /store — public customer ordering portal
│   │   ├── layout.tsx          # Minimal public layout (no auth)
│   │   ├── page.tsx            # Order entry page (menu browse + add to cart)
│   │   ├── OrderPageClient.tsx # Interactive client component (category nav, modals)
│   │   ├── cart/page.tsx       # Cart review page
│   │   ├── checkout/page.tsx   # Checkout page (stub — future payment)
│   │   └── subscriptions/page.tsx # Subscription entry page
│   ├── api/                    # API routes
│   │   ├── auth/logout/        # Logout API route
│   │   ├── catalog/            # Catalog API routes
│   │   │   ├── sync/           # POST /api/catalog/sync
│   │   │   ├── categories/     # GET + PATCH /api/catalog/categories
│   │   │   ├── products/       # GET + PATCH /api/catalog/products
│   │   │   └── modifier-groups/ # GET + PATCH /api/catalog/modifier-groups
│   │   └── store/[storeSlug]/product/[productId]/route.ts  # GET product detail (public)
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
│   ├── order/                  # Customer Order UI components
│   │   ├── StoreHeader.tsx     # Store name + pickup time display
│   │   ├── CategoryBar.tsx     # Horizontal scroll category tab bar
│   │   ├── ProductSection.tsx  # Category section with product list
│   │   ├── ProductCard.tsx     # Product card (text left, image right)
│   │   ├── ProductModal.tsx    # Modifier selection bottom sheet / modal
│   │   ├── CartButton.tsx      # Floating cart badge button
│   │   ├── PickupTimeChip.tsx  # Pickup time display chip
│   │   ├── PickupTimeSelector.tsx  # Pickup time slot picker
│   │   └── SubscriptionEntryLink.tsx  # Link to subscription entry page
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
│   ├── customer-menu.service.ts # Customer-facing catalog queries (public ordering)
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
│   ├── cart/
│   │   └── cart-context.tsx    # Client-side cart state (React Context + useReducer)
│   ├── integrations/
│   │   └── loyverse/
│   │       ├── client.ts       # LoyverseClient (paginated fetch helpers)
│   │       ├── parser.ts       # parseLoyverseCategory/Item/ModifierGroup
│   │       └── types.ts        # Loyverse API response types
│   ├── order/
│   │   └── pickup-time.ts      # Pickup time auto-calculation utilities
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

## Portal Access Model & Workspace Switching

### Portal Structure

Beyond is organised into four separate portals, each with its own URL namespace, layout, and access rules:

| Portal | URL Prefix | Purpose |
|--------|-----------|---------|
| **Customer App** | `/app` | Order management, subscriptions, account |
| **Back Office** | `/backoffice` | Store operations — orders, inventory, menus |
| **Owner Console** | `/owner` | Multi-store management — team, billing, integrations |
| **Admin Console** | `/admin` | Platform administration |

### Role Hierarchy & Portal Access

| Role | Customer App `/app` | Back Office `/backoffice` | Owner Console `/owner` | Admin Console `/admin` |
|------|:---:|:---:|:---:|:---:|
| CUSTOMER (platform `USER`, no store) | ✅ | — | — | — |
| STAFF | ✅ | ✅ | — | — |
| SUPERVISOR | ✅ | ✅ | — | — |
| MANAGER | ✅ | ✅ | ✅ (limited) | — |
| OWNER (membership `OWNER`/`ADMIN`) | ✅ | ✅ | ✅ | — |
| ADMIN (`PLATFORM_ADMIN`) | — | — | — | ✅ |

Higher-privilege roles inherit access to lower portals. OWNER users in particular have full access to both `/backoffice` and `/owner`.

### Default Post-Login Redirect

After a successful login, users are redirected based on their highest role:

| Role | Has `primaryStoreId`? | Redirected to |
|------|----------------------|--------------|
| `PLATFORM_ADMIN` | — | `/admin` |
| OWNER membership | ✅ Yes | `/backoffice/store/{primaryStoreId}/orders` |
| OWNER membership | ❌ No | `/owner/dashboard` |
| MANAGER membership | ✅ Yes | `/backoffice/store/{primaryStoreId}/orders` |
| MANAGER membership | ❌ No | `/owner/dashboard` |
| STAFF / SUPERVISOR | ✅ Yes | `/backoffice/store/{primaryStoreId}/orders` |
| STAFF / SUPERVISOR | ❌ No | `/app` |
| CUSTOMER | — | `/app` |

**Why does OWNER land in Back Office?** Owners spend the majority of their time on daily operations (orders, inventory). The Owner Console (`/owner`) is reserved for administrative tasks (billing, team, integrations). OWNER users can switch to the Owner Console at any time via the **Workspace Switcher** in the header.

### Workspace Switcher

The `WorkspaceSwitcher` component (`components/layout/WorkspaceSwitcher.tsx`) appears in the header of every portal. It reads the current user's session and surfaces links to all portals they are permitted to access, with the current portal highlighted.

Example for an OWNER user in Back Office:

```
Current: Back Office  |  Switch to:  Customer App   Owner Console
```

The `/backoffice` link always uses the `primaryStoreId` from the session (or the current `[storeId]` URL param when already inside a store layout).

---



- **Domain-Driven Structure** — each business domain (order, catalog, payment…) owns its types and logic.
- **Adapter Pattern** — POS, delivery, and payment integrations are isolated behind adapter interfaces, making it easy to add new providers without touching core logic.
- **Multi-Tenancy** — every resource is scoped to a `Tenant`, enabling multiple businesses on the same deployment.
- **Role-Based Access Control** — six platform roles (`CUSTOMER`, `STAFF`, `SUPERVISOR`, `MANAGER`, `OWNER`, `ADMIN`) each map to a static set of named permissions. The middleware enforces role checks at the edge (no DB hit); server actions call `requirePermission()` for fine-grained store-level checks.
- **JWT Session** — sessions are stored as signed JWTs in an `httpOnly` cookie (`beyond_session`). Signing uses `jose` with a `SESSION_SECRET` / `NEXTAUTH_SECRET` environment variable.
- **Multi-Portal Routing** — four separate URL namespaces (`/app`, `/backoffice`, `/owner`, `/admin`) each have their own layout and sidebar, automatically guarded by `middleware.ts`.
- **Server Components by default** — client components (`"use client"`) are used only where interactivity is required (sidebars, login form).
- **Customer Order UI** — the public ordering portal (`/store/[storeSlug]`) reads only the internal catalog tables. No provider-specific fields, external mirror tables, or sync metadata are ever exposed to customer-facing code.

---

## Customer Order UI

The customer ordering portal lives under `/store/[storeSlug]` and is a **fully public, no-login-required** ordering interface inspired by Bopple / Uber Eats mobile UX.

### Route Structure

| Route | Purpose |
|-------|---------|
| `/store/[storeSlug]` | Main order entry — category bar + product card list |
| `/store/[storeSlug]/cart` | Cart review — items, quantities, pickup time summary |
| `/store/[storeSlug]/checkout` | Checkout (stub — payment & order creation coming) |
| `/store/[storeSlug]/subscriptions` | Subscription entry — same catalog filtered for subscription products |

`storeSlug` maps to the `Store.code` field in the database (URL-safe, human-readable store identifier).

### Information Architecture

```
/store/[storeSlug]
│
├── StoreHeader (sticky)
│   ├── Store display name
│   └── Pickup time chip (auto-selected, click to change)
│
├── CategoryBar (sticky below header)
│   └── Horizontal scroll tabs — filtered by isVisibleOnOnlineOrder, sorted by displayOrder
│
└── ProductSections (scrollable)
    ├── [Category Name]
    │   └── ProductCard × N
    │       ├── Left 70%: displayName, shortDescription, price, Add button
    │       └── Right 30%: product image (or gradient fallback)
    └── SubscriptionEntryLink
```

### Product Card Layout

Cards follow a **text-left / image-right** layout:

```
┌─────────────────────────────────┐
│ Product Name        ┌─────────┐ │
│ Short description…  │  image  │ │
│                     └─────────┘ │
│ $12.50     [+ Add]              │
└─────────────────────────────────┘
```

- `displayName` = `onlineName` if set, otherwise `name`
- `isFeatured` products show a Featured badge
- `isSoldOut` products show a Sold Out badge and disable the Add button
- Products with modifiers (`hasModifiers=true`) open a **ProductModal** on Add

### Product Modal (Modifier Selection)

When a product has modifier groups, tapping **Add** opens a bottom sheet / modal:

- Displays product name, image, description, base price
- Renders each `CatalogModifierGroup` in order
- Required groups are validated before adding to cart
- `selectionMax=1` groups render as radio buttons; others as checkboxes
- Sold-out options are disabled
- Quantity stepper + "Add to Cart" CTA at the bottom

### Pickup Time Auto-Selection

Pickup time is automatically calculated on page load:

```
now + prepMinutes (default: 15 min) + buffer → round up to nearest 10-min slot
```

**Utilities** (`lib/order/pickup-time.ts`):

| Function | Purpose |
|----------|---------|
| `getDefaultPickupTime(params?)` | Returns earliest available pickup time |
| `roundToPickupSlot(date, interval?)` | Rounds a date up to the nearest slot boundary |
| `getAvailablePickupSlots(params?)` | Returns an array of upcoming pickup time slots |
| `formatPickupTime(time)` | Formats a Date as "10:30 AM" |
| `formatPickupLabel(time, isAsap)` | Formats as "ASAP (10:30 AM)" or "Pickup at 10:30 AM" |

Customers can tap the pickup time chip to open `PickupTimeSelector` and choose a different slot.

> TODO: Filter slots against store opening hours once `StoreHours` table is added.

### Cart State

Client-side cart is managed via React Context (`lib/cart/cart-context.tsx`):

```typescript
interface CartItem {
  productId: string;
  displayName: string;
  unitPrice: number;          // minor units (cents)
  quantity: number;
  selectedModifiers: SelectedModifier[];
  imageUrl?: string;
  notes?: string;             // future: per-item notes
}
```

- `CartProvider` is instantiated per page with the server-computed `initialPickupTime`
- `cartItemKey()` creates a stable key from `productId` + sorted modifier option IDs, allowing two items with different modifier selections to coexist in the cart

> TODO: Persist cart to `sessionStorage` or server-side `cart_sessions` table across navigations.

### Order vs Subscription Entry

Regular ordering and subscriptions **share the same backend catalog and cart infrastructure**. The only difference is the visibility filter applied when querying products:

| Context | Filter |
|---------|--------|
| `/store/[storeSlug]` | `isVisibleOnOnlineOrder=true` |
| `/store/[storeSlug]/subscriptions` | `isVisibleOnSubscription=true` |

Both use the same `OrderPageClient` component, same `CartProvider`, and same `CustomerModifierGroup` types.

> The subscription page is designed to extend into a full **Subscription Builder** flow (frequency selection, subscription checkout, subscription management) without changing the catalog data model.

### Customer Menu Service

All customer-facing data queries go through `services/customer-menu.service.ts`:

| Function | Purpose |
|----------|---------|
| `getStoreBySlugForCustomer(storeSlug)` | Looks up an active store by its `code` field |
| `getOnlineCatalogForStore(storeId)` | Returns categories + products for online ordering |
| `getSubscriptionCatalogForStore(storeId)` | Returns categories + products for subscriptions |
| `getProductDetailForOrdering(productId, storeId)` | Returns full product with modifier groups |

**Important constraints:**
- Only reads `catalog_*` tables — never external mirror tables (`external_catalog_*`) or mapping tables
- Never exposes `sourceRef`, `sourceType`, `syncChecksum`, or any provider-specific field
- Money values are always returned as integer minor units (e.g. `1250` for $12.50)

### Component Reference

| Component | Location | Description |
|-----------|----------|-------------|
| `StoreHeader` | `components/order/` | Store name + pickup time display in page header |
| `CategoryBar` | `components/order/` | Sticky horizontal scroll category tabs |
| `ProductSection` | `components/order/` | One section per category with heading |
| `ProductCard` | `components/order/` | Text-left / image-right product card |
| `ProductModal` | `components/order/` | Bottom sheet for modifier group selection |
| `CartButton` | `components/order/` | Cart badge button (item count + subtotal) |
| `PickupTimeChip` | `components/order/` | Compact pickup time display chip |
| `PickupTimeSelector` | `components/order/` | Slot list bottom sheet for time changes |
| `SubscriptionEntryLink` | `components/order/` | Link card to subscription entry page |

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
| `STAFF` / `SUPERVISOR` | `/backoffice/store` |
| `MANAGER` (with store) | `/backoffice/store` |
| `MANAGER` (no store) | `/owner/dashboard` |
| `OWNER` / `ADMIN` (with store) | `/backoffice/store` |
| `OWNER` / `ADMIN` (no store) | `/owner/dashboard` |
| `PLATFORM_ADMIN` | `/admin` |

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

## Admin Console (Platform Admin)

The `/admin` portal is a **PLATFORM_ADMIN-only operations console** for managing the entire platform.

### Access Control

- Protected at three levels:
  1. `middleware.ts` — edge-level route guard, blocks non-`PLATFORM_ADMIN` before any page loads
  2. `app/admin/layout.tsx` — server component auth check via `requireAuth()`
  3. Service layer — `requirePlatformAdmin()` helper in each page
- `OWNER`, `MANAGER`, `STAFF`, and other roles **cannot** access `/admin`
- Unauthorized users are redirected to `/unauthorized`

### Routes

| Route | Description |
|-------|-------------|
| `/admin` | Platform dashboard — KPI cards + recent tenants/users/stores |
| `/admin/system` | **System Monitoring / Health Dashboard** — platform health, operational metrics, incidents, drill-down links |
| `/admin/tenants` | Tenant list with search, status filter, pagination |
| `/admin/tenants/[tenantId]` | Tenant detail — info, stores, memberships, connection summary, **status change** |
| `/admin/users` | User list with search, status filter, pagination |
| `/admin/users/[userId]` | User detail — info, tenant memberships, store memberships, **status change** |
| `/admin/stores` | Store list with search, status filter, pagination |
| `/admin/stores/[storeId]` | Store detail — info, memberships, connections, **status change** |
| `/admin/integrations` | Platform-wide connection list — filter by status/provider, pagination |
| `/admin/integrations/[connectionId]` | Connection detail — status change, credential rotation, action log |
| `/admin/jobs` | **Jobs Console** — view, manually trigger, and safely retry operational recovery jobs |
| `/admin/jobs/[jobRunId]` | Job Run detail — input/result/error with sensitive-field masking, retry lineage, context links |
| `/admin/logs` | **Unified Logs Console** — audit, connection, webhook, and order event logs with multi-source filters |
| `/admin/logs/[logType]/[logId]` | Log detail — source-specific metadata, sanitized payload, context links |
| `/admin/billing` | **Billing Overview** — MRR estimate, plan distribution, recent subscription events & billing records |
| `/admin/billing/plans` | Plan list with status filter; create new plan |
| `/admin/billing/plans/[planId]` | Plan detail — edit info, manage limits & features, view subscribed tenants |
| `/admin/billing/tenants` | Tenant billing list — subscription status, usage, over-limit indicator |
| `/admin/billing/tenants/[tenantId]` | Tenant billing detail — subscription management, usage vs limits, billing account, records & event history |
| `/admin/feature-flags` | **Feature Flags Console** — list, create, filter by status/search |
| `/admin/feature-flags/[flagKey]` | Feature flag detail — assignments, status change, audit history |

### Dashboard KPIs

- Total tenants, stores, users, connections
- New tenants / users / stores in last 7 days
- Recent 5 items each for tenants, users, stores

### Write Actions (Phase 2)

Status changes are performed from entity detail pages. Each detail page shows a **상태 변경** (Status Change) section with a dropdown and save button:

- **Tenant**: ACTIVE / TRIAL / SUSPENDED / ARCHIVED
- **User**: ACTIVE / INVITED / SUSPENDED / ARCHIVED
- **Store**: ACTIVE / INACTIVE / ARCHIVED

Changes call `PATCH /api/admin/{entity}/{id}/status` and refresh the page on success.

### User Impersonation (Phase 2 Admin Feature)

`PLATFORM_ADMIN` can view the app from any user's point of view for support and issue reproduction.

#### Key Concepts

| Concept | Description |
|---------|-------------|
| **actor** | The real logged-in admin — always `PLATFORM_ADMIN`. Recorded in all audit logs. |
| **effective user** | The impersonated target — governs UI, permissions, and portal routing during the session. |

#### How It Works

1. On `/admin/users/[userId]`, admins see a **"View as user"** button (hidden for other admins and inactive users).
2. Clicking the button shows a confirmation dialog explaining the impersonation scope.
3. On confirm, `POST /api/admin/impersonate` is called:
   - Validates actor is `PLATFORM_ADMIN` and target is eligible.
   - Creates a signed `beyond_impersonation` JWT cookie (separate from `beyond_session`).
   - Resolves the effective user's landing page and redirects there.
   - Writes an `impersonation.started` audit log entry with actor identity.
4. While impersonating, a **full-width sticky amber banner** is shown at the very top of every page across all portals (`/admin`, `/owner`, `/backoffice`, `/app`).
5. The banner shows: effective user name/email, signed-in admin email, start time, and an **"Exit impersonation"** button.
6. Exiting via `DELETE /api/admin/impersonate` clears the cookie, logs `impersonation.ended`, and redirects back to `/admin/users/[userId]`.

#### Policy

| Rule | Detail |
|------|--------|
| Who can impersonate | `PLATFORM_ADMIN` only |
| Allowed targets | Any active user who is not a `PLATFORM_ADMIN` |
| Blocked targets | Other `PLATFORM_ADMIN` users, `SUSPENDED` / `ARCHIVED` / `INVITED` inactive accounts |
| Concurrent impersonations | One per session — starting a new one replaces the previous |
| Audit logging | `impersonation.started`, `impersonation.ended`, `impersonation.denied` events |

#### Session Architecture

Two cookies are used simultaneously:

| Cookie | Purpose |
|--------|---------|
| `beyond_session` | Actor's original JWT — **unchanged** throughout impersonation |
| `beyond_impersonation` | Signed JWT overlay with effective user's identity and routing hints |

`getCurrentUserAuthContext()` returns the **effective user's** memberships and permissions when the impersonation cookie is present. All portal layouts, permission guards, and redirect logic see the effective user transparently.

The middleware reads both cookies: `/admin/**` still requires the actor's session to be `PLATFORM_ADMIN`; all other portals use the effective user's roles.

#### Technical Files

| File | Role |
|------|------|
| `lib/auth/impersonation.ts` | `ImpersonationPayload` type, JWT helpers (`createImpersonationToken`, `verifyImpersonationToken`, `getImpersonationState`) |
| `app/api/admin/impersonate/route.ts` | `POST` (start) and `DELETE` (end) API endpoints |
| `components/admin/ImpersonationBanner.tsx` | Server component — reads cookie server-side, renders client banner |
| `components/admin/ImpersonationBannerClient.tsx` | Client component — sticky banner UI with exit button |
| `components/admin/ImpersonateButton.tsx` | Client component — "View as user" button + confirmation dialog |
| `app/layout.tsx` | Root layout — mounts `ImpersonationBanner` globally |

### Implementation Notes

- **Service layer**: `services/admin/` is separate from owner/backoffice services
- **Write API routes**: `app/api/admin/tenants/[id]/status`, `app/api/admin/users/[id]/status`, `app/api/admin/stores/[id]/status`
- **No sensitive data**: passwordHash, tokens, session data are never exposed
- **Mobile support**: sidebar hidden on mobile with a compact navigation bar
- **Pagination**: 20 items per page, query-string based (`?q=...&status=...&page=...`)

---

### Logs Console (Admin Phase 4 — Read-Only)

The `/admin/logs` page is a **unified, read-only log console** for platform operators to diagnose issues across all log sources.

#### Log Sources

| Source | Description |
|--------|-------------|
| `AuditLog` | Admin write actions, impersonation events, critical system changes |
| `ConnectionActionLog` | Integration connect / callback / refresh / disconnect / re-auth |
| `InboundWebhookLog` | Inbound webhook reception and processing results |
| `OrderEvent` | Order lifecycle events — status changes, POS forwarding, reconciliation |

Impersonation events (`impersonation.started`, `impersonation.ended`, `impersonation.denied`) appear in the Audit log and can be quickly filtered via `?q=IMPERSONATION`.

#### Routes

| Route | Description |
|-------|-------------|
| `/admin/logs` | Unified log list — all four sources, normalized and sorted by recency |
| `/admin/logs/[logType]/[logId]` | Log detail — context, sanitized metadata/payload, related entity links |

#### Filters

Query parameters accepted by `/admin/logs`:

| Param | Description |
|-------|-------------|
| `q` | Free-text search (action, message, event name, order ID) |
| `logType` | `AUDIT` / `CONNECTION_ACTION` / `WEBHOOK` / `ORDER_EVENT` |
| `from` / `to` | Date range (ISO 8601 or `YYYY-MM-DD`) |
| `tenantId` | Filter by tenant |
| `storeId` | Filter by store |
| `userId` | Filter by actor user |
| `provider` | Filter by provider (`LOYVERSE`, `UBER_EATS`, `DOORDASH`, `STRIPE`) |
| `actionType` | Filter by action/event type |
| `status` | Filter by status |
| `errorOnly` | `1` — show only ERROR-severity logs |
| `page` | Pagination (default 1, page size 20) |

#### Sensitive Data Masking

All raw payloads and metadata surfaced in the detail view are processed by `lib/admin/logs/sanitize.ts` before display. The following field keys (case-insensitive, matched as substring) are **always** replaced with `[REDACTED]`:

`password`, `passwordHash`, `token`, `accessToken`, `refreshToken`, `secret`, `clientSecret`, `signingKey`, `signature`, `authorization`, `cookie`, `session`, `configEncrypted`, `rawCredential`, `webhookSecret`, `apiKey`, `credential`, `privateKey`

The sanitizer recurses into nested objects and arrays. Original database records are **never modified**.

#### Scope Restrictions

This console is **read-only**. The following are intentionally excluded:

- Log deletion or modification
- Webhook replay / retry
- Job force re-run
- Billing event mutation
- Integration credential raw view

#### Deep Links

Detail pages for tenants, stores, and users include quick links to their related logs:

- `/admin/logs?tenantId=…` — all logs for a tenant
- `/admin/logs?storeId=…` — all logs for a store
- `/admin/logs?userId=…` — audit/impersonation events for a user

#### Technical Files

| File | Role |
|------|------|
| `types/admin-logs.ts` | Normalized type definitions (`AdminLogListItem`, `AdminLogDetail`, filter params) |
| `lib/admin/logs/sanitize.ts` | Sensitive-field masking (recursive, tested) |
| `lib/admin/logs/normalize.ts` | Per-source normalizers for list and detail views |
| `lib/admin/logs/labels.ts` | Human-readable labels for log types, actions, providers |
| `lib/admin/logs/filters.ts` | Filter query-param parsing |
| `services/admin/admin-log.service.ts` | Unified log query service — `listAdminLogs`, `getAdminLogDetail` |
| `components/admin/logs/` | UI components: table, filters, badges, detail header, metadata/payload viewers, context links |
| `__tests__/sanitize.test.ts` | Unit tests for the sanitize module |

#### Roadmap

- **Phase 5 — Jobs Console**: ✅ Implemented — see below
- **Phase 6 — Billing Panel**: ✅ Implemented — subscription plan CRUD, billing history, invoice details
- **Phase 7 — Integrations Admin Panel**: ✅ Implemented — connection management, credential rotation, action log
- **Phase 8 — System Monitoring / Health Dashboard**: ✅ Implemented — see below
- **Phase 9 — Feature Flags**: ✅ Implemented — runtime config, controlled rollout, assignment management

---

### Jobs Console (Admin Phase 5)

The `/admin/jobs` page is a **PLATFORM_ADMIN-only operational console** for viewing, manually triggering, and safely retrying platform recovery jobs.

#### Key Concepts

| Concept | Description |
|---------|-------------|
| **JobRun** | A single execution record for a job (created on each manual run or retry) |
| **Manual Run** | Admin-triggered execution of a safe job type |
| **Retry** | Re-execution of a `FAILED` run — always creates a **new** `JobRun`, never mutates the original |
| **parentRunId** | Links a retry run to its original run, forming an immutable retry lineage |
| **triggerSource** | `SYSTEM`, `ADMIN_MANUAL`, or `ADMIN_RETRY` |

#### Job Types (Phase 5 — Safe Jobs Only)

| Job Type | Description | Risk Level |
|----------|-------------|------------|
| `CATALOG_SYNC` | Loyverse full catalog sync for a store | LOW |
| `CONNECTION_VALIDATE` | Read-only credential/status check for a connection | LOW |
| `CONNECTION_REFRESH_CHECK` | Safe token refresh via existing `refreshConnectionCredentials` | MEDIUM |
| `ORDER_RECOVERY_RETRY` | Re-send a failed POS order via `forwardOrderToPos` (idempotency preserved) | MEDIUM |
| `ORDER_RECONCILIATION_RETRY` | Batch retry of PENDING/FAILED POS orders for a store | MEDIUM |
| `ANALYTICS_REBUILD` | Rebuild store-scoped order aggregation snapshot | LOW |

All executors **wrap existing domain services** — no business logic is duplicated.

HIGH-risk job types (billing charge retry, destructive cleanup, credential overwrite, webhook mass replay) are **not implemented** and not exposed in Phase 5.

#### Routes

| Route | Description |
|-------|-------------|
| `/admin/jobs` | Job Run list — filter by type/status/tenant/store/provider/triggerSource, paginated |
| `/admin/jobs/[jobRunId]` | Job Run detail — context, sanitized input/result/error, retry lineage, related links |

#### Filters

Query parameters accepted by `/admin/jobs`:

| Param | Description |
|-------|-------------|
| `jobType` | Filter by job type |
| `status` | `QUEUED` / `RUNNING` / `SUCCEEDED` / `FAILED` / `CANCELLED` / `SKIPPED` |
| `tenantId` | Filter by tenant |
| `storeId` | Filter by store |
| `provider` | Filter by provider (`LOYVERSE`, `UBER_EATS`, `DOORDASH`) |
| `triggerSource` | `SYSTEM` / `ADMIN_MANUAL` / `ADMIN_RETRY` |
| `failedOnly` | `true` — show only FAILED runs |
| `from` / `to` | Date range (ISO 8601) |
| `page` | Pagination (default 1, page size 20) |

#### Status Lifecycle

```
QUEUED → RUNNING → SUCCEEDED
                 → FAILED
       → SKIPPED (when no action needed)
       → CANCELLED
```

Retry creates a new `JobRun` with `triggerSource = ADMIN_RETRY` and `parentRunId = originalRun.id`. The original FAILED run is **never modified** — it is immutable history.

#### Security

- All routes and API endpoints require `PLATFORM_ADMIN`
- Manual run and retry are **blocked during impersonation** — admin must exit impersonation first
- All `inputJson` / `resultJson` / `errorMessage` fields are passed through `sanitizeJsonValue` before display

#### Audit Events

| Event | When |
|-------|------|
| `JOB_MANUAL_RUN_REQUESTED` | Admin submits the manual run form |
| `JOB_RUN_CREATED` | `JobRun` record inserted |
| `JOB_RUN_STARTED` | Status transitions to `RUNNING` |
| `JOB_RUN_SUCCEEDED` | Status transitions to `SUCCEEDED` |
| `JOB_RUN_FAILED` | Status transitions to `FAILED` |
| `JOB_RUN_RETRIED` | Retry run created, linking back to original |

#### Technical Files

| File | Role |
|------|------|
| `prisma/schema.prisma` | `JobRun` model + `JobType`, `JobRunStatus`, `JobTriggerSource` enums |
| `types/admin-jobs.ts` | View model types (`AdminJobRunListItem`, `AdminJobRunDetail`, filter params) |
| `lib/admin/jobs/filters.ts` | Filter query-param parsing |
| `lib/admin/jobs/labels.ts` | Human-readable labels for job types, statuses, trigger sources |
| `lib/admin/jobs/guards.ts` | `canRetryJobRun`, `canManuallyRunJobType`, per-type risk config |
| `lib/admin/jobs/normalize.ts` | Prisma row → view model (with sanitization) |
| `services/admin/admin-job.service.ts` | Orchestration service — list, detail, manual run, retry, execute |
| `app/api/admin/jobs/run/route.ts` | `POST` manual run endpoint (PLATFORM_ADMIN, impersonation blocked) |
| `app/api/admin/jobs/[jobRunId]/retry/route.ts` | `POST` retry endpoint (PLATFORM_ADMIN, impersonation blocked) |
| `components/admin/jobs/` | UI components: table, filters, badges, manual run dialog, retry button, payload viewer |

### Phase 3 부분 완료 / 예정

Completed:
- Tenant / User / Store create + edit dialogs (API routes, service layer, audit trail)

Remaining:
- Integration force-reconnect / sync trigger
- Analytics: 차트 기반 트렌드 분석

---

### Integrations Admin Panel (Admin Phase 7)

The `/admin/integrations` section lets PLATFORM_ADMINs inspect and act on any store connection.

#### Routes

| Route | Description |
|-------|-------------|
| `/admin/integrations` | Platform-wide connection list — filter by status/provider, paginated |
| `/admin/integrations/[connectionId]` | Connection detail — edit status, rotate credentials, view action log |

#### Actions

| Action | HTTP | Description |
|--------|------|-------------|
| Status change | `PATCH /api/admin/integrations/[connectionId]/status` | Force a connection to `CONNECTED`, `DISCONNECTED`, `ERROR`, `REAUTH_REQUIRED`, or `NOT_CONNECTED` |
| Credential rotation | `POST /api/admin/integrations/[connectionId]/rotate-credential` | Deactivate current active credential and generate a placeholder for re-auth |

Both actions are blocked during active impersonation and emit audit events.

#### Technical Files

| File | Role |
|------|------|
| `services/admin/admin-integration.service.ts` | `getAdminConnectionDetail`, `updateAdminConnectionStatus`, `adminRotateCredential` |
| `app/api/admin/integrations/[connectionId]/status/route.ts` | `PATCH` status change endpoint |
| `app/api/admin/integrations/[connectionId]/rotate-credential/route.ts` | `POST` credential rotation endpoint |
| `components/admin/ConnectionCredentialTable.tsx` | Credential lifecycle table |
| `components/admin/ConnectionStatusChangeForm.tsx` | Inline status select + submit |
| `components/admin/RotateCredentialButton.tsx` | Credential rotation trigger button |

---

### Feature Flags Console (Admin Phase 9)

The `/admin/feature-flags` section provides runtime feature control, percentage rollout, and per-scope overrides without deployments.

#### Concepts

| Concept | Description |
|---------|-------------|
| **FeatureFlag** | A named toggle with a stable `key`, a `flagType` (BOOLEAN / STRING / INTEGER / JSON / VARIANT), global default values, and a lifecycle `status` (ACTIVE / INACTIVE / ARCHIVED) |
| **FeatureFlagAssignment** | A scoped override: a specific value applied when the evaluation context matches `scopeType` + `scopeKey` (e.g. a tenant, store, user, or percentage bucket) |
| **Evaluation** | At runtime `evaluateFlag(flagKey, context)` walks assignments ordered by priority. First match wins; falls back to flag default, then hard-coded default. |
| **Percentage rollout** | Assignments with `scopeType=PERCENTAGE` use a deterministic hash of `flagKey + userId/tenantId` to assign users to a bucket, enabling stable 0–100% gradual rollouts |

#### Scope Types

| Scope | Description |
|-------|-------------|
| `GLOBAL` | Applies to everyone regardless of context |
| `TENANT` | Matches a specific `tenantId` |
| `STORE` | Matches a specific `storeId` |
| `USER` | Matches a specific `userId` |
| `ROLE` | Matches a platform or store role string |
| `PORTAL` | Matches the portal name (`admin`, `backoffice`, `owner`, `customer`) |
| `PROVIDER` | Matches a connection provider (`loyverse`, `uber_eats`, `doordash`) |
| `ENVIRONMENT` | Matches an environment string (`production`, `staging`) |
| `PERCENTAGE` | Assigns a bucket percentage (0–100) using deterministic hashing |

#### Routes

| Route | Description |
|-------|-------------|
| `/admin/feature-flags` | Flag list — filter by status/search, stats cards, create new flag |
| `/admin/feature-flags/[flagKey]` | Flag detail — flag info, assignment table, status change, audit history |

#### API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/feature-flags` | List flags |
| `POST` | `/api/admin/feature-flags` | Create flag |
| `GET` | `/api/admin/feature-flags/[flagKey]` | Get flag detail |
| `PATCH` | `/api/admin/feature-flags/[flagKey]` | Update flag fields or change status |
| `POST` | `/api/admin/feature-flags/[flagKey]/assignments` | Add assignment |
| `PATCH` | `/api/admin/feature-flags/[flagKey]/assignments/[assignmentId]` | Toggle assignment active/inactive |
| `DELETE` | `/api/admin/feature-flags/[flagKey]/assignments/[assignmentId]` | Delete assignment |

#### Technical Files

| File | Role |
|------|------|
| `prisma/schema.prisma` | `FeatureFlag` + `FeatureFlagAssignment` models and enums |
| `prisma/seeds/feature-flags.ts` | Default flag seed (7 platform flags) |
| `types/feature-flags.ts` | View model types, input types, evaluation types |
| `lib/flags/evaluate.ts` | `evaluateFlag(flagKey, context)` — priority-ordered scope matching, percentage hashing |
| `lib/flags/defaults.ts` | `KNOWN_FLAGS` constants + hard-coded fallback defaults |
| `lib/flags/guards.ts` | Typed convenience helpers (`isCatalogSyncV2Enabled`, etc.) |
| `lib/flags/context.ts` | `buildFlagContextFromSession()` — builds evaluation context from auth session |
| `lib/flags/hashing.ts` | `hashToPercentage(key, seed)` — deterministic 0–100 bucket assignment |
| `lib/flags/labels.ts` | Human-readable labels for flag types, statuses, scope types |
| `services/admin/admin-feature-flag.service.ts` | CRUD + assignment management service |
| `app/api/admin/feature-flags/` | REST API routes |
| `components/admin/feature-flags/` | 8 UI components (table, create dialog, assignment dialog, status form, etc.) |

---

## Owner Console (Phase 1)

The **Owner Console** (`/owner`) is the portal for store owners and managers to manage their business. It is protected by the `OWNER`, `ADMIN`, and `MANAGER` membership roles.

### Owner Portal Structure

```
app/owner/
├── layout.tsx          # Auth guard + OwnerSidebar + WorkspaceSwitcher
├── page.tsx            # Redirects to /owner/dashboard
├── dashboard/          # /owner/dashboard — KPI cards + connection status + recent logs
├── store/              # /owner/store — Store Settings (OWNER/ADMIN only)
├── users/              # /owner/users — Users & Roles list (OWNER/ADMIN only)
├── connections/        # /owner/connections — POS/Delivery/Payment connection list
├── catalog/            # /owner/catalog — Catalog Source Settings per store
├── operations/         # /owner/operations — Operations Settings per store
├── billing/            # /owner/billing — Billing & Subscription (OWNER/ADMIN only)
├── reports/            # /owner/reports — Sales & operation reports
└── logs/               # /owner/logs — Recent 50 connection action log entries
```

### Owner Menu Roles

| Page | OWNER | ADMIN | MANAGER |
|------|:-----:|:-----:|:-------:|
| Dashboard | ✅ | ✅ | ✅ |
| Connections | ✅ | ✅ | ✅ |
| Catalog Source | ✅ | ✅ | ✅ |
| Operations | ✅ | ✅ | ✅ |
| Reports | ✅ | ✅ | ✅ |
| Logs | ✅ | ✅ | ✅ |
| Store Settings | ✅ | ✅ | ❌ |
| Users & Roles | ✅ | ✅ | ❌ |
| Billing | ✅ | ✅ | ❌ |

Guards are implemented via `lib/owner/auth-guard.ts`:
- `requireOwnerPortalAccess()` — OWNER, ADMIN, MANAGER
- `requireOwnerAdminAccess()` — OWNER, ADMIN only

### Store Settings (`/owner/store`)

Displays and manages per-store basic information:

| Field | Description |
|-------|-------------|
| Store Name | Display name of the store |
| Email | Contact email |
| Phone | Contact phone |
| Address | Store address |
| Timezone | Operating timezone |
| Currency | Store currency code |
| Tax Rate | Tax rate (%) stored in `store_settings.tax_rate` |
| Service Fee | Service fee rate (%) in `store_settings.service_fee_rate` |
| Pickup Interval | Minutes between pickup slots (`pickup_interval_minutes`) |
| Default Prep Time | Default preparation time in minutes (`default_prep_time_minutes`) |
| Logo | Logo URL for the store |

Backed by the `store_settings` table (one row per store, FK → `stores.id`).

### Catalog Source Settings (`/owner/catalog`)

Configure the catalog data source per store:

| Field | Description |
|-------|-------------|
| Source Type | `POS`, `LOCAL`, `MERGED`, `DELIVERY`, or `IMPORTED` |
| Source Connection | FK to `connections` table (optional) |
| Auto Sync | Enable automatic catalog synchronisation |
| Sync Interval | Minutes between auto-sync runs |

Backed by the `catalog_settings` table (one row per store).

### Operations Settings (`/owner/operations`)

Toggle and configure operational behaviour per store:

| Field | Description |
|-------|-------------|
| Store Open | Whether the store is accepting orders |
| Holiday Mode | Temporarily suspends new orders |
| Pickup Interval | Minutes between pickup time slots |
| Min Prep Time | Minimum preparation time in minutes |
| Max Orders / Slot | Maximum concurrent orders per time slot |
| Auto Accept Orders | Automatically confirm incoming orders |
| Auto Print POS | Send orders to POS printer automatically |
| Subscription Enabled | Enable subscription ordering channel |
| Online Order Enabled | Enable online ordering channel |

Backed by the `store_operation_settings` table (one row per store).

### Permission Structure (Owner / Manager / Staff)

```
OWNER membership role
└── Full access to all /owner pages
    └── Inherits all store permissions (orders, inventory, menu, billing, integrations)

ADMIN membership role
└── Full access to all /owner pages
    └── Inherits store permissions except billing

MANAGER membership role
└── Limited access: dashboard, connections, catalog, operations, reports, logs
    └── Cannot access: store settings, users management, billing

SUPERVISOR / STAFF store roles
└── No access to /owner portal (backoffice only)
```

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
- [x] Canonical order model (multi-channel: Uber Eats / DoorDash / Online / Subscription / POS)
- [x] POS forwarding + docket-print pipeline with submission status tracking
- [x] POS webhook/sync reconciliation (idempotent — no duplicate orders)
- [x] OrderChannelLink for SOURCE / FORWARDED / MIRROR channel tracking
- [x] OrderEvent immutable audit trail
- [x] InboundWebhookLog for raw webhook storage and signature-verification audit
- [x] Order HTTP API routes (list, status update, forward-to-POS)
- [x] Inbound order webhook routes (Uber Eats / DoorDash) with signature verification
- [x] Backoffice orders page — live order list with status transitions
- [x] Product availability control — `isSoldOut` per product, inventory management page, operations overview
- [x] **Admin Console MVP (read-only)** — dashboard KPIs, tenant/user/store list+detail, search/filter/pagination, PLATFORM_ADMIN guard
- [x] **Admin Console Phase 2** — write actions (status change), integrations list, webhook log viewer, connection action log viewer, billing/subscription overview, full sidebar navigation
- [x] **Admin User Impersonation** — PLATFORM_ADMIN can view the app as any active non-admin user; sticky amber banner on all pages; full audit trail; actor/effective-user session separation
- [x] **Admin Console Phase 4 — Logs Console** — unified read-only log console for AuditLog / ConnectionActionLog / InboundWebhookLog / OrderEvent; multi-filter support; sensitive-data masking; related entity deep links
- [ ] Admin Console Phase 3 — integration force-reconnect/sync, analytics charts (create/edit already done)
- [x] **Admin Console Phase 5 — Jobs Panel** — background task management, manual run, retry with immutable lineage, safe job types only
- [x] **Admin Console Phase 6 — Billing Panel** — plan CRUD (limits & features), tenant subscription management (plan change, trial extend, status change), billing account editor, billing records & subscription event history, MRR estimate dashboard
- [x] **Admin Console Phase 7 — Integrations Admin Panel** — connection detail page, status change, credential rotation, action log viewer
- [x] **Admin Console Phase 9 — Feature Flags / Runtime Config** — flag lifecycle management, scoped assignments, percentage rollout, evaluation engine, audit trail
- [x] **Owner Console Phase 1** — dashboard (KPI + connection status + logs), store settings, users & roles, connections, catalog source settings, operations settings, billing, reports, logs pages; OWNER/ADMIN/MANAGER role guards; Prisma models for `store_settings`, `catalog_settings`, `store_operation_settings`
- [ ] POS adapter implementations (Posbank, OKPOS)
- [ ] Delivery platform adapters (Baemin, Coupang Eats)
- [ ] Payment gateway integration (Toss Payments)
- [ ] Real-time order notifications (WebSocket / SSE)
- [ ] Sales analytics charts (canonical order aggregation)
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

## Order Architecture

### Overview — Canonical Order Model

Beyond uses a **canonical order model**: every real customer purchase is stored as exactly **one `Order` row** in the database, regardless of which channel the order came from or how many systems it was forwarded to.

```
┌──────────────────────────────────────────────────────────────────────┐
│  External channels (inbound)           │  Execution targets (outbound) │
│  Uber Eats / DoorDash / Online         │  POS (docket print)           │
│  Subscription / POS-direct             │                               │
└───────────────────┬───────────────────────────────┬──────────────────┘
                    │                               │
                    ▼                               ▼
        ┌───────────────────────┐       ┌─────────────────────┐
        │   OrderChannelLink    │       │   OrderChannelLink  │
        │   role = SOURCE       │       │   role = FORWARDED  │
        │   direction = INBOUND │       │   direction = OUTBOUND│
        └───────────┬───────────┘       └──────────┬──────────┘
                    │                              │
                    └──────────────┬───────────────┘
                                   ▼
                         ┌──────────────────┐
                         │   Order (canonical)│
                         │   1 row per purchase│
                         │   sourceChannel    │
                         │   status           │
                         │   totalAmount      │
                         └────────┬───────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
               OrderItem    OrderEvent    InboundWebhookLog
             (line items)  (audit trail)  (raw webhook log)
```

### Key Design Principles

| Principle | Description |
|-----------|-------------|
| **One order per purchase** | One real purchase = one `Order` row, regardless of channel path. |
| **source_channel ≠ forwarding** | `orders.sourceChannel` records where the order originated. `OrderChannelLink` records every channel it touched (source, forwarded-to, mirrored). |
| **Internal ID / external ID strictly separated** | `orders.id` is an internal UUID only. All external refs (`uberOrderId`, `posOrderRef`, etc.) are stored in separate fields or `OrderChannelLink.externalOrderRef`. |
| **Raw payload always stored** | Every inbound order event stores its raw payload in `orders.rawSourcePayload` and `InboundWebhookLog.requestBody`. |
| **POS is dual-role** | POS can be the *source* of an order (staff inputs directly), or a *forwarding target* (Beyond sends a delivery order to POS for docket printing). |
| **Reconciliation before creation** | On every POS webhook/sync, the service checks for an existing `FORWARDED` link before creating a new order. |

---

### Database Tables — Order Domain

| Table | Purpose |
|-------|---------|
| `orders` | Canonical order record (one per real purchase). |
| `order_items` | Line items within a canonical order. |
| `order_item_modifiers` | Modifier/option selections within a line item. |
| `order_channel_links` | Per-channel connection records (SOURCE / FORWARDED / MIRROR). |
| `order_events` | Immutable audit trail for order lifecycle events. |
| `inbound_webhook_logs` | Raw log of every inbound webhook call from external channels. |
| `legacy_orders` | *(deprecated)* Previous simple order table (not used for new orders). |
| `legacy_order_items` | *(deprecated)* Previous order items table. |
| `legacy_payments` | *(deprecated)* Previous payment table. |

---

### Order Enums

| Enum | Values |
|------|--------|
| `OrderSourceChannel` | `POS`, `UBER_EATS`, `DOORDASH`, `ONLINE`, `SUBSCRIPTION`, `MANUAL`, `UNKNOWN` |
| `OrderChannelType` | `POS`, `UBER_EATS`, `DOORDASH`, `ONLINE`, `SUBSCRIPTION` |
| `OrderChannelRole` | `SOURCE`, `FORWARDED`, `MIRROR` |
| `OrderLinkDirection` | `INBOUND`, `OUTBOUND` |
| `OrderStatus` | `RECEIVED`, `ACCEPTED`, `IN_PROGRESS`, `READY`, `COMPLETED`, `CANCELLED`, `FAILED` |
| `PosSubmissionStatus` | `NOT_REQUIRED`, `PENDING`, `SENT`, `ACCEPTED`, `FAILED`, `SKIPPED` |
| `OrderEventType` | `ORDER_RECEIVED`, `ORDER_CREATED`, `ORDER_UPDATED`, `ORDER_STATUS_CHANGED`, `POS_FORWARD_REQUESTED`, `POS_FORWARD_SENT`, `POS_FORWARD_ACCEPTED`, `POS_FORWARD_FAILED`, `POS_RECONCILED`, `ORDER_CANCELLED`, `RAW_WEBHOOK_RECEIVED`, `RAW_SYNC_RECEIVED` |

---

### POS Order Cases

Beyond distinguishes two fundamentally different POS order scenarios:

#### Case 1 — POS is the source

Staff inputs an order directly on the POS terminal. The POS sends a webhook to Beyond.

```
POS → webhook → reconcilePosWebhookOrSync()
  → No FORWARDED link found
  → No posOrderRef match found
  → Create new Order { sourceChannel: "POS" }
  → Create OrderChannelLink { role: SOURCE, direction: INBOUND }
```

#### Case 2 — External order forwarded to POS

An Uber Eats or DoorDash order arrives. Beyond creates the canonical order, then forwards it to POS so a docket can be printed.

```
Uber Eats → webhook → createCanonicalOrderFromInbound()
  → Create Order { sourceChannel: "UBER_EATS" }
  → Create OrderChannelLink { role: SOURCE, direction: INBOUND }

Beyond → forwardOrderToPos()
  → Order { posSubmissionStatus: PENDING }
  → Create OrderChannelLink { role: FORWARDED, direction: OUTBOUND, createdByBeyond: true }

POS → webhook (echo) → reconcilePosWebhookOrSync()
  → FORWARDED link found → update existing order (NOT created again)
  → Create/update OrderChannelLink { role: MIRROR, direction: INBOUND }
  → Emit POS_RECONCILED event
```

---

### Idempotency / Deduplication

Every inbound order with an external ref gets a `canonicalOrderKey`:

```
canonicalOrderKey = "<OrderChannelType>:<storeId>:<externalOrderRef>"
# e.g. "UBER_EATS:store-uuid-001:uber-order-XYZ"
```

A **partial unique index** (`WHERE canonical_order_key IS NOT NULL`) enforces uniqueness at the database level, allowing `null` for orders without external refs.

`createCanonicalOrderFromInbound()` checks the key before inserting — if it already exists, the existing order is returned and `created: false` is reported. No duplicate is created.

---

### POS Reconciliation Lookup Order

`reconcilePosWebhookOrSync()` always checks in this order before creating:

1. **FORWARDED link lookup** — find `OrderChannelLink` where `role=FORWARDED`, `direction=OUTBOUND`, `connectionId=<posConnectionId>`, `externalOrderRef=<posOrderRef>`. If found → update existing order.
2. **posOrderRef direct match** — find `Order` where `posConnectionId=<conn>` and `posOrderRef=<ref>`. If found → update.
3. **canonicalOrderKey idempotency** — check `POS:<storeId>:<posOrderRef>`. If found → return existing order.
4. **Create new POS-origin order** — only if all lookups fail.

---

### Order Service API (`services/order.service.ts`)

| Function | Description |
|----------|-------------|
| `createCanonicalOrderFromInbound(input)` | Create a canonical order from an inbound channel event. Idempotent via `canonicalOrderKey`. |
| `forwardOrderToPos(input)` | Mark an order as forwarded to POS, create OUTBOUND channel link. |
| `recordPosForwardResponse(input)` | Record POS acceptance or rejection of a forwarded order. |
| `reconcilePosWebhookOrSync(input)` | Reconcile a POS webhook/sync event — update or create. |
| `listOrders(storeId, opts)` | List canonical orders for a store, newest-first, with items. Supports filtering by status, channel, date range. |
| `getOrderById(orderId)` | Fetch a single order by ID including items and channel links. |
| `updateOrderStatus(orderId, status)` | Transition order status, record event. |
| `logInboundWebhook(params)` | Write a raw `InboundWebhookLog` at the start of webhook handling. |
| `markWebhookLogProcessed(logId, status)` | Mark a webhook log as processed (or failed). |

---

### Order HTTP API Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/orders?storeId=<id>` | List orders for a store (newest-first). Query params: `status`, `sourceChannel`, `from`, `to`, `limit`, `offset`. |
| `PATCH` | `/api/orders/[orderId]/status` | Transition an order to a new status. Body: `{ status: OrderStatus }`. |
| `POST` | `/api/orders/[orderId]/forward-to-pos` | Mark an order as forwarded to POS. Body: `{ posConnectionId, requestPayload? }`. |
| `POST` | `/api/webhooks/orders/[provider]?storeId=<id>` | Inbound order webhook from delivery platforms. Supported `provider` slugs: `uber-eats`, `doordash`. |

#### Webhook Route Details

The `/api/webhooks/orders/[provider]` route:

1. **Reads the raw request body** before JSON parsing (required for HMAC signature verification).
2. **Verifies the signature** if `UBER_EATS_WEBHOOK_SECRET` / `DOORDASH_WEBHOOK_SECRET` env vars are set. If the secret is not configured, the signature check is skipped (useful for local dev). If the secret is configured and the signature does not match, the request is rejected with HTTP 401.
3. **Logs the raw webhook** to `InboundWebhookLog` immediately (before any processing).
4. **Looks up the active `Connection`** for the store and channel. If no connected integration is found, the webhook is logged as `SKIPPED` and HTTP 200 is returned (prevents platform retries for mis-configured stores).
5. **Normalizes the payload** into `CreateCanonicalOrderInput` and calls `createCanonicalOrderFromInbound()`. Deduplication is enforced by `canonicalOrderKey`.
6. **Marks the webhook log** as `PROCESSED` or `FAILED`.

Environment variables for webhook signature verification:

```
UBER_EATS_WEBHOOK_SECRET=<your-uber-eats-signing-secret>
DOORDASH_WEBHOOK_SECRET=<your-doordash-signing-secret>
```

---

### Sales Analytics

The canonical `orders` table supports multi-channel sales aggregation directly:

```sql
-- Revenue by channel
SELECT source_channel, SUM(total_amount) AS revenue, COUNT(*) AS order_count
FROM orders
WHERE tenant_id = $1
  AND store_id  = $2
  AND status    = 'COMPLETED'
  AND ordered_at BETWEEN $3 AND $4
GROUP BY source_channel;

-- Revenue by day
SELECT DATE_TRUNC('day', ordered_at) AS day, SUM(total_amount) AS revenue
FROM orders
WHERE tenant_id = $1 AND store_id = $2 AND status = 'COMPLETED'
GROUP BY 1 ORDER BY 1;
```

All amounts are stored as integer minor units (e.g. NZD cents). `currencyCode` is per-order. Never aggregate across different currencies.

---



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


---

## Store-Level External Channel Integration

### Overview

매장 단위 외부 채널 연동 시스템은 Loyverse POS, Uber Eats, DoorDash 등의 외부 플랫폼을 **매장 단위**로 연결하는 end-to-end 인증/자격증명 관리 구조를 제공합니다.

---

### Architecture

```
app/owner/stores/[storeId]/integrations/   # Store-level integration UI
app/api/integrations/
  connect/route.ts         # POST — initiate OAuth flow
  callback/[provider]/route.ts  # GET  — OAuth callback handler
  disconnect/route.ts      # POST — soft-disconnect provider
services/integration.service.ts  # Full connection lifecycle
adapters/integrations/
  base.ts                  # ProviderAdapter interface + registry
  loyverse.adapter.ts      # Loyverse OAuth2 adapter
  uber-eats.adapter.ts     # Uber Eats OAuth2 adapter
  doordash.adapter.ts      # DoorDash OAuth2 + JWT adapter
lib/integrations/crypto.ts # AES-256-GCM encrypt/decryptJson
domains/integration/types.ts  # Shared domain types
```

---

### Database Schema — Integrations Layer

#### New Enums

| Enum | Values |
|------|--------|
| `ConnectionStatus` | `NOT_CONNECTED`, `CONNECTING`, `CONNECTED`, `ERROR`, `REAUTH_REQUIRED`, `DISCONNECTED` |
| `ProviderEnvironment` | `SANDBOX`, `PRODUCTION` |
| `AuthScheme` | `OAUTH2`, `JWT_BEARER`, `API_KEY`, `BASIC`, `CUSTOM` |
| `CredentialType` | `OAUTH_TOKEN`, `CLIENT_CREDENTIAL`, `JWT_SIGNING_KEY`, `JWT_ASSERTION`, `API_KEY`, `WEBHOOK_SECRET`, `CUSTOM_SECRET` |
| `ConnectionActionType` | `CONNECT_START`, `CONNECT_CALLBACK`, `CONNECT_SUCCESS`, `CONNECT_FAILURE`, `REFRESH_SUCCESS`, `REFRESH_FAILURE`, `DISCONNECT`, `REAUTHORIZE`, `STORE_MAPPING_UPDATE`, `SYNC_TEST` |

#### Models

| Model | Purpose |
|-------|---------|
| `ProviderAppCredential` | Tenant-level or platform-global provider app settings (client_id, encrypted client_secret, scopes, key_id, developer_id). Separate from per-store credentials. |
| `Connection` | Per-store connection instance (status, auth scheme, external merchant/store IDs, last auth validation, reauth timestamps). |
| `ConnectionCredential` | Lifecycle-aware encrypted credential storage. Supports multiple active credentials per connection (e.g. `JWT_SIGNING_KEY` + `WEBHOOK_SECRET` for DoorDash). |
| `ConnectionOAuthState` | CSRF state for OAuth flows (expires, consumed once). |
| `ConnectionActionLog` | Per-connection audit trail for UI display and debugging (CONNECT_START → CONNECT_SUCCESS, REFRESH, DISCONNECT…). |

#### Connection Model Fields

```
Connection
  storeId, tenantId, type (POS/DELIVERY/PAYMENT), provider
  status: NOT_CONNECTED → CONNECTING → CONNECTED → ERROR/REAUTH_REQUIRED → DISCONNECTED
  authScheme: OAUTH2 / JWT_BEARER / API_KEY / …
  appCredentialId: → ProviderAppCredential
  externalMerchantId, externalStoreId, externalStoreName, externalLocationId
  lastConnectedAt, lastAuthValidatedAt, reauthRequiredAt, disconnectedAt
  lastSyncAt, lastSyncStatus, lastErrorCode, lastErrorMessage
  capabilitiesJson, metadataJson
```

#### ConnectionCredential Model Fields

```
ConnectionCredential
  connectionId, tenantId, storeId
  credentialType: OAUTH_TOKEN / JWT_SIGNING_KEY / API_KEY / WEBHOOK_SECRET / …
  authScheme: OAUTH2 / JWT_BEARER / API_KEY / …
  configEncrypted: AES-256-GCM encrypted JSON payload
  tokenReferenceHash: SHA-256 fingerprint of access/refresh token (dedup)
  issuedAt, expiresAt, refreshAfter
  canRefresh, requiresReauth, isActive
  lastRefreshAt, lastRefreshStatus, lastRefreshError
```

---

### Encryption

All credential payloads are encrypted at rest using **AES-256-GCM** before being written to `ConnectionCredential.configEncrypted`.

- Module: `lib/integrations/crypto.ts`
- Key: `INTEGRATIONS_ENCRYPTION_KEY` (env var — 64-char hex = 32 bytes)
- Format: `<iv_b64url>:<authTag_b64url>:<ciphertext_b64url>`
- Never logs plaintext tokens

Generate a key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### Provider Adapters

Each provider implements the `ProviderAdapter` interface in `adapters/integrations/`:

```typescript
interface ProviderAdapter {
  provider: ConnectionProvider
  supportsPkce: boolean
  canRefreshCredentials: boolean
  buildAuthorizationUrl(input): AuthorizationStartResult
  handleOAuthCallback(input): Promise<OAuthCallbackResult>
  listAvailableStores?(input): Promise<ProviderStoreCandidate[]>
  refreshCredentials?(input): Promise<CredentialRefreshResult | undefined>
}
```

#### Provider Differences

| Provider | Auth Scheme | Refresh | Notes |
|----------|-------------|---------|-------|
| **Loyverse** | OAuth2 | ✅ refresh_token | Standard code flow; merchant info fetched at callback |
| **Uber Eats** | OAuth2 | ✅ refresh_token | `eats.store` + `eats.order` scopes |
| **DoorDash** | OAuth2 + JWT Bearer | ✅ refresh_token | OAuth for merchant auth; `JWT_SIGNING_KEY` credential stored for Drive API calls |

#### DoorDash Dual-Auth Model

DoorDash supports two concurrent auth strategies:
1. **OAuth token** — merchant authorization, stored as `OAUTH_TOKEN` credential
2. **JWT signing key** — `developer_id` + `key_id` + signing secret stored as `JWT_SIGNING_KEY` credential; short-lived HS256 assertions minted at request time

If a `ProviderAppCredential` has `developerId` + `keyId` + `clientSecret` set, the DoorDash adapter automatically stores both credentials after OAuth callback.

---

### OAuth Flow

```
User clicks "Connect" in UI
  → POST /api/integrations/connect { storeId, provider, connectionType }
  → Creates ConnectionOAuthState (CSRF state, 10-min TTL)
  → Returns { redirectUrl } (provider auth page)
  → Browser redirects to provider

User authorizes on provider
  → Provider redirects to GET /api/integrations/callback/[provider]?code=...&state=...
  → State is validated + consumed
  → Token exchange via adapter.handleOAuthCallback()
  → Connection upserted (CONNECTED status)
  → Credentials encrypted + stored
  → Action logged (AuditLog + ConnectionActionLog)
  → Browser redirected to /owner/stores/[storeId]/integrations?connected=1
```

---

### API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/integrations/connect` | INTEGRATIONS | Start OAuth flow for a provider |
| `GET` | `/api/integrations/callback/[provider]` | Public | OAuth callback (Loyverse / uber-eats / doordash) |
| `POST` | `/api/integrations/disconnect` | INTEGRATIONS | Soft-disconnect a provider |

---

### UI Routes

| Path | Description |
|------|-------------|
| `/owner/stores/[storeId]/integrations` | Store-level integration dashboard — shows connection status per provider, connect/disconnect buttons, recent action log |
| `/owner/integrations` | Legacy tenant-level integrations page (redirects to store picker) |

---

### Permission Model

| Action | Required Permission | Notes |
|--------|--------------------|----|
| View integration status | `INTEGRATIONS` | Store-level check via `requireStorePermission` |
| Connect / reconnect | `INTEGRATIONS` | Only OWNER or MANAGER roles hold this permission |
| Disconnect | `INTEGRATIONS` | Same |
| Refresh credentials | Server-side only | Background job; no direct UI trigger |

---

### ConnectionActionLog vs AuditLog

| Log | Purpose |
|-----|---------|
| `ConnectionActionLog` | Integration-specific summary log for UI display (provider, actionType, status, errorCode). Shows in store integrations page. |
| `AuditLog` | Tenant-wide general audit trail (actor, action, targetType, targetId). Also written for important integration events. |

Important integration events write **both** logs.

---

### Credential Lifecycle

```
New token           isActive=true
Token refresh       old row → isActive=false, rotatedAt=now; new row created
Disconnect          all active credentials → isActive=false, rotatedAt=now
Re-connect          new credentials created (update existing Connection row)
```

The `tokenReferenceHash` (SHA-256 of token prefix) prevents duplicate inserts when the same token is refreshed idempotently.

---

### Environment Variables

```bash
# AES-256-GCM key for encrypting credentials at rest (required)
INTEGRATIONS_ENCRYPTION_KEY="<64-char-hex>"

# Required for OAuth redirect URI construction
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

Provider-specific client IDs and secrets are stored in `ProviderAppCredential` rows in the database (not env vars), encrypted via `configEncrypted`.
