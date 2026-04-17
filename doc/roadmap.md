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
- [x] **Catalog Phase 1 — Internal Catalog Ownership** — Beyond internal catalog is now the canonical operational model. Added provenance fields (`originType`, `originConnectionId`, `originExternalRef`, `importedAt`). `CatalogOriginType` enum (`BEYOND_CREATED`, `IMPORTED_FROM_POS`, `IMPORTED_FROM_DELIVERY`, `IMPORTED_FROM_OTHER`). Removed all source-lock logic from backoffice and owner catalog services. All catalog entities are now fully editable regardless of origin. UI updated to remove POS-lock messages; origin shown as informational badge only. `types/owner.ts` updated with `originType`. Migration `20260417000000_catalog_phase1_provenance`. 61 tests in `__tests__/backoffice-catalog.service.test.ts` + `__tests__/catalog-internal-ownership.test.ts`.

#### Catalog Phase 2 (Planned)
- [ ] External catalog import UI (map external entities to internal catalog rows)
- [ ] Conflict-resolution policy for sync vs. local edits
- [ ] Import preview and diff view

#### Catalog Phase 3 (Planned)
- [ ] Channel publish — push internal catalog changes to POS/delivery channels
- [ ] Two-way sync with conflict-resolution
- [ ] Outbound change log

### Platform Infrastructure

- [x] **Real-Time Notifications — SSE Infrastructure** — in-process channel registry at `lib/sse/stream-manager.ts`; three SSE endpoints: backoffice Kanban (`/api/sse/store/[storeId]/orders`), owner notification bell (`/api/sse/owner/notifications`), storefront confirmation (`/api/sse/store/[storeSlug]/orders/[orderId]`); SSE-first with polling fallback on all consumers; 11 unit tests
- [x] **Subscription Billing Engine** — Stripe adapter at `adapters/billing/stripe.adapter.ts` fully implements `BillingProviderAdapter`; billing scheduler with 3-day lookahead window; Stripe webhook handler (`invoice.paid`, `invoice.payment_failed`, `subscription.updated`, `subscription.deleted`, all idempotent); payment method management UI at `/owner/billing/payment-methods`; 15 unit tests
- [x] **Transactional Email** — email adapter interface at `adapters/email/base.ts` with Resend implementation (`resend.adapter.ts`); renderer + templates for order confirmation, subscription notice, alert digest; `sendEmail()` with `EmailLog` Prisma model (migration 20260405220000) persisting every delivery; `setEmailAdapter()` for test injection; lib utilities in `lib/email/`; 21 unit tests
- [x] **Web Push Notifications** — browser push subscription management at `/app/notifications`; `PushOptIn` component with service-worker registration; `PushSubscription` Prisma model; service: `push-notifications.service.ts` (register/unregister/send/list); `POST`/`DELETE /api/push/subscribe`, `GET /api/push/vapid-key`; lib utilities in `lib/push/`; 22 unit tests

### Integrations & Adapters

- [x] Loyverse integration adapter — categories, items, modifier groups, catalog sync
- [x] **Uber Eats Adapter** — OAuth 2.0 merchant authorization flow; `UBER_EATS` in `ConnectionProvider` enum; `adapters/integrations/uber-eats.adapter.ts`
- [x] **DoorDash Adapter** — OAuth 2.0 + JWT signing key (Drive API); `DOORDASH` in `ConnectionProvider` enum; `adapters/integrations/doordash.adapter.ts`
- [x] **Stripe Billing Adapter** — `adapters/billing/stripe.adapter.ts` implementing `BillingProviderAdapter`; `POST /api/webhooks/billing/stripe` handler; payment method management

### Backoffice Portal

- [x] **Backoffice Phase 1 — Live Dashboard & Operational Reports** — live KPI cards, channel breakdown, active orders list at `/backoffice/store/[storeId]/dashboard`; full operational report at `/backoffice/store/[storeId]/reports` (daily series, channel breakdown, status funnel, top products, peak-hour heatmap); 9 UI components; 34 unit tests
- [x] **Backoffice Phase 2 — Live Order Management** — 4-column Kanban board (New → Accepted → In Preparation → Ready) with per-order actions; Order Detail Drawer; Kitchen Display mode at `/backoffice/store/[storeId]/orders/kitchen` (full-screen, tablet-optimised, 15s auto-refresh); new-order toast badge; SSE-first push; 17 unit tests
- [x] **Backoffice Phase 3 — Catalog & Inventory Management** — sold-out / visibility toggles per product; bulk restore availability; category display-order reordering; modifier-option sold-out control; `BackofficeCatalogClient` at `/backoffice/store/[storeId]/catalog`; service: `services/backoffice/backoffice-catalog.service.ts`; API routes under `/api/backoffice/[storeId]/catalog/`
- [x] **Backoffice Phase 4 — Staff & Scheduling** — staff roster table at `/backoffice/store/[storeId]/staff`; `listStaffMembers`, `updateStaffMember`, `getScheduleData` service functions; schedule grid UI; service: `services/backoffice/backoffice-staff.service.ts`; 3 API routes; 4 UI components in `components/backoffice/staff/`; BackofficeSidebar updated; 21 unit tests

### Public Storefront

- [x] **Storefront Phase 1 — Menu Browsing & Cart** — public catalog at `/store/[storeSlug]`; cart with `sessionStorage` persistence; `CartProvider` context
- [x] **Storefront Phase 2 — Checkout & Order Placement** — full checkout page at `/store/[storeSlug]/checkout` (contact form, pickup-time grid, order notes); `POST /api/store/[storeSlug]/orders` creates a canonical ONLINE order; confirmation page with SSE-first status polling; 13 unit tests
- [x] **Storefront Phase 3 — Subscription Enrollment Flow** — 3-step enrollment flow (`SubscriptionEnrollmentFlow`) at `/store/[storeSlug]/subscriptions`; `POST /api/store/[storeSlug]/subscriptions` guest enrollment; confirmation page with account CTA; service functions `getSubscriptionPlansForStore`, `enrollGuestSubscription`

