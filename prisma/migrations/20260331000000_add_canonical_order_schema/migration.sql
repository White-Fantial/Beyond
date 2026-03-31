-- ============================================================
-- Migration: 20260331000000_add_canonical_order_schema
--
-- Changes:
--   1. Rename legacy tables (orders → legacy_orders, etc.)
--   2. Add order enums
--   3. Create canonical order tables
--   4. Add partial unique index on orders.canonical_order_key
-- ============================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Rename legacy tables so the canonical tables can use their original names.
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE "orders"      RENAME TO "legacy_orders";
ALTER TABLE "order_items" RENAME TO "legacy_order_items";
ALTER TABLE "payments"    RENAME TO "legacy_payments";

-- Rename foreign-key constraints to match the new table names.
ALTER TABLE "legacy_order_items" RENAME CONSTRAINT "order_items_orderId_fkey"   TO "legacy_order_items_orderId_fkey";
ALTER TABLE "legacy_order_items" RENAME CONSTRAINT "order_items_menuItemId_fkey" TO "legacy_order_items_menuItemId_fkey";
ALTER TABLE "legacy_payments"    RENAME CONSTRAINT "payments_orderId_fkey"        TO "legacy_payments_orderId_fkey";

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Create enums
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TYPE "OrderSourceChannel" AS ENUM (
    'POS',
    'UBER_EATS',
    'DOORDASH',
    'ONLINE',
    'SUBSCRIPTION',
    'MANUAL',
    'UNKNOWN'
);

CREATE TYPE "OrderChannelType" AS ENUM (
    'POS',
    'UBER_EATS',
    'DOORDASH',
    'ONLINE',
    'SUBSCRIPTION'
);

CREATE TYPE "OrderChannelRole" AS ENUM (
    'SOURCE',
    'FORWARDED',
    'MIRROR'
);

CREATE TYPE "OrderLinkDirection" AS ENUM (
    'INBOUND',
    'OUTBOUND'
);

CREATE TYPE "OrderStatus" AS ENUM (
    'RECEIVED',
    'ACCEPTED',
    'IN_PROGRESS',
    'READY',
    'COMPLETED',
    'CANCELLED',
    'FAILED'
);

CREATE TYPE "PosSubmissionStatus" AS ENUM (
    'NOT_REQUIRED',
    'PENDING',
    'SENT',
    'ACCEPTED',
    'FAILED',
    'SKIPPED'
);

