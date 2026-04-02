# Architecture

## Multi-Tenant Data Model

Beyond uses a three-tier multi-tenant model: **Tenant → Store → User** where access is controlled through two join tables.

```
Tenant (slug: "bagels-beyond")
  │
  ├── Store (code: "addington")   ◄── stores belong to a tenant
  │     └── Connection            ◄── integrations scoped to store + tenant
  │
  ├── Membership (User ↔ Tenant)  ◄── user's role within a tenant
  │     └── StoreMembership       ◄── user's role within a specific store
  │
  └── AuditLog                    ◄── immutable audit trail
```

### Entity Relationship Diagram

```
┌────────────┐        ┌─────────────┐        ┌────────┐
│   Tenant   │──────<│ Membership  │>────────│  User  │
│  slug (UK) │        │ role        │         │ email  │
│  timezone  │        │ status      │         │ pwHash │
│  currency  │        └──────┬──────┘         │ plRole │
└─────┬──────┘               │                └────────┘
      │                      │
      │        ┌─────────────▼──────────┐
      └──────<│    StoreMembership      │
      │        │  membershipId (FK)      │
      │        │  storeId     (FK)       │
      │        │  tenantId    (FK)       │
      │        │  role  status           │
      │        └────────────────────────┘
      │
      └──────<│    Store                │
               │  tenantId (FK)          │
               │  code (UK per tenant)   │
               │  name  status           │
               └──────┬──────────────────┘
                      │
               ┌──────▼──────┐
               │ Connection  │
               │ type        │
               │ provider    │
               │ status      │
               └──────┬──────┘
                      │
               ┌──────▼────────────────┐
               │ ConnectionCredential  │
               │ configEncrypted       │
               │ isActive              │
               └───────────────────────┘
```

### Key Design Decisions

| Concept | Decision |
|---------|----------|
| **Tenant isolation** | Every `Store`, `Membership`, `StoreMembership`, and `Connection` carries a `tenantId` FK. All service functions validate cross-tenant access before write. |
| **Two-level membership** | `Membership` (User ↔ Tenant) and `StoreMembership` (Membership ↔ Store) allow a user to have different roles in different stores of the same tenant. |
| **Connection credentials** | `ConnectionCredential` stores encrypted config separately from `Connection` metadata, enabling credential rotation without changing the connection record. |
| **Audit trail** | `AuditLog` is append-only. `logAuditEvent()` swallows errors so audit failures never block business operations. |
| **JWT sessions** | The session cookie embeds `primaryTenantId`, `primaryMembershipRole`, `primaryStoreId`, `primaryStoreRole` to allow middleware to make routing decisions without a DB hit. |

### Running Migration & Seed

```bash
# Apply migrations (dev)
npx prisma migrate dev --name <migration-name>

# Generate Prisma client after schema changes
npx prisma generate

# Seed demo data (Bagels Beyond tenant)
npm run prisma:seed
```

Seed creates:
- **Tenant**: `bagels-beyond` (Bagels Beyond Ltd, NZD, Pacific/Auckland)
- **Store**: `addington` (Addington Store)
- **User**: `owner@bagelsbeyond.local` / `password123` with OWNER membership

---

## Order Architecture

### Canonical Order Model

Beyond uses a **canonical order model**: every real customer purchase is stored as exactly **one `Order` row** in the database, regardless of which channel the order came from or how many systems it was forwarded to.

```
┌──────────────────────────────────────────────────────────────────────┐
│  External channels (inbound)           │  Execution targets (outbound) │
│  Uber Eats / DoorDash / Online         │  POS (docket print)           │
│  Subscription / POS-direct             │                               │
└───────────────────┬───────────────────────────────┬──────────────────┘
                    │                               │
                    ▼                               ▼
        ┌───────────────────────┐       ┌─────────────────────┐
        │   OrderChannelLink    │       │   OrderChannelLink  │
        │   role = SOURCE       │       │   role = FORWARDED  │
        │   direction = INBOUND │       │   direction = OUTBOUND│
        └───────────┬───────────┘       └──────────┬──────────┘
                    │                              │
                    └──────────────┬───────────────┘
                                   ▼
                         ┌──────────────────┐
                         │   Order (canonical)│
                         │   1 row per purchase│
                         │   sourceChannel    │
                         │   status           │
                         │   totalAmount      │
                         └────────┬───────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
               OrderItem    OrderEvent    InboundWebhookLog
             (line items)  (audit trail)  (raw webhook log)
```

### Key Design Principles

