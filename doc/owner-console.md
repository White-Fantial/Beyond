# Owner Console

The **Owner Console** (`/owner`) is the business management portal for store owners and admins. It combines a tenant-wide **Owner Dashboard** at `/owner` with store-context operations at `/owner/stores/[storeId]/*`, enforcing multi-tenant isolation throughout.

> **Key separation**: Admin (`/admin`) manages the platform. Owner (`/owner`) manages the store business. These roles never overlap.

## Navigation Structure

Owner Portal navigation is split into two distinct layers, both rendered in the left sidebar:

### 1. Global Owner Navigation (always visible)

The `OwnerSidebar` component renders the following sections for all owner pages:

| Section | Items |
|---------|-------|
| Store Management | Home, My Stores, Team |
| Customers | Customers, Promotions, Gift Cards |
| Cost Management | Recipe Library, Ingredients, Suppliers, Supplier Accounts |
| Data & Insights | Reports, Advanced Analytics |
| Developer Tools | Webhooks, Alert Rules, Notifications, Integration Logs |
| Settings | Billing, Catalog Settings, Activity & Audit |

### 2. Store-scoped Secondary Navigation (shown when inside a specific store)

When the URL is `/owner/stores/[storeId]/*`, the sidebar appends a **Current Store** section with three groups:

| Group | Items | Route |
|-------|-------|-------|
| **Store** | Overview | `/owner/stores/[storeId]` (exact) |
| | Store Settings | `/owner/stores/[storeId]/settings` |
| | Staff | `/owner/stores/[storeId]/staff` |
| | Reports | `/owner/stores/[storeId]/reports` |
| **Catalog** | Products | `/owner/stores/[storeId]/products` |
| | Categories | `/owner/stores/[storeId]/categories` |
| | Modifiers | `/owner/stores/[storeId]/modifiers` |
| **Operations** | Integrations | `/owner/stores/[storeId]/integrations` |
| | Subscriptions | `/owner/stores/[storeId]/subscriptions` |

**Active state rules:**
- Overview uses exact path matching (`/owner/stores/[storeId]` only).
- All other items use prefix matching — `/owner/stores/[storeId]/products/[productId]` keeps Products active.
- Group titles are visually highlighted when any child item is active.

**Why this structure:**
- Prevents the wide horizontal tab overflow that occurred when store menus were rendered as a top nav bar.
- Clarifies hierarchy: global owner navigation vs. store-specific operations.
- Scales naturally as new store-scoped pages are added (just add to the group definition).
- Reduces visual clutter — only the relevant store menu is surfaced in context.

### Store Header Bar

Store detail pages no longer display a wide horizontal tab menu. The header now shows:

- **Left:** Breadcrumb (`Stores / {Store Name}`) + store name as page title + status badge (if not ACTIVE)
- **Right:** Quick actions — `← Switch Store`, `Back Office ↗`, `Customer App ↗`

## Portal Structure

```
app/owner/
├── layout.tsx                    # Auth guard (OWNER/ADMIN/MANAGER) + OwnerSidebar
├── page.tsx                      # Owner Dashboard (Business Overview / Store Summary / Alerts)
├── stores/
│   ├── page.tsx                  # Store picker; single-store owners auto-redirect
│   └── [storeId]/
│       ├── layout.tsx            # Store header bar (breadcrumb + title + quick actions); no horizontal tabs
│       ├── page.tsx              # Store dashboard — Today / Store Status sections, channel breakdown, sold-out, upcoming subs
│       ├── settings/page.tsx     # Store info, operation settings, subscription policy, store hours
│       ├── staff/page.tsx        # Staff list with tenant/store roles and status
│       ├── products/page.tsx     # Product list — owner-local fields + source-lock badges
│       ├── categories/page.tsx   # Category list — display order, visibility, image/color
│       ├── modifiers/page.tsx    # Modifier groups + options with sold-out indicators
│       ├── integrations/page.tsx # Channel connection cards (Loyverse POS, Uber Eats, DoorDash)
│       └── subscriptions/
│           ├── page.tsx          # Subscription summary cards + navigation
│           ├── customers/        # Per-customer subscription view
│           └── upcoming/         # Upcoming subscription orders (next 30 days)
├── billing/                      # Tenant-level billing
├── reports/page.tsx              # /owner/reports — Reports & Analytics (Phase 4)
└── logs/                         # Recent connection action logs
```

