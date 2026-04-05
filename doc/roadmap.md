# Beyond — Roadmap

## Completed

### Core Foundation

- [x] Project scaffolding (Next.js 14, Prisma, Tailwind)
- [x] Domain types & adapter interfaces
- [x] Database schema (multi-tenant, RBAC)
- [x] JWT session management
- [x] Role & permission system (6 roles, 14 permissions)
- [x] Multi-portal routing & layouts (Customer, Backoffice, Owner, Admin)
- [x] Edge middleware with role-based route protection
- [x] Login page with server action & `LoginForm` client component
- [x] Vitest test suite (catalog service, sync, parsers, foundation integrity)

### Catalog & Orders

- [x] Loyverse POS adapter (categories, items, modifier groups) with `modifier_ids` mirroring
- [x] Full catalog sync service (raw mirror tables → internal catalog → channel mappings)
- [x] Catalog API routes (sync, categories, products, modifier-groups)
- [x] Backoffice catalog pages (categories, products, modifiers) — operational UX
- [x] Channel entity mapping for outbound ID resolution
- [x] Canonical order model (multi-channel: Uber Eats / DoorDash / Online / Subscription / POS)
- [x] POS forwarding + docket-print pipeline with submission status tracking
- [x] POS webhook/sync reconciliation (idempotent — no duplicate orders)
- [x] OrderChannelLink for SOURCE / FORWARDED / MIRROR channel tracking
- [x] OrderEvent immutable audit trail
- [x] InboundWebhookLog for raw webhook storage and signature-verification audit
- [x] Order HTTP API routes (list, status update, forward-to-POS)
- [x] Inbound order webhook routes (Uber Eats / DoorDash) with signature verification
- [x] Product availability control — `isSoldOut` per product, inventory management page, operations overview

### Platform Infrastructure

- [x] **Real-Time Notifications — SSE Infrastructure** — in-process channel registry at `lib/sse/stream-manager.ts`; three SSE endpoints: backoffice Kanban (`/api/sse/store/[storeId]/orders`), owner notification bell (`/api/sse/owner/notifications`), storefront confirmation (`/api/sse/store/[storeSlug]/orders/[orderId]`); SSE-first with polling fallback on all consumers; 11 unit tests
- [x] **Subscription Billing Engine** — Stripe adapter at `adapters/billing/stripe.adapter.ts` fully implements `BillingProviderAdapter`; billing scheduler with 3-day lookahead window; Stripe webhook handler (`invoice.paid`, `invoice.payment_failed`, `subscription.updated`, `subscription.deleted`, all idempotent); payment method management UI at `/owner/billing/payment-methods`; 15 unit tests

### Integrations & Adapters

- [x] Loyverse integration adapter — categories, items, modifier groups, catalog sync
- [x] **Uber Eats Adapter** — OAuth 2.0 merchant authorization flow; `UBER_EATS` in `ConnectionProvider` enum; `adapters/integrations/uber-eats.adapter.ts`
- [x] **DoorDash Adapter** — OAuth 2.0 + JWT signing key (Drive API); `DOORDASH` in `ConnectionProvider` enum; `adapters/integrations/doordash.adapter.ts`
- [x] **Stripe Billing Adapter** — `adapters/billing/stripe.adapter.ts` implementing `BillingProviderAdapter`; `POST /api/webhooks/billing/stripe` handler; payment method management

### Backoffice Portal

- [x] **Backoffice Phase 1 — Live Dashboard & Operational Reports** — live KPI cards, channel breakdown, active orders list at `/backoffice/store/[storeId]/dashboard`; full operational report at `/backoffice/store/[storeId]/reports` (daily series, channel breakdown, status funnel, top products, peak-hour heatmap); 9 UI components; 34 unit tests
- [x] **Backoffice Phase 2 — Live Order Management** — 4-column Kanban board (New → Accepted → In Preparation → Ready) with per-order actions; Order Detail Drawer; Kitchen Display mode at `/backoffice/store/[storeId]/orders/kitchen` (full-screen, tablet-optimised, 15s auto-refresh); new-order toast badge; SSE-first push; 17 unit tests
- [x] **Backoffice Phase 3 — Catalog & Inventory Management** — sold-out / visibility toggles per product; bulk restore availability; category display-order reordering; modifier-option sold-out control; `BackofficeCatalogClient` at `/backoffice/store/[storeId]/catalog`; service: `services/backoffice/backoffice-catalog.service.ts`; API routes under `/api/backoffice/[storeId]/catalog/`

### Public Storefront

- [x] **Storefront Phase 1 — Menu Browsing & Cart** — public catalog at `/store/[storeSlug]`; cart with `sessionStorage` persistence; `CartProvider` context
- [x] **Storefront Phase 2 — Checkout & Order Placement** — full checkout page at `/store/[storeSlug]/checkout` (contact form, pickup-time grid, order notes); `POST /api/store/[storeSlug]/orders` creates a canonical ONLINE order; confirmation page with SSE-first status polling; 13 unit tests
- [x] **Storefront Phase 3 — Subscription Enrollment Flow** — 3-step enrollment flow (`SubscriptionEnrollmentFlow`) at `/store/[storeSlug]/subscriptions`; `POST /api/store/[storeSlug]/subscriptions` guest enrollment; confirmation page with account CTA; service functions `getSubscriptionPlansForStore`, `enrollGuestSubscription`

### Customer Portal

- [x] **Customer Portal Phase 1** — order history (`/app/orders`, `/app/orders/[orderId]`), subscription management (`/app/subscriptions`) with pause/resume/cancel/next-date, account settings (`/app/account`) with profile edit and password change; 10 API routes; 7 UI components; 35 unit tests
- [x] **Customer Portal Phase 2 — Notifications & Address Management** — in-app notification bell with unread badge; notifications page at `/app/notifications` (All / Unread tabs, mark-as-read, mark-all-read); address book at `/app/addresses` (add/edit/delete/set-default); `CustomerAddress` and `CustomerNotification` Prisma models; 28 unit tests

