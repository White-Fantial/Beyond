-- CreateEnum
CREATE TYPE "CatalogSourceType" AS ENUM ('POS', 'DELIVERY', 'LOCAL', 'MERGED', 'IMPORTED');

-- CreateEnum
CREATE TYPE "CatalogChannelType" AS ENUM ('LOYVERSE', 'UBER_EATS', 'DOORDASH', 'ONLINE_ORDER', 'SUBSCRIPTION', 'OTHER');

-- CreateEnum
CREATE TYPE "CatalogEntityType" AS ENUM ('CATEGORY', 'PRODUCT', 'MODIFIER_GROUP', 'MODIFIER_OPTION');

-- CreateEnum
CREATE TYPE "MappingStatus" AS ENUM ('ACTIVE', 'BROKEN', 'PENDING', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'TRIAL', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('USER', 'PLATFORM_ADMIN', 'PLATFORM_SUPPORT');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'ANALYST');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED');

-- CreateEnum
CREATE TYPE "StoreStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StoreRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'SUPERVISOR', 'STAFF');

-- CreateEnum
CREATE TYPE "StoreMembershipStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'REMOVED');

-- CreateEnum
CREATE TYPE "ConnectionType" AS ENUM ('POS', 'DELIVERY', 'PAYMENT');