## Authorization

| Guard | Where Used | Requirement |
|-------|-----------|-------------|
| `requireOwnerPortalAccess()` | `app/owner/layout.tsx` | OWNER, ADMIN, or MANAGER membership |
| `requireOwnerAdminAccess()` | Billing, sensitive settings | OWNER or ADMIN membership only |
| `requireOwnerStoreAccess(storeId)` | Every store-context page/API | OWNER/ADMIN membership **and** store belongs to actor's tenant |
| `resolveActorTenantId(ctx, storeId)` | Every store-context write | Throws `CROSS_TENANT_ACCESS_DENIED` if storeId is not in actor's tenant |

### Permission Structure

```
OWNER membership role
└── requireOwnerStoreAccess passes for all stores in their tenant
└── Full access to all /owner/stores/[storeId]/* pages and APIs

ADMIN membership role
└── Same store-context access as OWNER
└── Cannot access billing

MANAGER membership role
└── requireOwnerPortalAccess passes (can see /owner)
└── requireOwnerStoreAccess passes for their stores
└── Catalog/operations/integrations: ✅  |  Staff/settings/billing: ❌

SUPERVISOR / STAFF store roles
└── No /owner portal access (backoffice only)
```

---

## Owner Dashboard (`/owner`) — Phase 3

The **multi-store business overview** — a tenant-scoped summary dashboard surfacing health and performance of the entire business.

### A. Business Overview

Seven at-a-glance metric cards:

| Metric | Source |
|--------|--------|
| Total Stores | `Store` count (ACTIVE + INACTIVE, ARCHIVED excluded) |
| Total Staff | Distinct `userId` from active `StoreMembership` rows |
| POS Connected | `Connection` count where `type=POS`, `status=CONNECTED` |
| Delivery Connected | `Connection` count where `type=DELIVERY`, `status=CONNECTED` |
| Today's Orders | `Order` count in today's date range, excluding CANCELLED/FAILED |
| Today's Revenue | `Order.totalAmount` sum for today (minor units, tenant currency) |
| Monthly Revenue | `Order.totalAmount` sum for current calendar month |

Revenue and date ranges are computed in the **tenant's IANA timezone** (fallback: `Pacific/Auckland`).

### B. Store Summary

Per-store table/card layout showing daily performance for each non-ARCHIVED store. Connection status rolls up all connections of a type into one of five states: `CONNECTED`, `PARTIAL`, `NOT_CONNECTED`, `ERROR`, `REAUTH_REQUIRED`. Priority order: `ERROR > REAUTH_REQUIRED > PARTIAL > CONNECTED > NOT_CONNECTED`.

### C. Alerts

| Alert type | Trigger | Severity |
|------------|---------|---------|
| `POS_CONNECTION_ISSUE` | Active store has POS connection with ERROR / REAUTH_REQUIRED / DISCONNECTED status | CRITICAL / WARNING |
| `DELIVERY_CONNECTION_ISSUE` | Active store has delivery connection with ERROR / REAUTH_REQUIRED / DISCONNECTED status | CRITICAL / WARNING |
| `SYNC_FAILED` | `connection.lastSyncStatus = FAILED` on an active store | WARNING |
| `PENDING_INVITATION` | `Membership.status = INVITED` count > 0 | INFO |
| `BILLING_ISSUE` | `TenantSubscription.status` in PAST_DUE / SUSPENDED | CRITICAL |

### Technical Files

| File | Role |
|------|------|
| `types/owner-dashboard.ts` | View-model types |
| `services/owner/owner-dashboard.service.ts` | `getOwnerDashboard()`, metrics, summaries, alerts |
| `app/api/owner/dashboard/route.ts` | `GET /api/owner/dashboard` |
| `components/owner/OwnerOverviewGrid.tsx` | 7-card metric grid |
| `components/owner/OwnerStoreSummaryTable.tsx` | Responsive table + stacked cards (mobile) |
| `components/owner/OwnerAlertsPanel.tsx` | Alert list with severity badges |
| `lib/owner/labels.ts` | Status → display label maps |
| `lib/format/money.ts` | `formatMoneyFromMinor(minorUnits, currencyCode)` |
| `lib/datetime/ranges.ts` | `getTodayRange(tz)`, `getMonthRange(tz)` |
| `__tests__/owner-dashboard.service.test.ts` | Unit tests (25) |