| Principle | Description |
|-----------|-------------|
| **One order per purchase** | One real purchase = one `Order` row, regardless of channel path. |
| **source_channel ≠ forwarding** | `orders.sourceChannel` records where the order originated. `OrderChannelLink` records every channel it touched. |
| **Internal ID / external ID strictly separated** | `orders.id` is an internal UUID only. All external refs are stored in separate fields or `OrderChannelLink.externalOrderRef`. |
| **Raw payload always stored** | Every inbound order event stores its raw payload in `orders.rawSourcePayload` and `InboundWebhookLog.requestBody`. |
| **POS is dual-role** | POS can be the *source* of an order (staff inputs directly), or a *forwarding target* (Beyond sends a delivery order to POS for docket printing). |
| **Reconciliation before creation** | On every POS webhook/sync, the service checks for an existing `FORWARDED` link before creating a new order. |

### Database Tables

| Table | Purpose |
|-------|---------|
| `orders` | Canonical order record (one per real purchase). |
| `order_items` | Line items within a canonical order. |
| `order_item_modifiers` | Modifier/option selections within a line item. |
| `order_channel_links` | Per-channel connection records (SOURCE / FORWARDED / MIRROR). |
| `order_events` | Immutable audit trail for order lifecycle events. |
| `inbound_webhook_logs` | Raw log of every inbound webhook call. |

### Order Enums

| Enum | Values |
|------|--------|
| `OrderSourceChannel` | `POS`, `UBER_EATS`, `DOORDASH`, `ONLINE`, `SUBSCRIPTION`, `MANUAL`, `UNKNOWN` |
| `OrderChannelRole` | `SOURCE`, `FORWARDED`, `MIRROR` |
| `OrderStatus` | `RECEIVED`, `ACCEPTED`, `IN_PROGRESS`, `READY`, `COMPLETED`, `CANCELLED`, `FAILED` |
| `PosSubmissionStatus` | `NOT_REQUIRED`, `PENDING`, `SENT`, `ACCEPTED`, `FAILED`, `SKIPPED` |

### POS Order Cases

**Case 1 — POS is the source**: Staff inputs an order directly on the POS terminal.
```
POS → webhook → reconcilePosWebhookOrSync()
  → No FORWARDED link found
  → Create new Order { sourceChannel: "POS" }
```

**Case 2 — External order forwarded to POS**: An Uber Eats or DoorDash order arrives.
```
Uber Eats → webhook → createCanonicalOrderFromInbound()
  → Create Order { sourceChannel: "UBER_EATS" }

Beyond → forwardOrderToPos()
  → Create OrderChannelLink { role: FORWARDED, direction: OUTBOUND }

POS → webhook (echo) → reconcilePosWebhookOrSync()
  → FORWARDED link found → update existing order (NOT created again)
  → Emit POS_RECONCILED event
```

### Idempotency / Deduplication

Every inbound order with an external ref gets a `canonicalOrderKey`:
```
canonicalOrderKey = "<OrderChannelType>:<storeId>:<externalOrderRef>"
# e.g. "UBER_EATS:store-uuid-001:uber-order-XYZ"
```

A partial unique index (`WHERE canonical_order_key IS NOT NULL`) enforces uniqueness at the database level.

### Order Service API

| Function | Description |
|----------|-------------|
| `createCanonicalOrderFromInbound(input)` | Create a canonical order from an inbound channel event. Idempotent via `canonicalOrderKey`. |
| `forwardOrderToPos(input)` | Mark an order as forwarded to POS, create OUTBOUND channel link. |
| `recordPosForwardResponse(input)` | Record POS acceptance or rejection of a forwarded order. |
| `reconcilePosWebhookOrSync(input)` | Reconcile a POS webhook/sync event — update or create. |
| `listOrders(storeId, opts)` | List canonical orders for a store, newest-first, with items. |
| `getOrderById(orderId)` | Fetch a single order by ID including items and channel links. |
| `updateOrderStatus(orderId, status)` | Transition order status, record event. |

### Order HTTP API Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/orders?storeId=<id>` | List orders for a store. Query params: `status`, `sourceChannel`, `from`, `to`, `limit`, `offset`. |
| `PATCH` | `/api/orders/[orderId]/status` | Transition an order to a new status. |
| `POST` | `/api/orders/[orderId]/forward-to-pos` | Mark an order as forwarded to POS. |
| `POST` | `/api/webhooks/orders/[provider]?storeId=<id>` | Inbound order webhook from delivery platforms. Supported `provider` slugs: `uber-eats`, `doordash`. |

---

## Catalog Architecture

### Overview

The catalog system is organized into three layers:

```
┌──────────────────────────────────────────────────────────────────────┐
│  1. Internal Catalog Tables                                           │
│     catalog_categories, catalog_products, catalog_modifier_groups,   │
│     catalog_modifier_options, catalog_product_categories,            │
│     catalog_product_modifier_groups                                  │
├──────────────────────────────────────────────────────────────────────┤
│  2. External Raw Mirror Tables                                        │
│     external_catalog_categories, external_catalog_products,          │
│     external_catalog_modifier_groups, external_catalog_modifier_options│
│     external_catalog_product_modifier_group_links                    │
├──────────────────────────────────────────────────────────────────────┤
│  3. Channel Mapping Table                                             │
│     channel_entity_mappings                                          │
└──────────────────────────────────────────────────────────────────────┘
```

| Layer | Purpose | Key fields |
|-------|---------|------------|
| **Internal catalog** | Single normalized source of truth for all catalog reads (UI, order UI, subscriptions). IDs are internal UUIDs only. | `id`, `tenantId`, `storeId`, `sourceType`, `sourceOfTruthConnectionId`, `source*Ref` |
| **External mirror** | Raw, unmodified copy of each record fetched from Loyverse. Used for debugging, diffing, and re-syncing. | `connectionId`, `externalId`, `rawPayload`, `lastSyncedAt` |
| **Channel mapping** | Bidirectional lookup table between internal IDs and external channel IDs. Used when sending orders outbound to Loyverse or any channel. | `internalEntityId`, `externalEntityId`, `connectionId`, `entityType` |

### Sync Philosophy

Beyond uses **full catalog sync** rather than incremental/partial sync. On each sync run:
1. All categories, modifier groups, modifier options, and items are fetched from Loyverse.
2. Raw mirror rows are upserted (one per external entity).
3. Internal catalog rows are upserted using source keys (never names).
4. Product–category and product–modifier-group links are reconciled.
5. Channel mapping rows are upserted.

### Source-locked vs Locally Editable Fields

| Field | Editable locally? | Notes |
|-------|------------------|-------|
| `name` | ❌ Source-locked (POS) | Updated only via sync |
| `basePriceAmount` | ❌ Source-locked (POS) | Updated only via sync |
| `displayOrder` | ✅ Local | Reorder categories/products in the backoffice |
| `isVisibleOnOnlineOrder` | ✅ Local | Toggle visibility on online ordering channel |
| `isVisibleOnSubscription` | ✅ Local | Toggle visibility on subscription channel |
| `isFeatured` | ✅ Local | Mark products as featured on the menu |
| `onlineName` | ✅ Local | Override display name for online ordering |
| `imageUrl` | ✅ Local | Upload a custom image |
| `CatalogModifierOption.isSoldOut` | ✅ Local | Mark option as sold out |

### Catalog API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/catalog/categories?storeId=` | List catalog categories |
| `PATCH` | `/api/catalog/categories` | Reorder or update category visibility |
| `GET` | `/api/catalog/products?storeId=` | List catalog products |
| `PATCH` | `/api/catalog/products` | Update allowed local merchandising fields |
| `GET` | `/api/catalog/modifier-groups?storeId=` | List modifier groups with nested options |
| `PATCH` | `/api/catalog/modifier-groups` | Toggle modifier option sold-out |
| `POST` | `/api/catalog/sync` | Trigger full Loyverse catalog sync for a store |

---

## Channel Integrations

### Overview

Store-level external channel integration connects Loyverse POS, Uber Eats, DoorDash, and other external platforms per-store.

### Architecture

```
app/owner/stores/[storeId]/integrations/   # Store-level integration UI
app/api/integrations/
  connect/route.ts         # POST — initiate OAuth flow
  callback/[provider]/route.ts  # GET  — OAuth callback handler
  disconnect/route.ts      # POST — soft-disconnect provider
services/integration.service.ts  # Full connection lifecycle
adapters/integrations/
  base.ts                  # ProviderAdapter interface + registry
  loyverse.adapter.ts      # Loyverse OAuth2 adapter
  uber-eats.adapter.ts     # Uber Eats OAuth2 adapter
  doordash.adapter.ts      # DoorDash OAuth2 + JWT adapter
lib/integrations/crypto.ts # AES-256-GCM encrypt/decryptJson
```

### Database Models

| Model | Purpose |
|-------|---------|
| `ProviderAppCredential` | Tenant-level or platform-global provider app settings (client_id, encrypted client_secret, scopes). |
| `Connection` | Per-store connection instance (status, auth scheme, external merchant/store IDs, last auth validation). |
| `ConnectionCredential` | Lifecycle-aware encrypted credential storage. Supports multiple active credentials per connection. |
| `ConnectionOAuthState` | CSRF state for OAuth flows (expires, consumed once). |
| `ConnectionActionLog` | Per-connection audit trail for UI display and debugging. |

### Encryption

