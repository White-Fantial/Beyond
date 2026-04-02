# Owner Console

The **Owner Console** (`/owner`) is the business management portal for store owners and admins. It combines a tenant-wide **Owner Dashboard** at `/owner` with store-context operations at `/owner/stores/[storeId]/*`, enforcing multi-tenant isolation throughout.

> **Key separation**: Admin (`/admin`) manages the platform. Owner (`/owner`) manages the store business. These roles never overlap.

## Portal Structure

```
app/owner/
├── layout.tsx                    # Auth guard (OWNER/ADMIN/MANAGER) + OwnerSidebar
├── page.tsx                      # Owner Dashboard (Business Overview / Store Summary / Alerts)
├── stores/
│   ├── page.tsx                  # Store picker; single-store owners auto-redirect
│   └── [storeId]/
│       ├── layout.tsx            # Store context header + sub-nav
│       ├── page.tsx              # Store dashboard — summary cards, channel breakdown, sold-out, upcoming subs
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