---

## Store Dashboard (`/owner/stores/[storeId]`)

| Card | Description |
|------|-------------|
| Today Sales | Aggregate revenue for today |
| Today Orders | Total orders received today |
| Completed Orders | Orders with COMPLETED status |
| Cancelled Orders | Orders with CANCELLED status |
| Sold-Out Products | Count of `isSoldOut = true` active products |
| Active Subscriptions | Active subscription count for this store's plans |
| Connected Channels | `connected / total` provider connections |
| Upcoming Sub Orders | Active subscriptions billing within next 7 days |

---

## Store Settings (`/owner/stores/[storeId]/settings`)

Three sections backed by `store_settings` + `store_operation_settings` + `store_hours` tables:

- **Basic Info** — displayName, phone, email, address, timezone, currency (`PATCH /api/owner/stores/[storeId]/settings`)
- **Operation Settings** — storeOpen, holidayMode, pickupIntervalMinutes, pickupLeadMinutes, minPrepTimeMinutes, maxOrdersPerSlot, subscription policy, sold-out reset mode, etc. (`PATCH /api/owner/stores/[storeId]/settings/operations`)
- **Store Hours** — per-day `isOpen`, `openTimeLocal`, `closeTimeLocal`, `pickupStartTimeLocal`, `pickupEndTimeLocal` (`PUT /api/owner/stores/[storeId]/hours`)

---

## Staff Management (`/owner/stores/[storeId]/staff`)

| Endpoint | Action |
|----------|--------|
| `POST /api/owner/stores/[storeId]/staff` | Invite staff by email |
| `PATCH /api/owner/stores/[storeId]/staff/[membershipId]` | Change role or toggle active/inactive |
| `DELETE /api/owner/stores/[storeId]/staff/[membershipId]` | Remove from store |

**Safety rule**: The last OWNER of a store cannot be demoted, deactivated, or removed. `assertNotLastOwner()` enforces this at the service layer.

---

## Catalog Management (Owner-Local Fields Only)

> **Critical principle**: POS source-of-truth fields are **never modified** by the owner portal. Only local merchandising/operations fields are editable.

| Entity | Read-Only (POS locked 🔒) | Editable by Owner ✏️ |
|--------|--------------------------|----------------------|
| Category | `name`, `sourceType`, `sourceCategoryRef` | `displayOrder`, `isVisibleOnOnlineOrder`, `isVisibleOnSubscription`, `imageUrl`, `onlineImageUrl`, `subscriptionImageUrl`, `localUiColor` |
| Product | `name`, `basePriceAmount`, `sku`, `barcode`, `sourceType` | `onlineName`, `subscriptionName`, `shortDescription`, `imageUrl`, `isFeatured`, `isVisibleOnOnlineOrder`, `isVisibleOnSubscription`, `displayOrder`, `internalNote` |
| Modifier Option | `name`, `priceDeltaAmount`, `sourceType` | `isSoldOut`, `isDefault`, `displayOrder` |
| Modifier Group | `name`, `sourceType` | `isVisibleOnOnlineOrder`, `displayOrder` |

API handlers strip source-locked fields before delegating to the service layer:
```
PATCH /api/owner/stores/[storeId]/products/[productId]
PATCH /api/owner/stores/[storeId]/categories/[categoryId]
PATCH /api/owner/stores/[storeId]/modifier-options/[optionId]
```

---

## Channel Connections (`/owner/stores/[storeId]/integrations`)

Provider cards for Loyverse POS, Uber Eats, and DoorDash. Each card shows:
- Connection status, auth scheme, external store/merchant name
- `lastConnectedAt`, `lastAuthValidatedAt`, `lastSyncAt`, `lastSyncStatus`
- `reauthRequired` flag + last error message
- Connect / Reconnect / Disconnect actions

---

## Subscription Overview (`/owner/stores/[storeId]/subscriptions`)

