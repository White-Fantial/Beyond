-- CreateEnum
CREATE TYPE "CatalogSourceType" AS ENUM ('POS', 'DELIVERY', 'LOCAL', 'MERGED', 'IMPORTED');

-- CreateEnum
CREATE TYPE "CatalogOriginType" AS ENUM ('BEYOND_CREATED', 'IMPORTED_FROM_POS', 'IMPORTED_FROM_DELIVERY', 'IMPORTED_FROM_OTHER');

-- CreateEnum
CREATE TYPE "CatalogChannelType" AS ENUM ('LOYVERSE', 'UBER_EATS', 'DOORDASH', 'ONLINE_ORDER', 'SUBSCRIPTION', 'OTHER');

-- CreateEnum
CREATE TYPE "CatalogEntityType" AS ENUM ('CATEGORY', 'PRODUCT', 'MODIFIER_GROUP', 'MODIFIER_OPTION');

-- CreateEnum
CREATE TYPE "MappingStatus" AS ENUM ('ACTIVE', 'BROKEN', 'PENDING', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "CatalogMappingStatus" AS ENUM ('ACTIVE', 'NEEDS_REVIEW', 'UNMATCHED', 'BROKEN', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CatalogMappingSource" AS ENUM ('AUTO', 'MANUAL', 'IMPORT_SEEDED');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'TRIAL', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('USER', 'PLATFORM_ADMIN', 'PLATFORM_SUPPORT', 'RECIPE_PROVIDER', 'PLATFORM_MODERATOR');

-- CreateEnum
CREATE TYPE "ProviderApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RecipePayoutStatus" AS ENUM ('PENDING', 'TRANSFERRED', 'FAILED');

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
CREATE TYPE "CatalogPublishAction" AS ENUM ('CREATE', 'UPDATE', 'ARCHIVE', 'UNARCHIVE');

-- CreateEnum
CREATE TYPE "CatalogPublishStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CatalogPublishScope" AS ENUM ('CATEGORY', 'PRODUCT', 'MODIFIER_GROUP', 'MODIFIER_OPTION', 'PRODUCT_CATEGORY_LINK', 'PRODUCT_MODIFIER_GROUP_LINK');

-- CreateEnum
CREATE TYPE "ExternalCatalogChangeKind" AS ENUM ('CREATED', 'UPDATED', 'DELETED', 'RELINKED', 'STRUCTURE_UPDATED');

-- CreateEnum
CREATE TYPE "ExternalCatalogChangeStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'IGNORED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "CatalogConflictType" AS ENUM ('FIELD_VALUE_CONFLICT', 'STRUCTURE_CONFLICT', 'MISSING_ON_EXTERNAL', 'MISSING_ON_INTERNAL', 'PARENT_RELATION_CONFLICT', 'UNKNOWN_CONFLICT');

-- CreateEnum
CREATE TYPE "CatalogConflictStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'IGNORED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "CatalogConflictResolutionStrategy" AS ENUM ('KEEP_INTERNAL', 'ACCEPT_EXTERNAL', 'MERGE_MANUALLY', 'DEFER', 'IGNORE');

-- CreateEnum
CREATE TYPE "CatalogConflictScope" AS ENUM ('CATEGORY', 'PRODUCT', 'MODIFIER_GROUP', 'MODIFIER_OPTION', 'PRODUCT_CATEGORY_LINK', 'PRODUCT_MODIFIER_GROUP_LINK');

-- CreateEnum
CREATE TYPE "CatalogSyncDirection" AS ENUM ('INTERNAL_TO_EXTERNAL', 'EXTERNAL_TO_INTERNAL', 'BIDIRECTIONAL', 'DISABLED');

-- CreateEnum
CREATE TYPE "CatalogSyncConflictStrategy" AS ENUM ('MANUAL_REVIEW', 'PREFER_INTERNAL', 'PREFER_EXTERNAL', 'LAST_WRITE_WINS');

-- CreateEnum
CREATE TYPE "CatalogSyncAutoApplyMode" AS ENUM ('NEVER', 'SAFE_ONLY', 'ALWAYS');

-- CreateEnum
CREATE TYPE "CatalogSyncPolicyScope" AS ENUM ('CATEGORY', 'PRODUCT', 'MODIFIER_GROUP', 'MODIFIER_OPTION', 'PRODUCT_CATEGORY_LINK', 'PRODUCT_MODIFIER_GROUP_LINK');

-- CreateEnum
CREATE TYPE "CatalogSyncPlanStatus" AS ENUM ('DRAFT', 'READY', 'PARTIALLY_BLOCKED', 'BLOCKED', 'APPLIED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CatalogSyncAction" AS ENUM ('APPLY_INTERNAL_PATCH', 'APPLY_EXTERNAL_PATCH', 'CREATE_INTERNAL_ENTITY', 'CREATE_EXTERNAL_ENTITY', 'ARCHIVE_INTERNAL_ENTITY', 'ARCHIVE_EXTERNAL_ENTITY', 'LINK_MAPPING', 'UNLINK_MAPPING', 'SKIP');

-- CreateEnum
CREATE TYPE "CatalogSyncItemStatus" AS ENUM ('PENDING', 'READY', 'BLOCKED', 'APPLIED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "CatalogMergeDraftStatus" AS ENUM ('DRAFT', 'VALIDATED', 'INVALID', 'PLAN_GENERATED', 'APPLIED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CatalogMergeFieldChoice" AS ENUM ('TAKE_INTERNAL', 'TAKE_EXTERNAL', 'CUSTOM_VALUE');

-- CreateEnum
CREATE TYPE "CatalogMergeStructureChoice" AS ENUM ('KEEP_INTERNAL_SET', 'TAKE_EXTERNAL_SET', 'MERGE_SELECTED', 'CUSTOM_STRUCTURE');

-- CreateEnum
CREATE TYPE "CatalogMergeParentChoice" AS ENUM ('KEEP_INTERNAL_PARENT', 'TAKE_EXTERNAL_PARENT', 'SET_CUSTOM_PARENT');

-- CreateEnum
CREATE TYPE "CatalogMergeApplyTarget" AS ENUM ('INTERNAL_ONLY', 'EXTERNAL_ONLY', 'INTERNAL_THEN_EXTERNAL');

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

-- CreateEnum
CREATE TYPE "IngredientScope" AS ENUM ('PLATFORM', 'STORE');

-- CreateEnum
CREATE TYPE "SupplierPriceSource" AS ENUM ('SCRAPED', 'MANUAL_ENTRY', 'INVOICE_IMPORT');

-- CreateEnum
CREATE TYPE "IngredientUnit" AS ENUM ('GRAM', 'KG', 'ML', 'LITER', 'EACH', 'TSP', 'TBSP', 'OZ', 'LB', 'CUP', 'PIECE');

-- CreateEnum
CREATE TYPE "RecipeYieldUnit" AS ENUM ('EACH', 'BATCH', 'SERVING', 'GRAM', 'KG', 'ML', 'LITER');

-- CreateEnum
CREATE TYPE "SupplierScope" AS ENUM ('PLATFORM', 'STORE');

-- CreateEnum
CREATE TYPE "SupplierRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "MarketplaceRecipeType" AS ENUM ('BASIC', 'PREMIUM');

-- CreateEnum
CREATE TYPE "MarketplaceRecipeStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'CHANGE_REQUESTED', 'APPROVED', 'PUBLISHED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RecipeDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "RecipeReviewAction" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'CHANGE_REQUESTED', 'REVISION_SUBMITTED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "IngredientRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DUPLICATE');

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
    "stripeConnectAccountId" TEXT,
    "stripeConnectOnboarded" BOOLEAN NOT NULL DEFAULT false,
    "stripeConnectPayoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "providerAppliedAt" TIMESTAMP(3),
    "providerApprovedAt" TIMESTAMP(3),

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
    "isCustomerFacing" BOOLEAN NOT NULL DEFAULT true,
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
    "preferredStoreId" TEXT,
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
    "originType" "CatalogOriginType" NOT NULL DEFAULT 'BEYOND_CREATED',
    "originConnectionId" TEXT,
    "originExternalRef" TEXT,
    "importedAt" TIMESTAMP(3),
    "sourceType" "CatalogSourceType" NOT NULL,
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
    "originType" "CatalogOriginType" NOT NULL DEFAULT 'BEYOND_CREATED',
    "originConnectionId" TEXT,
    "originExternalRef" TEXT,
    "importedAt" TIMESTAMP(3),
    "sourceType" "CatalogSourceType" NOT NULL,
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
CREATE TABLE "tenant_product_categories" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_catalog_products" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "shortDescription" TEXT,
    "basePriceAmount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "imageUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "internalNote" TEXT,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tenant_catalog_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_modifier_groups" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "selectionMin" INTEGER NOT NULL DEFAULT 0,
    "selectionMax" INTEGER,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tenant_modifier_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_modifier_options" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tenantModifierGroupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceDeltaAmount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tenant_modifier_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_product_modifier_groups" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tenantProductId" TEXT NOT NULL,
    "tenantModifierGroupId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_product_modifier_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_category_selections" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "tenantCategoryId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrderOverride" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_category_selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_modifier_group_selections" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "tenantModifierGroupId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrderOverride" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_modifier_group_selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_product_selections" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "tenantProductId" TEXT NOT NULL,
    "customPriceAmount" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "selectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_product_selections_pkey" PRIMARY KEY ("id")
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
    "originType" "CatalogOriginType" NOT NULL DEFAULT 'BEYOND_CREATED',
    "originConnectionId" TEXT,
    "originExternalRef" TEXT,
    "importedAt" TIMESTAMP(3),
    "sourceType" "CatalogSourceType" NOT NULL,
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
    "originType" "CatalogOriginType" NOT NULL DEFAULT 'BEYOND_CREATED',
    "originConnectionId" TEXT,
    "originExternalRef" TEXT,
    "importedAt" TIMESTAMP(3),
    "sourceType" "CatalogSourceType" NOT NULL,
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
CREATE TABLE "catalog_import_runs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "importedCategoriesCount" INTEGER NOT NULL DEFAULT 0,
    "importedProductsCount" INTEGER NOT NULL DEFAULT 0,
    "importedModifierGroupsCount" INTEGER NOT NULL DEFAULT 0,
    "importedModifierOptionsCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "comparedToImportRunId" TEXT,
    "diffStatus" TEXT,
    "diffCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_import_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_catalog_snapshots" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "externalEntityId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "payloadChecksum" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "importRunId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_catalog_snapshots_pkey" PRIMARY KEY ("id")
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
    "entityHash" TEXT,
    "importRunId" TEXT,
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
    "entityHash" TEXT,
    "importRunId" TEXT,
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
    "entityHash" TEXT,
    "importRunId" TEXT,
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
    "entityHash" TEXT,
    "importRunId" TEXT,
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
    "importRunId" TEXT,
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
    "connectionId" TEXT NOT NULL,
    "internalEntityType" "CatalogEntityType" NOT NULL,
    "internalEntityId" TEXT NOT NULL,
    "externalEntityType" "CatalogEntityType" NOT NULL,
    "externalEntityId" TEXT NOT NULL,
    "status" "CatalogMappingStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "source" "CatalogMappingSource" NOT NULL DEFAULT 'AUTO',
    "confidenceScore" DOUBLE PRECISION,
    "matchReason" TEXT,
    "notes" TEXT,
    "lastValidatedAt" TIMESTAMP(3),
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlinkedAt" TIMESTAMP(3),
    "lastPublishedAt" TIMESTAMP(3),
    "lastPublishStatus" "CatalogPublishStatus",
    "lastPublishAction" "CatalogPublishAction",
    "lastPublishHash" TEXT,
    "lastPublishError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_entity_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_publish_jobs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "internalEntityType" "CatalogEntityType",
    "internalEntityId" TEXT,
    "scope" "CatalogPublishScope" NOT NULL,
    "action" "CatalogPublishAction" NOT NULL,
    "status" "CatalogPublishStatus" NOT NULL DEFAULT 'PENDING',
    "requestedByUserId" TEXT,
    "triggerSource" TEXT,
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "errorMessage" TEXT,
    "errorCode" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_publish_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_catalog_changes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "entityType" "CatalogEntityType" NOT NULL,
    "externalEntityId" TEXT NOT NULL,
    "internalEntityId" TEXT,
    "mappingId" TEXT,
    "changeKind" "ExternalCatalogChangeKind" NOT NULL,
    "status" "ExternalCatalogChangeStatus" NOT NULL DEFAULT 'OPEN',
    "previousEntityHash" TEXT,
    "currentEntityHash" TEXT,
    "importRunId" TEXT NOT NULL,
    "comparedImportRunId" TEXT,
    "summary" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "ignoredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_catalog_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_catalog_change_fields" (
    "id" TEXT NOT NULL,
    "changeId" TEXT NOT NULL,
    "fieldPath" TEXT NOT NULL,
    "previousValue" JSONB,
    "currentValue" JSONB,
    "changeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_catalog_change_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_conflicts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "internalEntityType" "CatalogEntityType" NOT NULL,
    "internalEntityId" TEXT NOT NULL,
    "externalEntityType" "CatalogEntityType",
    "externalEntityId" TEXT,
    "mappingId" TEXT,
    "externalChangeId" TEXT,
    "scope" "CatalogConflictScope" NOT NULL,
    "conflictType" "CatalogConflictType" NOT NULL,
    "status" "CatalogConflictStatus" NOT NULL DEFAULT 'OPEN',
    "summary" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolutionStrategy" "CatalogConflictResolutionStrategy",
    "resolutionNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_conflict_fields" (
    "id" TEXT NOT NULL,
    "conflictId" TEXT NOT NULL,
    "fieldPath" TEXT NOT NULL,
    "fieldConflictType" TEXT NOT NULL,
    "baselineValue" JSONB,
    "internalValue" JSONB,
    "externalValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_conflict_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_conflict_resolution_logs" (
    "id" TEXT NOT NULL,
    "conflictId" TEXT NOT NULL,
    "previousStatus" "CatalogConflictStatus",
    "newStatus" "CatalogConflictStatus" NOT NULL,
    "strategy" "CatalogConflictResolutionStrategy",
    "note" TEXT,
    "changedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_conflict_resolution_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_catalog_changes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "entityType" "CatalogEntityType" NOT NULL,
    "internalEntityId" TEXT NOT NULL,
    "fieldPath" TEXT NOT NULL,
    "previousValue" JSONB,
    "currentValue" JSONB,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedByUserId" TEXT,
    "changeSource" TEXT,

    CONSTRAINT "internal_catalog_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_sync_policies" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "scope" "CatalogSyncPolicyScope" NOT NULL,
    "fieldPath" TEXT,
    "direction" "CatalogSyncDirection" NOT NULL,
    "conflictStrategy" "CatalogSyncConflictStrategy" NOT NULL,
    "autoApplyMode" "CatalogSyncAutoApplyMode" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_sync_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_sync_plans" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "source" TEXT,
    "status" "CatalogSyncPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "basedOnImportRunId" TEXT,
    "basedOnExternalChangeId" TEXT,
    "basedOnConflictId" TEXT,
    "summary" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_sync_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_sync_plan_items" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "internalEntityType" "CatalogEntityType",
    "internalEntityId" TEXT,
    "externalEntityType" "CatalogEntityType",
    "externalEntityId" TEXT,
    "scope" "CatalogSyncPolicyScope" NOT NULL,
    "fieldPath" TEXT,
    "action" "CatalogSyncAction" NOT NULL,
    "direction" "CatalogSyncDirection",
    "status" "CatalogSyncItemStatus" NOT NULL DEFAULT 'PENDING',
    "blockedReason" TEXT,
    "previewBeforeValue" JSONB,
    "previewAfterValue" JSONB,
    "mappingId" TEXT,
    "externalChangeId" TEXT,
    "conflictId" TEXT,
    "publishJobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_sync_plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_sync_execution_logs" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "planItemId" TEXT,
    "status" TEXT NOT NULL,
    "action" "CatalogSyncAction" NOT NULL,
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "errorMessage" TEXT,
    "errorCode" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_sync_execution_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_merge_drafts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "conflictId" TEXT,
    "internalEntityType" "CatalogEntityType" NOT NULL,
    "internalEntityId" TEXT NOT NULL,
    "externalEntityType" "CatalogEntityType",
    "externalEntityId" TEXT,
    "status" "CatalogMergeDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "applyTarget" "CatalogMergeApplyTarget" NOT NULL DEFAULT 'INTERNAL_THEN_EXTERNAL',
    "title" TEXT,
    "summary" TEXT,
    "validationErrors" JSONB,
    "generatedPlanId" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_merge_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_merge_draft_fields" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "fieldPath" TEXT NOT NULL,
    "choice" "CatalogMergeFieldChoice" NOT NULL,
    "baselineValue" JSONB,
    "internalValue" JSONB,
    "externalValue" JSONB,
    "customValue" JSONB,
    "resolvedValue" JSONB,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_merge_draft_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_merge_draft_structures" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "fieldPath" TEXT NOT NULL,
    "choice" TEXT NOT NULL,
    "baselineValue" JSONB,
    "internalValue" JSONB,
    "externalValue" JSONB,
    "customValue" JSONB,
    "resolvedValue" JSONB,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_merge_draft_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_merge_execution_logs" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "generatedPlanId" TEXT,
    "status" TEXT NOT NULL,
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "errorMessage" TEXT,
    "changedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_merge_execution_logs_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "ingredients" (
    "id" TEXT NOT NULL,
    "scope" "IngredientScope" NOT NULL DEFAULT 'STORE',
    "tenantId" TEXT,
    "storeId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "unit" "IngredientUnit" NOT NULL DEFAULT 'GRAM',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_ingredients" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "storeId" TEXT,
    "catalogProductId" TEXT,
    "tenantCatalogProductId" TEXT,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "yieldQty" INTEGER NOT NULL DEFAULT 1,
    "yieldUnit" "RecipeYieldUnit" NOT NULL DEFAULT 'EACH',
    "notes" TEXT,
    "instructions" TEXT,
    "marketplaceSourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "unit" "IngredientUnit" NOT NULL DEFAULT 'GRAM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_product_components" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "tenantProductId" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "unit" "IngredientUnit" NOT NULL DEFAULT 'EACH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_product_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "scope" "SupplierScope" NOT NULL DEFAULT 'STORE',
    "tenantId" TEXT,
    "storeId" TEXT,
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "notes" TEXT,
    "adapterType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_requests" (
    "id" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "notes" TEXT,
    "status" "SupplierRequestStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedSupplierId" TEXT,
    "reviewedByUserId" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_products" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "externalUrl" TEXT,
    "referencePrice" INTEGER NOT NULL DEFAULT 0,
    "unit" "IngredientUnit" NOT NULL DEFAULT 'EACH',
    "lastScrapedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "supplier_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredient_supplier_links" (
    "id" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "supplierProductId" TEXT NOT NULL,
    "tenantId" TEXT,
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingredient_supplier_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_credentials" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "loginUrl" TEXT,
    "username" TEXT NOT NULL,
    "passwordEnc" TEXT NOT NULL,
    "lastVerified" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "supplier_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_contract_prices" (
    "id" TEXT NOT NULL,
    "supplierProductId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "contractRef" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_contract_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_price_records" (
    "id" TEXT NOT NULL,
    "supplierProductId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "observedPrice" INTEGER NOT NULL,
    "source" "SupplierPriceSource" NOT NULL DEFAULT 'MANUAL_ENTRY',
    "credentialId" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "supplier_price_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_recipes" (
    "id" TEXT NOT NULL,
    "type" "MarketplaceRecipeType" NOT NULL DEFAULT 'PREMIUM',
    "status" "MarketplaceRecipeStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "providerId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "yieldQty" INTEGER NOT NULL DEFAULT 1,
    "yieldUnit" "RecipeYieldUnit" NOT NULL DEFAULT 'EACH',
    "servings" INTEGER,
    "cuisineTag" TEXT,
    "difficulty" "RecipeDifficulty",
    "prepTimeMinutes" INTEGER,
    "cookTimeMinutes" INTEGER,
    "instructions" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "estimatedCostPrice" INTEGER NOT NULL DEFAULT 0,
    "recommendedPrice" INTEGER NOT NULL DEFAULT 0,
    "salePrice" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "marketplace_recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_recipe_ingredients" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "unit" "IngredientUnit" NOT NULL DEFAULT 'GRAM',
    "notes" TEXT,
    "unitCostSnapshot" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_recipe_reviews" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "action" "RecipeReviewAction" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_recipe_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_recipe_purchases" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "buyerUserId" TEXT NOT NULL,
    "tenantId" TEXT,
    "pricePaid" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paymentRef" TEXT,
    "stripePaymentIntentId" TEXT,
    "stripeTransferId" TEXT,
    "platformFeeAmount" INTEGER NOT NULL DEFAULT 0,
    "providerPayoutAmount" INTEGER NOT NULL DEFAULT 0,
    "payoutStatus" "RecipePayoutStatus" NOT NULL DEFAULT 'PENDING',
    "transferredAt" TIMESTAMP(3),
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refundedAt" TIMESTAMP(3),

    CONSTRAINT "marketplace_recipe_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredient_requests" (
    "id" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "unit" "IngredientUnit" NOT NULL DEFAULT 'GRAM',
    "notes" TEXT,
    "status" "IngredientRequestStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedIngredientId" TEXT,
    "tempIngredientId" TEXT,
    "reviewedByUserId" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingredient_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_onboarding_applications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessType" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "taxId" TEXT,
    "portfolioUrl" TEXT,
    "introduction" TEXT,
    "status" "ProviderApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,

    CONSTRAINT "provider_onboarding_applications_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "customers_preferredStoreId_idx" ON "customers"("preferredStoreId");

-- CreateIndex
CREATE INDEX "subscriptions_tenantId_customerId_idx" ON "subscriptions"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "subscriptions_tenantId_status_idx" ON "subscriptions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "catalog_categories_tenantId_storeId_idx" ON "catalog_categories"("tenantId", "storeId");

-- CreateIndex
CREATE INDEX "catalog_categories_storeId_isActive_isVisibleOnOnlineOrder__idx" ON "catalog_categories"("storeId", "isActive", "isVisibleOnOnlineOrder", "displayOrder");

-- CreateIndex
CREATE INDEX "catalog_categories_storeId_originConnectionId_originExterna_idx" ON "catalog_categories"("storeId", "originConnectionId", "originExternalRef");

-- CreateIndex
CREATE INDEX "catalog_products_tenantId_storeId_idx" ON "catalog_products"("tenantId", "storeId");

-- CreateIndex
CREATE INDEX "catalog_products_storeId_isActive_isVisibleOnOnlineOrder_di_idx" ON "catalog_products"("storeId", "isActive", "isVisibleOnOnlineOrder", "displayOrder");

-- CreateIndex
CREATE INDEX "catalog_products_storeId_originConnectionId_originExternalR_idx" ON "catalog_products"("storeId", "originConnectionId", "originExternalRef");

-- CreateIndex
CREATE INDEX "catalog_products_storeId_name_idx" ON "catalog_products"("storeId", "name");

-- CreateIndex
CREATE INDEX "tenant_product_categories_tenantId_displayOrder_idx" ON "tenant_product_categories"("tenantId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_product_categories_tenantId_name_key" ON "tenant_product_categories"("tenantId", "name");

-- CreateIndex
CREATE INDEX "tenant_catalog_products_tenantId_isActive_displayOrder_idx" ON "tenant_catalog_products"("tenantId", "isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "tenant_catalog_products_tenantId_name_idx" ON "tenant_catalog_products"("tenantId", "name");

-- CreateIndex
CREATE INDEX "tenant_catalog_products_categoryId_idx" ON "tenant_catalog_products"("categoryId");

-- CreateIndex
CREATE INDEX "tenant_modifier_groups_tenantId_isActive_displayOrder_idx" ON "tenant_modifier_groups"("tenantId", "isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "tenant_modifier_groups_tenantId_name_idx" ON "tenant_modifier_groups"("tenantId", "name");

-- CreateIndex
CREATE INDEX "tenant_modifier_options_tenantModifierGroupId_isActive_disp_idx" ON "tenant_modifier_options"("tenantModifierGroupId", "isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "tenant_product_modifier_groups_tenantProductId_displayOrder_idx" ON "tenant_product_modifier_groups"("tenantProductId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_product_modifier_groups_tenantProductId_tenantModifi_key" ON "tenant_product_modifier_groups"("tenantProductId", "tenantModifierGroupId");

-- CreateIndex
CREATE INDEX "store_category_selections_tenantId_storeId_idx" ON "store_category_selections"("tenantId", "storeId");

-- CreateIndex
CREATE UNIQUE INDEX "store_category_selections_storeId_tenantCategoryId_key" ON "store_category_selections"("storeId", "tenantCategoryId");

-- CreateIndex
CREATE INDEX "store_modifier_group_selections_tenantId_storeId_idx" ON "store_modifier_group_selections"("tenantId", "storeId");

-- CreateIndex
CREATE UNIQUE INDEX "store_modifier_group_selections_storeId_tenantModifierGroup_key" ON "store_modifier_group_selections"("storeId", "tenantModifierGroupId");

-- CreateIndex
CREATE INDEX "store_product_selections_tenantId_storeId_idx" ON "store_product_selections"("tenantId", "storeId");

-- CreateIndex
CREATE INDEX "store_product_selections_storeId_isActive_displayOrder_idx" ON "store_product_selections"("storeId", "isActive", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "store_product_selections_storeId_tenantProductId_key" ON "store_product_selections"("storeId", "tenantProductId");

-- CreateIndex
CREATE INDEX "catalog_product_categories_storeId_categoryId_sortOrder_idx" ON "catalog_product_categories"("storeId", "categoryId", "sortOrder");

-- CreateIndex
CREATE INDEX "catalog_product_categories_storeId_productId_idx" ON "catalog_product_categories"("storeId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_product_categories_productId_categoryId_key" ON "catalog_product_categories"("productId", "categoryId");

-- CreateIndex
CREATE INDEX "catalog_modifier_groups_tenantId_storeId_idx" ON "catalog_modifier_groups"("tenantId", "storeId");

-- CreateIndex
CREATE INDEX "catalog_modifier_groups_storeId_originConnectionId_originEx_idx" ON "catalog_modifier_groups"("storeId", "originConnectionId", "originExternalRef");

-- CreateIndex
CREATE INDEX "catalog_modifier_groups_storeId_isActive_displayOrder_idx" ON "catalog_modifier_groups"("storeId", "isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "catalog_modifier_options_tenantId_storeId_idx" ON "catalog_modifier_options"("tenantId", "storeId");

-- CreateIndex
CREATE INDEX "catalog_modifier_options_modifierGroupId_isActive_isSoldOut_idx" ON "catalog_modifier_options"("modifierGroupId", "isActive", "isSoldOut", "displayOrder");

-- CreateIndex
CREATE INDEX "catalog_modifier_options_storeId_originConnectionId_originE_idx" ON "catalog_modifier_options"("storeId", "originConnectionId", "originExternalRef");

-- CreateIndex
CREATE INDEX "catalog_product_modifier_groups_storeId_productId_displayOr_idx" ON "catalog_product_modifier_groups"("storeId", "productId", "displayOrder");

-- CreateIndex
CREATE INDEX "catalog_product_modifier_groups_storeId_modifierGroupId_idx" ON "catalog_product_modifier_groups"("storeId", "modifierGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_product_modifier_groups_productId_modifierGroupId_key" ON "catalog_product_modifier_groups"("productId", "modifierGroupId");

-- CreateIndex
CREATE INDEX "catalog_import_runs_tenantId_storeId_createdAt_idx" ON "catalog_import_runs"("tenantId", "storeId", "createdAt");

-- CreateIndex
CREATE INDEX "catalog_import_runs_connectionId_status_idx" ON "catalog_import_runs"("connectionId", "status");

-- CreateIndex
CREATE INDEX "external_catalog_snapshots_connectionId_entityType_external_idx" ON "external_catalog_snapshots"("connectionId", "entityType", "externalEntityId");

-- CreateIndex
CREATE INDEX "external_catalog_snapshots_importRunId_idx" ON "external_catalog_snapshots"("importRunId");

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
CREATE INDEX "channel_entity_mappings_tenantId_storeId_connectionId_inter_idx" ON "channel_entity_mappings"("tenantId", "storeId", "connectionId", "internalEntityType", "internalEntityId");

-- CreateIndex
CREATE INDEX "channel_entity_mappings_tenantId_storeId_connectionId_exter_idx" ON "channel_entity_mappings"("tenantId", "storeId", "connectionId", "externalEntityType", "externalEntityId");

-- CreateIndex
CREATE INDEX "channel_entity_mappings_tenantId_storeId_connectionId_statu_idx" ON "channel_entity_mappings"("tenantId", "storeId", "connectionId", "status");

-- CreateIndex
CREATE INDEX "catalog_publish_jobs_tenantId_storeId_connectionId_status_idx" ON "catalog_publish_jobs"("tenantId", "storeId", "connectionId", "status");

-- CreateIndex
CREATE INDEX "catalog_publish_jobs_tenantId_storeId_connectionId_internal_idx" ON "catalog_publish_jobs"("tenantId", "storeId", "connectionId", "internalEntityType", "internalEntityId");

-- CreateIndex
CREATE INDEX "external_catalog_changes_tenantId_storeId_connectionId_stat_idx" ON "external_catalog_changes"("tenantId", "storeId", "connectionId", "status");

-- CreateIndex
CREATE INDEX "external_catalog_changes_tenantId_storeId_connectionId_enti_idx" ON "external_catalog_changes"("tenantId", "storeId", "connectionId", "entityType");

-- CreateIndex
CREATE INDEX "external_catalog_changes_connectionId_externalEntityId_enti_idx" ON "external_catalog_changes"("connectionId", "externalEntityId", "entityType");

-- CreateIndex
CREATE INDEX "external_catalog_changes_importRunId_idx" ON "external_catalog_changes"("importRunId");

-- CreateIndex
CREATE INDEX "external_catalog_change_fields_changeId_idx" ON "external_catalog_change_fields"("changeId");

-- CreateIndex
CREATE INDEX "catalog_conflicts_tenantId_storeId_connectionId_status_idx" ON "catalog_conflicts"("tenantId", "storeId", "connectionId", "status");

-- CreateIndex
CREATE INDEX "catalog_conflicts_tenantId_storeId_connectionId_internalEnt_idx" ON "catalog_conflicts"("tenantId", "storeId", "connectionId", "internalEntityType", "internalEntityId");

-- CreateIndex
CREATE INDEX "catalog_conflicts_connectionId_externalEntityType_externalE_idx" ON "catalog_conflicts"("connectionId", "externalEntityType", "externalEntityId");

-- CreateIndex
CREATE INDEX "catalog_conflicts_externalChangeId_idx" ON "catalog_conflicts"("externalChangeId");

-- CreateIndex
CREATE INDEX "catalog_conflict_fields_conflictId_idx" ON "catalog_conflict_fields"("conflictId");

-- CreateIndex
CREATE INDEX "catalog_conflict_resolution_logs_conflictId_idx" ON "catalog_conflict_resolution_logs"("conflictId");

-- CreateIndex
CREATE INDEX "internal_catalog_changes_tenantId_storeId_entityType_intern_idx" ON "internal_catalog_changes"("tenantId", "storeId", "entityType", "internalEntityId", "changedAt");

-- CreateIndex
CREATE INDEX "internal_catalog_changes_tenantId_storeId_changedAt_idx" ON "internal_catalog_changes"("tenantId", "storeId", "changedAt");

-- CreateIndex
CREATE INDEX "catalog_sync_policies_tenantId_storeId_connectionId_scope_i_idx" ON "catalog_sync_policies"("tenantId", "storeId", "connectionId", "scope", "isEnabled");

-- CreateIndex
CREATE INDEX "catalog_sync_policies_tenantId_storeId_connectionId_fieldPa_idx" ON "catalog_sync_policies"("tenantId", "storeId", "connectionId", "fieldPath");

-- CreateIndex
CREATE INDEX "catalog_sync_plans_tenantId_storeId_connectionId_status_idx" ON "catalog_sync_plans"("tenantId", "storeId", "connectionId", "status");

-- CreateIndex
CREATE INDEX "catalog_sync_plan_items_planId_status_idx" ON "catalog_sync_plan_items"("planId", "status");

-- CreateIndex
CREATE INDEX "catalog_sync_plan_items_conflictId_idx" ON "catalog_sync_plan_items"("conflictId");

-- CreateIndex
CREATE INDEX "catalog_sync_plan_items_externalChangeId_idx" ON "catalog_sync_plan_items"("externalChangeId");

-- CreateIndex
CREATE INDEX "catalog_sync_execution_logs_planId_idx" ON "catalog_sync_execution_logs"("planId");

-- CreateIndex
CREATE INDEX "catalog_sync_execution_logs_planItemId_idx" ON "catalog_sync_execution_logs"("planItemId");

-- CreateIndex
CREATE INDEX "catalog_merge_drafts_tenantId_storeId_connectionId_status_idx" ON "catalog_merge_drafts"("tenantId", "storeId", "connectionId", "status");

-- CreateIndex
CREATE INDEX "catalog_merge_drafts_conflictId_idx" ON "catalog_merge_drafts"("conflictId");

-- CreateIndex
CREATE INDEX "catalog_merge_drafts_generatedPlanId_idx" ON "catalog_merge_drafts"("generatedPlanId");

-- CreateIndex
CREATE INDEX "catalog_merge_draft_fields_draftId_idx" ON "catalog_merge_draft_fields"("draftId");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_merge_draft_fields_draftId_fieldPath_key" ON "catalog_merge_draft_fields"("draftId", "fieldPath");

-- CreateIndex
CREATE INDEX "catalog_merge_draft_structures_draftId_idx" ON "catalog_merge_draft_structures"("draftId");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_merge_draft_structures_draftId_fieldPath_key" ON "catalog_merge_draft_structures"("draftId", "fieldPath");

-- CreateIndex
CREATE INDEX "catalog_merge_execution_logs_draftId_idx" ON "catalog_merge_execution_logs"("draftId");

-- CreateIndex
CREATE INDEX "catalog_merge_execution_logs_generatedPlanId_idx" ON "catalog_merge_execution_logs"("generatedPlanId");

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

-- CreateIndex
CREATE INDEX "ingredients_scope_isActive_idx" ON "ingredients"("scope", "isActive");

-- CreateIndex
CREATE INDEX "ingredients_scope_category_idx" ON "ingredients"("scope", "category");

-- CreateIndex
CREATE INDEX "ingredients_tenantId_storeId_idx" ON "ingredients"("tenantId", "storeId");

-- CreateIndex
CREATE INDEX "ingredients_storeId_name_idx" ON "ingredients"("storeId", "name");

-- CreateIndex
CREATE INDEX "tenant_ingredients_tenantId_idx" ON "tenant_ingredients"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_ingredients_tenantId_ingredientId_key" ON "tenant_ingredients"("tenantId", "ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_categories_name_key" ON "recipe_categories"("name");

-- CreateIndex
CREATE INDEX "recipe_categories_displayOrder_name_idx" ON "recipe_categories"("displayOrder", "name");

-- CreateIndex
CREATE INDEX "recipes_tenantId_storeId_idx" ON "recipes"("tenantId", "storeId");

-- CreateIndex
CREATE INDEX "recipes_storeId_catalogProductId_idx" ON "recipes"("storeId", "catalogProductId");

-- CreateIndex
CREATE INDEX "recipes_tenantId_tenantCatalogProductId_idx" ON "recipes"("tenantId", "tenantCatalogProductId");

-- CreateIndex
CREATE INDEX "recipes_categoryId_idx" ON "recipes"("categoryId");

-- CreateIndex
CREATE INDEX "recipes_marketplaceSourceId_idx" ON "recipes"("marketplaceSourceId");

-- CreateIndex
CREATE INDEX "recipe_ingredients_recipeId_idx" ON "recipe_ingredients"("recipeId");

-- CreateIndex
CREATE INDEX "recipe_ingredients_ingredientId_idx" ON "recipe_ingredients"("ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_ingredients_recipeId_ingredientId_key" ON "recipe_ingredients"("recipeId", "ingredientId");

-- CreateIndex
CREATE INDEX "recipe_product_components_recipeId_idx" ON "recipe_product_components"("recipeId");

-- CreateIndex
CREATE INDEX "recipe_product_components_tenantProductId_idx" ON "recipe_product_components"("tenantProductId");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_product_components_recipeId_tenantProductId_key" ON "recipe_product_components"("recipeId", "tenantProductId");

-- CreateIndex
CREATE INDEX "suppliers_scope_idx" ON "suppliers"("scope");

-- CreateIndex
CREATE INDEX "suppliers_tenantId_storeId_idx" ON "suppliers"("tenantId", "storeId");

-- CreateIndex
CREATE INDEX "suppliers_storeId_name_idx" ON "suppliers"("storeId", "name");

-- CreateIndex
CREATE INDEX "supplier_requests_status_idx" ON "supplier_requests"("status");

-- CreateIndex
CREATE INDEX "supplier_requests_tenantId_idx" ON "supplier_requests"("tenantId");

-- CreateIndex
CREATE INDEX "supplier_requests_requestedByUserId_idx" ON "supplier_requests"("requestedByUserId");

-- CreateIndex
CREATE INDEX "supplier_products_supplierId_idx" ON "supplier_products"("supplierId");

-- CreateIndex
CREATE INDEX "ingredient_supplier_links_ingredientId_idx" ON "ingredient_supplier_links"("ingredientId");

-- CreateIndex
CREATE INDEX "ingredient_supplier_links_supplierProductId_idx" ON "ingredient_supplier_links"("supplierProductId");

-- CreateIndex
CREATE INDEX "ingredient_supplier_links_tenantId_idx" ON "ingredient_supplier_links"("tenantId");

-- CreateIndex
CREATE INDEX "ingredient_supplier_links_ingredientId_supplierProductId_te_idx" ON "ingredient_supplier_links"("ingredientId", "supplierProductId", "tenantId");

-- CreateIndex
CREATE INDEX "supplier_credentials_tenantId_userId_idx" ON "supplier_credentials"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "supplier_credentials_supplierId_idx" ON "supplier_credentials"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_credentials_tenantId_userId_supplierId_key" ON "supplier_credentials"("tenantId", "userId", "supplierId");

-- CreateIndex
CREATE INDEX "supplier_contract_prices_supplierProductId_tenantId_idx" ON "supplier_contract_prices"("supplierProductId", "tenantId");

-- CreateIndex
CREATE INDEX "supplier_contract_prices_tenantId_idx" ON "supplier_contract_prices"("tenantId");

-- CreateIndex
CREATE INDEX "supplier_price_records_supplierProductId_tenantId_idx" ON "supplier_price_records"("supplierProductId", "tenantId");

-- CreateIndex
CREATE INDEX "supplier_price_records_tenantId_idx" ON "supplier_price_records"("tenantId");

-- CreateIndex
CREATE INDEX "marketplace_recipes_status_idx" ON "marketplace_recipes"("status");

-- CreateIndex
CREATE INDEX "marketplace_recipes_type_status_idx" ON "marketplace_recipes"("type", "status");

-- CreateIndex
CREATE INDEX "marketplace_recipes_providerId_idx" ON "marketplace_recipes"("providerId");

-- CreateIndex
CREATE INDEX "marketplace_recipes_deletedAt_idx" ON "marketplace_recipes"("deletedAt");

-- CreateIndex
CREATE INDEX "marketplace_recipe_ingredients_recipeId_idx" ON "marketplace_recipe_ingredients"("recipeId");

-- CreateIndex
CREATE INDEX "marketplace_recipe_ingredients_ingredientId_idx" ON "marketplace_recipe_ingredients"("ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_recipe_ingredients_recipeId_ingredientId_key" ON "marketplace_recipe_ingredients"("recipeId", "ingredientId");

-- CreateIndex
CREATE INDEX "marketplace_recipe_reviews_recipeId_createdAt_idx" ON "marketplace_recipe_reviews"("recipeId", "createdAt");

-- CreateIndex
CREATE INDEX "marketplace_recipe_reviews_reviewerId_idx" ON "marketplace_recipe_reviews"("reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_recipe_purchases_stripePaymentIntentId_key" ON "marketplace_recipe_purchases"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "marketplace_recipe_purchases_buyerUserId_idx" ON "marketplace_recipe_purchases"("buyerUserId");

-- CreateIndex
CREATE INDEX "marketplace_recipe_purchases_recipeId_idx" ON "marketplace_recipe_purchases"("recipeId");

-- CreateIndex
CREATE INDEX "marketplace_recipe_purchases_tenantId_idx" ON "marketplace_recipe_purchases"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_recipe_purchases_recipeId_buyerUserId_key" ON "marketplace_recipe_purchases"("recipeId", "buyerUserId");

-- CreateIndex
CREATE INDEX "ingredient_requests_status_idx" ON "ingredient_requests"("status");

-- CreateIndex
CREATE INDEX "ingredient_requests_requestedByUserId_idx" ON "ingredient_requests"("requestedByUserId");

-- CreateIndex
CREATE INDEX "ingredient_requests_tenantId_idx" ON "ingredient_requests"("tenantId");

-- CreateIndex
CREATE INDEX "provider_onboarding_applications_userId_idx" ON "provider_onboarding_applications"("userId");

-- CreateIndex
CREATE INDEX "provider_onboarding_applications_status_idx" ON "provider_onboarding_applications"("status");

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
ALTER TABLE "customers" ADD CONSTRAINT "customers_preferredStoreId_fkey" FOREIGN KEY ("preferredStoreId") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_catalog_products" ADD CONSTRAINT "tenant_catalog_products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "tenant_product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_modifier_options" ADD CONSTRAINT "tenant_modifier_options_tenantModifierGroupId_fkey" FOREIGN KEY ("tenantModifierGroupId") REFERENCES "tenant_modifier_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_product_modifier_groups" ADD CONSTRAINT "tenant_product_modifier_groups_tenantProductId_fkey" FOREIGN KEY ("tenantProductId") REFERENCES "tenant_catalog_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_product_modifier_groups" ADD CONSTRAINT "tenant_product_modifier_groups_tenantModifierGroupId_fkey" FOREIGN KEY ("tenantModifierGroupId") REFERENCES "tenant_modifier_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_category_selections" ADD CONSTRAINT "store_category_selections_tenantCategoryId_fkey" FOREIGN KEY ("tenantCategoryId") REFERENCES "tenant_product_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_modifier_group_selections" ADD CONSTRAINT "store_modifier_group_selections_tenantModifierGroupId_fkey" FOREIGN KEY ("tenantModifierGroupId") REFERENCES "tenant_modifier_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_product_selections" ADD CONSTRAINT "store_product_selections_tenantProductId_fkey" FOREIGN KEY ("tenantProductId") REFERENCES "tenant_catalog_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "external_catalog_snapshots" ADD CONSTRAINT "external_catalog_snapshots_importRunId_fkey" FOREIGN KEY ("importRunId") REFERENCES "catalog_import_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_catalog_change_fields" ADD CONSTRAINT "external_catalog_change_fields_changeId_fkey" FOREIGN KEY ("changeId") REFERENCES "external_catalog_changes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_conflict_fields" ADD CONSTRAINT "catalog_conflict_fields_conflictId_fkey" FOREIGN KEY ("conflictId") REFERENCES "catalog_conflicts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_conflict_resolution_logs" ADD CONSTRAINT "catalog_conflict_resolution_logs_conflictId_fkey" FOREIGN KEY ("conflictId") REFERENCES "catalog_conflicts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_sync_plan_items" ADD CONSTRAINT "catalog_sync_plan_items_planId_fkey" FOREIGN KEY ("planId") REFERENCES "catalog_sync_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_merge_draft_fields" ADD CONSTRAINT "catalog_merge_draft_fields_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "catalog_merge_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_merge_draft_structures" ADD CONSTRAINT "catalog_merge_draft_structures_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "catalog_merge_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_merge_execution_logs" ADD CONSTRAINT "catalog_merge_execution_logs_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "catalog_merge_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_ingredients" ADD CONSTRAINT "tenant_ingredients_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_catalogProductId_fkey" FOREIGN KEY ("catalogProductId") REFERENCES "catalog_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_tenantCatalogProductId_fkey" FOREIGN KEY ("tenantCatalogProductId") REFERENCES "tenant_catalog_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "recipe_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_product_components" ADD CONSTRAINT "recipe_product_components_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_product_components" ADD CONSTRAINT "recipe_product_components_tenantProductId_fkey" FOREIGN KEY ("tenantProductId") REFERENCES "tenant_catalog_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_requests" ADD CONSTRAINT "supplier_requests_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_requests" ADD CONSTRAINT "supplier_requests_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_requests" ADD CONSTRAINT "supplier_requests_resolvedSupplierId_fkey" FOREIGN KEY ("resolvedSupplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_supplier_links" ADD CONSTRAINT "ingredient_supplier_links_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_supplier_links" ADD CONSTRAINT "ingredient_supplier_links_supplierProductId_fkey" FOREIGN KEY ("supplierProductId") REFERENCES "supplier_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_credentials" ADD CONSTRAINT "supplier_credentials_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_contract_prices" ADD CONSTRAINT "supplier_contract_prices_supplierProductId_fkey" FOREIGN KEY ("supplierProductId") REFERENCES "supplier_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_price_records" ADD CONSTRAINT "supplier_price_records_supplierProductId_fkey" FOREIGN KEY ("supplierProductId") REFERENCES "supplier_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_price_records" ADD CONSTRAINT "supplier_price_records_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "supplier_credentials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_recipes" ADD CONSTRAINT "marketplace_recipes_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_recipes" ADD CONSTRAINT "marketplace_recipes_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_recipe_ingredients" ADD CONSTRAINT "marketplace_recipe_ingredients_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "marketplace_recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_recipe_ingredients" ADD CONSTRAINT "marketplace_recipe_ingredients_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_recipe_reviews" ADD CONSTRAINT "marketplace_recipe_reviews_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "marketplace_recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_recipe_reviews" ADD CONSTRAINT "marketplace_recipe_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_recipe_purchases" ADD CONSTRAINT "marketplace_recipe_purchases_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "marketplace_recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_recipe_purchases" ADD CONSTRAINT "marketplace_recipe_purchases_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_requests" ADD CONSTRAINT "ingredient_requests_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_requests" ADD CONSTRAINT "ingredient_requests_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_requests" ADD CONSTRAINT "ingredient_requests_resolvedIngredientId_fkey" FOREIGN KEY ("resolvedIngredientId") REFERENCES "ingredients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_requests" ADD CONSTRAINT "ingredient_requests_tempIngredientId_fkey" FOREIGN KEY ("tempIngredientId") REFERENCES "ingredients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_onboarding_applications" ADD CONSTRAINT "provider_onboarding_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_onboarding_applications" ADD CONSTRAINT "provider_onboarding_applications_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
