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
- [x] **Admin Console Phase 8 — System Monitoring** — real-time platform health dashboard at `/admin/system`; services: `admin-system.service.ts`, `admin-health.service.ts`, `admin-metrics.service.ts`, `admin-incident.service.ts`; lib helpers in `lib/admin/system/{thresholds,health,metrics,incidents,labels}.ts`; types in `types/admin-system.ts`; 9 UI components in `components/admin/system/`
- [x] **Admin Console Phase 9 — Feature Flags / Runtime Config** — flag lifecycle management, scoped assignments, percentage rollout, evaluation engine, audit trail
- [x] **Owner Console Phase 1** — dashboard (KPI + connection status + logs), store settings, users & roles, connections, catalog source settings, operations settings, billing, reports, logs pages; OWNER/ADMIN/MANAGER role guards; Prisma models for `store_settings`, `catalog_settings`, `store_operation_settings`
- [x] **Owner Console Phase 2** — store-context portal (`/owner/stores/[storeId]/*`); store dashboard (KPIs, channel breakdown, sold-out list, upcoming subscriptions); store settings; staff management; owner-local catalog fields; channel connection cards; subscription summary pages; 8 write API routes; 12 AuditLog event types; cross-tenant access enforcement
- [x] **Owner Console Phase 3 — Owner Dashboard** — tenant-scoped multi-store business overview at `/owner`; Business Overview (7 metric cards), Store Summary table (per-store connection health + daily revenue), Alerts panel (POS/delivery/sync/invitation/billing issues)
- [x] **Owner Console Phase 4 — Reports & Analytics** — tenant-level and store-level reports with KPI cards, revenue trend, channel breakdown, store comparison, top products, subscription summary, rule-based insights; URL-persisted filters with preset ranges and compare-to-previous; 13 UI components; 3 service files; 2 API routes; 3 test files
- [x] **Owner Console Phase 5 — Customer & Subscription Management** — tenant-scoped customer list (`/owner/customers`) with search/filter/sort/pagination and 4-card KPI strip; customer detail (`/owner/customers/[customerId]`) with Overview, Orders, Subscriptions, Notes tabs; subscription lifecycle actions (pause/resume/cancel/next-date/note) with state-machine validation; owner-only `internalNote` on Customer profile; 5 audit log event types (`OWNER_CUSTOMER_NOTE_UPDATED`, `OWNER_SUBSCRIPTION_PAUSED`, `OWNER_SUBSCRIPTION_RESUMED`, `OWNER_SUBSCRIPTION_CANCELLED`, `OWNER_SUBSCRIPTION_NEXT_DATE_UPDATED`, `OWNER_SUBSCRIPTION_NOTE_UPDATED`); cross-tenant access guard on all routes; `Customer` model + `Subscription` extended with `tenantId`, `storeId`, `nextOrderAt`, `internalNote`, `pausedAt`, `cancelReason`; 10 API routes; 2 service files; 44 unit tests
- [x] **Owner Console Phase 6 — Billing Deep Dive** — billing overview at `/owner/billing` (plan card, subscription status badge, alerts, usage vs limits, recent invoices, quick actions); invoice list at `/owner/billing/invoices` with status-filter tabs and pagination; invoice detail at `/owner/billing/invoices/[invoiceId]` with line items and payment attempt timeline; plan catalog and preview-first plan change flow at `/owner/billing/plans` with downgrade blocking; 8 service functions in `owner-billing.service.ts`; `BillingProviderAdapter` interface + `MockBillingProviderAdapter`; 6 new schema models (`BillingInvoice`, `BillingInvoiceLine`, `PaymentAttempt`, `UsageMetricSnapshot`, `SubscriptionChangeRequest`, `BillingEventLog`) + 7 new enums + 4 new fields on `TenantSubscription`; 7 API routes; 5 UI components; idempotent billing seed with 3 plans + sample invoices + usage snapshots; 15 unit tests
- [x] **Admin Console Phase 3** — integration force-reconnect/sync (`/api/admin/integrations/[connectionId]/force-reconnect`, `trigger-sync`, `trigger-refresh-check`, `validate`); analytics charts page at `/admin/analytics` with 7 UI components (`AdminKpiGrid`, `AdminTrendChart`, `AdminProviderHealthTable`, `AdminFailureBreakdownTable`, `AdminProblemStoresTable`, `AdminAttentionSummaryCards`, `AdminAnalyticsFilterBar`); 8 analytics service functions
- [x] **Owner Console Phase 7 — Team Activity & Audit** — read-only tenant-scoped activity hub at `/owner/activity`; tabbed view: Activity Feed, Role Changes, Settings Changes, Integration Changes; 4 service functions in `services/owner/owner-activity.service.ts`; types in `types/owner-activity.ts`; 4 API routes (`GET /api/owner/activity`, `/roles`, `/settings`, `/integrations`); 6 UI components in `components/owner/activity/`; Activity & Audit link added to `OwnerSidebar`; 25 unit tests