| Route | Content |
|-------|---------|
| `/subscriptions` | Summary cards: active, paused, next-7-days expected orders, subscription-eligible product count |
| `/subscriptions/customers` | Grouped by `customerId`: active/paused counts, next order date, monthly amount estimate |
| `/subscriptions/upcoming` | Orders expected within 30 days with plan name, date, and estimated amount |

---

## Reports & Analytics (Phase 4)

`/owner/reports` (tenant-level) and `/owner/stores/[storeId]/reports` (store-level) give owners time-ranged, filter-aware operational reports.

### Report Filter Model

| Param | Default | Description |
|-------|---------|-------------|
| `preset` | `last7` | Preset date range: `today`, `yesterday`, `last7`, `last30`, `thisMonth`, `lastMonth`, `custom` |
| `from` / `to` | — | `YYYY-MM-DD`; only used when `preset=custom` |
| `channels` | all | Comma-separated `OrderSourceChannel` values |
| `storeIds` | all | Comma-separated store IDs (tenant-level only) |
| `comparePrevious` | `true` | Show previous-period KPI deltas |

### Tenant-Level Report Sections

| Section | Description |
|---------|-------------|
| KPI Grid | Gross revenue, order count, AOV, completed rate, cancelled rate, subscription revenue |
| Revenue Trend | SVG bar chart showing daily revenue |
| Channel Breakdown | Horizontal bars per channel: revenue share, order count, cancellation rate |
| Store Comparison | Table: revenue, orders, AOV, cancel%, channels, active subscriptions — per store |
| Top Products | Revenue-ranked product table |
| Subscription Summary | Active/paused counts, period subscription revenue, upcoming 7/30-day estimates |
| Insights Panel | Deterministic rule-based insight cards |

### Store-Level Report Sections

All tenant sections except Store Comparison, plus:

| Section | Description |
|---------|-------------|
| Category Performance | Revenue-ranked horizontal bars per product category |
| Product Performance | Store-scoped top products |
| Order Health | Stacked bar: completed / cancelled / failed counts and rates |
| Sold-Out Impact | Count of currently sold-out products and modifier options |

### Insight Rules

| Insight key | Trigger | Severity |
|-------------|---------|---------|
| `no_orders` | Zero orders in selected period | warning |
| `no_completed` | Orders exist but none completed | warning |
| `high_cancel_rate` | Cancellation rate ≥ 15% with ≥ 5 orders | critical |
| `top_channel` | Highest-revenue channel identified | positive |
| `cancel_channel_*` | A channel has ≥ 15% cancel rate with ≥ 3 orders | warning |
| `best_store` | Highest-revenue store (tenant-level, multi-store) | info |
| `best_product` | Top-selling product by revenue | positive |
| `soldout_*` | A top-selling product is currently sold out | warning |
| `strong_sub_share` | Subscription revenue ≥ 20% of gross revenue | positive |
| `active_subs` | Active subscriptions exist | info |

### Technical Files

| File | Role |
|------|------|
| `types/owner-reports.ts` | All Phase 4 types |
| `lib/owner/reports/filters.ts` | `parseReportFilters`, `resolvePresetRange`, `resolveComparePeriod` |
| `lib/owner/reports/labels.ts` | Labels, badge classes, formatters |
| `lib/owner/reports/insights.ts` | `generateTenantInsights`, `generateStoreInsights` |
| `services/owner/reports/owner-report-query.service.ts` | Low-level Prisma aggregations |
| `services/owner/reports/owner-reports.service.ts` | `getTenantOwnerReports`, `getStoreOwnerReports` |
| `app/api/owner/reports/route.ts` | `GET /api/owner/reports` |
| `app/api/owner/stores/[storeId]/reports/route.ts` | `GET /api/owner/stores/[storeId]/reports` |
| `components/owner/reports/` | 13 UI components |
| `__tests__/owner-reports-*.test.ts` | 3 test files |

---

## Services (`services/owner/`)

| Service | Responsibility |
|---------|---------------|
| `owner-authz.service.ts` | Cross-tenant store access guard + tenant ID resolution |
| `owner-dashboard.service.ts` | Store-context KPI aggregation; tenant-level summary |
| `owner-settings.service.ts` | Read/upsert store info, operation settings, store hours |
| `owner-staff.service.ts` | Invite, role change, deactivate/remove with last-owner guard |
| `owner-catalog.service.ts` | List/update categories, products, modifier options — local fields only |
| `owner-integrations.service.ts` | Connection card view model facade |
| `owner-subscriptions.service.ts` | Subscription summary, customer grouping, upcoming orders |

