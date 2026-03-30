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
│   ├── api/auth/logout/        # Logout API route
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
│   └── store.service.ts
│
├── lib/
│   ├── auth/
│   │   ├── constants.ts        # Roles, permissions, static role→permission map
│   │   ├── context.ts          # UserAuthContext builder (DB-backed)
│   │   ├── permissions.ts      # requireAuth / requirePermission helpers
│   │   ├── redirect.ts         # Post-login redirect logic
│   │   └── session.ts          # JWT create / verify / cookie helpers
│   ├── prisma.ts               # Prisma client singleton
│   └── utils.ts                # Shared utilities
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
- [ ] POS adapter implementations (Posbank, OKPOS)
- [ ] Delivery platform adapters (Baemin, Coupang Eats)
- [ ] Payment gateway integration (Toss Payments)
- [ ] Real-time order notifications (WebSocket / SSE)
- [ ] Sales analytics charts
- [ ] Subscription billing engine

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
