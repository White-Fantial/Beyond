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
| Runtime | Node.js 20+ |

---

## Project Structure

```
beyond/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Auth route group (no dashboard layout)
│   │   └── login/page.tsx
│   ├── (dashboard)/            # Dashboard route group (sidebar + header)
│   │   ├── layout.tsx
│   │   └── dashboard/page.tsx
│   ├── globals.css
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Landing page
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx
│   └── ui/
│       ├── Button.tsx
│       └── Card.tsx
│
├── domains/                    # Domain types (DDD-style)
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
│   ├── prisma.ts               # Prisma client singleton
│   └── utils.ts                # Shared utilities
│
├── config/index.ts             # App-wide configuration
├── types/index.ts              # Shared TypeScript types
└── prisma/
    └── schema.prisma           # Database schema
```

---

## Design Principles

- **Domain-Driven Structure** — each business domain (order, catalog, payment…) owns its types and logic.
- **Adapter Pattern** — POS, delivery, and payment integrations are isolated behind adapter interfaces, making it easy to add new providers without touching core logic.
- **Multi-Tenancy** — every resource is scoped to a `Tenant`, enabling multiple businesses on the same deployment.
- **Server Components by default** — client components (`"use client"`) are used only where interactivity is required (Sidebar, form inputs).

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
# Edit .env and set DATABASE_URL

# 3. Generate Prisma client
npm run prisma:generate

# 4. Run database migrations
npm run prisma:migrate

# 5. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the landing page.  
Navigate to [http://localhost:3000/dashboard](http://localhost:3000/dashboard) for the operations dashboard.

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
| `npm run prisma:studio` | Open Prisma Studio |

---

## Roadmap

- [ ] Authentication (NextAuth.js / JWT)
- [ ] POS adapter implementations (Posbank, OKPOS)
- [ ] Delivery platform adapters (Baemin, Coupang Eats)
- [ ] Payment gateway integration (Toss Payments)
- [ ] Real-time order notifications (WebSocket / SSE)
- [ ] Sales analytics charts
- [ ] Multi-store management
- [ ] Subscription billing engine

---

© 2024 Beyond. All rights reserved.