---

## Audit Events (Phase 2)

All owner write operations emit typed `AuditLog` entries with `tenantId`, `storeId`, `actorUserId`, `targetType`, `targetId`:

`OWNER_STORE_SETTINGS_UPDATED` · `OWNER_STORE_HOURS_UPDATED` · `OWNER_STAFF_INVITED` · `OWNER_STAFF_ROLE_UPDATED` · `OWNER_STAFF_DEACTIVATED` · `OWNER_STAFF_REACTIVATED` · `OWNER_STAFF_REMOVED` · `OWNER_PRODUCT_UPDATED` · `OWNER_CATEGORY_UPDATED` · `OWNER_MODIFIER_OPTION_UPDATED` · `OWNER_CONNECTION_DISCONNECTED` · `OWNER_CATALOG_SYNC_REQUESTED`

---

## Prisma Models (Phase 2)

**New model: `StoreHours`** (`store_hours`)
```prisma
model StoreHours {
  id                   String   @id @default(uuid())
  tenantId             String
  storeId              String
  dayOfWeek            Int      // 0 = Sunday … 6 = Saturday
  isOpen               Boolean  @default(true)
  openTimeLocal        String   @default("09:00")
  closeTimeLocal       String   @default("17:00")
  pickupStartTimeLocal String?
  pickupEndTimeLocal   String?
  @@unique([storeId, dayOfWeek])
}
```

**New enums**: `SoldOutResetMode` (NONE / DAILY_AUTO_RESET), `DefaultAvailabilityMode` (AVAILABLE / MANUAL_CONTROLLED)

**Extended `StoreOperationSettings`**: 13 new fields covering subscription policy, pickup policy, and availability settings.

**Extended `CatalogCategory`**: `onlineImageUrl`, `subscriptionImageUrl`, `localUiColor` (owner-local fields).

---

## Phase 5 — Customer & Subscription Management

### New Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/owner/customers` | GET (page) | Customer list with search, filter, sort, pagination |
| `/owner/customers/[customerId]` | GET (page) | Customer detail — Overview / Orders / Subscriptions / Notes tabs |
| `/api/owner/customers` | GET | JSON: customer list + KPI |
| `/api/owner/customers/[customerId]` | GET | JSON: customer detail (KPIs, breakdowns, note) |
| `/api/owner/customers/[customerId]/orders` | GET | JSON: customer order history |
| `/api/owner/customers/[customerId]/subscriptions` | GET | JSON: customer subscription list |
| `/api/owner/customers/[customerId]/notes` | PATCH | Save owner internal note |
| `/api/owner/subscriptions/[subscriptionId]/pause` | POST | Pause subscription |
| `/api/owner/subscriptions/[subscriptionId]/resume` | POST | Resume subscription |
| `/api/owner/subscriptions/[subscriptionId]/cancel` | POST | Cancel subscription (with reason) |
| `/api/owner/subscriptions/[subscriptionId]/next-date` | PATCH | Update next order/billing date |
| `/api/owner/subscriptions/[subscriptionId]/note` | PATCH | Update subscription internal note |

### New Service Files

| File | Exports |
|------|---------|
| `services/owner/customer-service.ts` | `getOwnerCustomers`, `getOwnerCustomerKpi`, `getOwnerCustomerDetail`, `getOwnerCustomerOrders`, `getOwnerCustomerSubscriptions`, `updateOwnerCustomerNote` |
| `services/owner/subscription-management-service.ts` | `pauseOwnerSubscription`, `resumeOwnerSubscription`, `cancelOwnerSubscription`, `updateOwnerSubscriptionNextDate`, `updateOwnerSubscriptionNote` |

### Subscription State Machine

```
ACTIVE ──pause──► PAUSED ──resume──► ACTIVE
ACTIVE ──cancel─► CANCELLED (terminal)
PAUSED ──cancel─► CANCELLED (terminal)
CANCELLED ──✗──── any (blocked)
```

Invalid transitions return `SubscriptionTransitionError` (HTTP 422).

### Permission & Tenant Scope