### Owner Console

- [x] **Owner Console Phase 1** — dashboard (KPI + connection status + logs), store settings, users & roles, connections, catalog source settings, operations settings, billing, reports, logs pages; OWNER/ADMIN/MANAGER role guards
- [x] **Owner Console Phase 2** — store-context portal (`/owner/stores/[storeId]/*`); store dashboard, store settings, staff management, channel connection cards, subscription summary; 8 write API routes; 12 AuditLog event types; cross-tenant access enforcement
- [x] **Owner Console Phase 3 — Owner Dashboard** — tenant-scoped multi-store overview at `/owner`; 7 KPI metric cards, Store Summary table, Alerts panel
- [x] **Owner Console Phase 4 — Reports & Analytics** — tenant-level and store-level reports; KPI cards, revenue trend, channel breakdown, store comparison, top products, subscription summary, rule-based insights; URL-persisted filters with preset ranges; 13 UI components; 3 service files; 3 test files
- [x] **Owner Console Phase 5 — Customer & Subscription Management** — customer list (`/owner/customers`) with KPI strip, search/filter/sort/pagination; customer detail with Overview, Orders, Subscriptions, Notes tabs; subscription lifecycle actions with state-machine validation; cross-tenant access guard; 10 API routes; 44 unit tests
- [x] **Owner Console Phase 6 — Billing Deep Dive** — billing overview at `/owner/billing`; invoice list/detail with line items and payment timeline; plan catalog with downgrade-blocking plan change flow; 6 new schema models; 7 API routes; 15 unit tests
- [x] **Owner Console Phase 7 — Team Activity & Audit** — activity hub at `/owner/activity`; tabbed view: Activity Feed, Role Changes, Settings Changes, Integration Changes; 4 service functions; 4 API routes; 25 unit tests
- [x] **Owner Console Phase 8 — Automation & Notifications** — alert rule builder (7 metric types); notification centre at `/owner/notifications`; `NotificationBell` with live unread badge; alert rules management at `/owner/alert-rules`; `AlertRule` + `Notification` Prisma models; 4 services; 7 API routes; 45 unit tests
- [x] **Owner Console Phase 9 — Advanced Analytics & Forecasting** — order volume heatmap (weekday × hour); linear-regression revenue forecast with confidence interval; per-store production estimates; churn risk signals (HIGH/MEDIUM/LOW); 4 service functions; 4 API routes; 6 UI components; 36 unit tests

### Admin Console

- [x] **Admin Console MVP (read-only)** — dashboard KPIs, tenant/user/store list+detail, search/filter/pagination, PLATFORM_ADMIN guard
- [x] **Admin Console Phase 2** — write actions (status change), integrations list, webhook log viewer, connection action log viewer, billing/subscription overview, full sidebar navigation
- [x] **Admin User Impersonation** — PLATFORM_ADMIN can view the app as any active non-admin user; sticky amber banner; full audit trail; actor/effective-user session separation
- [x] **Admin Console Phase 3 — Analytics & Integration Management** — integration force-reconnect/sync/validate actions; analytics charts page at `/admin/analytics` with 7 UI components; 8 analytics service functions
- [x] **Admin Console Phase 4 — Logs Console** — unified read-only log console for AuditLog / ConnectionActionLog / InboundWebhookLog / OrderEvent; multi-filter support; sensitive-data masking; related entity deep links
- [x] **Admin Console Phase 5 — Jobs Panel** — background task management, manual run, retry with immutable lineage, safe job types only
- [x] **Admin Console Phase 6 — Billing Panel** — plan CRUD (limits & features), tenant subscription management (plan change, trial extend, status change), billing account editor, MRR estimate dashboard
- [x] **Admin Console Phase 7 — Integrations Admin Panel** — connection detail page, status change, credential rotation, action log viewer
- [x] **Admin Console Phase 8 — System Monitoring** — real-time platform health dashboard at `/admin/system`; `admin-system`, `admin-health`, `admin-metrics`, `admin-incident` services; lib helpers in `lib/admin/system/`; 9 UI components
- [x] **Admin Console Phase 9 — Feature Flags / Runtime Config** — flag lifecycle management, scoped assignments, percentage rollout, evaluation engine, audit trail

---

## Planned

### Customer Portal

- [ ] **Customer Portal Phase 3 — Loyalty & Payment Methods** — loyalty account overview and earn/redeem history at `/app/loyalty`; saved payment methods management at `/app/payment-methods` (list/add/remove/set-default); `LoyaltyAccount`, `LoyaltyTransaction`, `ReferralCode` Prisma models; service functions in `customer.service.ts`; API routes under `/api/customer/loyalty/` and `/api/customer/payment-methods/`; UI components in `components/customer/loyalty/` and `components/customer/payment-methods/`

### Integrations & Adapters

- [ ] **Lightspeed POS Adapter** — catalog sync, order forwarding; `LIGHTSPEED` added to `ConnectionProvider` enum; `adapters/integrations/lightspeed.adapter.ts`

### Cross-Cutting

- [ ] **CSV / PDF Export** — downloadable CSV and PDF export for Owner Console reports (`/owner/reports`) and Admin Logs Console (`/admin/logs`); export service utilities; API routes with `Content-Disposition` headers
- [ ] **Web Push Notifications** — browser push subscription management (`/app/notifications/push-settings`); service worker registration; `PushSubscription` Prisma model; owner alert evaluator triggers push delivery alongside in-app notifications