### Customer Portal

- [x] **Customer Portal Phase 1** — order history (`/app/orders`, `/app/orders/[orderId]`), subscription management (`/app/subscriptions`) with pause/resume/cancel/next-date, account settings (`/app/account`) with profile edit and password change; 10 API routes; 7 UI components; 35 unit tests
- [x] **Customer Portal Phase 2 — Notifications & Address Management** — in-app notification bell with unread badge; notifications page at `/app/notifications` (All / Unread tabs, mark-as-read, mark-all-read); address book at `/app/addresses` (add/edit/delete/set-default); `CustomerAddress` and `CustomerNotification` Prisma models; 28 unit tests
- [x] **Customer Portal Phase 3 — Loyalty & Payment Methods** — loyalty account overview and earn/redeem history at `/app/loyalty`; saved payment methods management at `/app/payment-methods` (list/add/remove/set-default); `LoyaltyAccount`, `LoyaltyTransaction`, `ReferralCode`, `SavedPaymentMethod` Prisma models; seed at `prisma/seeds/loyalty.ts`; 7 API routes; 7 UI components; 23 unit tests
- [x] **Customer Portal Phase 4 — Reviews & Support** — product review submission and history at `/app/reviews`; support ticket list, detail, and reply at `/app/support` and `/app/support/[ticketId]`; `ProductReview`, `SupportTicket`, `SupportTicketMessage` Prisma models; services: `customer-reviews.service.ts`, `customer-support.service.ts`; 6 API routes; 8 UI components; CustomerNav updated; 22 unit tests
- [x] **Customer Portal Phase 5 — Referrals & Push Settings** — referral stats and share card at `/app/referrals`; web push preference management; `PushPreference` Prisma model; service functions `getReferralStats`, `getUserPushPreferences`, `updatePushPreferences`; 3 API routes; 3 UI components; CustomerNav updated; 21 unit tests

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
- [x] **Owner Console Phase 10 — Advanced Settings** — multi-store catalog settings at `/owner/settings`; tenant-level settings (timezone, locale, billing contact); store basic-info editor; operation settings (prep time, ordering windows, holiday overrides); `CatalogSettings` + `StoreOperationSettings` + `StoreHours` upserts; 6 service functions; OwnerSidebar updated; 28 unit tests
- [x] **Owner Console Phase 11 — Integrations Management** — tenant-scoped connection cards at `/owner/integrations`; connect / disconnect / reconnect flow; connection action log viewer; service functions `getOwnerTenantConnectionCards`, `disconnectOwnerConnection`, `getOwnerConnectionActionLogs`; API routes under `/api/owner/integrations/`; OwnerSidebar updated; 22 unit tests
- [x] **Owner Console Phase 12 — Promotions & Discounts** — promo code list at `/owner/promotions` and detail at `/owner/promotions/[promoId]`; `PromoCode` + `PromoRedemption` Prisma models (migration 20260405000000); service: `owner-promotions.service.ts` (list/detail/create/update/delete/apply); types: `types/owner-promotions.ts`; 7 API routes; 3 UI components; OwnerSidebar updated; 27 unit tests
- [x] **Owner Console Phase 13 — Gift Cards** — gift card list at `/owner/gift-cards` and detail page; `GiftCard` + `GiftCardTransaction` Prisma models (migration 20260405210000); service: `owner-gift-cards.service.ts` (list/detail/issue/void/lookup/validate/apply); types: `types/owner-gift-cards.ts`; 5 API routes; 4 UI components; OwnerSidebar "Promotions & Gifts" section; 25 unit tests
- [x] **Owner Console — Team Management** — tenant-level team member list at `/owner/team`; invite, role change, and remove actions; last-owner guard; service: `owner-team.service.ts` (`listOwnerTeamMembers`, `getOwnerTeamMember`, `inviteOwnerTeamMember`, `updateOwnerTeamMember`, `removeOwnerTeamMember`); OwnerSidebar updated; 25 unit tests
- [x] **Owner Console — Outbound Webhooks** — webhook endpoint list at `/owner/webhooks` and detail at `/owner/webhooks/[endpointId]`; `WebhookEndpoint` + `WebhookDelivery` Prisma models (migration 20260405240000); service: `owner-webhooks.service.ts` (list/detail/create/toggle/delete/deliveries); lib: `lib/webhooks/deliver.ts` (dispatchWebhook + HMAC signing); types: `types/owner-webhooks.ts`; 5 API routes; 4 UI components; OwnerSidebar updated; 22 unit tests

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
- [x] **Admin Console Phase 10 — GDPR & Compliance** — compliance event log and data-subject management at `/admin/compliance`; `ComplianceEvent` Prisma model (migration 20260405230000); service: `admin-compliance.service.ts` (`exportUserData`, `anonymiseUser`, `getRetentionReport`); 2 API routes (CSV export + erasure); AdminSidebar updated; 18 unit tests

---

## Planned

### Integrations & Adapters

- [ ] **Lightspeed POS Adapter** — catalog sync, order forwarding; `LIGHTSPEED` added to `ConnectionProvider` enum; `adapters/integrations/lightspeed.adapter.ts`

### Cross-Cutting

- [ ] **CSV / PDF Export** — downloadable CSV and PDF export for Owner Console reports (`/owner/reports`) and Admin Logs Console (`/admin/logs`); export service utilities; API routes with `Content-Disposition` headers