- [x] **Owner Console Phase 8 — Automation & Notifications** — proactive in-app alerting for store owners; alert rule builder with 7 metric types (cancellation rate, revenue drop, sold-out count, order failure rate, low-stock items, POS disconnect, delivery disconnect); percentage-rollout window evaluation; notification centre at `/owner/notifications` with All / Unread tabs; `NotificationBell` component with live unread badge in `OwnerSidebar`; alert rules management at `/owner/alert-rules` with create/edit/toggle/delete; `AlertRule` + `Notification` Prisma models + `AlertMetricType` + `NotificationType` enums; migration `20260403000000`; idempotent seed; 4 services (`owner-alert-rule`, `owner-notification`, `owner-alert-evaluator`); 7 API routes; 7 UI components in `components/owner/notifications/` and `components/owner/alert-rules/`; 45 unit tests
- [x] **Owner Console Phase 9 — Advanced Analytics & Forecasting** — analytics hub at `/owner/analytics`; weekday × hour-slot order volume heatmap with colour-intensity scale; linear-regression revenue forecast with 80% confidence interval band (7/14/30-day horizon); next-week production estimates per store using trailing 4-week same-weekday average; churn risk signals for customers with declining order frequency (HIGH/MEDIUM/LOW classification); 4 service functions in `services/owner/owner-analytics.service.ts`; types in `types/owner-analytics.ts`; 4 API routes (`GET /api/owner/analytics/heatmap`, `/forecast`, `/production`, `/churn`); 6 UI components in `components/owner/analytics/`; Analytics link added to `OwnerSidebar`; 36 unit tests
- [x] **Backoffice Phase 1 — Live Dashboard & Operational Reports** — replaced stub dashboard with live KPI cards (today's orders, revenue, active orders, sold-out count) and channel breakdown + active orders list at `/backoffice/store/[storeId]/dashboard`; replaced stub reports page with full operational report at `/backoffice/store/[storeId]/reports` (daily series, channel breakdown, status funnel, top 5 products, peak-hour heatmap, URL-persisted day-range filter); types in `types/backoffice.ts`; 2 service functions in `services/backoffice/`; 2 API routes (`GET /api/backoffice/[storeId]/dashboard`, `/api/backoffice/[storeId]/reports?days=`); 9 UI components in `components/backoffice/dashboard/` and `components/backoffice/reports/`; 34 unit tests
- [x] **Customer Portal Phase 1** — customer-facing order history (`/app/orders`, `/app/orders/[orderId]`), subscription management (`/app/subscriptions`) with pause/resume/cancel/next-date actions, account settings (`/app/account`) with profile edit and password change; service: `services/customer.service.ts` (10 functions, email-scoped); types: `types/customer.ts`; 10 API routes under `/api/customer/`; 7 UI components in `components/customer/{orders,subscriptions,account}/`; 35 unit tests
- [x] **Customer Portal Phase 2 — Notifications & Address Management** — in-app notification bell with unread badge wired into `CustomerNav`; notifications full-page at `/app/notifications` with All / Unread tabs, mark-as-read on click, mark-all-read action; address book at `/app/addresses` with add/edit/delete/set-default; `CustomerNotificationBell` component; `NotificationList`, `AddressCard`, `AddressForm` UI components; service functions: `listCustomerNotifications`, `markCustomerNotificationRead`, `markAllCustomerNotificationsRead`, `listCustomerAddresses`, `createCustomerAddress`, `updateCustomerAddress`, `deleteCustomerAddress`, `setDefaultCustomerAddress`; types: `CustomerNotification`, `CustomerNotificationListResult`, `CustomerAddress`, `CustomerAddressInput`; `CustomerAddress` and `CustomerNotification` Prisma models; home page updated with Notifications + Addresses tiles; Manage Addresses link on account page; 28 unit tests

## In Progress



## Planned

### Backoffice

- [ ] **Backoffice Phase 3 — Catalog & Inventory Management** — sold-out / visibility toggles per product; bulk restore availability; category display-order reordering; modifier-option sold-out control; `BackofficeCatalogClient` page at `/backoffice/store/[storeId]/catalog`; service: `services/backoffice/backoffice-catalog.service.ts`; 5 API routes under `/api/backoffice/[storeId]/catalog/`; `SoldOutBadge`, `BulkRestoreButton`, `ProductVisibilityRow`, `CategoryReorderList` UI components; Catalog link added to `BackofficeSidebar`

### Public Storefront

- [ ] **Storefront Phase 3 — Subscription Enrollment Flow** — 3-step enrollment flow (`SubscriptionEnrollmentFlow` client component) on `/store/[storeSlug]/subscriptions`; plan browser listing available subscription plans; `POST /api/store/[storeSlug]/subscriptions` guest enrolment with SSE broadcast; confirmation page at `/store/[storeSlug]/subscriptions/confirmation/[subscriptionId]` with account CTA; service functions `getSubscriptionPlansForStore`, `enrollGuestSubscription` in `customer-menu.service.ts`; types in `types/storefront.ts`

### Customer Portal

- [ ] **Customer Portal Phase 3 — Loyalty & Payment Methods** — loyalty account overview and earn/redeem history at `/app/loyalty`; saved payment methods management at `/app/payment-methods` (list/add/remove/set-default); `LoyaltyAccount`, `LoyaltyTransaction`, `ReferralCode` Prisma models; service functions in `customer.service.ts`; API routes under `/api/customer/loyalty/` and `/api/customer/payment-methods/`; UI components in `components/customer/loyalty/` and `components/customer/payment-methods/`

### Integrations & Adapters

- [ ] **Baemin Adapter** — inbound order webhook with HMAC-SHA256 signature verification; OAuth 2.0 token exchange; `BAEMIN` added to `ConnectionProvider` enum; `adapters/integrations/baemin.adapter.ts` and `adapters/integrations/baemin/types.ts`; webhook route updated for `baemin` provider
- [ ] **Coupang Eats Adapter** — inbound order webhook with HMAC-SHA256 signature verification; OAuth 2.0 + PKCE token exchange; `COUPANG_EATS` added to `ConnectionProvider` enum; `adapters/integrations/coupang-eats.adapter.ts` and `adapters/integrations/coupang-eats/types.ts`; webhook route updated for `coupang-eats` provider
- [ ] **Toss Payments Adapter** — `adapters/toss.adapter.ts` implementing `BillingProviderAdapter`; Toss Payments checkout widget integration on storefront checkout; `POST /api/webhooks/billing/toss` handler; `adapters/toss/types.ts`
- [ ] POS adapter implementations (Posbank, OKPOS)

### Cross-Cutting

- [ ] **CSV / PDF Export** — downloadable CSV and PDF export for Owner Console reports (`/owner/reports`) and Admin Logs Console (`/admin/logs`); export service utilities; API routes with `Content-Disposition` headers
- [ ] **i18n Foundation** — `next-intl` integration; Korean (ko) and English (en) locale message files; locale switcher component; all UI strings externalised to message files
- [ ] **Web Push Notifications** — browser push subscription management (`/app/notifications/push-settings`); service worker registration; `PushSubscription` Prisma model; owner alert evaluator triggers push delivery alongside in-app notifications
- [ ] Sales analytics charts (canonical order aggregation)

---

## Completed — Next Phases

- [x] **Backoffice Phase 2 — Live Order Management** — 4-column Kanban board at `/backoffice/store/[storeId]/orders` (New → Accepted → In Preparation → Ready) with per-order accept/reject/advance/cancel actions; Order Detail Drawer with full item breakdown, modifier list, totals, order notes, and immutable event timeline; Kitchen Display mode at `/backoffice/store/[storeId]/orders/kitchen` (full-screen, no sidebar, tablet-optimised, 15s auto-refresh); new-order toast badge when incoming count increases; service `services/backoffice/backoffice-orders.service.ts` (`listLiveOrders`, `getBackofficeOrderDetail`, `updateBackofficeOrderStatus`, `isValidTransition`); 2 API routes (`GET /api/backoffice/[storeId]/orders`, `PATCH /api/backoffice/[storeId]/orders/[orderId]/status`); Kitchen Display nav item added to `BackofficeSidebar`; 17 unit tests

- [x] **Public Storefront Phase 2 — Checkout & Order Placement** — cart state now persisted to `sessionStorage` (key `beyond_cart_<storeId>`, hydrated on mount); full checkout page at `/store/[storeSlug]/checkout` with contact form (name, phone, email), pickup-time grid (12 slots), order notes, and fixed-bottom CTA; `POST /api/store/[storeSlug]/orders` validates items against live catalog and creates a canonical ONLINE order via `createCanonicalOrderFromInbound`; order confirmation page at `/store/[storeSlug]/confirmation/[orderId]` with status badge and polling; `GET /api/store/[storeSlug]/orders/[orderId]` public status endpoint; service functions `placeGuestOrder`, `getGuestOrderStatus` added to `customer-menu.service.ts`; types in `types/storefront.ts`; 13 unit tests

- [x] **Real-Time Notifications — SSE Infrastructure** — in-process channel registry at `lib/sse/stream-manager.ts` (`subscribe`, `broadcast`, `subscriberCount`, `formatSSEMessage`, `formatHeartbeat`); three SSE endpoints: `GET /api/sse/store/[storeId]/orders` (backoffice Kanban, authenticated), `GET /api/sse/owner/notifications` (owner notification bell, authenticated), `GET /api/sse/store/[storeSlug]/orders/[orderId]` (storefront confirmation, public); `BackofficeOrdersClient` upgraded to SSE-first with 15s polling fallback; `NotificationBell` subscribes to SSE for live unread count with 30s reconnect; `ConfirmationClient` upgraded to SSE-first with 20s polling fallback; 11 unit tests

- [x] **Subscription Billing Engine** — Stripe adapter `adapters/billing/stripe.adapter.ts` fully implements `BillingProviderAdapter` plus `listPaymentMethods`, `detachPaymentMethod`, `createSetupIntent`, `verifyWebhookSignature`; billing scheduler `lib/billing/scheduler.ts` identifies subscriptions due within 3-day lookahead window and marks expired ACTIVE subscriptions PAST_DUE; Stripe webhook handler at `POST /api/webhooks/billing/stripe` handles `invoice.paid`, `invoice.payment_failed`, `subscription.updated`, `subscription.deleted` (all idempotent); payment method management UI at `/owner/billing/payment-methods` with list/remove; API routes `GET /api/owner/billing/payment-methods` and `DELETE /api/owner/billing/payment-methods/[paymentMethodId]`; admin billing tenant detail page extended with payment-attempt timeline and manual retry button; `owner-billing.service.ts` wired to pick Stripe adapter when `STRIPE_SECRET_KEY` is set; 15 unit tests

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

### ~~Phase 8 — Automation & Notifications~~ ✅ Complete

See Completed section above.

### ~~Phase 9 — Advanced Analytics & Forecasting~~ ✅ Complete

See Completed section above. Key details in [doc/owner-console.md](./owner-console.md#phase-9--advanced-analytics--forecasting).