All credential payloads are encrypted at rest using **AES-256-GCM** before being written to `ConnectionCredential.configEncrypted`.

- Module: `lib/integrations/crypto.ts`
- Key: `INTEGRATIONS_ENCRYPTION_KEY` (env var — 64-char hex = 32 bytes)
- Format: `<iv_b64url>:<authTag_b64url>:<ciphertext_b64url>`

Generate a key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Provider Adapters

Each provider implements the `ProviderAdapter` interface:

```typescript
interface ProviderAdapter {
  provider: ConnectionProvider
  buildAuthorizationUrl(input): AuthorizationStartResult
  handleOAuthCallback(input): Promise<OAuthCallbackResult>
  listAvailableStores?(input): Promise<ProviderStoreCandidate[]>
  refreshCredentials?(input): Promise<CredentialRefreshResult | undefined>
}
```

| Provider | Auth Scheme | Refresh | Notes |
|----------|-------------|---------|-------|
| **Loyverse** | OAuth2 | ✅ refresh_token | Standard code flow |
| **Uber Eats** | OAuth2 | ✅ refresh_token | `eats.store` + `eats.order` scopes |
| **DoorDash** | OAuth2 + JWT Bearer | ✅ refresh_token | OAuth for merchant auth; `JWT_SIGNING_KEY` stored for Drive API calls |

### OAuth Flow

```
User clicks "Connect" in UI
  → POST /api/integrations/connect { storeId, provider, connectionType }
  → Creates ConnectionOAuthState (CSRF state, 10-min TTL)
  → Returns { redirectUrl } (provider auth page)

User authorizes on provider
  → Provider redirects to GET /api/integrations/callback/[provider]?code=...&state=...
  → State is validated + consumed
  → Token exchange via adapter.handleOAuthCallback()
  → Connection upserted (CONNECTED status)
  → Credentials encrypted + stored
  → Browser redirected to /owner/stores/[storeId]/integrations?connected=1
```

### API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/integrations/connect` | INTEGRATIONS | Start OAuth flow for a provider |
| `GET` | `/api/integrations/callback/[provider]` | Public | OAuth callback handler |
| `POST` | `/api/integrations/disconnect` | INTEGRATIONS | Soft-disconnect a provider |

### Credential Lifecycle

```
New token           isActive=true
Token refresh       old row → isActive=false, rotatedAt=now; new row created
Disconnect          all active credentials → isActive=false, rotatedAt=now
Re-connect          new credentials created (update existing Connection row)
```

### Environment Variables

```bash
# AES-256-GCM key for encrypting credentials at rest (required)
INTEGRATIONS_ENCRYPTION_KEY="<64-char-hex>"

# Required for OAuth redirect URI construction
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

Provider-specific client IDs and secrets are stored in `ProviderAppCredential` rows in the database (not env vars), encrypted via `configEncrypted`.

---

## Customer Order UI

The customer ordering portal lives under `/store/[storeSlug]` and is a **fully public, no-login-required** ordering interface.

### Route Structure

| Route | Purpose |
|-------|---------|
| `/store/[storeSlug]` | Main order entry — category bar + product card list |
| `/store/[storeSlug]/cart` | Cart review — items, quantities, pickup time summary |
| `/store/[storeSlug]/checkout` | Checkout (stub — payment & order creation coming) |
| `/store/[storeSlug]/subscriptions` | Subscription entry — same catalog filtered for subscription products |

`storeSlug` maps to the `Store.code` field in the database.

### Cart State

Client-side cart is managed via React Context (`lib/cart/cart-context.tsx`):

```typescript
interface CartItem {
  productId: string;
  displayName: string;
  unitPrice: number;          // minor units (cents)
  quantity: number;
  selectedModifiers: SelectedModifier[];
  imageUrl?: string;
  notes?: string;
}
```

### Pickup Time Auto-Selection

```
now + prepMinutes (default: 15 min) + buffer → round up to nearest 10-min slot
```

**Utilities** (`lib/order/pickup-time.ts`):

| Function | Purpose |
|----------|---------|
| `getDefaultPickupTime(params?)` | Returns earliest available pickup time |
| `roundToPickupSlot(date, interval?)` | Rounds a date up to the nearest slot boundary |
| `getAvailablePickupSlots(params?)` | Returns an array of upcoming pickup time slots |
| `formatPickupTime(time)` | Formats a Date as "10:30 AM" |

### Customer Menu Service

All customer-facing data queries go through `services/customer-menu.service.ts`. Important constraints:
- Only reads `catalog_*` tables — never external mirror tables or mapping tables
- Never exposes `sourceRef`, `sourceType`, `syncChecksum`, or any provider-specific field
- Money values are always returned as integer minor units (e.g. `1250` for $12.50)