- All customer/order/subscription queries require `OWNER_PORTAL_MEMBERSHIP_ROLES` membership.
- `customerId` in URLs = `Order.customerId` string field (cross-tenant access returns 404).
- Subscription tenant verification: `subscription.plan.store.tenantId === actorTenantId`.
- Cross-tenant access returns `CROSS_TENANT_ACCESS_DENIED` (HTTP 403).

### Audit Events (Phase 5)

`OWNER_CUSTOMER_NOTE_UPDATED` · `OWNER_SUBSCRIPTION_PAUSED` · `OWNER_SUBSCRIPTION_RESUMED` · `OWNER_SUBSCRIPTION_CANCELLED` · `OWNER_SUBSCRIPTION_NEXT_DATE_UPDATED` · `OWNER_SUBSCRIPTION_NOTE_UPDATED`

All events include: `actorUserId`, `tenantId`, `storeId`, `customerId`, `before`/`after` values, `reason` where applicable.

### Prisma Changes (Phase 5)

**New model: `Customer`** (`customers`)
```prisma
model Customer {
  id                  String    @id @default(cuid())
  tenantId            String
  name                String?
  email               String?
  phone               String?
  internalNote        String?   // owner-only, never exposed to customer-facing surfaces
  noteUpdatedAt       DateTime?
  noteUpdatedByUserId String?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
}
```

**Extended `Subscription`** model with new optional fields:
- `tenantId String?` — denormalized for direct tenant scoping
- `storeId String?` — denormalized
- `nextOrderAt DateTime?` — owner-managed next order date
- `internalNote String?` — owner-only subscription note
- `pausedAt DateTime?` — timestamp when paused
- `cancelReason String?` — reason for cancellation

### UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `CustomerFilterBar` | `app/owner/customers/` | URL-param search/filter/sort bar |
| `CustomerDetailTabs` | `components/owner/customers/` | Tabbed customer detail (Overview/Orders/Subscriptions/Notes) |

### Customer Data Model

"Customers" are identified by the `Order.customerId` string field. The customer list is derived by grouping tenant orders by `customerId`. The `Customer` table stores owner-only metadata (internalNote) keyed by email within the tenant. This approach preserves backward compatibility with existing order data.

---

## Phase 6 — Billing Deep Dive

### Overview

The owner console Billing area gives store operators a self-serve view of their plan, usage, invoices, and plan-change flow. It is built on a clean billing domain that separates internal IDs from any future billing provider IDs.

### Routes

| Route | Purpose |
|-------|---------|
| `/owner/billing` | Billing overview — plan, status, alerts, usage summary, recent invoices |
| `/owner/billing/invoices` | Invoice history with status filter tabs and pagination |
| `/owner/billing/invoices/[invoiceId]` | Invoice detail — line items, payment attempts timeline |
| `/owner/billing/plans` | Plan catalog — compare and change plan with preview |

All routes require `requireOwnerAdminAccess()` (OWNER or ADMIN membership).

### API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/owner/billing/overview` | Full billing overview |
| GET | `/api/owner/billing/usage` | Usage vs plan limits |
| GET | `/api/owner/billing/invoices` | Invoice list (status filter, pagination) |
| GET | `/api/owner/billing/invoices/[invoiceId]` | Invoice detail |
| GET | `/api/owner/billing/plans` | Plan catalog |
| POST | `/api/owner/billing/plans/preview` | Preview a plan change |
| POST | `/api/owner/billing/plans/change` | Submit a plan change request |

### Services

| Service | Location |
|---------|---------|
| `getBillingOverview` | `services/owner/owner-billing.service.ts` |
| `getUsageVsLimits` | `services/owner/owner-billing.service.ts` |
| `listBillingInvoices` | `services/owner/owner-billing.service.ts` |
| `getBillingInvoiceDetail` | `services/owner/owner-billing.service.ts` |
| `getPlanCatalog` | `services/owner/owner-billing.service.ts` |
| `previewPlanChange` | `services/owner/owner-billing.service.ts` |
| `requestPlanChange` | `services/owner/owner-billing.service.ts` |
| `getBillingAlerts` | `services/owner/owner-billing.service.ts` |

### Billing Architecture

