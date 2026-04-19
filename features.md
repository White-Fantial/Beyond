# Beyond — Feature Reference

> Comprehensive catalogue of every feature in the Beyond integrated food-business operations platform, grouped by functional area.

---

## Table of Contents

1. [Authentication & Authorization](#1-authentication--authorization)
2. [Multi-Portal Access Model](#2-multi-portal-access-model)
3. [Back Office — Store Operations](#3-back-office--store-operations)
4. [Owner Console — Multi-Store Management](#4-owner-console--multi-store-management)
5. [Cost Management](#5-cost-management)
6. [Customer Portal](#6-customer-portal)
7. [Public Ordering Portal (Storefront)](#7-public-ordering-portal-storefront)
8. [Marketplace](#8-marketplace)
9. [Catalog Management](#9-catalog-management)
10. [External Integrations](#10-external-integrations)
11. [Admin Console](#11-admin-console)
12. [Notification & Communication](#12-notification--communication)
13. [Platform Infrastructure](#13-platform-infrastructure)

---

## 1. Authentication & Authorization

| Feature | Description |
|---------|-------------|
| **JWT Session Auth** | Stateless JWT sessions stored in an `httpOnly` cookie (`beyond_session`). Signed with `jose` + `bcryptjs`. |
| **Role-Based Access Control (RBAC)** | Six platform roles (`CUSTOMER`, `STAFF`, `SUPERVISOR`, `MANAGER`, `OWNER`, `PLATFORM_ADMIN`) each mapped to a fixed set of named permissions. |
| **Platform Roles** | Additional roles for marketplace participants: `RECIPE_PROVIDER`, `PLATFORM_MODERATOR`. |
| **Named Permissions** | 14 fine-grained permissions: `CUSTOMER_APP`, `ORDERS`, `OPERATIONS`, `INVENTORY`, `MENU_VIEW`, `MENU_MANAGE`, `CATEGORY_MANAGE`, `MODIFIER_MANAGE`, `REPORTS`, `STAFF_MANAGE`, `STORE_SETTINGS`, `INTEGRATIONS`, `BILLING`, `PLATFORM_ADMIN`. |
| **Edge Middleware Protection** | `middleware.ts` enforces role checks at the Next.js edge before any page renders. |
| **Server-Side Permission Checks** | `requirePermission()` helper enforces store-level permission checks inside server actions and API routes. |
| **Post-Login Smart Redirect** | Role + `primaryStoreId` determine the landing page automatically (Backoffice, Owner Console, or Customer App). |

---

## 2. Multi-Portal Access Model

Beyond exposes four independent portals, each with its own URL namespace, layout, and sidebar.

| Portal | URL Prefix | Primary Audience |
|--------|-----------|-----------------|
| **Customer App** | `/app` | End customers — orders, subscriptions, account |
| **Back Office** | `/backoffice` | Store staff — daily operations, orders, inventory |
| **Owner Console** | `/owner` | Business owners — multi-store management, analytics |
| **Admin Console** | `/admin` | Platform administrators |

---

## 3. Back Office — Store Operations

Accessible at `/backoffice/store/[storeId]/`.

| Feature | Description |
|---------|-------------|
| **Order Management** | View and process incoming orders in real time; status transitions; order history. |
| **Inventory Management** | Mark menu items as sold-out; track stock levels. |
| **Menu Management** | Create, update, and archive catalog products within the store context. |
| **Category Management** | Manage product categories and control their visibility to customers. |
| **Modifier Groups & Options** | Create and edit option groups (e.g. sizes, add-ons) attached to menu items. |
| **Store Operations** | Floor control — open/close store; manage daily operational state. |
| **Staff Management** | Add, remove, and update store team members; assign roles and permissions. |
| **Sales Reports** | Per-store sales dashboards and downloadable reports. |
| **Store Catalog** | Browse and edit the canonical internal catalog scoped to the store. |

---

## 4. Owner Console — Multi-Store Management

Accessible at `/owner/`.

### 4a. Dashboard & Analytics

| Feature | Description |
|---------|-------------|
| **Owner Dashboard** | Aggregate KPIs across all stores — revenue, order volume, new customers. |
| **Advanced Analytics** | Deeper trend charts, cohort breakdowns, and time-range comparisons. |
| **Alert Rules** | Define threshold-based alert rules (e.g. revenue drops, error spikes). Alerts are evaluated automatically. |
| **Activity Logs** | Immutable audit log of all owner-level actions across stores. |

### 4b. Store & Team Management

| Feature | Description |
|---------|-------------|
| **Multi-Store Management** | Create and configure multiple stores under one tenant. |
| **Store Settings** | Business hours, address, branding, and operational configuration per store. |
| **Team Management** | Invite team members, assign stores, manage role memberships. |
| **Staff Directory** | Centralized view of all staff across all stores. |

### 4c. Customer & Subscription Management

| Feature | Description |
|---------|-------------|
| **Customer CRM** | Search, view, and manage customer profiles and purchase history. |
| **Subscription Management** | Create and manage customer subscription plans; pause, cancel, or update subscriptions. |
| **Gift Cards** | Issue and void gift cards; track redemption history; apply gift cards to orders. |
| **Promotions & Discounts** | Create promo codes with configurable discount types, limits, and expiry; track redemptions. |

### 4d. Operations & Integrations

| Feature | Description |
|---------|-------------|
| **Connections** | Manage live POS and delivery-platform integration connections per store. |
| **Integrations Overview** | View all configured integrations and their health status. |
| **Billing Management** | View and update subscription plans, payment methods, and invoices. |
| **Reports** | Cross-store reporting on sales, customers, and inventory. |
| **Notifications** | Configure owner-level notification preferences. |
| **Outbound Webhooks** | Register HTTPS endpoints to receive real-time event payloads; HMAC-SHA256 request signing; delivery history and retry tracking. |

---

## 5. Cost Management

Accessible at `/owner/ingredients`, `/owner/recipes`, `/owner/suppliers`, `/owner/supplier-credentials`.

| Feature | Description |
|---------|-------------|
| **Ingredient Management** | Define raw ingredients with unit, cost, and category metadata. |
| **Recipe Management** | Build recipes from ingredients; calculate theoretical cost per serving. |
| **Supplier Management** | Maintain a supplier directory with contact details and product offerings. |
| **Supplier Scraper** | Automated price data collection from supplier websites; configurable per-product scraping jobs. |
| **Supplier Credentials** | Store per-supplier login credentials (encrypted) for authenticated scraping sessions. |
| **Base Price Computation** | After each scrape run, base prices are automatically recomputed across all products for that supplier; `getBasePriceInfo` exposes current vs. previous price deltas. |

---

## 6. Customer Portal

Accessible at `/app/`.

| Feature | Description |
|---------|-------------|
| **Order History** | Browse past orders with status, items, and totals. |
| **Active Subscriptions** | View and manage recurring delivery subscriptions; pause or cancel. |
| **Account Management** | Update profile information, email, and password. |
| **Address Book** | Add, edit, and set default delivery addresses. |
| **Payment Methods** | Add and manage saved payment cards. |
| **Loyalty Program** | Track loyalty points earned from purchases; view tier status and reward history. |
| **Product Reviews** | Submit star ratings and written reviews for purchased items. |
| **Support Tickets** | Open support tickets and continue threaded conversations with store support. |
| **Referrals** | Share referral links; track accepted referrals and bonus rewards. |
| **Push Notification Preferences** | Enable or disable push notification categories per device. |

---

## 7. Public Ordering Portal (Storefront)

Accessible at `/store/[storeSlug]/`.

| Feature | Description |
|---------|-------------|
| **Store Menu** | Public menu browsing — categories, products, modifiers — reads only the internal catalog. |
| **Cart** | Add, remove, and adjust quantities; modifier selection; cart persistence. |
| **Checkout** | Address, payment method selection, and order placement. |
| **Order Confirmation** | Post-payment confirmation page with order summary. |
| **Subscription Ordering** | Choose a recurring subscription plan at checkout. |

---

## 8. Marketplace

Accessible at `/marketplace/` (customers), `/provider/` (recipe providers), `/admin/` (platform moderators).

### 8a. Recipe Marketplace (Customers & Providers)

| Feature | Description |
|---------|-------------|
| **Browse Marketplace Recipes** | Customers browse provider-submitted recipes with ratings, price, and description. |
| **Recipe Purchase** | Customers purchase recipes; Stripe payment intent creation and webhook-based confirmation. |
| **Provider Recipe Submissions** | Providers submit recipes for review via `/provider/recipes`. |
| **Provider Earnings Dashboard** | Providers track payout history and total earnings at `/provider/earnings`. |

### 8b. Provider Onboarding (Stripe Connect)

| Feature | Description |
|---------|-------------|
| **Provider Application** | Users apply to become recipe providers; stored as `ProviderApplication` records. |
| **Admin Review** | Platform admins approve or reject applications at `/admin/provider-applications`. |
| **Stripe Connect Onboarding** | Approved providers complete Stripe Express account setup via hosted onboarding link. |
| **Account Status Refresh** | Automatic re-sync of Stripe Connect account status (`charges_enabled`, `payouts_enabled`). |
| **Provider Payouts** | Platform triggers `createProviderTransfer` to pay out provider earnings after purchase completion. |

### 8c. Platform Ingredients & Ingredient Requests

| Feature | Description |
|---------|-------------|
| **Platform Ingredients** | Admin-curated master ingredient list used as canonical references in marketplace recipes. |
| **Ingredient Requests** | Users request new ingredients to be added; admins review and approve or reject requests. |

### 8d. Recipe Moderation

| Feature | Description |
|---------|-------------|
| **Recipe Review Queue** | Moderators view submitted recipes and approve or reject them at `/admin/marketplace/recipes`. |
| **Moderation Status** | Recipes move through `PENDING → APPROVED / REJECTED` lifecycle. |

---

## 9. Catalog Management

Accessible at `/owner/stores/[storeId]/integrations/[connectionId]/`.

The catalog system is the canonical operational model. External data from POS/delivery platforms flows through eight layers.

### 9a. Internal Catalog (Phase 1)

| Feature | Description |
|---------|-------------|
| **Canonical Internal Catalog** | `catalog_categories`, `catalog_products`, `catalog_modifier_groups`, `catalog_modifier_options` are the single source of truth. |
| **Origin Provenance** | `originType` (`BEYOND_CREATED`, `IMPORTED_FROM_POS`, `IMPORTED_FROM_DELIVERY`, `IMPORTED_FROM_OTHER`) tracks where an entity originated. Does not restrict editing. |
| **Unrestricted Editing** | All catalog entities are fully editable regardless of origin (no source-lock). |

### 9b. Catalog Import (Phase 2)

| Feature | Description |
|---------|-------------|
| **Full Catalog Import** | `runFullCatalogImport` pulls the full catalog from an external channel via the provider adapter and normalizes it. |
| **Import Run Tracking** | `CatalogImportRun` records each import with status, row counts, and timestamps. |
| **External Snapshots** | Raw payloads are stored in `external_catalog_snapshots` for auditability. |
| **Adapters** | Loyverse, Uber Eats, and DoorDash catalog import adapters. |

### 9c. Channel Entity Mapping (Phase 3)

| Feature | Description |
|---------|-------------|
| **Auto-Matching** | Catalog matchers automatically link internal entities to external entities by name/slug similarity. |
| **Manual Mapping** | Operators can manually link or unlink entity pairs. |
| **Mapping Statuses** | `ACTIVE`, `NEEDS_REVIEW`, `UNMATCHED`, `BROKEN`, `ARCHIVED`. |
| **Mapping API** | 9 API routes under `/api/catalog/mappings/`. |

### 9d. Outbound Publish Layer (Phase 4)

| Feature | Description |
|---------|-------------|
| **One-Way Publish** | Internal catalog changes are pushed to external channels (Internal → External only). |
| **Changed-Only Publish** | SHA-256 hash comparison (`lastPublishHash`) skips unchanged entities. |
| **Per-Entity Publish Jobs** | `CatalogPublishJob` records each publish attempt with status and error detail. |
| **Payload Builders** | Provider-specific payload builders for Loyverse, Uber Eats, and DoorDash. |
| **Publish UI** | `/owner/stores/[storeId]/integrations/[connectionId]/publish`. |

### 9e. External Change Detection (Phase 5)

| Feature | Description |
|---------|-------------|
| **Import Diff Detection** | Successive import runs are compared; field-level differences are logged as `ExternalCatalogChange` records. |
| **Field-Level Diffs** | `ExternalCatalogChangeField` captures old value, new value, and field name per change. |
| **Acknowledge / Ignore** | Operators review detected changes and acknowledge or ignore them without automatic data updates. |
| **Change Detection UI** | `/owner/stores/[storeId]/integrations/[connectionId]/external-changes`. |

### 9f. Conflict Detection & Resolution (Phase 6)

| Feature | Description |
|---------|-------------|
| **Conflict Detection** | Conflicts are derived by comparing internal catalog state against external detected changes when both sides have changed the same field differently. |
| **Field-Level & Structure-Level Conflicts** | `CatalogConflictField` and structure-level sub-types capture granular diff details. |
| **Resolution Strategies** | `KEEP_INTERNAL`, `ACCEPT_EXTERNAL`, `MERGE_MANUALLY`, `DEFER`, `IGNORE`. |
| **Resolution Logging** | All resolution decisions are recorded in `CatalogConflictResolutionLog`. |
| **Conflict UI** | `/owner/stores/[storeId]/integrations/[connectionId]/conflicts`. |

### 9g. Policy-Based Two-Way Sync (Phase 7)

| Feature | Description |
|---------|-------------|
| **Sync Policies** | Per-field `CatalogSyncPolicy` records specify direction, conflict strategy, and auto-apply mode (`NEVER` / `SAFE_ONLY` / `ALWAYS`). |
| **Sync Plan Generation** | Planner evaluates open changes and resolved conflicts against policies to produce a `CatalogSyncPlan` with `CatalogSyncPlanItem` records. |
| **Sync Execution** | Executor routes each READY plan item to the inbound-apply service (External → Internal) or publish service (Internal → External). |
| **Field Whitelists** | Prevents external changes from overwriting internal-only fields. |
| **Loop Guard** | Prevents echo conflicts from publish-triggered re-imports. |
| **Sync Execution Logs** | All executions recorded in `CatalogSyncExecutionLog`. |
| **Sync UI** | `/owner/stores/[storeId]/integrations/[connectionId]/sync`. |

### 9h. Advanced Merge Editor (Phase 8)

| Feature | Description |
|---------|-------------|
| **Merge Drafts** | Operators create a `CatalogMergeDraft` session linked to a conflict. |
| **Field-Level Choices** | `TAKE_INTERNAL`, `TAKE_EXTERNAL`, `CUSTOM_VALUE` per field. |
| **Structure-Level Choices** | `KEEP_INTERNAL_SET`, `TAKE_EXTERNAL_SET`, `MERGE_SELECTED`, `CUSTOM_STRUCTURE` for sets (e.g. modifier options). |
| **Draft Lifecycle** | `DRAFT → VALIDATED → PLAN_GENERATED → APPLIED`. |
| **Validation** | Business rule validation (name length, price ≥ 0, minSelect ≤ maxSelect, CUSTOM_VALUE requires a value). |
| **Apply Targets** | `INTERNAL_ONLY`, `EXTERNAL_ONLY`, `INTERNAL_THEN_EXTERNAL`. |
| **Merge UI** | `/owner/stores/[storeId]/integrations/[connectionId]/merge`. |

---

## 10. External Integrations

### 10a. POS Systems

| Adapter | Description |
|---------|-------------|
| **Loyverse** | Full catalog import/publish, order forwarding, and entity mapping. |

### 10b. Delivery Platforms

| Adapter | Description |
|---------|-------------|
| **Uber Eats** | Catalog import and publish adapters. |
| **DoorDash** | Catalog import and publish adapters. |

### 10c. Payment

| Adapter | Description |
|---------|-------------|
| **Stripe** | One-time payment intents, subscription billing, webhook event verification. |
| **Stripe Connect** | Provider onboarding, Express account creation, provider payouts via transfers. |

### 10d. Email

| Adapter | Description |
|---------|-------------|
| **Resend** | Transactional email delivery via `resend.adapter.ts`; injectable adapter for testing. |

---

## 11. Admin Console

Accessible at `/admin/`.

| Feature | Description |
|---------|-------------|
| **Tenant Management** | Create, view, and manage platform tenants (businesses). |
| **User Management** | Search, view, impersonate, and deactivate platform users. |
| **Store Management** | Admin-level visibility and control over all stores. |
| **Subscription & Plan Management** | Define and modify subscription plans; view all active subscriptions. |
| **Billing Overview** | Platform-level billing health and revenue metrics. |
| **Analytics & Metrics** | Platform-wide KPI dashboards; usage and growth metrics. |
| **Feature Flags** | Toggle feature flags per tenant or platform-wide without deployments. |
| **Logs & Audit** | Access structured audit logs and raw application logs. |
| **System Health Monitoring** | Real-time health checks, uptime metrics, and incident tracking. |
| **Job Management** | View and manage background job queues and execution history. |
| **Incident Management** | Create, update, and resolve platform incidents. |
| **Integration Recovery** | Diagnose and recover broken external integration connections. |
| **GDPR & Compliance** | Export user data as CSV; initiate user data erasure (anonymisation); generate data retention reports. |
| **Provider Applications** | Review and approve/reject recipe provider applications. |
| **Ingredient Requests Review** | Review and approve/reject customer-submitted ingredient requests. |
| **Marketplace Recipe Moderation** | Review submitted marketplace recipes. |

---

## 12. Notification & Communication

| Feature | Description |
|---------|-------------|
| **Transactional Emails** | Order confirmations, subscription notices, and alert digests sent via Resend; every delivery logged in `EmailLog`. |
| **Push Notifications** | Web push delivery via `push-notifications.service.ts`; per-user opt-in stored in `PushPreference`. |
| **Server-Sent Events (SSE)** | Real-time event stream at `/api/sse` for live order updates and alerts. |
| **Outbound Webhooks** | HMAC-SHA256-signed HTTP POST payloads to owner-registered endpoints; delivery history with retry tracking. |
| **Alert Rules Engine** | Owner-defined alert rules evaluated on a schedule; matched alerts surface in the Owner Console and trigger notifications. |

---

## 13. Platform Infrastructure

| Feature | Description |
|---------|-------------|
| **Multi-Tenancy** | Every resource (`Store`, `User`, `Order`, catalog entities, etc.) is scoped to a `Tenant`, enabling multiple businesses on a single deployment. |
| **Domain-Driven Structure** | Business domains (order, catalog, payment, …) own their types in `domains/` and logic in `services/`. |
| **Adapter Pattern** | POS, delivery, payment, billing, and email integrations are isolated behind adapter interfaces for easy swapping. |
| **Server Components by Default** | Next.js App Router server components used everywhere; `"use client"` only where interactivity is required. |
| **Encryption at Rest** | External integration credentials are encrypted with `INTEGRATIONS_ENCRYPTION_KEY` before storage. |
| **Audit Trail** | Key platform actions emit `ComplianceEvent` records and appear in owner activity logs. |
| **Feature Flag System** | `lib/flags/` + `admin-feature-flag.service.ts` enable runtime toggling of features per tenant. |
| **Export Utilities** | `lib/export/` supports CSV and PDF report generation. |
| **Test Suite** | Vitest test suites in `__tests__/` covering services, API routes, and adapters (800 + tests). |
