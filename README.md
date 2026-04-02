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
- **Customer Order UI** — the public ordering portal reads only the internal catalog tables. No provider-specific fields or sync metadata are ever exposed to customer-facing code.

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
| [doc/roadmap.md](./doc/roadmap.md) | Development roadmap — completed, in-progress, and planned items; future Owner Console phases |
| [doc/admin-console.md](./doc/admin-console.md) | Admin Console — routes, write actions, impersonation, logs, jobs, billing, feature flags |
| [doc/owner-console.md](./doc/owner-console.md) | Owner Console — dashboard, store settings, staff, catalog, reports & analytics, customer & subscription management (Phase 5) |
| [doc/architecture.md](./doc/architecture.md) | Architecture — multi-tenant model, order model, catalog layers, channel integrations, customer order UI |
| [doc/troubleshooting.md](./doc/troubleshooting.md) | Troubleshooting common issues (sync, modifiers, order forwarding) |