```
Owner Console UI
      ↓
  API Routes  (tenant-scoped, OWNER/ADMIN only)
      ↓
  Owner Billing Service  (domain logic, downgrade validation)
      ↓
  Prisma (internal billing entities)  +  BillingProviderAdapter (provider boundary)
```

**Internal billing domain** — all entities use internal UUIDs. External provider references are stored in separate fields (`providerCustomerId`, `providerSubscriptionId`, `providerInvoiceId`) and are never used as primary keys.

**Provider adapter boundary** — `adapters/billing/billing-provider.adapter.ts` defines the `BillingProviderAdapter` interface. The `MockBillingProviderAdapter` is used in development. A `StripeBillingAdapter` can be added without changing the service layer.

**Usage calculation** — computed live from the database (`calculateTenantCurrentUsage` in `lib/billing/usage.ts`) using counts of stores, memberships, connections, orders, and subscriptions for the current billing period. Plan limit keys `stores.max`, `staff.max`, `channels.max`, `orders.monthly`, `subscriptions.monthly` are used (legacy keys `max_stores`, `max_users`, `max_active_integrations`, `monthly_order_limit` are also supported for backward compatibility).

**Downgrade validation** — `previewPlanChange` compares current live usage against each enforced count limit on the target plan. If any metric exceeds the target plan limit, the change is blocked and explicit reasons are returned.

### New Schema Entities (Phase 6)

**New enums**: `BillingInvoiceStatus`, `BillingInvoiceLineType`, `PaymentAttemptStatus`, `UsageMetricStatus`, `SubscriptionChangeType`, `SubscriptionChangeStatus`, `SubscriptionChangeEffectiveMode`

**Extended model: `TenantSubscription`** — added `providerName`, `providerCustomerId`, `providerSubscriptionId`, `nextBillingAt`

**New models**:

| Model | Table | Purpose |
|-------|-------|---------|
| `BillingInvoice` | `billing_invoices` | Full invoice record with status, amounts, period |
| `BillingInvoiceLine` | `billing_invoice_lines` | Line items within an invoice |
| `PaymentAttempt` | `payment_attempts` | Individual payment attempt records |
| `UsageMetricSnapshot` | `usage_metric_snapshots` | Per-metric usage snapshots for a period |
| `SubscriptionChangeRequest` | `subscription_change_requests` | Plan change audit trail with blocking reasons |
| `BillingEventLog` | `billing_event_logs` | Append-only billing event log |

### UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `StatusBadge` | `components/owner/billing/` | Color-mapped status pill |
| `UsageBar` | `components/owner/billing/` | Utilization progress bar |
| `AlertBanner` | `components/owner/billing/` | Priority-ordered billing alert banners |
| `InvoiceStatusBadge` | `components/owner/billing/` | Invoice status badge |
| `PlanChangeFlow` | `components/owner/billing/` | Client-side plan select → preview → confirm flow |

### What Is Real vs Mock

| Feature | Status |
|---------|--------|
| Usage computation from DB | ✅ Real (live counts) |
| Plan catalog & limits | ✅ Real (seeded plans) |
| Invoice list & detail | ✅ Real (internal `BillingInvoice` records) |
| Subscription status & alerts | ✅ Real |
| Plan change request persistence | ✅ Real (creates `SubscriptionChangeRequest`) |
| Upgrade immediate apply | ✅ Real (updates `TenantSubscription`) |
| Proration preview amount | �� Mock (adapter returns null) |
| Provider sync (Stripe webhooks) | 🔲 Not yet |
| Payment method management | 🔲 Not yet |
| Billing portal redirect | 🔲 Not yet |

### Remaining Work

- Real Stripe adapter (`StripeBillingAdapter`) implementation
- Webhook reconciliation: sync Stripe events to `BillingInvoice` and `TenantSubscription`
- Payment method management UI
- Billing portal integration (customer portal session)
- Tax/GST refinements (line items, tax IDs)
- Finance-role billing permissions if needed
- Email notifications for payment failure / trial ending

### Audit Events (Phase 6)

`OWNER_BILLING_PLAN_CHANGE_REQUESTED` · `OWNER_BILLING_PLAN_CHANGE_APPLIED` · `OWNER_BILLING_PLAN_DOWNGRADE_BLOCKED`

All events include: `actorUserId`, `tenantId`, `fromPlanCode`, `toPlanCode`, `changeRequestId`.

---

