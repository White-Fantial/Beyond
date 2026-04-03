# Beyond — Roadmap

## Completed

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
- [x] **Admin Console Phase 5 — Jobs Panel** — background task management, manual run, retry with immutable lineage, safe job types only
- [x] **Admin Console Phase 6 — Billing Panel** — plan CRUD (limits & features), tenant subscription management (plan change, trial extend, status change), billing account editor, billing records & subscription event history, MRR estimate dashboard
- [x] **Admin Console Phase 7 — Integrations Admin Panel** — connection detail page, status change, credential rotation, action log viewer
- [x] **Admin Console Phase 9 — Feature Flags / Runtime Config** — flag lifecycle management, scoped assignments, percentage rollout, evaluation engine, audit trail
- [x] **Owner Console Phase 1** — dashboard (KPI + connection status + logs), store settings, users & roles, connections, catalog source settings, operations settings, billing, reports, logs pages; OWNER/ADMIN/MANAGER role guards; Prisma models for `store_settings`, `catalog_settings`, `store_operation_settings`
- [x] **Owner Console Phase 2** — store-context portal (`/owner/stores/[storeId]/*`); store dashboard (KPIs, channel breakdown, sold-out list, upcoming subscriptions); store settings; staff management; owner-local catalog fields; channel connection cards; subscription summary pages; 8 write API routes; 12 AuditLog event types; cross-tenant access enforcement
- [x] **Owner Console Phase 3 — Owner Dashboard** — tenant-scoped multi-store business overview at `/owner`; Business Overview (7 metric cards), Store Summary table (per-store connection health + daily revenue), Alerts panel (POS/delivery/sync/invitation/billing issues)
- [x] **Owner Console Phase 4 — Reports & Analytics** — tenant-level and store-level reports with KPI cards, revenue trend, channel breakdown, store comparison, top products, subscription summary, rule-based insights; URL-persisted filters with preset ranges and compare-to-previous; 13 UI components; 3 service files; 2 API routes; 3 test files
- [x] **Owner Console Phase 5 — Customer & Subscription Management** — tenant-scoped customer list (`/owner/customers`) with search/filter/sort/pagination and 4-card KPI strip; customer detail (`/owner/customers/[customerId]`) with Overview, Orders, Subscriptions, Notes tabs; subscription lifecycle actions (pause/resume/cancel/next-date/note) with state-machine validation; owner-only `internalNote` on Customer profile; 5 audit log event types (`OWNER_CUSTOMER_NOTE_UPDATED`, `OWNER_SUBSCRIPTION_PAUSED`, `OWNER_SUBSCRIPTION_RESUMED`, `OWNER_SUBSCRIPTION_CANCELLED`, `OWNER_SUBSCRIPTION_NEXT_DATE_UPDATED`, `OWNER_SUBSCRIPTION_NOTE_UPDATED`); cross-tenant access guard on all routes; `Customer` model + `Subscription` extended with `tenantId`, `storeId`, `nextOrderAt`, `internalNote`, `pausedAt`, `cancelReason`; 10 API routes; 2 service files; 44 unit tests
- [x] **Owner Console Phase 6 — Billing Deep Dive** — billing overview at `/owner/billing` (plan card, subscription status badge, alerts, usage vs limits, recent invoices, quick actions); invoice list at `/owner/billing/invoices` with status-filter tabs and pagination; invoice detail at `/owner/billing/invoices/[invoiceId]` with line items and payment attempt timeline; plan catalog and preview-first plan change flow at `/owner/billing/plans` with downgrade blocking; 8 service functions in `owner-billing.service.ts`; `BillingProviderAdapter` interface + `MockBillingProviderAdapter`; 6 new schema models (`BillingInvoice`, `BillingInvoiceLine`, `PaymentAttempt`, `UsageMetricSnapshot`, `SubscriptionChangeRequest`, `BillingEventLog`) + 7 new enums + 4 new fields on `TenantSubscription`; 7 API routes; 5 UI components; idempotent billing seed with 3 plans + sample invoices + usage snapshots; 15 unit tests
- [x] **Admin Console Phase 3** — integration force-reconnect/sync (`/api/admin/integrations/[connectionId]/force-reconnect`, `trigger-sync`, `trigger-refresh-check`, `validate`); analytics charts page at `/admin/analytics` with 7 UI components (`AdminKpiGrid`, `AdminTrendChart`, `AdminProviderHealthTable`, `AdminFailureBreakdownTable`, `AdminProblemStoresTable`, `AdminAttentionSummaryCards`, `AdminAnalyticsFilterBar`); 8 analytics service functions
- [x] **Owner Console Phase 7 — Team Activity & Audit** — read-only tenant-scoped activity hub at `/owner/activity`; tabbed view: Activity Feed, Role Changes, Settings Changes, Integration Changes; 4 service functions in `services/owner/owner-activity.service.ts`; types in `types/owner-activity.ts`; 4 API routes (`GET /api/owner/activity`, `/roles`, `/settings`, `/integrations`); 6 UI components in `components/owner/activity/`; Activity & Audit link added to `OwnerSidebar`; 25 unit tests

## In Progress



## Planned

- [ ] POS adapter implementations (Posbank, OKPOS)
- [ ] Delivery platform adapters (Baemin, Coupang Eats)
- [ ] Payment gateway integration (Toss Payments)
- [ ] Real-time order notifications (WebSocket / SSE)
- [ ] Sales analytics charts (canonical order aggregation)
- [ ] Subscription billing engine

---

## Future Owner Console Phases

The following phases extend the Owner Console beyond Phase 5.

### ~~Phase 5 — Customer & Subscription Management~~ ✅ Complete

See Completed section above.

### ~~Phase 6 — Billing Deep Dive~~ ✅ Complete

See Completed section above. Key details in [doc/owner-console.md](./owner-console.md#phase-6--billing-deep-dive).

**What is currently mock / not yet real:**
- Proration preview amounts (adapter returns null until Stripe is connected)
- Provider webhook sync (Stripe events → internal BillingInvoice / TenantSubscription)
- Payment method management UI
- Billing portal redirect / customer portal session

**Remaining future work:**
- Real Stripe adapter implementation
- Webhook reconciliation
- Payment method management UI
- Tax/GST line item refinements
- Finance-role billing permissions

### ~~Phase 7 — Team Activity & Audit~~ ✅ Complete

See Completed section above.

### Phase 8 — Automation & Notifications

- Alert rule builder: define thresholds for cancellation rate, revenue drop, sold-out products
- Delivery and POS issue notifications (real-time, in-app)
- Daily summary digest emails / in-app notifications for owners
- Sold-out auto-alert to assigned staff members

### Phase 9 — Advanced Analytics & Forecasting

- Richer trend analysis: weekday and time-slot performance heatmaps
- Revenue forecasting using historical order patterns
- Production-planning support: next-week order volume estimates per store
- Prediction hooks for subscription churn and upsell opportunities
