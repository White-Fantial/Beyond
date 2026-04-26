// Admin UI types — read-only view models for the Platform Admin console.
// These are derived from Prisma models but shaped for display.

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface AdminDashboardSummary {
  totalTenants: number;
  totalStores: number;
  totalUsers: number;
  totalConnections: number;
  newTenantsLast7Days: number;
  newUsersLast7Days: number;
  newStoresLast7Days: number;
  recentTenants: RecentTenantRow[];
  recentUsers: RecentUserRow[];
  recentStores: RecentStoreRow[];
}

export interface RecentTenantRow {
  id: string;
  displayName: string;
  slug: string;
  status: string;
  createdAt: Date;
}

export interface RecentUserRow {
  id: string;
  name: string;
  email: string;
  platformRole: string;
  createdAt: Date;
}

export interface RecentStoreRow {
  id: string;
  name: string;
  tenantDisplayName: string;
  status: string;
  createdAt: Date;
}

// ─── Tenant ───────────────────────────────────────────────────────────────────

export interface AdminTenantListItem {
  id: string;
  displayName: string;
  slug: string;
  type: string;
  status: string;
  timezone: string;
  currency: string;
  storeCount: number;
  membershipCount: number;
  createdAt: Date;
}

export interface AdminTenantListParams {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminTenantDetail {
  id: string;
  slug: string;
  legalName: string;
  displayName: string;
  type: string;
  status: string;
  timezone: string;
  currency: string;
  countryCode: string;
  createdAt: Date;
  updatedAt: Date;
  storeCount: number;
  membershipCount: number;
  userCount: number;
  connectionCount: number;
  stores: TenantStoreRow[];
  memberships: TenantMembershipRow[];
  connectionSummary: TenantConnectionSummaryRow[];
}

export interface TenantStoreRow {
  id: string;
  name: string;
  code: string;
  status: string;
  timezone: string;
  createdAt: Date;
}

export interface TenantMembershipRow {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  status: string;
  joinedAt: Date | null;
  createdAt: Date;
}

export interface TenantConnectionSummaryRow {
  provider: string;
  total: number;
  connected: number;
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  platformRole: string;
  status: string;
  tenantCount: number;
  storeCount: number;
  createdAt: Date;
}

export interface AdminUserListParams {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminUserDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  platformRole: string;
  status: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  tenantMemberships: UserTenantMembershipRow[];
  storeMemberships: UserStoreMembershipRow[];
  tenantCount: number;
  storeCount: number;
}

export interface UserTenantMembershipRow {
  id: string;
  tenantId: string;
  tenantDisplayName: string;
  role: string;
  status: string;
  joinedAt: Date | null;
  createdAt: Date;
}

export interface UserStoreMembershipRow {
  id: string;
  storeId: string;
  storeName: string;
  tenantId: string;
  tenantDisplayName: string;
  role: string;
  status: string;
  createdAt: Date;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export interface AdminStoreListItem {
  id: string;
  name: string;
  code: string;
  tenantId: string;
  tenantDisplayName: string;
  status: string;
  timezone: string;
  connectionCount: number;
  createdAt: Date;
}

export interface AdminStoreListParams {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminStoreDetail {
  id: string;
  tenantId: string;
  tenantDisplayName: string;
  name: string;
  displayName: string;
  code: string;
  status: string;
  timezone: string;
  currency: string;
  countryCode: string;
  createdAt: Date;
  updatedAt: Date;
  membershipCount: number;
  connectionCount: number;
  activeConnectionCount: number;
  memberships: StoreMembershipRow[];
  connections: StoreConnectionRow[];
}

export interface StoreMembershipRow {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  status: string;
  createdAt: Date;
}

export interface StoreConnectionRow {
  id: string;
  provider: string;
  type: string;
  status: string;
  authScheme: string | null;
  externalStoreName: string | null;
  lastConnectedAt: Date | null;
  lastSyncAt: Date | null;
  lastSyncStatus: string | null;
}

// ─── Platform-wide Connection list ────────────────────────────────────────────

export interface AdminConnectionListItem {
  id: string;
  tenantId: string;
  tenantDisplayName: string;
  storeId: string;
  storeName: string;
  provider: string;
  type: string;
  status: string;
  externalStoreName: string | null;
  lastConnectedAt: Date | null;
  lastSyncAt: Date | null;
  lastSyncStatus: string | null;
  createdAt: Date;
}

export interface AdminConnectionListParams {
  q?: string;
  status?: string;
  provider?: string;
  page?: number | string;
  pageSize?: number | string;
}

// ─── Inbound Webhook Logs ─────────────────────────────────────────────────────

export interface AdminWebhookLogItem {
  id: string;
  tenantId: string | null;
  storeId: string | null;
  channelType: string | null;
  eventName: string | null;
  externalEventRef: string | null;
  signatureValid: boolean | null;
  processingStatus: string;
  receivedAt: Date;
  processedAt: Date | null;
  errorMessage: string | null;
}

export interface AdminWebhookLogParams {
  status?: string;
  channelType?: string;
  page?: number | string;
  pageSize?: number | string;
}

// ─── Connection Action Logs (Jobs) ────────────────────────────────────────────

export interface AdminConnectionActionLogItem {
  id: string;
  tenantId: string;
  storeId: string;
  provider: string;
  actionType: string;
  status: string;
  message: string | null;
  errorCode: string | null;
  createdAt: Date;
}

export interface AdminConnectionActionLogParams {
  provider?: string;
  status?: string;
  page?: number | string;
  pageSize?: number | string;
}

// ─── Connection Detail (Phase 7) ─────────────────────────────────────────────

export interface AdminConnectionDetail {
  id: string;
  tenantId: string;
  tenantDisplayName: string;
  storeId: string;
  storeName: string;
  provider: string;
  type: string;
  status: string;
  displayName: string | null;
  externalMerchantId: string | null;
  externalStoreId: string | null;
  externalStoreName: string | null;
  externalLocationId: string | null;
  authScheme: string | null;
  lastConnectedAt: Date | null;
  lastAuthValidatedAt: Date | null;
  lastSyncAt: Date | null;
  lastSyncStatus: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  reauthRequiredAt: Date | null;
  disconnectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  credentials: AdminConnectionCredentialRow[];
  recentActionLogs: AdminConnectionActionLogRow[];
}

export interface AdminConnectionCredentialRow {
  id: string;
  credentialType: string;
  authScheme: string;
  label: string | null;
  version: number;
  isActive: boolean;
  canRefresh: boolean;
  requiresReauth: boolean;
  issuedAt: Date | null;
  expiresAt: Date | null;
  refreshAfter: Date | null;
  lastUsedAt: Date | null;
  lastRefreshAt: Date | null;
  lastRefreshStatus: string | null;
  lastRefreshError: string | null;
  rotatedAt: Date | null;
  createdAt: Date;
}

export interface AdminConnectionActionLogRow {
  id: string;
  tenantId: string;
  storeId: string;
  provider: string;
  actionType: string;
  status: string;
  actorUserId: string | null;
  message: string | null;
  errorCode: string | null;
  createdAt: Date;
}

// ─── Billing ──────────────────────────────────────────────────────────────────

export interface AdminBillingSummary {
  totalSubscriptionPlans: number;
  totalActiveSubscriptions: number;
  totalSubscriptions: number;
  recentPlans: AdminSubscriptionPlanRow[];
}

export interface AdminSubscriptionPlanRow {
  id: string;
  storeId: string;
  storeName: string;
  tenantDisplayName: string;
  name: string;
  price: number;
  interval: string;
  isActive: boolean;
  activeSubscriptions: number;
  createdAt: Date;
}