## Phase 9 — Advanced Analytics & Forecasting

The `/owner/analytics` page is a dedicated analytics hub focused on patterns and forward-looking intelligence, distinct from the historical summaries in `/owner/reports`.

### Features

| Feature | Description |
|---------|-------------|
| **Order Volume Heatmap** | Weekday × hour-slot SVG heatmap with colour-intensity scale. Identifies peak trading hours per store or across all stores. |
| **Revenue Forecast** | 7/14/30-day ahead linear-regression forecast with 80% confidence interval band. Displays both historical actual bars and predicted line. |
| **Production Estimates** | Next-week per-store order volume estimates using trailing 4-week same-weekday average. Delta vs prior period shown per day. |
| **Churn Risk Signals** | Customers with declining order frequency classified as HIGH / MEDIUM / LOW. Links to customer detail pages. |

### Routes

| Route | Description |
|-------|-------------|
| `/owner/analytics` | Analytics hub — summary KPI cards + heatmap + forecast + production table + churn risk table |

### API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/owner/analytics/heatmap` | Weekday × hour-slot order volume matrix |
| GET | `/api/owner/analytics/forecast` | Revenue forecast series with confidence intervals |
| GET | `/api/owner/analytics/production` | Next-week per-store order volume estimates |
| GET | `/api/owner/analytics/churn` | Churn risk signals for at-risk customers |

### Query Parameters

| Parameter | Applies to | Description |
|-----------|-----------|-------------|
| `storeId` | heatmap, forecast, production | Restrict to a single store |
| `storeIds` | production | Comma-separated store IDs |
| `from` / `to` | heatmap | Date range (YYYY-MM-DD) |
| `horizon` | forecast | Forecast horizon: `7`, `14`, or `30` |
| `weekStartDate` | production | ISO Monday date for the target week |
| `windowDays` | churn | Recency window in days (default 90) |

### Services

| Function | Location | Description |
|----------|----------|-------------|
| `getHeatmapData` | `services/owner/owner-analytics.service.ts` | Aggregate orders by weekday × hour |
| `getRevenueForecast` | `services/owner/owner-analytics.service.ts` | Linear regression forecast with CI |
| `getProductionEstimates` | `services/owner/owner-analytics.service.ts` | Same-weekday trailing average per store |
| `getChurnRiskSignals` | `services/owner/owner-analytics.service.ts` | Declining-frequency customer classification |

### UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `AnalyticsFilterBar` | `components/owner/analytics/` | Store selector, date range, horizon toggle |
| `AnalyticsSummaryCards` | `components/owner/analytics/` | 4 KPI cards: peak hour, peak day, projected revenue, at-risk subscribers |
| `HeatmapChart` | `components/owner/analytics/` | SVG 7×24 order volume heatmap with legend |
| `ForecastChart` | `components/owner/analytics/` | SVG forecast with confidence band and actual bar overlay |
| `ProductionEstimateTable` | `components/owner/analytics/` | Per-store, per-day estimate table with delta badges |
| `ChurnRiskTable` | `components/owner/analytics/` | Sortable at-risk customer table with risk level badges |

### Churn Risk Classification

The recency window (default 90 days) is split into two equal halves. For each customer with orders in the window:

| `recentCount / priorCount` | Risk Level |
|---------------------------|-----------|
| < 0.4 | HIGH |
| 0.4 – 0.7 | MEDIUM |
| ≥ 0.7 | LOW |

Customers with zero orders are excluded. Customers with prior orders but zero recent orders are classified as HIGH.

### Forecast Algorithm

Linear regression (OLS) is fit to `3 × horizon` days of historical daily revenue. Predicted values for each future day use `y = intercept + slope × dayIndex`. The 80% confidence interval uses ±1.28σ (residual standard deviation). Predicted and interval values are clamped to ≥ 0.

### Technical Files

| File | Role |
|------|------|
| `types/owner-analytics.ts` | View-model type definitions |
| `services/owner/owner-analytics.service.ts` | All four analytics service functions |
| `app/owner/analytics/page.tsx` | Server component page |
| `app/api/owner/analytics/*/route.ts` | Four API route handlers |
| `components/owner/analytics/` | Six UI components |
| `__tests__/owner-analytics.test.ts` | 36 unit tests |