CREATE TYPE "OrderEventType" AS ENUM (
    'ORDER_RECEIVED',
    'ORDER_CREATED',
    'ORDER_UPDATED',
    'ORDER_STATUS_CHANGED',
    'POS_FORWARD_REQUESTED',
    'POS_FORWARD_SENT',
    'POS_FORWARD_ACCEPTED',
    'POS_FORWARD_FAILED',
    'POS_RECONCILED',
    'ORDER_CANCELLED',
    'RAW_WEBHOOK_RECEIVED',
    'RAW_SYNC_RECEIVED'
);

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Create canonical orders table
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE "orders" (
    "id"                      TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tenantId"                TEXT NOT NULL,
    "storeId"                 TEXT NOT NULL,

    -- Source channel
    "sourceChannel"           "OrderSourceChannel" NOT NULL,
    "sourceConnectionId"      TEXT,
    "sourceOrderRef"          TEXT,
    "sourceCustomerRef"       TEXT,
    "originSubmittedAt"       TIMESTAMP(3),

    -- Lifecycle timestamps
    "orderedAt"               TIMESTAMP(3) NOT NULL,
    "acceptedAt"              TIMESTAMP(3),
    "completedAt"             TIMESTAMP(3),
    "cancelledAt"             TIMESTAMP(3),

    -- Status
    "status"                  "OrderStatus" NOT NULL DEFAULT 'RECEIVED',

    -- Money (integer minor units)
    "subtotalAmount"          INTEGER NOT NULL DEFAULT 0,
    "discountAmount"          INTEGER NOT NULL DEFAULT 0,
    "taxAmount"               INTEGER NOT NULL DEFAULT 0,
    "tipAmount"               INTEGER NOT NULL DEFAULT 0,
    "totalAmount"             INTEGER NOT NULL DEFAULT 0,
    "currencyCode"            TEXT NOT NULL DEFAULT 'NZD',

    -- Customer
    "customerId"              TEXT,
    "customerName"            TEXT,
    "customerPhone"           TEXT,
    "customerEmail"           TEXT,

    -- POS forwarding
    "posForwardingRequired"   BOOLEAN NOT NULL DEFAULT false,
    "posConnectionId"         TEXT,
    "posSubmissionStatus"     "PosSubmissionStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "posOrderRef"             TEXT,
    "posSubmittedAt"          TIMESTAMP(3),
    "posAcceptedAt"           TIMESTAMP(3),

    -- Idempotency / dedup
    "canonicalOrderKey"       TEXT,
    "externalCreatedByBeyond" BOOLEAN NOT NULL DEFAULT false,

    "notes"                   TEXT,
    "rawSourcePayload"        JSONB,

    "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"               TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- Standard indexes
CREATE INDEX "orders_tenantId_storeId_orderedAt_idx"       ON "orders" ("tenantId", "storeId", "orderedAt");
CREATE INDEX "orders_tenantId_storeId_sourceChannel_idx"   ON "orders" ("tenantId", "storeId", "sourceChannel");
CREATE INDEX "orders_sourceConnectionId_sourceOrderRef_idx" ON "orders" ("sourceConnectionId", "sourceOrderRef");
CREATE INDEX "orders_posConnectionId_posOrderRef_idx"      ON "orders" ("posConnectionId", "posOrderRef");

-- Partial unique index: canonicalOrderKey uniqueness only when non-null.
-- This prevents double-counting real orders while allowing null for orders without a key.
CREATE UNIQUE INDEX "orders_tenantId_storeId_canonicalOrderKey_unique"
    ON "orders" ("tenantId", "storeId", "canonicalOrderKey")
    WHERE "canonicalOrderKey" IS NOT NULL;

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. Create canonical order_items table
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE "order_items" (
    "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "orderId"          TEXT NOT NULL,
    "tenantId"         TEXT NOT NULL,
    "storeId"          TEXT NOT NULL,

    "productId"        TEXT,
    "productName"      TEXT NOT NULL,
    "productSku"       TEXT,
    "sourceProductRef" TEXT,
    "quantity"         INTEGER NOT NULL,
    "unitPriceAmount"  INTEGER NOT NULL,
    "totalPriceAmount" INTEGER NOT NULL,

    "notes"            TEXT,
    "rawPayload"       JSONB,

    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "order_items_orderId_fkey"
        FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE CASCADE
);

CREATE INDEX "order_items_orderId_idx"        ON "order_items" ("orderId");
CREATE INDEX "order_items_tenantId_storeId_idx" ON "order_items" ("tenantId", "storeId");

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. Create order_item_modifiers table
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE "order_item_modifiers" (
    "id"                      TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "orderItemId"             TEXT NOT NULL,
    "tenantId"                TEXT NOT NULL,
    "storeId"                 TEXT NOT NULL,

    "modifierGroupId"         TEXT,
    "modifierOptionId"        TEXT,
    "modifierGroupName"       TEXT,
    "modifierOptionName"      TEXT NOT NULL,
    "quantity"                INTEGER NOT NULL DEFAULT 1,
    "unitPriceAmount"         INTEGER NOT NULL DEFAULT 0,
    "totalPriceAmount"        INTEGER NOT NULL DEFAULT 0,

    "sourceModifierGroupRef"  TEXT,
    "sourceModifierOptionRef" TEXT,
    "rawPayload"              JSONB,

    "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"               TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_item_modifiers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "order_item_modifiers_orderItemId_fkey"
        FOREIGN KEY ("orderItemId") REFERENCES "order_items" ("id") ON DELETE CASCADE
);

CREATE INDEX "order_item_modifiers_orderItemId_idx"         ON "order_item_modifiers" ("orderItemId");
CREATE INDEX "order_item_modifiers_tenantId_storeId_idx"    ON "order_item_modifiers" ("tenantId", "storeId");

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. Create order_channel_links table
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE "order_channel_links" (
    "id"                  TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "orderId"             TEXT NOT NULL,
    "tenantId"            TEXT NOT NULL,
    "storeId"             TEXT NOT NULL,

    "channelType"         "OrderChannelType" NOT NULL,
    "connectionId"        TEXT,
    "role"                "OrderChannelRole" NOT NULL,
    "direction"           "OrderLinkDirection" NOT NULL,

    "externalOrderRef"    TEXT,
    "externalDisplayRef"  TEXT,
    "externalStatus"      TEXT,
    "externalCreatedAt"   TIMESTAMP(3),
    "externalUpdatedAt"   TIMESTAMP(3),

    "requestPayload"      JSONB,
    "responsePayload"     JSONB,
    "rawPayload"          JSONB,

    "linkedBy"            TEXT,
    "createdByBeyond"     BOOLEAN NOT NULL DEFAULT false,

    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_channel_links_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "order_channel_links_orderId_fkey"
        FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE CASCADE
);

CREATE INDEX "order_channel_links_orderId_idx"              ON "order_channel_links" ("orderId");
CREATE INDEX "order_channel_links_tenantId_storeId_ch_idx"  ON "order_channel_links" ("tenantId", "storeId", "channelType");
CREATE INDEX "order_channel_links_connectionId_extRef_idx"  ON "order_channel_links" ("connectionId", "externalOrderRef");
CREATE INDEX "order_channel_links_tenantId_storeId_role_idx" ON "order_channel_links" ("tenantId", "storeId", "role");

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. Create order_events table
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE "order_events" (
    "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "orderId"      TEXT NOT NULL,
    "tenantId"     TEXT NOT NULL,
    "storeId"      TEXT NOT NULL,
    "eventType"    "OrderEventType" NOT NULL,
    "channelType"  "OrderChannelType",
    "connectionId" TEXT,
    "payload"      JSONB,
    "message"      TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "order_events_orderId_fkey"
        FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE CASCADE
);

CREATE INDEX "order_events_orderId_createdAt_idx"         ON "order_events" ("orderId", "createdAt");
CREATE INDEX "order_events_tenantId_storeId_createdAt_idx" ON "order_events" ("tenantId", "storeId", "createdAt");

-- ──────────────────────────────────────────────────────────────────────────────
-- 8. Create inbound_webhook_logs table
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE "inbound_webhook_logs" (
    "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tenantId"         TEXT,
    "storeId"          TEXT,
    "connectionId"     TEXT,
    "channelType"      "OrderChannelType",
    "eventName"        TEXT,
    "externalEventRef" TEXT,
    "deliveryId"       TEXT,
    "signatureValid"   BOOLEAN,
    "processingStatus" TEXT NOT NULL,
    "requestHeaders"   JSONB,
    "requestBody"      JSONB,
    "receivedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt"      TIMESTAMP(3),
    "errorMessage"     TEXT,

    CONSTRAINT "inbound_webhook_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "inbound_webhook_logs_channelType_receivedAt_idx"    ON "inbound_webhook_logs" ("channelType", "receivedAt");
CREATE INDEX "inbound_webhook_logs_connectionId_extEventRef_idx"  ON "inbound_webhook_logs" ("connectionId", "externalEventRef");
CREATE INDEX "inbound_webhook_logs_deliveryId_idx"                ON "inbound_webhook_logs" ("deliveryId");
