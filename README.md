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

| Role | Permissions |
|------|-------------|
| `CUSTOMER` | `CUSTOMER_APP` |
| `STAFF` | `ORDERS`, `OPERATIONS`, `INVENTORY`, `MENU_VIEW` |
| `SUPERVISOR` | STAFF + `REPORTS`, `CATEGORY_MANAGE` |
| `MANAGER` | SUPERVISOR + `MENU_MANAGE`, `MODIFIER_MANAGE` |
| `OWNER` | MANAGER + `STAFF_MANAGE`, `STORE_SETTINGS`, `INTEGRATIONS`, `BILLING` |
| `ADMIN` | `PLATFORM_ADMIN` (full platform access) |

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