-- CreateEnum
CREATE TYPE "ConnectionProvider" AS ENUM ('LOYVERSE', 'LIGHTSPEED', 'UBER_EATS', 'DOORDASH', 'STRIPE', 'OTHER');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('NOT_CONNECTED', 'CONNECTING', 'CONNECTED', 'ERROR', 'REAUTH_REQUIRED', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "ProviderEnvironment" AS ENUM ('SANDBOX', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "AuthScheme" AS ENUM ('OAUTH2', 'JWT_BEARER', 'API_KEY', 'BASIC', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CredentialType" AS ENUM ('OAUTH_TOKEN', 'CLIENT_CREDENTIAL', 'JWT_SIGNING_KEY', 'JWT_ASSERTION', 'API_KEY', 'WEBHOOK_SECRET', 'CUSTOM_SECRET');

-- CreateEnum
CREATE TYPE "ConnectionActionType" AS ENUM ('CONNECT_START', 'CONNECT_CALLBACK', 'CONNECT_SUCCESS', 'CONNECT_FAILURE', 'REFRESH_SUCCESS', 'REFRESH_FAILURE', 'DISCONNECT', 'REAUTHORIZE', 'STORE_MAPPING_UPDATE', 'SYNC_TEST');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('NEVER', 'RUNNING', 'SUCCESS', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED', 'EXPIRED', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "SubscriptionEventType" AS ENUM ('PLAN_ASSIGNED', 'PLAN_CHANGED', 'TRIAL_EXTENDED', 'STATUS_CHANGED', 'CANCEL_AT_PERIOD_END_SET', 'SUBSCRIPTION_REACTIVATED', 'BILLING_OVERRIDE_APPLIED', 'BILLING_NOTE_ADDED');

-- CreateEnum
CREATE TYPE "BillingRecordType" AS ENUM ('INVOICE', 'PAYMENT', 'ADJUSTMENT', 'CREDIT', 'NOTE');

-- CreateEnum
CREATE TYPE "BillingRecordStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE');

-- CreateEnum
CREATE TYPE "BillingInvoiceStatus" AS ENUM ('PAID', 'OPEN', 'PAST_DUE', 'FAILED', 'VOID', 'REFUNDED', 'DRAFT');

-- CreateEnum
CREATE TYPE "BillingInvoiceLineType" AS ENUM ('PLAN', 'USAGE', 'ADJUSTMENT', 'CREDIT', 'TAX');

-- CreateEnum
CREATE TYPE "PaymentAttemptStatus" AS ENUM ('SUCCEEDED', 'FAILED', 'REQUIRES_ACTION', 'PROCESSING', 'CANCELED');

-- CreateEnum
CREATE TYPE "UsageMetricStatus" AS ENUM ('NORMAL', 'NEAR_LIMIT', 'REACHED', 'EXCEEDED');

-- CreateEnum
CREATE TYPE "SubscriptionChangeType" AS ENUM ('UPGRADE', 'DOWNGRADE');

-- CreateEnum
CREATE TYPE "SubscriptionChangeStatus" AS ENUM ('PENDING', 'BLOCKED', 'CONFIRMED', 'APPLIED', 'CANCELED');

-- CreateEnum
CREATE TYPE "SubscriptionChangeEffectiveMode" AS ENUM ('IMMEDIATE', 'NEXT_CYCLE');

-- CreateEnum
CREATE TYPE "SoldOutResetMode" AS ENUM ('NONE', 'DAILY_AUTO_RESET');

-- CreateEnum
CREATE TYPE "DefaultAvailabilityMode" AS ENUM ('AVAILABLE', 'MANUAL_CONTROLLED');

-- CreateEnum
CREATE TYPE "OrderSourceChannel" AS ENUM ('POS', 'UBER_EATS', 'DOORDASH', 'ONLINE', 'SUBSCRIPTION', 'MANUAL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "OrderChannelType" AS ENUM ('POS', 'UBER_EATS', 'DOORDASH', 'ONLINE', 'SUBSCRIPTION', 'MANUAL');

-- CreateEnum
CREATE TYPE "OrderChannelRole" AS ENUM ('SOURCE', 'FORWARDED', 'MIRROR');

-- CreateEnum
CREATE TYPE "OrderLinkDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('RECEIVED', 'ACCEPTED', 'IN_PROGRESS', 'READY', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "PosSubmissionStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'SENT', 'ACCEPTED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "OrderEventType" AS ENUM ('ORDER_RECEIVED', 'ORDER_CREATED', 'ORDER_UPDATED', 'ORDER_STATUS_CHANGED', 'POS_FORWARD_REQUESTED', 'POS_FORWARD_SENT', 'POS_FORWARD_ACCEPTED', 'POS_FORWARD_FAILED', 'POS_RECONCILED', 'ORDER_CANCELLED', 'RAW_WEBHOOK_RECEIVED', 'RAW_SYNC_RECEIVED');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('CATALOG_SYNC', 'CONNECTION_VALIDATE', 'CONNECTION_REFRESH_CHECK', 'ORDER_RECOVERY_RETRY', 'ORDER_RECONCILIATION_RETRY', 'ANALYTICS_REBUILD');

-- CreateEnum
CREATE TYPE "JobRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "JobTriggerSource" AS ENUM ('SYSTEM', 'ADMIN_MANUAL', 'ADMIN_RETRY');

-- CreateEnum
CREATE TYPE "FlagType" AS ENUM ('BOOLEAN', 'STRING', 'INTEGER', 'JSON', 'VARIANT');

-- CreateEnum
CREATE TYPE "FlagStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FlagScopeType" AS ENUM ('GLOBAL', 'TENANT', 'STORE', 'USER', 'ROLE', 'PORTAL', 'PROVIDER', 'ENVIRONMENT', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "CustomerNotificationType" AS ENUM ('ORDER_STATUS_UPDATE', 'SUBSCRIPTION_REMINDER', 'PAYMENT_ISSUE', 'GENERAL');

-- CreateEnum
CREATE TYPE "LoyaltyTransactionType" AS ENUM ('EARN', 'REDEEM', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "LoyaltyTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "AlertMetricType" AS ENUM ('CANCELLATION_RATE', 'REVENUE_DROP', 'SOLD_OUT_COUNT', 'ORDER_FAILURE_RATE', 'LOW_STOCK_ITEMS', 'POS_DISCONNECT', 'DELIVERY_DISCONNECT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ALERT_TRIGGERED', 'SYSTEM_INFO', 'BILLING_REMINDER', 'SUBSCRIPTION_EVENT', 'INTEGRATION_ISSUE', 'STAFF_ACTIVITY');

-- CreateEnum
CREATE TYPE "PromoDiscountType" AS ENUM ('PERCENT', 'FIXED_AMOUNT', 'FREE_ITEM');

-- CreateEnum
CREATE TYPE "PromoStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportTicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "GiftCardTransactionType" AS ENUM ('ISSUE', 'REDEEM', 'REFUND', 'VOID');

-- CreateEnum
CREATE TYPE "EmailLogStatus" AS ENUM ('SENT', 'FAILED', 'BOUNCED');

-- CreateEnum
CREATE TYPE "ComplianceEventType" AS ENUM ('DATA_EXPORT', 'ERASURE_REQUEST', 'ERASURE_COMPLETE');

-- CreateEnum
CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "timezone" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT,
    "authProvider" TEXT,
    "authProviderUserId" TEXT,
    "platformRole" "PlatformRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'INVITED',
    "invitedByUserId" TEXT,
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "StoreStatus" NOT NULL DEFAULT 'ACTIVE',
    "phone" TEXT,
    "email" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "region" TEXT,
    "postalCode" TEXT,
    "countryCode" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "openingDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_memberships" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "role" "StoreRole" NOT NULL,
    "status" "StoreMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_app_credentials" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "provider" "ConnectionProvider" NOT NULL,
    "environment" "ProviderEnvironment" NOT NULL DEFAULT 'PRODUCTION',
    "displayName" TEXT NOT NULL,
    "authScheme" "AuthScheme" NOT NULL,
    "clientId" TEXT,
    "keyId" TEXT,
    "developerId" TEXT,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "configEncrypted" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_app_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connections" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "type" "ConnectionType" NOT NULL,
    "provider" "ConnectionProvider" NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'NOT_CONNECTED',
    "displayName" TEXT,
    "externalMerchantId" TEXT,
    "externalStoreId" TEXT,
    "externalStoreName" TEXT,
    "externalLocationId" TEXT,
    "authScheme" "AuthScheme",
    "appCredentialId" TEXT,
    "capabilitiesJson" JSONB,
    "metadataJson" JSONB,
    "lastConnectedAt" TIMESTAMP(3),
    "lastAuthValidatedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "reauthRequiredAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connection_credentials" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "credentialType" "CredentialType" NOT NULL,
    "authScheme" "AuthScheme" NOT NULL,
    "label" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "configEncrypted" TEXT NOT NULL,
    "tokenReferenceHash" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "refreshAfter" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "lastRefreshAt" TIMESTAMP(3),
    "lastRefreshStatus" TEXT,
    "lastRefreshError" TEXT,
    "canRefresh" BOOLEAN NOT NULL DEFAULT false,
    "requiresReauth" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rotatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connection_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connection_oauth_states" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "provider" "ConnectionProvider" NOT NULL,
    "connectionType" "ConnectionType" NOT NULL,
    "state" TEXT NOT NULL,
    "codeVerifier" TEXT,
    "redirectUri" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connection_oauth_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connection_action_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "connectionId" TEXT,
    "provider" "ConnectionProvider" NOT NULL,
    "actionType" "ConnectionActionType" NOT NULL,
    "status" TEXT NOT NULL,
    "actorUserId" TEXT,
    "message" TEXT,
    "errorCode" TEXT,
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connection_action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "storeId" TEXT,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_items" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "option_groups" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "maxSelections" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "option_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_options" (
    "id" TEXT NOT NULL,
    "optionGroupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "additionalPrice" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "menu_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legacy_orders" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "channelType" TEXT NOT NULL,
    "externalOrderId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalAmount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legacy_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legacy_order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "totalPrice" INTEGER NOT NULL,
    "options" JSONB,

    CONSTRAINT "legacy_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legacy_payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "amount" INTEGER NOT NULL,
    "provider" TEXT,
    "externalTransactionId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legacy_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "sourceChannel" "OrderSourceChannel" NOT NULL,
    "sourceConnectionId" TEXT,
    "sourceOrderRef" TEXT,
    "sourceCustomerRef" TEXT,
    "originSubmittedAt" TIMESTAMP(3),
    "orderedAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "status" "OrderStatus" NOT NULL DEFAULT 'RECEIVED',
    "subtotalAmount" INTEGER NOT NULL DEFAULT 0,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "taxAmount" INTEGER NOT NULL DEFAULT 0,
    "tipAmount" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'NZD',
    "customerId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "posForwardingRequired" BOOLEAN NOT NULL DEFAULT false,
    "posConnectionId" TEXT,
    "posSubmissionStatus" "PosSubmissionStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "posOrderRef" TEXT,
    "posSubmittedAt" TIMESTAMP(3),
    "posAcceptedAt" TIMESTAMP(3),
    "canonicalOrderKey" TEXT,
    "externalCreatedByBeyond" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "rawSourcePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "productSku" TEXT,
    "sourceProductRef" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPriceAmount" INTEGER NOT NULL,
    "totalPriceAmount" INTEGER NOT NULL,
    "notes" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item_modifiers" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "modifierGroupId" TEXT,
    "modifierOptionId" TEXT,
    "modifierGroupName" TEXT,
    "modifierOptionName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPriceAmount" INTEGER NOT NULL DEFAULT 0,
    "totalPriceAmount" INTEGER NOT NULL DEFAULT 0,
    "sourceModifierGroupRef" TEXT,
    "sourceModifierOptionRef" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_item_modifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_channel_links" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "channelType" "OrderChannelType" NOT NULL,
    "connectionId" TEXT,
    "role" "OrderChannelRole" NOT NULL,
    "direction" "OrderLinkDirection" NOT NULL,
    "externalOrderRef" TEXT,
    "externalDisplayRef" TEXT,
    "externalStatus" TEXT,
    "externalCreatedAt" TIMESTAMP(3),
    "externalUpdatedAt" TIMESTAMP(3),
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "rawPayload" JSONB,
    "linkedBy" TEXT,
    "createdByBeyond" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_channel_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_events" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "eventType" "OrderEventType" NOT NULL,
    "channelType" "OrderChannelType",
    "connectionId" TEXT,
    "payload" JSONB,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inbound_webhook_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "storeId" TEXT,
    "connectionId" TEXT,
    "channelType" "OrderChannelType",
    "eventName" TEXT,
    "externalEventRef" TEXT,
    "deliveryId" TEXT,
    "signatureValid" BOOLEAN,
    "processingStatus" TEXT NOT NULL,
    "requestHeaders" JSONB,
    "requestBody" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,

    CONSTRAINT "inbound_webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_integrations" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "externalStoreId" TEXT,
    "config" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_integrations" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "externalShopId" TEXT,
    "config" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "internalNote" TEXT,
    "noteUpdatedAt" TIMESTAMP(3),
    "noteUpdatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "interval" TEXT NOT NULL,
    "benefits" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "nextBillingDate" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "tenantId" TEXT,
    "storeId" TEXT,
    "nextOrderAt" TIMESTAMP(3),
    "internalNote" TEXT,
    "pausedAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_categories" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "sourceType" "CatalogSourceType" NOT NULL,
    "sourceOfTruthConnectionId" TEXT,
    "sourceCategoryRef" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVisibleOnOnlineOrder" BOOLEAN NOT NULL DEFAULT true,
    "isVisibleOnSubscription" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" TEXT,
    "onlineImageUrl" TEXT,
    "subscriptionImageUrl" TEXT,
    "localUiColor" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "catalog_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_products" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "sourceType" "CatalogSourceType" NOT NULL,
    "sourceOfTruthConnectionId" TEXT,
    "sourceProductRef" TEXT,
    "sku" TEXT,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "shortDescription" TEXT,
    "basePriceAmount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'NZD',
    "imageUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSellable" BOOLEAN NOT NULL DEFAULT true,
    "isSoldOut" BOOLEAN NOT NULL DEFAULT false,
    "isVisibleOnOnlineOrder" BOOLEAN NOT NULL DEFAULT true,
    "isVisibleOnSubscription" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "posName" TEXT,
    "onlineName" TEXT,
    "subscriptionName" TEXT,
    "internalNote" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "catalog_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_product_categories" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_modifier_groups" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "sourceType" "CatalogSourceType" NOT NULL,
    "sourceOfTruthConnectionId" TEXT,
    "sourceModifierGroupRef" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "selectionMin" INTEGER NOT NULL DEFAULT 0,
    "selectionMax" INTEGER,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVisibleOnOnlineOrder" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "catalog_modifier_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_modifier_options" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "modifierGroupId" TEXT NOT NULL,
    "sourceType" "CatalogSourceType" NOT NULL,
    "sourceOfTruthConnectionId" TEXT,
    "sourceModifierOptionRef" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceDeltaAmount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'NZD',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSoldOut" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "catalog_modifier_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_product_modifier_groups" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "modifierGroupId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "overrideSelectionMin" INTEGER,
    "overrideSelectionMax" INTEGER,
    "overrideRequired" BOOLEAN,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_product_modifier_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_catalog_categories" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "channelType" "CatalogChannelType" NOT NULL,
    "externalId" TEXT NOT NULL,
    "externalParentId" TEXT,
    "normalizedName" TEXT,
    "rawPayload" JSONB NOT NULL,
    "externalUpdatedAt" TIMESTAMP(3),
    "syncChecksum" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_catalog_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_catalog_products" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "channelType" "CatalogChannelType" NOT NULL,
    "externalId" TEXT NOT NULL,
    "externalParentId" TEXT,
    "normalizedName" TEXT,
    "normalizedPriceAmount" INTEGER,
    "rawPayload" JSONB NOT NULL,
    "externalUpdatedAt" TIMESTAMP(3),
    "syncChecksum" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_catalog_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_catalog_modifier_groups" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "channelType" "CatalogChannelType" NOT NULL,
    "externalId" TEXT NOT NULL,
    "externalParentId" TEXT,
    "normalizedName" TEXT,
    "rawPayload" JSONB NOT NULL,
    "externalUpdatedAt" TIMESTAMP(3),
    "syncChecksum" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_catalog_modifier_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_catalog_modifier_options" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "channelType" "CatalogChannelType" NOT NULL,
    "externalId" TEXT NOT NULL,
    "externalParentId" TEXT,
    "normalizedName" TEXT,
    "normalizedPriceAmount" INTEGER,
    "rawPayload" JSONB NOT NULL,
    "externalUpdatedAt" TIMESTAMP(3),
    "syncChecksum" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_catalog_modifier_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_catalog_product_modifier_group_links" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "channelType" "CatalogChannelType" NOT NULL,
    "externalProductId" TEXT NOT NULL,
    "externalModifierGroupId" TEXT NOT NULL,
    "rawPayload" JSONB,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_catalog_product_modifier_group_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_entity_mappings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "entityType" "CatalogEntityType" NOT NULL,
    "internalEntityId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "channelType" "CatalogChannelType" NOT NULL,
    "externalEntityId" TEXT NOT NULL,
    "externalParentId" TEXT,
    "mappingStatus" "MappingStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_entity_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_runs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "storeId" TEXT,
    "provider" TEXT,
    "jobType" "JobType" NOT NULL,
    "status" "JobRunStatus" NOT NULL DEFAULT 'QUEUED',
    "triggerSource" "JobTriggerSource" NOT NULL,
    "triggeredByUserId" TEXT,
    "parentRunId" TEXT,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "inputJson" JSONB,
    "resultJson" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "queuedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "PlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "billingInterval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
    "priceAmountMinor" INTEGER NOT NULL DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'NZD',
    "trialDays" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_limits" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "valueInt" INTEGER,
    "valueText" TEXT,
    "valueBool" BOOLEAN,
    "unit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_features" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "configJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_billing_accounts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "billingEmail" TEXT NOT NULL,
    "companyName" TEXT,
    "legalName" TEXT,
    "taxNumber" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "region" TEXT,
    "postalCode" TEXT,
    "countryCode" TEXT,
    "externalCustomerRef" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_billing_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_subscriptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "billingInterval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "trialStart" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "reactivatedAt" TIMESTAMP(3),
    "externalSubscriptionRef" TEXT,
    "externalPriceRef" TEXT,
    "providerName" TEXT,
    "providerCustomerId" TEXT,
    "providerSubscriptionId" TEXT,
    "nextBillingAt" TIMESTAMP(3),
    "overrideJson" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_subscription_events" (
    "id" TEXT NOT NULL,
    "tenantSubscriptionId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventType" "SubscriptionEventType" NOT NULL,
    "actorUserId" TEXT,
    "actorLabel" TEXT,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "fromPlanId" TEXT,
    "toPlanId" TEXT,
    "note" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_subscription_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tenantSubscriptionId" TEXT,
    "recordType" "BillingRecordType" NOT NULL,
    "status" "BillingRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "amountMinor" INTEGER,
    "currencyCode" TEXT,
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "externalInvoiceRef" TEXT,
    "summary" TEXT NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_invoices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "providerInvoiceId" TEXT,
    "invoiceNumber" TEXT,
    "status" "BillingInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'NZD',
    "subtotalMinor" INTEGER NOT NULL DEFAULT 0,
    "taxMinor" INTEGER NOT NULL DEFAULT 0,
    "totalMinor" INTEGER NOT NULL DEFAULT 0,
    "amountPaidMinor" INTEGER NOT NULL DEFAULT 0,
    "amountDueMinor" INTEGER NOT NULL DEFAULT 0,
    "billedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "hostedInvoiceUrl" TEXT,
    "pdfUrl" TEXT,
    "billingPeriodStart" TIMESTAMP(3),
    "billingPeriodEnd" TIMESTAMP(3),
    "rawStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_invoice_lines" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "type" "BillingInvoiceLineType" NOT NULL DEFAULT 'PLAN',
    "description" TEXT NOT NULL,
    "quantity" INTEGER,
    "unitAmountMinor" INTEGER,
    "amountMinor" INTEGER NOT NULL DEFAULT 0,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_attempts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "providerPaymentIntentId" TEXT,
    "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'PROCESSING',
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "retryable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_metric_snapshots" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "metricKey" TEXT NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "limitValue" DOUBLE PRECISION,
    "utilizationPercent" DOUBLE PRECISION,
    "status" "UsageMetricStatus" NOT NULL DEFAULT 'NORMAL',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_change_requests" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "currentPlanId" TEXT NOT NULL,
    "targetPlanId" TEXT NOT NULL,
    "changeType" "SubscriptionChangeType" NOT NULL,
    "status" "SubscriptionChangeStatus" NOT NULL DEFAULT 'PENDING',
    "effectiveMode" "SubscriptionChangeEffectiveMode" NOT NULL DEFAULT 'NEXT_CYCLE',
    "prorationPreviewMinor" INTEGER,
    "blockingReasonsJson" JSONB,
    "previewJson" JSONB,
    "requestedByUserId" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_event_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "subscriptionId" TEXT,
    "invoiceId" TEXT,
    "eventType" TEXT NOT NULL,
    "providerName" TEXT,
    "providerEventId" TEXT,
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_event_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_snapshots" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "storesCount" INTEGER NOT NULL DEFAULT 0,
    "usersCount" INTEGER NOT NULL DEFAULT 0,
    "activeIntegrationsCount" INTEGER NOT NULL DEFAULT 0,
    "ordersCount" INTEGER NOT NULL DEFAULT 0,
    "subscriptionsCount" INTEGER,
    "metricsJson" JSONB,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "flagType" "FlagType" NOT NULL DEFAULT 'BOOLEAN',
    "status" "FlagStatus" NOT NULL DEFAULT 'INACTIVE',
    "defaultBoolValue" BOOLEAN,
    "defaultStringValue" TEXT,
    "defaultIntValue" INTEGER,
    "defaultJsonValue" JSONB,
    "isExperiment" BOOLEAN NOT NULL DEFAULT false,
    "ownerNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flag_assignments" (
    "id" TEXT NOT NULL,
    "featureFlagId" TEXT NOT NULL,
    "scopeType" "FlagScopeType" NOT NULL DEFAULT 'GLOBAL',
    "scopeKey" TEXT,
    "boolValue" BOOLEAN,
    "stringValue" TEXT,
    "intValue" INTEGER,
    "jsonValue" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flag_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_settings" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "taxRate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "serviceFeeRate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "pickupIntervalMinutes" INTEGER NOT NULL DEFAULT 15,
    "defaultPrepTimeMinutes" INTEGER NOT NULL DEFAULT 20,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_settings" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "sourceConnectionId" TEXT,
    "sourceType" "CatalogSourceType" NOT NULL DEFAULT 'LOCAL',
    "autoSync" BOOLEAN NOT NULL DEFAULT false,
    "syncIntervalMinutes" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_operation_settings" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "storeOpen" BOOLEAN NOT NULL DEFAULT true,
    "holidayMode" BOOLEAN NOT NULL DEFAULT false,
    "pickupIntervalMinutes" INTEGER NOT NULL DEFAULT 15,
    "minPrepTimeMinutes" INTEGER NOT NULL DEFAULT 10,
    "maxOrdersPerSlot" INTEGER NOT NULL DEFAULT 10,
    "autoAcceptOrders" BOOLEAN NOT NULL DEFAULT false,
    "autoPrintPos" BOOLEAN NOT NULL DEFAULT false,
    "subscriptionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "onlineOrderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pickupLeadMinutes" INTEGER NOT NULL DEFAULT 15,
    "allowSameDayOrders" BOOLEAN NOT NULL DEFAULT true,
    "sameDayOrderCutoffMinutesBeforeClose" INTEGER NOT NULL DEFAULT 60,
    "autoSelectPickupTime" BOOLEAN NOT NULL DEFAULT false,
    "subscriptionPauseAllowed" BOOLEAN NOT NULL DEFAULT true,
    "subscriptionSkipAllowed" BOOLEAN NOT NULL DEFAULT true,
    "subscriptionMinimumAmount" INTEGER NOT NULL DEFAULT 0,
    "subscriptionDiscountBps" INTEGER NOT NULL DEFAULT 0,
    "subscriptionOrderLeadDays" INTEGER NOT NULL DEFAULT 3,
    "subscriptionAllowedWeekdaysJson" TEXT,
    "soldOutResetMode" "SoldOutResetMode" NOT NULL DEFAULT 'NONE',
    "soldOutResetHourLocal" INTEGER NOT NULL DEFAULT 6,
    "defaultAvailabilityMode" "DefaultAvailabilityMode" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_operation_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_hours" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "openTimeLocal" TEXT NOT NULL DEFAULT '09:00',
    "closeTimeLocal" TEXT NOT NULL DEFAULT '17:00',
    "pickupStartTimeLocal" TEXT,
    "pickupEndTimeLocal" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CustomerNotificationType" NOT NULL DEFAULT 'GENERAL',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_addresses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Home',
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "region" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'NZ',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "tier" "LoyaltyTier" NOT NULL DEFAULT 'BRONZE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_transactions" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "orderId" TEXT,
    "type" "LoyaltyTransactionType" NOT NULL,
    "pointsDelta" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_codes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "rewardPoints" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_payment_methods" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'STRIPE',
    "last4" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "expiryMonth" INTEGER NOT NULL,
    "expiryYear" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "providerMethodId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_rules" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT,
    "metricType" "AlertMetricType" NOT NULL,
    "threshold" DECIMAL(10,4) NOT NULL,
    "windowMinutes" INTEGER NOT NULL DEFAULT 60,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastFiredAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'ALERT_TRIGGERED',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "readAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dhKey" TEXT NOT NULL,
    "authKey" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_codes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" "PromoDiscountType" NOT NULL,
    "discountValue" DECIMAL(10,4) NOT NULL,
    "minOrderAmount" DECIMAL(10,4),
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "status" "PromoStatus" NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_redemptions" (
    "id" TEXT NOT NULL,
    "promoCodeId" TEXT NOT NULL,
    "orderId" TEXT,
    "userId" TEXT,
    "discountMinor" INTEGER NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_reviews" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT,
    "orderId" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "moderatedAt" TIMESTAMP(3),
    "moderatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "SupportTicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "orderId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_ticket_messages" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isStaff" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orders" BOOLEAN NOT NULL DEFAULT true,
    "promotions" BOOLEAN NOT NULL DEFAULT true,
    "loyalty" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_cards" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT,
    "code" TEXT NOT NULL,
    "initialValue" INTEGER NOT NULL,
    "currentBalance" INTEGER NOT NULL,
    "issuedToEmail" TEXT,
    "expiresAt" TIMESTAMP(3),
    "isVoided" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gift_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_card_transactions" (
    "id" TEXT NOT NULL,
    "giftCardId" TEXT NOT NULL,
    "type" "GiftCardTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "orderId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gift_card_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "status" "EmailLogStatus" NOT NULL DEFAULT 'SENT',
    "errorMessage" TEXT,
    "providerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ComplianceEventType" NOT NULL,
    "performedBy" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_endpoints" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "httpStatus" INTEGER,
    "responseBody" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "memberships_tenantId_idx" ON "memberships"("tenantId");

-- CreateIndex
CREATE INDEX "memberships_userId_idx" ON "memberships"("userId");

-- CreateIndex
CREATE INDEX "memberships_status_idx" ON "memberships"("status");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_tenantId_userId_key" ON "memberships"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "stores_tenantId_idx" ON "stores"("tenantId");

-- CreateIndex
CREATE INDEX "stores_status_idx" ON "stores"("status");

-- CreateIndex
CREATE UNIQUE INDEX "stores_tenantId_code_key" ON "stores"("tenantId", "code");

-- CreateIndex
CREATE INDEX "store_memberships_tenantId_idx" ON "store_memberships"("tenantId");

-- CreateIndex
CREATE INDEX "store_memberships_storeId_idx" ON "store_memberships"("storeId");

-- CreateIndex
CREATE INDEX "store_memberships_membershipId_idx" ON "store_memberships"("membershipId");

-- CreateIndex
CREATE INDEX "store_memberships_status_idx" ON "store_memberships"("status");

-- CreateIndex
CREATE UNIQUE INDEX "store_memberships_membershipId_storeId_key" ON "store_memberships"("membershipId", "storeId");

-- CreateIndex
CREATE INDEX "provider_app_credentials_tenantId_provider_environment_isAc_idx" ON "provider_app_credentials"("tenantId", "provider", "environment", "isActive");

-- CreateIndex
CREATE INDEX "connections_tenantId_storeId_provider_idx" ON "connections"("tenantId", "storeId", "provider");

-- CreateIndex
CREATE INDEX "connections_status_reauthRequiredAt_idx" ON "connections"("status", "reauthRequiredAt");

-- CreateIndex
CREATE UNIQUE INDEX "connections_storeId_provider_type_key" ON "connections"("storeId", "provider", "type");

-- CreateIndex
CREATE INDEX "connection_credentials_connectionId_isActive_idx" ON "connection_credentials"("connectionId", "isActive");

-- CreateIndex
CREATE INDEX "connection_credentials_credentialType_authScheme_idx" ON "connection_credentials"("credentialType", "authScheme");

-- CreateIndex
CREATE INDEX "connection_credentials_expiresAt_refreshAfter_idx" ON "connection_credentials"("expiresAt", "refreshAfter");

-- CreateIndex
CREATE INDEX "connection_credentials_tenantId_storeId_idx" ON "connection_credentials"("tenantId", "storeId");

-- CreateIndex
CREATE UNIQUE INDEX "connection_oauth_states_state_key" ON "connection_oauth_states"("state");

-- CreateIndex
CREATE INDEX "connection_oauth_states_provider_expiresAt_idx" ON "connection_oauth_states"("provider", "expiresAt");

-- CreateIndex
CREATE INDEX "connection_oauth_states_tenantId_storeId_idx" ON "connection_oauth_states"("tenantId", "storeId");

-- CreateIndex
CREATE INDEX "connection_action_logs_tenantId_storeId_provider_createdAt_idx" ON "connection_action_logs"("tenantId", "storeId", "provider", "createdAt");

-- CreateIndex
CREATE INDEX "connection_action_logs_connectionId_createdAt_idx" ON "connection_action_logs"("connectionId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_createdAt_idx" ON "audit_logs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_storeId_createdAt_idx" ON "audit_logs"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_targetType_targetId_idx" ON "audit_logs"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON "role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "legacy_payments_orderId_key" ON "legacy_payments"("orderId");

-- CreateIndex
CREATE INDEX "orders_tenantId_storeId_orderedAt_idx" ON "orders"("tenantId", "storeId", "orderedAt");

-- CreateIndex
CREATE INDEX "orders_tenantId_storeId_sourceChannel_idx" ON "orders"("tenantId", "storeId", "sourceChannel");

-- CreateIndex
CREATE INDEX "orders_sourceConnectionId_sourceOrderRef_idx" ON "orders"("sourceConnectionId", "sourceOrderRef");

-- CreateIndex
CREATE INDEX "orders_posConnectionId_posOrderRef_idx" ON "orders"("posConnectionId", "posOrderRef");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_tenantId_storeId_idx" ON "order_items"("tenantId", "storeId");

-- CreateIndex
CREATE INDEX "order_item_modifiers_orderItemId_idx" ON "order_item_modifiers"("orderItemId");

-- CreateIndex
CREATE INDEX "order_item_modifiers_tenantId_storeId_idx" ON "order_item_modifiers"("tenantId", "storeId");

-- CreateIndex
CREATE INDEX "order_channel_links_orderId_idx" ON "order_channel_links"("orderId");

-- CreateIndex
CREATE INDEX "order_channel_links_tenantId_storeId_channelType_idx" ON "order_channel_links"("tenantId", "storeId", "channelType");

-- CreateIndex
CREATE INDEX "order_channel_links_connectionId_externalOrderRef_idx" ON "order_channel_links"("connectionId", "externalOrderRef");

-- CreateIndex
CREATE INDEX "order_channel_links_tenantId_storeId_role_idx" ON "order_channel_links"("tenantId", "storeId", "role");

-- CreateIndex
CREATE INDEX "order_events_orderId_createdAt_idx" ON "order_events"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "order_events_tenantId_storeId_createdAt_idx" ON "order_events"("tenantId", "storeId", "createdAt");

-- CreateIndex
CREATE INDEX "inbound_webhook_logs_channelType_receivedAt_idx" ON "inbound_webhook_logs"("channelType", "receivedAt");

-- CreateIndex
CREATE INDEX "inbound_webhook_logs_connectionId_externalEventRef_idx" ON "inbound_webhook_logs"("connectionId", "externalEventRef");

-- CreateIndex
CREATE INDEX "inbound_webhook_logs_deliveryId_idx" ON "inbound_webhook_logs"("deliveryId");

-- CreateIndex
CREATE UNIQUE INDEX "pos_integrations_storeId_provider_key" ON "pos_integrations"("storeId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_integrations_storeId_platform_key" ON "delivery_integrations"("storeId", "platform");

-- CreateIndex
CREATE INDEX "customers_tenantId_idx" ON "customers"("tenantId");

-- CreateIndex
CREATE INDEX "customers_tenantId_email_idx" ON "customers"("tenantId", "email");

-- CreateIndex
CREATE INDEX "subscriptions_tenantId_customerId_idx" ON "subscriptions"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "subscriptions_tenantId_status_idx" ON "subscriptions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "catalog_categories_tenantId_storeId_idx" ON "catalog_categories"("tenantId", "storeId");

-- CreateIndex
CREATE INDEX "catalog_categories_storeId_isActive_isVisibleOnOnlineOrder__idx" ON "catalog_categories"("storeId", "isActive", "isVisibleOnOnlineOrder", "displayOrder");

-- CreateIndex
CREATE INDEX "catalog_categories_storeId_sourceOfTruthConnectionId_source_idx" ON "catalog_categories"("storeId", "sourceOfTruthConnectionId", "sourceCategoryRef");

-- CreateIndex
CREATE INDEX "catalog_products_tenantId_storeId_idx" ON "catalog_products"("tenantId", "storeId");

-- CreateIndex
CREATE INDEX "catalog_products_storeId_isActive_isVisibleOnOnlineOrder_di_idx" ON "catalog_products"("storeId", "isActive", "isVisibleOnOnlineOrder", "displayOrder");

-- CreateIndex
CREATE INDEX "catalog_products_storeId_sourceOfTruthConnectionId_sourcePr_idx" ON "catalog_products"("storeId", "sourceOfTruthConnectionId", "sourceProductRef");

-- CreateIndex
CREATE INDEX "catalog_products_storeId_name_idx" ON "catalog_products"("storeId", "name");

-- CreateIndex
CREATE INDEX "catalog_product_categories_storeId_categoryId_sortOrder_idx" ON "catalog_product_categories"("storeId", "categoryId", "sortOrder");

-- CreateIndex
CREATE INDEX "catalog_product_categories_storeId_productId_idx" ON "catalog_product_categories"("storeId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_product_categories_productId_categoryId_key" ON "catalog_product_categories"("productId", "categoryId");

-- CreateIndex
CREATE INDEX "catalog_modifier_groups_tenantId_storeId_idx" ON "catalog_modifier_groups"("tenantId", "storeId");

-- CreateIndex
CREATE INDEX "catalog_modifier_groups_storeId_sourceOfTruthConnectionId_s_idx" ON "catalog_modifier_groups"("storeId", "sourceOfTruthConnectionId", "sourceModifierGroupRef");

-- CreateIndex
CREATE INDEX "catalog_modifier_groups_storeId_isActive_displayOrder_idx" ON "catalog_modifier_groups"("storeId", "isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "catalog_modifier_options_tenantId_storeId_idx" ON "catalog_modifier_options"("tenantId", "storeId");

-- CreateIndex
CREATE INDEX "catalog_modifier_options_modifierGroupId_isActive_isSoldOut_idx" ON "catalog_modifier_options"("modifierGroupId", "isActive", "isSoldOut", "displayOrder");

-- CreateIndex
CREATE INDEX "catalog_modifier_options_storeId_sourceOfTruthConnectionId__idx" ON "catalog_modifier_options"("storeId", "sourceOfTruthConnectionId", "sourceModifierOptionRef");

-- CreateIndex
CREATE INDEX "catalog_product_modifier_groups_storeId_productId_displayOr_idx" ON "catalog_product_modifier_groups"("storeId", "productId", "displayOrder");

-- CreateIndex
CREATE INDEX "catalog_product_modifier_groups_storeId_modifierGroupId_idx" ON "catalog_product_modifier_groups"("storeId", "modifierGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_product_modifier_groups_productId_modifierGroupId_key" ON "catalog_product_modifier_groups"("productId", "modifierGroupId");

-- CreateIndex
CREATE INDEX "external_catalog_categories_storeId_connectionId_idx" ON "external_catalog_categories"("storeId", "connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "external_catalog_categories_connectionId_externalId_key" ON "external_catalog_categories"("connectionId", "externalId");

-- CreateIndex
CREATE INDEX "external_catalog_products_storeId_connectionId_idx" ON "external_catalog_products"("storeId", "connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "external_catalog_products_connectionId_externalId_key" ON "external_catalog_products"("connectionId", "externalId");

-- CreateIndex
CREATE INDEX "external_catalog_modifier_groups_storeId_connectionId_idx" ON "external_catalog_modifier_groups"("storeId", "connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "external_catalog_modifier_groups_connectionId_externalId_key" ON "external_catalog_modifier_groups"("connectionId", "externalId");

-- CreateIndex
CREATE INDEX "external_catalog_modifier_options_storeId_connectionId_idx" ON "external_catalog_modifier_options"("storeId", "connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "external_catalog_modifier_options_connectionId_externalId_key" ON "external_catalog_modifier_options"("connectionId", "externalId");

-- CreateIndex
CREATE INDEX "external_catalog_product_modifier_group_links_storeId_conne_idx" ON "external_catalog_product_modifier_group_links"("storeId", "connectionId", "externalProductId");

-- CreateIndex
CREATE UNIQUE INDEX "external_catalog_product_modifier_group_links_connectionId__key" ON "external_catalog_product_modifier_group_links"("connectionId", "externalProductId", "externalModifierGroupId");

-- CreateIndex
CREATE INDEX "channel_entity_mappings_storeId_entityType_internalEntityId_idx" ON "channel_entity_mappings"("storeId", "entityType", "internalEntityId");

-- CreateIndex
CREATE INDEX "channel_entity_mappings_storeId_connectionId_entityType_idx" ON "channel_entity_mappings"("storeId", "connectionId", "entityType");

-- CreateIndex
CREATE UNIQUE INDEX "channel_entity_mappings_connectionId_entityType_externalEnt_key" ON "channel_entity_mappings"("connectionId", "entityType", "externalEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "channel_entity_mappings_connectionId_entityType_internalEnt_key" ON "channel_entity_mappings"("connectionId", "entityType", "internalEntityId");

-- CreateIndex
CREATE INDEX "job_runs_tenantId_storeId_idx" ON "job_runs"("tenantId", "storeId");

-- CreateIndex
CREATE INDEX "job_runs_status_createdAt_idx" ON "job_runs"("status", "createdAt");

-- CreateIndex
CREATE INDEX "job_runs_jobType_status_idx" ON "job_runs"("jobType", "status");

-- CreateIndex
CREATE INDEX "job_runs_triggeredByUserId_idx" ON "job_runs"("triggeredByUserId");

-- CreateIndex
CREATE INDEX "job_runs_parentRunId_idx" ON "job_runs"("parentRunId");

-- CreateIndex
CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");

-- CreateIndex
CREATE INDEX "plans_status_sortOrder_idx" ON "plans"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "plan_limits_planId_idx" ON "plan_limits"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "plan_limits_planId_key_key" ON "plan_limits"("planId", "key");

-- CreateIndex
CREATE INDEX "plan_features_planId_idx" ON "plan_features"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "plan_features_planId_key_key" ON "plan_features"("planId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_billing_accounts_tenantId_key" ON "tenant_billing_accounts"("tenantId");

-- CreateIndex
CREATE INDEX "tenant_subscriptions_tenantId_status_idx" ON "tenant_subscriptions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "tenant_subscriptions_status_currentPeriodEnd_idx" ON "tenant_subscriptions"("status", "currentPeriodEnd");

-- CreateIndex
CREATE INDEX "tenant_subscription_events_tenantSubscriptionId_createdAt_idx" ON "tenant_subscription_events"("tenantSubscriptionId", "createdAt");

-- CreateIndex
CREATE INDEX "tenant_subscription_events_tenantId_createdAt_idx" ON "tenant_subscription_events"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "billing_records_tenantId_createdAt_idx" ON "billing_records"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "billing_records_tenantId_recordType_status_idx" ON "billing_records"("tenantId", "recordType", "status");

-- CreateIndex
CREATE INDEX "billing_invoices_tenantId_billedAt_idx" ON "billing_invoices"("tenantId", "billedAt");

-- CreateIndex
CREATE INDEX "billing_invoices_tenantId_status_idx" ON "billing_invoices"("tenantId", "status");

-- CreateIndex
CREATE INDEX "billing_invoice_lines_invoiceId_idx" ON "billing_invoice_lines"("invoiceId");

-- CreateIndex
CREATE INDEX "payment_attempts_tenantId_attemptedAt_idx" ON "payment_attempts"("tenantId", "attemptedAt");

-- CreateIndex
CREATE INDEX "payment_attempts_invoiceId_idx" ON "payment_attempts"("invoiceId");

-- CreateIndex
CREATE INDEX "usage_metric_snapshots_tenantId_metricKey_measuredAt_idx" ON "usage_metric_snapshots"("tenantId", "metricKey", "measuredAt");

-- CreateIndex
CREATE INDEX "subscription_change_requests_tenantId_requestedAt_idx" ON "subscription_change_requests"("tenantId", "requestedAt");

-- CreateIndex
CREATE INDEX "billing_event_logs_tenantId_createdAt_idx" ON "billing_event_logs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "billing_event_logs_eventType_createdAt_idx" ON "billing_event_logs"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "usage_snapshots_tenantId_capturedAt_idx" ON "usage_snapshots"("tenantId", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

-- CreateIndex
CREATE INDEX "feature_flags_status_idx" ON "feature_flags"("status");

-- CreateIndex
CREATE INDEX "feature_flags_key_idx" ON "feature_flags"("key");

-- CreateIndex
CREATE INDEX "feature_flag_assignments_featureFlagId_idx" ON "feature_flag_assignments"("featureFlagId");

-- CreateIndex
CREATE INDEX "feature_flag_assignments_scopeType_scopeKey_idx" ON "feature_flag_assignments"("scopeType", "scopeKey");

-- CreateIndex
CREATE UNIQUE INDEX "store_settings_storeId_key" ON "store_settings"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_settings_storeId_key" ON "catalog_settings"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "store_operation_settings_storeId_key" ON "store_operation_settings"("storeId");

-- CreateIndex
CREATE INDEX "store_hours_tenantId_storeId_idx" ON "store_hours"("tenantId", "storeId");

-- CreateIndex
CREATE UNIQUE INDEX "store_hours_storeId_dayOfWeek_key" ON "store_hours"("storeId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "customer_notifications_userId_createdAt_idx" ON "customer_notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "customer_notifications_userId_readAt_idx" ON "customer_notifications"("userId", "readAt");

-- CreateIndex
CREATE INDEX "customer_addresses_userId_idx" ON "customer_addresses"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_accounts_userId_key" ON "loyalty_accounts"("userId");

-- CreateIndex
CREATE INDEX "loyalty_accounts_userId_idx" ON "loyalty_accounts"("userId");

-- CreateIndex
CREATE INDEX "loyalty_transactions_accountId_createdAt_idx" ON "loyalty_transactions"("accountId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_code_key" ON "referral_codes"("code");

-- CreateIndex
CREATE INDEX "referral_codes_userId_idx" ON "referral_codes"("userId");

-- CreateIndex
CREATE INDEX "saved_payment_methods_userId_idx" ON "saved_payment_methods"("userId");

-- CreateIndex
CREATE INDEX "alert_rules_tenantId_enabled_idx" ON "alert_rules"("tenantId", "enabled");

-- CreateIndex
CREATE INDEX "alert_rules_storeId_idx" ON "alert_rules"("storeId");

-- CreateIndex
CREATE INDEX "notifications_tenantId_userId_createdAt_idx" ON "notifications"("tenantId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt");

-- CreateIndex
CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_userId_endpoint_key" ON "push_subscriptions"("userId", "endpoint");

-- CreateIndex
CREATE INDEX "promo_codes_tenantId_status_idx" ON "promo_codes"("tenantId", "status");

-- CreateIndex
CREATE INDEX "promo_codes_storeId_idx" ON "promo_codes"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "promo_codes_tenantId_code_key" ON "promo_codes"("tenantId", "code");

-- CreateIndex
CREATE INDEX "promo_redemptions_promoCodeId_idx" ON "promo_redemptions"("promoCodeId");

-- CreateIndex
CREATE INDEX "promo_redemptions_orderId_idx" ON "promo_redemptions"("orderId");

-- CreateIndex
CREATE INDEX "product_reviews_tenantId_status_idx" ON "product_reviews"("tenantId", "status");

-- CreateIndex
CREATE INDEX "product_reviews_userId_idx" ON "product_reviews"("userId");

-- CreateIndex
CREATE INDEX "product_reviews_productId_idx" ON "product_reviews"("productId");

-- CreateIndex
CREATE INDEX "support_tickets_tenantId_status_idx" ON "support_tickets"("tenantId", "status");

-- CreateIndex
CREATE INDEX "support_tickets_userId_idx" ON "support_tickets"("userId");

-- CreateIndex
CREATE INDEX "support_ticket_messages_ticketId_idx" ON "support_ticket_messages"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "push_preferences_userId_key" ON "push_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "gift_cards_code_key" ON "gift_cards"("code");

-- CreateIndex
CREATE INDEX "gift_cards_tenantId_idx" ON "gift_cards"("tenantId");

-- CreateIndex
CREATE INDEX "gift_cards_storeId_idx" ON "gift_cards"("storeId");

-- CreateIndex
CREATE INDEX "gift_card_transactions_giftCardId_idx" ON "gift_card_transactions"("giftCardId");

-- CreateIndex
CREATE INDEX "email_logs_to_idx" ON "email_logs"("to");

-- CreateIndex
CREATE INDEX "email_logs_createdAt_idx" ON "email_logs"("createdAt");

-- CreateIndex
CREATE INDEX "compliance_events_userId_idx" ON "compliance_events"("userId");

-- CreateIndex
CREATE INDEX "compliance_events_createdAt_idx" ON "compliance_events"("createdAt");

-- CreateIndex
CREATE INDEX "webhook_endpoints_tenantId_idx" ON "webhook_endpoints"("tenantId");

-- CreateIndex
CREATE INDEX "webhook_deliveries_endpointId_idx" ON "webhook_deliveries"("endpointId");

-- CreateIndex
CREATE INDEX "webhook_deliveries_event_idx" ON "webhook_deliveries"("event");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_memberships" ADD CONSTRAINT "store_memberships_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_memberships" ADD CONSTRAINT "store_memberships_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_memberships" ADD CONSTRAINT "store_memberships_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connections" ADD CONSTRAINT "connections_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connections" ADD CONSTRAINT "connections_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connections" ADD CONSTRAINT "connections_appCredentialId_fkey" FOREIGN KEY ("appCredentialId") REFERENCES "provider_app_credentials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection_credentials" ADD CONSTRAINT "connection_credentials_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection_action_logs" ADD CONSTRAINT "connection_action_logs_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "option_groups" ADD CONSTRAINT "option_groups_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_options" ADD CONSTRAINT "menu_options_optionGroupId_fkey" FOREIGN KEY ("optionGroupId") REFERENCES "option_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legacy_orders" ADD CONSTRAINT "legacy_orders_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legacy_order_items" ADD CONSTRAINT "legacy_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "legacy_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legacy_order_items" ADD CONSTRAINT "legacy_order_items_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legacy_payments" ADD CONSTRAINT "legacy_payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "legacy_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_modifiers" ADD CONSTRAINT "order_item_modifiers_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_channel_links" ADD CONSTRAINT "order_channel_links_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_integrations" ADD CONSTRAINT "pos_integrations_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_integrations" ADD CONSTRAINT "delivery_integrations_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_product_categories" ADD CONSTRAINT "catalog_product_categories_productId_fkey" FOREIGN KEY ("productId") REFERENCES "catalog_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_product_categories" ADD CONSTRAINT "catalog_product_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "catalog_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_modifier_options" ADD CONSTRAINT "catalog_modifier_options_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES "catalog_modifier_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_product_modifier_groups" ADD CONSTRAINT "catalog_product_modifier_groups_productId_fkey" FOREIGN KEY ("productId") REFERENCES "catalog_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_product_modifier_groups" ADD CONSTRAINT "catalog_product_modifier_groups_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES "catalog_modifier_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_runs" ADD CONSTRAINT "job_runs_triggeredByUserId_fkey" FOREIGN KEY ("triggeredByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_runs" ADD CONSTRAINT "job_runs_parentRunId_fkey" FOREIGN KEY ("parentRunId") REFERENCES "job_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_limits" ADD CONSTRAINT "plan_limits_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_features" ADD CONSTRAINT "plan_features_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_billing_accounts" ADD CONSTRAINT "tenant_billing_accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subscription_events" ADD CONSTRAINT "tenant_subscription_events_tenantSubscriptionId_fkey" FOREIGN KEY ("tenantSubscriptionId") REFERENCES "tenant_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subscription_events" ADD CONSTRAINT "tenant_subscription_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_records" ADD CONSTRAINT "billing_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_records" ADD CONSTRAINT "billing_records_tenantSubscriptionId_fkey" FOREIGN KEY ("tenantSubscriptionId") REFERENCES "tenant_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "tenant_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_invoice_lines" ADD CONSTRAINT "billing_invoice_lines_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "billing_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "billing_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_metric_snapshots" ADD CONSTRAINT "usage_metric_snapshots_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_metric_snapshots" ADD CONSTRAINT "usage_metric_snapshots_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "tenant_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_change_requests" ADD CONSTRAINT "subscription_change_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_change_requests" ADD CONSTRAINT "subscription_change_requests_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "tenant_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_change_requests" ADD CONSTRAINT "subscription_change_requests_currentPlanId_fkey" FOREIGN KEY ("currentPlanId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_change_requests" ADD CONSTRAINT "subscription_change_requests_targetPlanId_fkey" FOREIGN KEY ("targetPlanId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_snapshots" ADD CONSTRAINT "usage_snapshots_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_flag_assignments" ADD CONSTRAINT "feature_flag_assignments_featureFlagId_fkey" FOREIGN KEY ("featureFlagId") REFERENCES "feature_flags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_settings" ADD CONSTRAINT "store_settings_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_settings" ADD CONSTRAINT "catalog_settings_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_settings" ADD CONSTRAINT "catalog_settings_sourceConnectionId_fkey" FOREIGN KEY ("sourceConnectionId") REFERENCES "connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_operation_settings" ADD CONSTRAINT "store_operation_settings_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_hours" ADD CONSTRAINT "store_hours_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_notifications" ADD CONSTRAINT "customer_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "loyalty_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "loyalty_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_payment_methods" ADD CONSTRAINT "saved_payment_methods_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_redemptions" ADD CONSTRAINT "promo_redemptions_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "promo_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_preferences" ADD CONSTRAINT "push_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_card_transactions" ADD CONSTRAINT "gift_card_transactions_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "gift_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "webhook_endpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
